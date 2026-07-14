import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';

import { EmpresaActivaService } from '../../../../core/empresa/empresa-activa.service';
import { ApiResponse } from '../../../cpe/models/api-response.model';
import { CpeEmisionResponse } from '../../../cpe/models/cpe-emision-response.model';
import {
  clasificarEstadoEmisionCpe,
  EmisionCpeEstado,
  obtenerMensajesEmisionCpe,
  resolverErrorHttpEmisionCpe,
} from '../../../cpe/pages/emitir-cpe-page/emitir-cpe-page.component';
import { StockApiService } from '../../../inventario/data-access/stock-api.service';
import { StockProductoResponse } from '../../../inventario/models/stock.model';
import { PosApiService } from '../../data-access/pos-api.service';
import { ClienteResponse, CrearClienteRequest } from '../../models/cliente.model';
import { ProductoResponse } from '../../models/producto.model';
import { CrearVentaRequest, EmitirCpeDesdeVentaRequest, VentaResponse } from '../../models/venta.model';

interface PosItem {
  readonly producto: ProductoResponse;
  readonly cantidad: number;
}

type StockProductoEstado =
  | {
      readonly estado: 'cargando' | 'no-disponible';
      readonly stock: null;
    }
  | {
      readonly estado: 'disponible';
      readonly stock: StockProductoResponse;
    };

type PosEstado = 'cargando' | 'listo' | 'guardando' | 'error';
type EstadoEmisionVenta = 'sin-emitir' | 'emitiendo' | EmisionCpeEstado;

const IGV = 0.18;

@Component({
  selector: 'app-ventas-page',
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './ventas-page.component.html',
  styleUrl: './ventas-page.component.scss',
})
export class VentasPageComponent implements OnInit {
  private readonly posApi = inject(PosApiService);
  private readonly stockApi = inject(StockApiService);
  private readonly empresaActivaService = inject(EmpresaActivaService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly estado = signal<PosEstado>('cargando');
  protected readonly mensaje = signal('');
  protected readonly busquedaProducto = signal('');
  protected readonly productos = signal<readonly ProductoResponse[]>([]);
  protected readonly stockProductos = signal<Readonly<Record<string, StockProductoEstado>>>({});
  protected readonly clientes = signal<readonly ClienteResponse[]>([]);
  protected readonly items = signal<readonly PosItem[]>([]);
  protected readonly ultimaVenta = signal<VentaResponse | null>(null);
  protected readonly emisionEstado = signal<EstadoEmisionVenta>('sin-emitir');
  protected readonly emisionMensaje = signal('');
  protected readonly emisionRespuesta = signal<CpeEmisionResponse | null>(null);
  protected readonly emisionErrores = signal<readonly string[]>([]);

  protected readonly productoForm = this.formBuilder.nonNullable.group({
    productoId: ['', Validators.required],
    cantidad: [1, [Validators.required, Validators.min(0.01)]],
  });

  protected readonly clienteForm = this.formBuilder.nonNullable.group({
    clienteId: [''],
    tipoDocumento: ['DNI', Validators.required],
    numeroDocumento: [''],
    nombreRazonSocial: [''],
    direccion: [''],
  });

  protected readonly ventaForm = this.formBuilder.nonNullable.group({
    fecha: [this.obtenerFechaActual()],
  });

  protected readonly emisionForm = this.formBuilder.nonNullable.group({
    tipoComprobante: ['03', [Validators.required, Validators.maxLength(2)]],
    serie: ['B001', [Validators.required, Validators.maxLength(4)]],
    correlativo: [1, [Validators.required, Validators.min(1)]],
    rucEmisor: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
  });

  protected readonly productosActivos = computed(() =>
    this.productos().filter((producto) => producto.activo),
  );

  protected readonly productosFiltrados = computed(() => {
    const busqueda = this.busquedaProducto().trim().toLowerCase();
    const productos = this.productosActivos();

    if (!busqueda) {
      return productos;
    }

    return productos.filter((producto) =>
      producto.nombre.toLowerCase().includes(busqueda) ||
      producto.codigoSku.toLowerCase().includes(busqueda) ||
      producto.codigoBarras.toLowerCase().includes(busqueda),
    );
  });

  protected readonly clientesActivos = computed(() =>
    this.clientes().filter((cliente) => cliente.activo),
  );

  protected readonly subtotal = computed(() =>
    redondear(this.items().reduce((total, item) => total + this.calcularBaseItem(item), 0)),
  );

  protected readonly igv = computed(() =>
    redondear(this.items().reduce((total, item) => total + this.calcularIgvItem(item), 0)),
  );

  protected readonly total = computed(() =>
    redondear(this.items().reduce((total, item) => total + this.calcularTotalItem(item), 0)),
  );

  protected readonly puedeRegistrarVenta = computed(() =>
    this.items().length > 0 && this.estado() !== 'guardando',
  );

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  protected cargarDatosIniciales(mostrarMensaje = false): void {
    if (this.estado() === 'guardando' || this.emisionEstado() === 'emitiendo') {
      return;
    }

    this.estado.set('cargando');
    this.mensaje.set('');

    forkJoin({
      productos: this.posApi.listarProductos(),
      clientes: this.posApi.listarClientes(),
    }).subscribe({
      next: ({ productos, clientes }) => {
        this.productos.set(productos);
        this.clientes.set(clientes);
        this.cargarStockProductos(productos, mostrarMensaje);
      },
      error: (error: unknown) => {
        this.estado.set('error');
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudieron cargar productos y clientes.'));
      },
    });
  }

  protected agregarProducto(): void {
    if (this.estado() === 'guardando') {
      return;
    }

    this.productoForm.markAllAsTouched();

    if (this.productoForm.invalid) {
      return;
    }

    const { productoId, cantidad } = this.productoForm.getRawValue();
    const producto = this.productosActivos().find((item) => item.id === productoId);

    if (!producto) {
      this.mensaje.set('Selecciona un producto activo.');
      return;
    }

    const stockLibre = this.obtenerStockLibre(producto.id);

    if (stockLibre === null) {
      this.mensaje.set('Stock no disponible para este producto.');
      return;
    }

    if (stockLibre <= 0) {
      this.mensaje.set('Sin stock disponible.');
      return;
    }

    const cantidadEnCarrito = this.items()
      .filter((item) => item.producto.id === producto.id)
      .reduce((total, item) => total + item.cantidad, 0);

    if (redondear(cantidadEnCarrito + cantidad) > stockLibre) {
      this.mensaje.set('Stock insuficiente para la cantidad solicitada.');
      return;
    }

    this.items.update((items) => {
      const existente = items.find((item) => item.producto.id === producto.id);

      if (existente) {
        return items.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: redondear(item.cantidad + cantidad) }
            : item,
        );
      }

      return [...items, { producto, cantidad }];
    });

    this.ultimaVenta.set(null);
    this.mensaje.set('');
    this.productoForm.patchValue({ productoId: '', cantidad: 1 });
  }

  protected quitarProducto(productoId: string): void {
    if (this.estado() === 'guardando') {
      return;
    }

    this.items.update((items) => items.filter((item) => item.producto.id !== productoId));
    this.ultimaVenta.set(null);
  }

  protected actualizarBusquedaProducto(event: Event): void {
    const target = event.target;
    this.busquedaProducto.set(target instanceof HTMLInputElement ? target.value : '');
  }

  protected crearClienteRapido(): void {
    if (this.estado() === 'guardando') {
      return;
    }

    const nombreRazonSocial = this.clienteForm.controls.nombreRazonSocial.value.trim();

    if (!nombreRazonSocial) {
      this.mensaje.set('Indica el nombre o razon social del cliente.');
      return;
    }

    const request: CrearClienteRequest = {
      tipoDocumento: this.clienteForm.controls.tipoDocumento.value,
      numeroDocumento: normalizarTextoNullable(this.clienteForm.controls.numeroDocumento.value),
      nombreRazonSocial,
      direccion: normalizarTextoNullable(this.clienteForm.controls.direccion.value),
      activo: true,
    };

    this.estado.set('guardando');
    this.posApi.crearCliente(request).subscribe({
      next: (cliente) => {
        this.clientes.update((clientes) => [...clientes, cliente]);
        this.clienteForm.patchValue({
          clienteId: cliente.id,
          numeroDocumento: '',
          nombreRazonSocial: '',
          direccion: '',
        });
        this.estado.set('listo');
        this.mensaje.set(`Cliente ${cliente.nombreRazonSocial} agregado.`);
      },
      error: (error: unknown) => {
        this.estado.set('listo');
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudo crear el cliente.'));
      },
    });
  }

  protected registrarVenta(): void {
    if (this.estado() === 'guardando') {
      return;
    }

    if (!this.empresaActivaService.empresaId()) {
      this.mensaje.set('Selecciona una empresa activa antes de vender.');
      return;
    }

    if (this.items().length === 0) {
      this.mensaje.set('Agrega al menos un producto a la venta.');
      return;
    }

    const request = this.construirVentaRequest();
    const productoIdsVendidos = [...new Set(this.items().map((item) => item.producto.id))];
    this.estado.set('guardando');
    this.mensaje.set('');

    this.posApi.crearVenta(request).subscribe({
      next: (venta) => {
        this.ultimaVenta.set(venta);
        this.items.set([]);
        this.limpiarResultadoEmision();
        this.refrescarStockProductos(productoIdsVendidos);
        this.estado.set('listo');
        this.mensaje.set(`Venta registrada correctamente. ID: ${venta.id}. Total: S/ ${venta.total.toFixed(2)}.`);
      },
      error: (error: unknown) => {
        this.estado.set('listo');
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudo registrar la venta.'));
      },
    });
  }

  protected limpiarVenta(): void {
    if (this.estado() === 'guardando') {
      return;
    }

    this.items.set([]);
    this.ultimaVenta.set(null);
    this.mensaje.set('');
    this.limpiarResultadoEmision();
  }

  protected emitirComprobante(): void {
    if (this.emisionEstado() === 'emitiendo') {
      return;
    }

    const venta = this.ultimaVenta();

    if (!venta) {
      this.mensaje.set('Registra una venta antes de emitir comprobante.');
      return;
    }

    this.emisionForm.markAllAsTouched();

    if (this.emisionForm.invalid) {
      this.emisionEstado.set('error-validacion');
      this.emisionMensaje.set('Completa tipo, serie, correlativo y RUC emisor.');
      return;
    }

    const request = this.construirEmitirCpeRequest();
    this.emisionEstado.set('emitiendo');
    this.emisionMensaje.set('Emitiendo comprobante desde la venta...');
    this.emisionErrores.set([]);
    this.emisionRespuesta.set(null);

    this.posApi.emitirCpeDesdeVenta(venta.id, request).subscribe({
      next: (response) => this.aplicarResultadoEmision(response),
      error: (error: unknown) => {
        const resultado = resolverErrorHttpEmisionCpe(error);

        this.emisionRespuesta.set(resultado.respuesta);
        this.emisionEstado.set(resultado.estado);
        this.emisionMensaje.set(resultado.mensaje);
        this.emisionErrores.set(resultado.errores);
      },
    });
  }

  protected calcularBaseItem(item: PosItem): number {
    return redondear(this.calcularTotalItem(item) / (1 + IGV));
  }

  protected calcularIgvItem(item: PosItem): number {
    return redondear(this.calcularTotalItem(item) - this.calcularBaseItem(item));
  }

  protected calcularTotalItem(item: PosItem): number {
    return redondear(item.cantidad * item.producto.precioVenta);
  }

  protected obtenerStock(productoId: string): StockProductoEstado | null {
    return this.stockProductos()[productoId] ?? null;
  }

  protected obtenerStockLibre(productoId: string): number | null {
    const stock = this.obtenerStock(productoId);
    return stock?.estado === 'disponible' ? stock.stock.stockLibre : null;
  }

  protected obtenerTextoStock(productoId: string): string {
    const stock = this.obtenerStock(productoId);

    if (!stock || stock.estado === 'cargando') {
      return 'Consultando stock...';
    }

    if (stock.estado !== 'disponible') {
      return 'Stock no disponible para este producto.';
    }

    if (stock.stock.stockLibre <= 0) {
      return 'Sin stock disponible';
    }

    return `Stock libre: ${formatearCantidad(stock.stock.stockLibre)}`;
  }

  protected puedeAgregarProducto(productoId: string): boolean {
    const stockLibre = this.obtenerStockLibre(productoId);
    return stockLibre !== null && stockLibre > 0;
  }

  private construirVentaRequest(): CrearVentaRequest {
    return {
      fecha: this.ventaForm.controls.fecha.value
        ? new Date(`${this.ventaForm.controls.fecha.value}T00:00:00`).toISOString()
        : null,
      clienteId: normalizarTextoNullable(this.clienteForm.controls.clienteId.value),
      detalles: this.items().map((item) => ({
        productoId: item.producto.id,
        productoVarianteId: null,
        cantidad: item.cantidad,
        precioUnitario: item.producto.precioVenta,
        igv: this.calcularIgvItem(item),
        total: this.calcularTotalItem(item),
      })),
    };
  }

  private construirEmitirCpeRequest(): EmitirCpeDesdeVentaRequest {
    const form = this.emisionForm.getRawValue();

    return {
      tipoComprobante: form.tipoComprobante,
      serie: form.serie.trim().toUpperCase(),
      correlativo: form.correlativo,
      rucEmisor: form.rucEmisor.trim(),
    };
  }

  private aplicarResultadoEmision(response: ApiResponse<CpeEmisionResponse>): void {
    const data = response.data;

    if (!data) {
      this.emisionEstado.set('error');
      this.emisionMensaje.set(response.mensaje || 'capitalpos-api no devolvio datos de emision.');
      this.emisionErrores.set(response.errores);
      return;
    }

    this.emisionRespuesta.set(data);
    this.emisionEstado.set(clasificarEstadoEmisionCpe(response.ok, data));
    this.emisionMensaje.set(data.mensaje || response.mensaje || 'Emision procesada.');
    this.emisionErrores.set(obtenerMensajesEmisionCpe(data.errores, response.errores));
  }

  private limpiarResultadoEmision(): void {
    this.emisionEstado.set('sin-emitir');
    this.emisionMensaje.set('');
    this.emisionRespuesta.set(null);
    this.emisionErrores.set([]);
  }

  private cargarStockProductos(
    productos: readonly ProductoResponse[],
    mostrarMensaje: boolean,
  ): void {
    const productosActivos = productos.filter((producto) => producto.activo);

    if (productosActivos.length === 0) {
      this.stockProductos.set({});
      this.estado.set('listo');
      this.mensaje.set(mostrarMensaje ? 'Productos y clientes actualizados.' : '');
      return;
    }

    this.stockProductos.set(Object.fromEntries(
      productosActivos.map((producto) => [
        producto.id,
        {
          estado: 'cargando',
          stock: null,
        } satisfies StockProductoEstado,
      ]),
    ));

    forkJoin(
      productosActivos.map((producto) =>
        this.stockApi.obtenerStockProducto(producto.id).pipe(
          map((stock) => [
            producto.id,
            {
              estado: 'disponible',
              stock,
            } satisfies StockProductoEstado,
          ] as const),
          catchError(() => of([
            producto.id,
            {
              estado: 'no-disponible',
              stock: null,
            } satisfies StockProductoEstado,
          ] as const)),
        ),
      ),
    ).subscribe((stockEntries) => {
      this.stockProductos.set(Object.fromEntries(stockEntries));
      this.estado.set('listo');
      this.mensaje.set(mostrarMensaje ? 'Productos, clientes y stock actualizados.' : '');
    });
  }

  private refrescarStockProductos(productoIds: readonly string[]): void {
    if (productoIds.length === 0) {
      return;
    }

    const stockActual = this.stockProductos();
    this.stockProductos.set({
      ...stockActual,
      ...Object.fromEntries(productoIds.map((productoId) => [
        productoId,
        {
          estado: 'cargando',
          stock: null,
        } satisfies StockProductoEstado,
      ])),
    });

    forkJoin(
      productoIds.map((productoId) =>
        this.stockApi.obtenerStockProducto(productoId).pipe(
          map((stock) => [
            productoId,
            {
              estado: 'disponible',
              stock,
            } satisfies StockProductoEstado,
          ] as const),
          catchError(() => of([
            productoId,
            {
              estado: 'no-disponible',
              stock: null,
            } satisfies StockProductoEstado,
          ] as const)),
        ),
      ),
    ).subscribe((stockEntries) => {
      this.stockProductos.update((stockPorProducto) => ({
        ...stockPorProducto,
        ...Object.fromEntries(stockEntries),
      }));
    });
  }

  private obtenerMensajeError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = this.extraerMensajeApi(error);

      if (apiMessage) {
        return apiMessage;
      }

      if (error.status === 0) {
        return 'No se pudo conectar con capitalpos-api.';
      }

      if (error.status === 403) {
        return 'No tienes permisos suficientes para operar ventas.';
      }

      if (error.status === 400) {
        return 'Revisa los datos de la venta e intenta nuevamente.';
      }

      if (error.status === 404) {
        return 'No se encontro el recurso solicitado para completar la venta.';
      }

      if (error.status >= 500) {
        return 'capitalpos-api no pudo procesar la operacion en este momento.';
      }
    }

    return fallback;
  }

  private extraerMensajeApi(error: HttpErrorResponse): string {
    const body = error.error;

    if (typeof body === 'object' && body !== null) {
      const message = 'message' in body ? body.message : 'mensaje' in body ? body.mensaje : null;
      return typeof message === 'string' ? message : '';
    }

    return '';
  }

  private obtenerFechaActual(): string {
    return obtenerFechaActualLima();
  }
}

export function obtenerFechaActualLima(fecha = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(fecha);
  const year = partes.find((parte) => parte.type === 'year')?.value;
  const month = partes.find((parte) => parte.type === 'month')?.value;
  const day = partes.find((parte) => parte.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function formatearCantidad(valor: number): string {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(valor);
}

function normalizarTextoNullable(valor: string): string | null {
  const texto = valor.trim();
  return texto.length > 0 ? texto : null;
}

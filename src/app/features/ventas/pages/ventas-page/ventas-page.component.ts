import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { EmpresaActivaService } from '../../../../core/empresa/empresa-activa.service';
import { ApiResponse } from '../../../cpe/models/api-response.model';
import { CpeEmisionResponse } from '../../../cpe/models/cpe-emision-response.model';
import {
  clasificarEstadoEmisionCpe,
  EmisionCpeEstado,
  obtenerMensajesEmisionCpe,
  resolverErrorHttpEmisionCpe,
} from '../../../cpe/pages/emitir-cpe-page/emitir-cpe-page.component';
import { PosApiService } from '../../data-access/pos-api.service';
import { ClienteResponse, CrearClienteRequest } from '../../models/cliente.model';
import { ProductoResponse } from '../../models/producto.model';
import { CrearVentaRequest, EmitirCpeDesdeVentaRequest, VentaResponse } from '../../models/venta.model';

interface PosItem {
  readonly producto: ProductoResponse;
  readonly cantidad: number;
}

type PosEstado = 'cargando' | 'listo' | 'guardando' | 'error';
type EstadoEmisionVenta = 'sin-emitir' | 'emitiendo' | EmisionCpeEstado;

const IGV = 0.18;

@Component({
  selector: 'app-ventas-page',
  imports: [DecimalPipe, ReactiveFormsModule],
  templateUrl: './ventas-page.component.html',
  styleUrl: './ventas-page.component.scss',
})
export class VentasPageComponent implements OnInit {
  private readonly posApi = inject(PosApiService);
  private readonly empresaActivaService = inject(EmpresaActivaService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly estado = signal<PosEstado>('cargando');
  protected readonly mensaje = signal('');
  protected readonly busquedaProducto = signal('');
  protected readonly productos = signal<readonly ProductoResponse[]>([]);
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

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  protected cargarDatosIniciales(): void {
    this.estado.set('cargando');
    this.mensaje.set('');

    forkJoin({
      productos: this.posApi.listarProductos(),
      clientes: this.posApi.listarClientes(),
    }).subscribe({
      next: ({ productos, clientes }) => {
        this.productos.set(productos);
        this.clientes.set(clientes);
        this.estado.set('listo');
      },
      error: (error: unknown) => {
        this.estado.set('error');
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudieron cargar productos y clientes.'));
      },
    });
  }

  protected agregarProducto(): void {
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
    this.items.update((items) => items.filter((item) => item.producto.id !== productoId));
    this.ultimaVenta.set(null);
  }

  protected actualizarBusquedaProducto(event: Event): void {
    const target = event.target;
    this.busquedaProducto.set(target instanceof HTMLInputElement ? target.value : '');
  }

  protected crearClienteRapido(): void {
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
    if (!this.empresaActivaService.empresaId()) {
      this.mensaje.set('Selecciona una empresa activa antes de vender.');
      return;
    }

    if (this.items().length === 0) {
      this.mensaje.set('Agrega al menos un producto a la venta.');
      return;
    }

    const request = this.construirVentaRequest();
    this.estado.set('guardando');
    this.mensaje.set('');

    this.posApi.crearVenta(request).subscribe({
      next: (venta) => {
        this.ultimaVenta.set(venta);
        this.items.set([]);
        this.limpiarResultadoEmision();
        this.estado.set('listo');
        this.mensaje.set(`Venta ${venta.id} registrada por S/ ${venta.total.toFixed(2)}.`);
      },
      error: (error: unknown) => {
        this.estado.set('listo');
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudo registrar la venta.'));
      },
    });
  }

  protected limpiarVenta(): void {
    this.items.set([]);
    this.ultimaVenta.set(null);
    this.mensaje.set('');
    this.limpiarResultadoEmision();
  }

  protected emitirComprobante(): void {
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
    return new Date().toISOString().slice(0, 10);
  }
}

function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function normalizarTextoNullable(valor: string): string | null {
  const texto = valor.trim();
  return texto.length > 0 ? texto : null;
}

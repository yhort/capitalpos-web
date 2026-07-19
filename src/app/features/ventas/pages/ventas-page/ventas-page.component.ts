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
import { ProductosApiService } from '../../../productos/data-access/productos-api.service';
import { ProductoVarianteResponse } from '../../../productos/models/producto.model';
import { SedesApiService } from '../../../sedes/data-access/sedes-api.service';
import { PuntoVentaResponse, SedeResponse } from '../../../sedes/models/sede.model';
import { PosApiService } from '../../data-access/pos-api.service';
import { ClienteResponse, CrearClienteRequest } from '../../models/cliente.model';
import { ProductoResponse } from '../../models/producto.model';
import { CanalVenta, CrearVentaRequest, EmitirCpeDesdeVentaRequest, VentaResponse } from '../../models/venta.model';

interface PosItem {
  readonly producto: ProductoResponse;
  readonly variante: ProductoVarianteResponse | null;
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

type VariantesProductoEstado =
  | {
      readonly estado: 'cargando' | 'no-disponible';
      readonly variantes: readonly ProductoVarianteResponse[];
    }
  | {
      readonly estado: 'disponible';
      readonly variantes: readonly ProductoVarianteResponse[];
    };

type PosEstado = 'cargando' | 'listo' | 'guardando' | 'error';
type EstadoEmisionVenta = 'sin-emitir' | 'emitiendo' | EmisionCpeEstado;
type SedesEstado = 'cargando' | 'listo' | 'error';
type PuntosVentaEstado = 'sin-sede' | 'cargando' | 'listo' | 'error';

const IGV = 0.18;
const SERIE_COMPATIBILIDAD_CPE = 'B001';
const CORRELATIVO_COMPATIBILIDAD_CPE = 1;
const CANALES_VENTA: readonly { readonly valor: CanalVenta; readonly etiqueta: string }[] = [
  { valor: 'TIENDA', etiqueta: 'Tienda' },
  { valor: 'PROVINCIA', etiqueta: 'Provincia' },
  { valor: 'MARKETING', etiqueta: 'Marketing' },
  { valor: 'MAYORISTA', etiqueta: 'Mayorista' },
  { valor: 'MAQUILA', etiqueta: 'Maquila' },
  { valor: 'OFERTAS', etiqueta: 'Ofertas' },
];

@Component({
  selector: 'app-ventas-page',
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './ventas-page.component.html',
  styleUrl: './ventas-page.component.scss',
})
export class VentasPageComponent implements OnInit {
  private readonly posApi = inject(PosApiService);
  private readonly productosApi = inject(ProductosApiService);
  private readonly stockApi = inject(StockApiService);
  private readonly sedesApi = inject(SedesApiService);
  private readonly empresaActivaService = inject(EmpresaActivaService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly estado = signal<PosEstado>('cargando');
  protected readonly mensaje = signal('');
  protected readonly busquedaProducto = signal('');
  protected readonly productos = signal<readonly ProductoResponse[]>([]);
  protected readonly stockProductos = signal<Readonly<Record<string, StockProductoEstado>>>({});
  protected readonly variantesProductos = signal<Readonly<Record<string, VariantesProductoEstado>>>({});
  protected readonly stockVariantes = signal<Readonly<Record<string, StockProductoEstado>>>({});
  protected readonly clientes = signal<readonly ClienteResponse[]>([]);
  protected readonly sedes = signal<readonly SedeResponse[]>([]);
  protected readonly puntosVenta = signal<readonly PuntoVentaResponse[]>([]);
  protected readonly sedesEstado = signal<SedesEstado>('cargando');
  protected readonly puntosVentaEstado = signal<PuntosVentaEstado>('sin-sede');
  protected readonly items = signal<readonly PosItem[]>([]);
  protected readonly ultimaVenta = signal<VentaResponse | null>(null);
  protected readonly emisionEstado = signal<EstadoEmisionVenta>('sin-emitir');
  protected readonly emisionMensaje = signal('');
  protected readonly emisionRespuesta = signal<CpeEmisionResponse | null>(null);
  protected readonly emisionErrores = signal<readonly string[]>([]);
  protected readonly canalesVenta = CANALES_VENTA;

  protected readonly productoForm = this.formBuilder.nonNullable.group({
    productoId: ['', Validators.required],
    productoVarianteId: [''],
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
    sedeId: ['', Validators.required],
    puntoVentaId: ['', Validators.required],
    canalVenta: ['TIENDA' as CanalVenta, Validators.required],
  });

  protected readonly emisionForm = this.formBuilder.nonNullable.group({
    tipoComprobante: ['03', [Validators.required, Validators.maxLength(2)]],
    serie: [SERIE_COMPATIBILIDAD_CPE],
    correlativo: [CORRELATIVO_COMPATIBILIDAD_CPE],
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

  protected readonly sedesActivas = computed(() =>
    this.sedes().filter((sede) => sede.activa),
  );

  protected readonly puntosVentaActivos = computed(() =>
    this.puntosVenta().filter((puntoVenta) => puntoVenta.activo),
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
    this.items().length > 0 && this.ventaForm.controls.puntoVentaId.valid && this.estado() !== 'guardando',
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
      sedes: this.sedesApi.listarSedes(),
    }).subscribe({
      next: ({ productos, clientes, sedes }) => {
        this.productos.set(productos);
        this.clientes.set(clientes);
        this.sedes.set(sedes);
        this.sedesEstado.set('listo');
        this.aplicarSedeInicial(sedes);
        this.cargarStockProductos(productos, mostrarMensaje);
      },
      error: (error: unknown) => {
        this.estado.set('error');
        this.sedesEstado.set('error');
        this.puntosVentaEstado.set('error');
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudieron cargar sedes, productos y clientes.'));
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

    if (!this.obtenerSedeIdSeleccionada()) {
      this.mensaje.set('Indica la sede antes de agregar productos.');
      return;
    }

    const { productoId, productoVarianteId, cantidad } = this.productoForm.getRawValue();
    const producto = this.productosActivos().find((item) => item.id === productoId);

    if (!producto) {
      this.mensaje.set('Selecciona un producto activo.');
      return;
    }

    const variantesActivas = this.obtenerVariantesActivas(producto.id);
    const requiereVariante = variantesActivas.length > 0;
    const variante = requiereVariante
      ? variantesActivas.find((item) => item.id === productoVarianteId) ?? null
      : null;

    if (requiereVariante && !variante) {
      this.mensaje.set('Selecciona una variante antes de agregar el producto.');
      return;
    }

    const stockLibre = variante
      ? this.obtenerStockLibreVariante(producto.id, variante.id)
      : this.obtenerStockLibre(producto.id);

    if (stockLibre === null) {
      this.mensaje.set(variante
        ? 'Stock no disponible para la variante seleccionada.'
        : 'Stock no disponible para este producto.');
      return;
    }

    if (stockLibre <= 0) {
      this.mensaje.set(variante
        ? 'La variante seleccionada no tiene stock disponible.'
        : 'Sin stock disponible.');
      return;
    }

    const cantidadEnCarrito = this.items()
      .filter((item) => item.producto.id === producto.id && item.variante?.id === variante?.id)
      .reduce((total, item) => total + item.cantidad, 0);

    if (redondear(cantidadEnCarrito + cantidad) > stockLibre) {
      this.mensaje.set(variante
        ? 'Stock insuficiente para la variante seleccionada.'
        : 'Stock insuficiente para la cantidad solicitada.');
      return;
    }

    this.items.update((items) => {
      const existente = items.find((item) =>
        item.producto.id === producto.id && item.variante?.id === variante?.id,
      );

      if (existente) {
        return items.map((item) =>
          item.producto.id === producto.id && item.variante?.id === variante?.id
            ? { ...item, cantidad: redondear(item.cantidad + cantidad) }
            : item,
        );
      }

      return [...items, { producto, variante, cantidad }];
    });

    this.ultimaVenta.set(null);
    this.mensaje.set('');
    this.productoForm.patchValue({ productoId: '', productoVarianteId: '', cantidad: 1 });
  }

  protected quitarProducto(productoId: string, productoVarianteId: string | null): void {
    if (this.estado() === 'guardando') {
      return;
    }

    this.items.update((items) => items.filter((item) =>
      item.producto.id !== productoId || item.variante?.id !== productoVarianteId,
    ));
    this.ultimaVenta.set(null);
  }

  protected alCambiarProducto(): void {
    const productoId = this.productoForm.controls.productoId.value;
    this.productoForm.patchValue({ productoVarianteId: '' });

    if (productoId && !this.obtenerVariantes(productoId)) {
      this.cargarVariantesProducto(productoId);
    }
  }

  protected alCambiarVariante(): void {
    const { productoId, productoVarianteId } = this.productoForm.getRawValue();

    if (productoId && productoVarianteId) {
      this.cargarStockVariante(productoId, productoVarianteId);
    }
  }

  protected alCambiarSede(): void {
    this.stockProductos.set({});
    this.stockVariantes.set({});
    this.ventaForm.patchValue({ puntoVentaId: '' });

    const sedeId = this.obtenerSedeIdSeleccionada();

    if (!sedeId) {
      this.puntosVenta.set([]);
      this.puntosVentaEstado.set('sin-sede');
      return;
    }

    this.cargarPuntosVenta(sedeId, true);

    if (this.productosActivos().length > 0) {
      this.cargarStockProductos(this.productos(), false);
    }
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

    if (!this.obtenerPuntoVentaIdSeleccionado()) {
      this.mensaje.set('Indica el punto de venta antes de registrar la venta.');
      return;
    }

    const request = this.construirVentaRequest();
    const itemsVendidos = this.items();
    const productoIdsVendidos = [...new Set(itemsVendidos
      .filter((item) => !item.variante)
      .map((item) => item.producto.id))];
    const variantesVendidas = itemsVendidos
      .filter((item): item is PosItem & { readonly variante: ProductoVarianteResponse } => !!item.variante)
      .map((item) => ({
        productoId: item.producto.id,
        varianteId: item.variante.id,
      }));
    this.estado.set('guardando');
    this.mensaje.set('');

    this.posApi.crearVenta(request).subscribe({
      next: (venta) => {
        this.ultimaVenta.set(venta);
        this.items.set([]);
        this.limpiarResultadoEmision();
        this.refrescarStockProductos(productoIdsVendidos);
        this.refrescarStockVariantes(variantesVendidas);
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
      this.emisionMensaje.set('Completa tipo de comprobante y RUC emisor.');
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

  protected obtenerStockVariante(productoId: string, varianteId: string): StockProductoEstado | null {
    return this.stockVariantes()[crearClaveVariante(productoId, varianteId)] ?? null;
  }

  protected obtenerStockLibreVariante(productoId: string, varianteId: string): number | null {
    const stock = this.obtenerStockVariante(productoId, varianteId);
    return stock?.estado === 'disponible' ? stock.stock.stockLibre : null;
  }

  protected obtenerVariantes(productoId: string): VariantesProductoEstado | null {
    return this.variantesProductos()[productoId] ?? null;
  }

  protected obtenerVariantesActivas(productoId: string): readonly ProductoVarianteResponse[] {
    const variantes = this.obtenerVariantes(productoId);
    return variantes?.estado === 'disponible'
      ? variantes.variantes.filter((variante) => variante.activo)
      : [];
  }

  protected obtenerTextoStock(productoId: string): string {
    if (!this.obtenerSedeIdSeleccionada()) {
      return 'Indica sede para consultar stock.';
    }

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

  protected obtenerTextoVariantes(productoId: string): string {
    const variantes = this.obtenerVariantes(productoId);

    if (!variantes || variantes.estado === 'cargando') {
      return 'Consultando variantes...';
    }

    if (variantes.estado === 'no-disponible') {
      return 'Variantes no disponibles.';
    }

    const activas = variantes.variantes.filter((variante) => variante.activo).length;
    return activas > 0 ? `${activas} variantes activas` : 'Sin variantes activas';
  }

  protected obtenerTextoVariante(variante: ProductoVarianteResponse): string {
    const atributos = [variante.color, variante.talla].filter((valor) => !!valor);
    const descripcion = atributos.length > 0 ? atributos.join(' / ') : 'Variante';
    const sku = variante.codigoSku ? `SKU ${variante.codigoSku}` : '';
    const barras = variante.codigoBarras ? `CB ${variante.codigoBarras}` : '';
    return [descripcion, sku, barras].filter((valor) => !!valor).join(' - ');
  }

  protected obtenerDescripcionItem(item: PosItem): string {
    return item.variante
      ? `${item.producto.nombre} - ${this.obtenerTextoVariante(item.variante)}`
      : item.producto.nombre;
  }

  protected obtenerStockLibreItem(item: PosItem): number | null {
    return item.variante
      ? this.obtenerStockLibreVariante(item.producto.id, item.variante.id)
      : this.obtenerStockLibre(item.producto.id);
  }

  protected obtenerEtiquetaCanalVenta(canal: string): string {
    return this.canalesVenta.find((item) => item.valor === canal)?.etiqueta ?? canal;
  }

  protected obtenerTextoSede(sede: SedeResponse): string {
    const codigo = sede.codigoEstablecimiento ? `Cod. ${sede.codigoEstablecimiento}` : '';
    return [sede.nombre, codigo].filter((valor) => !!valor).join(' - ');
  }

  protected obtenerTextoPuntoVenta(puntoVenta: PuntoVentaResponse): string {
    return puntoVenta.nombre || puntoVenta.id;
  }

  protected puedeAgregarProducto(productoId: string): boolean {
    const stockLibre = this.obtenerStockLibre(productoId);
    return stockLibre !== null && stockLibre > 0;
  }

  protected puedeAgregarSeleccionActual(): boolean {
    const { productoId, productoVarianteId } = this.productoForm.getRawValue();

    if (!productoId) {
      return false;
    }

    const variantesActivas = this.obtenerVariantesActivas(productoId);

    if (variantesActivas.length > 0) {
      return !!productoVarianteId && (this.obtenerStockLibreVariante(productoId, productoVarianteId) ?? 0) > 0;
    }

    return this.puedeAgregarProducto(productoId);
  }

  private construirVentaRequest(): CrearVentaRequest {
    return {
      fecha: this.ventaForm.controls.fecha.value
        ? new Date(`${this.ventaForm.controls.fecha.value}T00:00:00`).toISOString()
        : null,
      clienteId: normalizarTextoNullable(this.clienteForm.controls.clienteId.value),
      canalVenta: this.ventaForm.controls.canalVenta.value,
      puntoVentaId: this.obtenerPuntoVentaIdSeleccionado() ?? '',
      vendedorId: null,
      detalles: this.items().map((item) => ({
        productoId: item.producto.id,
        productoVarianteId: item.variante?.id ?? null,
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
      serie: normalizarSerieCompatibilidad(form.serie),
      correlativo: normalizarCorrelativoCompatibilidad(form.correlativo),
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
    const sedeId = this.obtenerSedeIdSeleccionada();

    if (productosActivos.length === 0) {
      this.stockProductos.set({});
      this.variantesProductos.set({});
      this.stockVariantes.set({});
      this.estado.set('listo');
      this.mensaje.set(mostrarMensaje ? 'Productos y clientes actualizados.' : '');
      return;
    }

    if (!sedeId) {
      this.stockProductos.set({});
      this.stockVariantes.set({});
      this.cargarVariantesProductosIniciales(productosActivos, mostrarMensaje);
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
    this.variantesProductos.set(Object.fromEntries(
      productosActivos.map((producto) => [
        producto.id,
        {
          estado: 'cargando',
          variantes: [],
        } satisfies VariantesProductoEstado,
      ]),
    ));

    forkJoin({
      stockEntries: forkJoin(productosActivos.map((producto) => this.obtenerStockProductoEntry(producto.id))),
      variantesEntries: forkJoin(productosActivos.map((producto) => this.obtenerVariantesProductoEntry(producto.id))),
    }).subscribe(({ stockEntries, variantesEntries }) => {
      this.stockProductos.set(Object.fromEntries(stockEntries));
      this.variantesProductos.set(Object.fromEntries(variantesEntries));
      this.estado.set('listo');
      this.mensaje.set(mostrarMensaje ? 'Productos, clientes y stock actualizados.' : '');
    });
  }

  private refrescarStockProductos(productoIds: readonly string[]): void {
    if (productoIds.length === 0 || !this.obtenerSedeIdSeleccionada()) {
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

    forkJoin(productoIds.map((productoId) => this.obtenerStockProductoEntry(productoId))).subscribe((stockEntries) => {
      this.stockProductos.update((stockPorProducto) => ({
        ...stockPorProducto,
        ...Object.fromEntries(stockEntries),
      }));
    });
  }

  private cargarVariantesProducto(productoId: string): void {
    this.actualizarVariantesProducto(productoId, {
      estado: 'cargando',
      variantes: [],
    });

    this.obtenerVariantesProductoEntry(productoId).subscribe(([id, variantes]) => {
      this.actualizarVariantesProducto(id, variantes);
    });
  }

  private cargarStockVariante(productoId: string, varianteId: string): void {
    const clave = crearClaveVariante(productoId, varianteId);

    if (!this.obtenerSedeIdSeleccionada()) {
      this.mensaje.set('Indica la sede antes de consultar stock de variante.');
      return;
    }

    this.stockVariantes.update((stockVariantes) => ({
      ...stockVariantes,
      [clave]: {
        estado: 'cargando',
        stock: null,
      },
    }));

    this.obtenerStockVarianteEntry(productoId, varianteId).subscribe(([stockClave, stock]) => {
      this.stockVariantes.update((stockVariantes) => ({
        ...stockVariantes,
        [stockClave]: stock,
      }));
    });
  }

  private refrescarStockVariantes(
    variantes: readonly { readonly productoId: string; readonly varianteId: string }[],
  ): void {
    if (variantes.length === 0 || !this.obtenerSedeIdSeleccionada()) {
      return;
    }

    const variantesUnicas = Array.from(
      new Map(variantes.map((variante) => [
        crearClaveVariante(variante.productoId, variante.varianteId),
        variante,
      ])).values(),
    );

    this.stockVariantes.update((stockActual) => ({
      ...stockActual,
      ...Object.fromEntries(variantesUnicas.map((variante) => [
        crearClaveVariante(variante.productoId, variante.varianteId),
        {
          estado: 'cargando',
          stock: null,
        } satisfies StockProductoEstado,
      ])),
    }));

    forkJoin(
      variantesUnicas.map((variante) =>
        this.obtenerStockVarianteEntry(variante.productoId, variante.varianteId),
      ),
    ).subscribe((stockEntries) => {
      this.stockVariantes.update((stockPorVariante) => ({
        ...stockPorVariante,
        ...Object.fromEntries(stockEntries),
      }));
    });
  }

  private obtenerStockProductoEntry(productoId: string) {
    const sedeId = this.obtenerSedeIdSeleccionada();

    if (!sedeId) {
      return of([
        productoId,
        {
          estado: 'no-disponible',
          stock: null,
        } satisfies StockProductoEstado,
      ] as const);
    }

    return this.stockApi.obtenerStockProducto(productoId, sedeId).pipe(
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
    );
  }

  private obtenerStockVarianteEntry(productoId: string, varianteId: string) {
    const clave = crearClaveVariante(productoId, varianteId);
    const sedeId = this.obtenerSedeIdSeleccionada();

    if (!sedeId) {
      return of([
        clave,
        {
          estado: 'no-disponible',
          stock: null,
        } satisfies StockProductoEstado,
      ] as const);
    }

    return this.stockApi.obtenerStockProductoVariante(productoId, varianteId, sedeId).pipe(
      map((stock) => [
        clave,
        {
          estado: 'disponible',
          stock,
        } satisfies StockProductoEstado,
      ] as const),
      catchError(() => of([
        clave,
        {
          estado: 'no-disponible',
          stock: null,
        } satisfies StockProductoEstado,
      ] as const)),
    );
  }

  private obtenerVariantesProductoEntry(productoId: string) {
    return this.productosApi.listarVariantes(productoId).pipe(
      map((variantes) => [
        productoId,
        {
          estado: 'disponible',
          variantes,
        } satisfies VariantesProductoEstado,
      ] as const),
      catchError(() => of([
        productoId,
        {
          estado: 'no-disponible',
          variantes: [],
        } satisfies VariantesProductoEstado,
      ] as const)),
    );
  }

  private actualizarVariantesProducto(productoId: string, state: VariantesProductoEstado): void {
    this.variantesProductos.update((variantes) => ({
      ...variantes,
      [productoId]: state,
    }));
  }

  private cargarVariantesProductosIniciales(productosActivos: readonly ProductoResponse[], mostrarMensaje: boolean): void {
    this.variantesProductos.set(Object.fromEntries(
      productosActivos.map((producto) => [
        producto.id,
        {
          estado: 'cargando',
          variantes: [],
        } satisfies VariantesProductoEstado,
      ]),
    ));

    forkJoin(productosActivos.map((producto) => this.obtenerVariantesProductoEntry(producto.id))).subscribe((variantesEntries) => {
      this.variantesProductos.set(Object.fromEntries(variantesEntries));
      this.estado.set('listo');
      this.mensaje.set(mostrarMensaje ? 'Productos y clientes actualizados. Indica una sede para consultar stock.' : '');
    });
  }

  private aplicarSedeInicial(sedes: readonly SedeResponse[]): void {
    const sedesActivas = sedes.filter((sede) => sede.activa);
    const sedeActual = this.obtenerSedeIdSeleccionada();
    const sedeActualActiva = sedesActivas.some((sede) => sede.id === sedeActual);

    if (sedesActivas.length === 1 && !sedeActualActiva) {
      this.ventaForm.patchValue({ sedeId: sedesActivas[0].id });
      this.cargarPuntosVenta(sedesActivas[0].id, true);
      return;
    }

    if (sedeActualActiva && sedeActual) {
      this.cargarPuntosVenta(sedeActual, true);
      return;
    }

    this.ventaForm.patchValue({ sedeId: '', puntoVentaId: '' });
    this.puntosVenta.set([]);
    this.puntosVentaEstado.set(sedesActivas.length === 0 ? 'listo' : 'sin-sede');
  }

  private cargarPuntosVenta(sedeId: string, autoSeleccionar: boolean): void {
    this.puntosVentaEstado.set('cargando');
    this.puntosVenta.set([]);

    this.sedesApi.listarPuntosVenta(sedeId).subscribe({
      next: (puntosVenta) => {
        this.puntosVenta.set(puntosVenta);
        this.puntosVentaEstado.set('listo');
        this.aplicarPuntoVentaInicial(puntosVenta, sedeId, autoSeleccionar);
      },
      error: (error: unknown) => {
        this.puntosVenta.set([]);
        this.puntosVentaEstado.set('error');
        this.ventaForm.patchValue({ puntoVentaId: '' });
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudieron cargar los puntos de venta de la sede.'));
      },
    });
  }

  private aplicarPuntoVentaInicial(
    puntosVenta: readonly PuntoVentaResponse[],
    sedeId: string,
    autoSeleccionar: boolean,
  ): void {
    const puntosActivos = puntosVenta.filter((puntoVenta) => puntoVenta.activo && puntoVenta.sedeId === sedeId);
    const puntoActual = this.obtenerPuntoVentaIdSeleccionado();
    const puntoActualActivo = puntosActivos.some((puntoVenta) => puntoVenta.id === puntoActual);

    if (puntoActualActivo) {
      return;
    }

    if (autoSeleccionar && puntosActivos.length === 1) {
      this.ventaForm.patchValue({ puntoVentaId: puntosActivos[0].id });
      return;
    }

    this.ventaForm.patchValue({ puntoVentaId: '' });

    if (puntosActivos.length === 0) {
      this.mensaje.set('No hay puntos de venta activos para la sede seleccionada.');
    }
  }

  private obtenerSedeIdSeleccionada(): string | null {
    return normalizarTextoNullable(this.ventaForm.controls.sedeId.value);
  }

  private obtenerPuntoVentaIdSeleccionado(): string | null {
    return normalizarTextoNullable(this.ventaForm.controls.puntoVentaId.value);
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

function crearClaveVariante(productoId: string, varianteId: string): string {
  return `${productoId}:${varianteId}`;
}

function normalizarTextoNullable(valor: string): string | null {
  const texto = valor.trim();
  return texto.length > 0 ? texto : null;
}

function normalizarSerieCompatibilidad(valor: string): string {
  const serie = valor.trim().toUpperCase();
  return serie.length > 0 ? serie : SERIE_COMPATIBILIDAD_CPE;
}

function normalizarCorrelativoCompatibilidad(valor: number): number {
  return Number.isFinite(valor) && valor >= 1 ? valor : CORRELATIVO_COMPATIBILIDAD_CPE;
}

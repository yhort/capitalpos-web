import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ProductosApiService } from '../../../productos/data-access/productos-api.service';
import { ProductoResponse, ProductoVarianteResponse } from '../../../productos/models/producto.model';
import { StockApiService } from '../../data-access/stock-api.service';
import { AjustarStockProductoRequest, StockProductoResponse } from '../../models/stock.model';

type InventarioEstado = 'cargando' | 'listo' | 'consultando' | 'ajustando' | 'error' | 'error-validacion';
type VariantesEstado = 'sin-producto' | 'cargando' | 'listo' | 'error';

@Component({
  selector: 'app-inventario-page',
  imports: [DecimalPipe, ReactiveFormsModule],
  templateUrl: './inventario-page.component.html',
  styleUrl: './inventario-page.component.scss',
})
export class InventarioPageComponent implements OnInit {
  private readonly productosApi = inject(ProductosApiService);
  private readonly stockApi = inject(StockApiService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly estado = signal<InventarioEstado>('cargando');
  protected readonly mensaje = signal('');
  protected readonly productos = signal<readonly ProductoResponse[]>([]);
  protected readonly variantes = signal<readonly ProductoVarianteResponse[]>([]);
  protected readonly variantesEstado = signal<VariantesEstado>('sin-producto');
  protected readonly stock = signal<StockProductoResponse | null>(null);

  protected readonly consultaForm = this.formBuilder.nonNullable.group({
    productoId: ['', Validators.required],
    productoVarianteId: [''],
  });

  protected readonly ajusteForm = this.formBuilder.nonNullable.group({
    cantidadDisponible: [0, [Validators.required, Validators.min(0)]],
  });

  protected readonly productosActivos = computed(() =>
    this.productos().filter((producto) => producto.activo),
  );

  protected readonly productoSeleccionado = computed(() => {
    const productoId = this.consultaForm.controls.productoId.value.trim();
    return this.productos().find((producto) => producto.id === productoId) ?? null;
  });

  protected readonly variantesActivas = computed(() =>
    this.variantes().filter((variante) => variante.activo),
  );

  protected readonly varianteSeleccionada = computed(() => {
    const varianteId = this.consultaForm.controls.productoVarianteId.value.trim();
    return this.variantesActivas().find((variante) => variante.id === varianteId) ?? null;
  });

  ngOnInit(): void {
    this.cargarProductos();
  }

  protected cargarProductos(): void {
    if (this.estado() === 'consultando' || this.estado() === 'ajustando') {
      return;
    }

    this.estado.set('cargando');
    this.mensaje.set('');

    this.productosApi.listarProductos().subscribe({
      next: (productos) => {
        this.productos.set(productos);
        this.estado.set('listo');
      },
      error: (error: unknown) => {
        this.estado.set('error');
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudieron cargar los productos.'));
      },
    });
  }

  protected alCambiarProducto(): void {
    const productoId = this.consultaForm.controls.productoId.value.trim();

    this.consultaForm.patchValue({ productoVarianteId: '' });
    this.stock.set(null);
    this.variantes.set([]);

    if (!productoId) {
      this.variantesEstado.set('sin-producto');
      return;
    }

    this.variantesEstado.set('cargando');
    this.productosApi.listarVariantes(productoId).subscribe({
      next: (variantes) => {
        this.variantes.set(variantes);
        this.variantesEstado.set('listo');
      },
      error: (error: unknown) => {
        this.variantes.set([]);
        this.variantesEstado.set('error');
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudieron cargar las variantes del producto.'));
      },
    });
  }

  protected alCambiarVariante(): void {
    this.stock.set(null);

    if (this.consultaForm.controls.productoVarianteId.value) {
      this.consultarStock();
    }
  }

  protected consultarStock(): void {
    if (this.estado() === 'consultando' || this.estado() === 'ajustando') {
      return;
    }

    this.consultaForm.markAllAsTouched();

    if (this.consultaForm.invalid) {
      this.estado.set('error-validacion');
      this.mensaje.set('Selecciona o ingresa un producto antes de consultar stock.');
      return;
    }

    const validacionVariante = this.validarVarianteSeleccionada();

    if (!validacionVariante.ok) {
      this.estado.set('error-validacion');
      this.mensaje.set(validacionVariante.mensaje);
      return;
    }

    this.ejecutarConsultaStock(
      this.consultaForm.controls.productoId.value.trim(),
      validacionVariante.productoVarianteId,
      'Stock consultado correctamente.',
    );
  }

  protected ajustarStock(): void {
    if (this.estado() === 'consultando' || this.estado() === 'ajustando') {
      return;
    }

    this.consultaForm.markAllAsTouched();
    this.ajusteForm.markAllAsTouched();

    if (this.consultaForm.invalid || this.ajusteForm.invalid) {
      this.estado.set('error-validacion');
      this.mensaje.set('Indica producto y una cantidad disponible válida.');
      return;
    }

    const validacionVariante = this.validarVarianteSeleccionada();

    if (!validacionVariante.ok) {
      this.estado.set('error-validacion');
      this.mensaje.set(validacionVariante.mensaje);
      return;
    }

    const request = this.construirAjustarStockRequest();
    this.estado.set('ajustando');
    this.mensaje.set('');

    this.stockApi.ajustarStock(request).subscribe({
      next: () => {
        this.ejecutarConsultaStock(request.productoId, request.productoVarianteId, 'Stock ajustado correctamente.');
      },
      error: (error: unknown) => {
        this.estado.set(error instanceof HttpErrorResponse && error.status === 400 ? 'error-validacion' : 'error');
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudo ajustar el stock.'));
      },
    });
  }

  private construirAjustarStockRequest(): AjustarStockProductoRequest {
    return {
      productoId: this.consultaForm.controls.productoId.value.trim(),
      productoVarianteId: this.validarVarianteSeleccionada().productoVarianteId,
      cantidadDisponible: normalizarNumero(this.ajusteForm.controls.cantidadDisponible.value),
    };
  }

  protected obtenerTextoVariante(variante: ProductoVarianteResponse): string {
    const atributos = [variante.color, variante.talla].filter((valor) => !!valor);
    const descripcion = atributos.length > 0 ? atributos.join(' / ') : 'Variante';
    const sku = variante.codigoSku ? `SKU ${variante.codigoSku}` : '';
    const barras = variante.codigoBarras ? `CB ${variante.codigoBarras}` : '';
    return [descripcion, sku, barras].filter((valor) => !!valor).join(' - ');
  }

  protected obtenerTextoProducto(producto: ProductoResponse): string {
    return [producto.nombre, producto.codigoSku].filter((valor) => !!valor).join(' - ');
  }

  protected formatearFechaActualizacion(fecha: string | null): string {
    return formatearFechaActualizacionStock(fecha);
  }

  protected puedeAjustarStock(): boolean {
    if (
      this.estado() === 'consultando' ||
      this.estado() === 'ajustando' ||
      this.consultaForm.invalid ||
      this.ajusteForm.invalid
    ) {
      return false;
    }

    return this.validarVarianteSeleccionada().ok;
  }

  private ejecutarConsultaStock(productoId: string, productoVarianteId: string | null, mensajeExito: string): void {
    const consulta = productoVarianteId
      ? this.stockApi.obtenerStockProductoVariante(productoId, productoVarianteId)
      : this.stockApi.obtenerStockProducto(productoId);

    this.estado.set('consultando');
    this.mensaje.set('');

    consulta.subscribe({
      next: (stock) => {
        this.stock.set(stock);
        this.ajusteForm.patchValue({
          cantidadDisponible: stock.cantidadDisponible,
        });
        this.estado.set('listo');
        this.mensaje.set(mensajeExito);
      },
      error: (error: unknown) => {
        this.stock.set(null);
        this.estado.set(error instanceof HttpErrorResponse && error.status === 400 ? 'error-validacion' : 'error');
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudo consultar el stock.'));
      },
    });
  }

  private validarVarianteSeleccionada():
    | { readonly ok: true; readonly productoVarianteId: string | null }
    | { readonly ok: false; readonly productoVarianteId: null; readonly mensaje: string } {
    if (this.variantesEstado() === 'cargando') {
      return {
        ok: false,
        productoVarianteId: null,
        mensaje: 'Espera a que carguen las variantes del producto.',
      };
    }

    if (this.variantesEstado() === 'error') {
      return {
        ok: false,
        productoVarianteId: null,
        mensaje: 'No se pudieron cargar las variantes del producto.',
      };
    }

    const variantesActivas = this.variantesActivas();

    if (variantesActivas.length === 0) {
      return {
        ok: true,
        productoVarianteId: null,
      };
    }

    const productoVarianteId = normalizarTextoNullable(this.consultaForm.controls.productoVarianteId.value);
    const varianteExiste = variantesActivas.some((variante) => variante.id === productoVarianteId);

    if (!productoVarianteId || !varianteExiste) {
      return {
        ok: false,
        productoVarianteId: null,
        mensaje: 'Selecciona una variante para consultar o ajustar stock.',
      };
    }

    return {
      ok: true,
      productoVarianteId,
    };
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
        return 'No tienes permisos para operar almacén.';
      }

      if (error.status === 404) {
        return 'No hay stock registrado para el producto indicado.';
      }

      if (error.status === 400) {
        return 'Revisa los datos de stock enviados.';
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
}

function normalizarTextoNullable(valor: string): string | null {
  const texto = valor.trim();
  return texto.length > 0 ? texto : null;
}

function normalizarNumero(valor: number): number {
  return Math.round((Number(valor) + Number.EPSILON) * 1000) / 1000;
}

export function formatearFechaActualizacionStock(fecha: string | null): string {
  if (!fecha) {
    return 'Sin fecha';
  }

  const fechaActualizacion = new Date(fecha);

  if (Number.isNaN(fechaActualizacion.getTime())) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(fechaActualizacion)
    .replace(',', '')
    .replace(/\u00a0/g, ' ');
}

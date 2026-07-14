import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ProductosApiService } from '../../../productos/data-access/productos-api.service';
import { ProductoResponse } from '../../../productos/models/producto.model';
import { StockApiService } from '../../data-access/stock-api.service';
import { AjustarStockProductoRequest, StockProductoResponse } from '../../models/stock.model';

type InventarioEstado = 'cargando' | 'listo' | 'consultando' | 'ajustando' | 'error' | 'error-validacion';

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

    const productoId = this.consultaForm.controls.productoId.value.trim();
    const productoVarianteId = normalizarTextoNullable(this.consultaForm.controls.productoVarianteId.value);
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
        this.mensaje.set('Stock consultado correctamente.');
      },
      error: (error: unknown) => {
        this.stock.set(null);
        this.estado.set(error instanceof HttpErrorResponse && error.status === 400 ? 'error-validacion' : 'error');
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudo consultar el stock.'));
      },
    });
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

    const request = this.construirAjustarStockRequest();
    this.estado.set('ajustando');
    this.mensaje.set('');

    this.stockApi.ajustarStock(request).subscribe({
      next: (stock) => {
        this.stock.set(stock);
        this.ajusteForm.patchValue({
          cantidadDisponible: stock.cantidadDisponible,
        });
        this.estado.set('listo');
        this.mensaje.set('Stock ajustado correctamente.');
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
      productoVarianteId: normalizarTextoNullable(this.consultaForm.controls.productoVarianteId.value),
      cantidadDisponible: normalizarNumero(this.ajusteForm.controls.cantidadDisponible.value),
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

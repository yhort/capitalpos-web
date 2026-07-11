import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ProductosApiService } from '../../data-access/productos-api.service';
import { CrearProductoRequest, ProductoResponse } from '../../models/producto.model';

type ProductosEstado = 'cargando' | 'listo' | 'guardando' | 'error';

@Component({
  selector: 'app-productos-page',
  imports: [DecimalPipe, ReactiveFormsModule],
  templateUrl: './productos-page.component.html',
  styleUrl: './productos-page.component.scss',
})
export class ProductosPageComponent implements OnInit {
  private readonly productosApi = inject(ProductosApiService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly estado = signal<ProductosEstado>('cargando');
  protected readonly mensaje = signal('');
  protected readonly productos = signal<readonly ProductoResponse[]>([]);
  protected readonly busqueda = signal('');

  protected readonly productoForm = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(200)]],
    precioVenta: [0, [Validators.required, Validators.min(0.01)]],
    codigoSku: ['', Validators.maxLength(80)],
    codigoBarras: ['', Validators.maxLength(80)],
    costo: [null as number | null, Validators.min(0)],
  });

  protected readonly productosFiltrados = computed(() => {
    const busqueda = this.busqueda().trim().toLowerCase();
    const productos = this.productos();

    if (!busqueda) {
      return productos;
    }

    return productos.filter((producto) =>
      producto.nombre.toLowerCase().includes(busqueda) ||
      producto.codigoSku.toLowerCase().includes(busqueda) ||
      producto.codigoBarras.toLowerCase().includes(busqueda),
    );
  });

  ngOnInit(): void {
    this.cargarProductos();
  }

  protected cargarProductos(): void {
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

  protected crearProducto(): void {
    this.productoForm.markAllAsTouched();

    if (this.productoForm.invalid) {
      this.mensaje.set('Revisa los datos del producto antes de guardar.');
      return;
    }

    const request = this.construirCrearProductoRequest();
    this.estado.set('guardando');
    this.mensaje.set('');

    this.productosApi.crearProducto(request).subscribe({
      next: (producto) => {
        this.productos.update((productos) => [producto, ...productos]);
        this.productoForm.reset({
          nombre: '',
          precioVenta: 0,
          codigoSku: '',
          codigoBarras: '',
          costo: null,
        });
        this.estado.set('listo');
        this.mensaje.set(`Producto ${producto.nombre} creado.`);
      },
      error: (error: unknown) => {
        this.estado.set('listo');
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudo crear el producto.'));
      },
    });
  }

  protected actualizarBusqueda(event: Event): void {
    const target = event.target;
    this.busqueda.set(target instanceof HTMLInputElement ? target.value : '');
  }

  private construirCrearProductoRequest(): CrearProductoRequest {
    const form = this.productoForm.getRawValue();

    return {
      nombre: form.nombre.trim(),
      precioVenta: normalizarNumero(form.precioVenta),
      codigoSku: normalizarTextoNullable(form.codigoSku),
      codigoBarras: normalizarTextoNullable(form.codigoBarras),
      costo: form.costo === null ? null : normalizarNumero(form.costo),
      activo: true,
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
        return 'No tienes permisos para operar productos.';
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
  return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}

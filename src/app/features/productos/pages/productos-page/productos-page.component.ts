import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';

import { CatalogoApiService } from '../../../catalogo/data-access/catalogo-api.service';
import {
  CategoriaResponse,
  CrearCategoriaRequest,
  CrearMarcaRequest,
  MarcaResponse,
} from '../../../catalogo/models/catalogo.model';
import { ProductosApiService } from '../../data-access/productos-api.service';
import {
  CrearProductoRequest,
  CrearProductoPresentacionRequest,
  CrearProductoVarianteRequest,
  ProductoPresentacionResponse,
  ProductoResponse,
  ProductoVarianteResponse,
  UnidadMedidaResponse,
} from '../../models/producto.model';

type ProductosEstado = 'cargando' | 'listo' | 'guardando' | 'error';
type CatalogoEstado = 'cargando' | 'listo' | 'guardando' | 'error';
type VariantesEstado = 'sin-cargar' | 'cargando' | 'listo' | 'guardando' | 'error';
type PresentacionesEstado = 'sin-cargar' | 'cargando' | 'listo' | 'guardando' | 'error';

interface VariantesProductoState {
  readonly estado: VariantesEstado;
  readonly variantes: readonly ProductoVarianteResponse[];
  readonly mensaje: string;
}

interface PresentacionesProductoState {
  readonly estado: PresentacionesEstado;
  readonly presentaciones: readonly ProductoPresentacionResponse[];
  readonly mensaje: string;
}

@Component({
  selector: 'app-productos-page',
  imports: [DecimalPipe, ReactiveFormsModule],
  templateUrl: './productos-page.component.html',
  styleUrl: './productos-page.component.scss',
})
export class ProductosPageComponent implements OnInit {
  private readonly productosApi = inject(ProductosApiService);
  private readonly catalogoApi = inject(CatalogoApiService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly estado = signal<ProductosEstado>('cargando');
  protected readonly catalogoEstado = signal<CatalogoEstado>('cargando');
  protected readonly mensaje = signal('');
  protected readonly productos = signal<readonly ProductoResponse[]>([]);
  protected readonly categorias = signal<readonly CategoriaResponse[]>([]);
  protected readonly marcas = signal<readonly MarcaResponse[]>([]);
  protected readonly unidadesMedida = signal<readonly UnidadMedidaResponse[]>([]);
  protected readonly variantesPorProducto = signal<Readonly<Record<string, VariantesProductoState>>>({});
  protected readonly presentacionesPorProducto = signal<Readonly<Record<string, PresentacionesProductoState>>>({});
  protected readonly productoExpandidoId = signal<string | null>(null);
  protected readonly busqueda = signal('');

  protected readonly productoForm = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(200)]],
    precioVenta: [0, [Validators.required, Validators.min(0.01)]],
    codigoSku: ['', Validators.maxLength(80)],
    codigoBarras: ['', Validators.maxLength(80)],
    categoriaId: [''],
    marcaId: [''],
    costo: [null as number | null, Validators.min(0)],
  });

  protected readonly categoriaForm = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
  });

  protected readonly marcaForm = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
  });

  protected readonly varianteForm = this.formBuilder.nonNullable.group({
    talla: ['', Validators.maxLength(50)],
    color: ['', Validators.maxLength(80)],
    codigoSku: ['', [Validators.required, Validators.maxLength(80)]],
    codigoBarras: ['', Validators.maxLength(80)],
  });

  protected readonly presentacionForm = this.formBuilder.nonNullable.group({
    unidadMedidaId: ['', Validators.required],
    factorConversion: [1, [Validators.required, Validators.min(0.0001)]],
    esUnidadBase: [false],
    precioVenta: [0, [Validators.required, Validators.min(0.01)]],
    codigoBarras: ['', Validators.maxLength(80)],
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

  protected readonly categoriasActivas = computed(() =>
    this.categorias().filter((categoria) => categoria.activa),
  );

  protected readonly marcasActivas = computed(() =>
    this.marcas().filter((marca) => marca.activa),
  );

  protected readonly unidadesMedidaActivas = computed(() =>
    this.unidadesMedida().filter((unidad) => this.esUnidadMedidaActiva(unidad)),
  );

  ngOnInit(): void {
    this.cargarProductos();
  }

  protected cargarProductos(): void {
    this.estado.set('cargando');
    this.catalogoEstado.set('cargando');
    this.mensaje.set('');

    forkJoin({
      productos: this.productosApi.listarProductos(),
      unidadesMedida: this.productosApi.listarUnidadesMedida().pipe(
        catchError((error: unknown) => {
          this.catalogoEstado.set('error');
          this.mensaje.set(this.obtenerMensajeError(error, 'No se pudieron cargar las unidades de medida.'));
          return of<readonly UnidadMedidaResponse[]>([]);
        }),
      ),
      categorias: this.catalogoApi.listarCategorias().pipe(
        catchError((error: unknown) => {
          this.catalogoEstado.set('error');
          this.mensaje.set(this.obtenerMensajeError(error, 'No se pudieron cargar las categorías.'));
          return of<readonly CategoriaResponse[]>([]);
        }),
      ),
      marcas: this.catalogoApi.listarMarcas().pipe(
        catchError((error: unknown) => {
          this.catalogoEstado.set('error');
          this.mensaje.set(this.obtenerMensajeError(error, 'No se pudieron cargar las marcas.'));
          return of<readonly MarcaResponse[]>([]);
        }),
      ),
    }).subscribe({
      next: ({ productos, unidadesMedida, categorias, marcas }) => {
        this.productos.set(productos);
        this.unidadesMedida.set(unidadesMedida);
        this.categorias.set(categorias);
        this.marcas.set(marcas);
        this.estado.set('listo');
        if (this.catalogoEstado() !== 'error') {
          this.catalogoEstado.set('listo');
        }
      },
      error: (error: unknown) => {
        this.estado.set('error');
        this.catalogoEstado.set('error');
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudieron cargar productos, categorías y marcas.'));
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
          categoriaId: '',
          marcaId: '',
          costo: null,
        });
        this.productoExpandidoId.set(producto.id);
        this.variantesPorProducto.update((variantesPorProducto) => ({
          ...variantesPorProducto,
          [producto.id]: crearVariantesState(),
        }));
        this.presentacionesPorProducto.update((presentacionesPorProducto) => ({
          ...presentacionesPorProducto,
          [producto.id]: crearPresentacionesState(),
        }));
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

  protected crearCategoriaRapida(): void {
    this.categoriaForm.markAllAsTouched();

    if (this.categoriaForm.invalid) {
      this.mensaje.set('Indica un nombre válido para la categoría.');
      return;
    }

    const request: CrearCategoriaRequest = {
      nombre: this.categoriaForm.controls.nombre.value.trim(),
      categoriaPadreId: null,
    };

    this.catalogoEstado.set('guardando');
    this.mensaje.set('');

    this.catalogoApi.crearCategoria(request).subscribe({
      next: (categoria) => {
        this.categorias.update((categorias) => [categoria, ...categorias]);
        this.productoForm.patchValue({ categoriaId: categoria.id });
        this.categoriaForm.reset({ nombre: '' });
        this.catalogoEstado.set('listo');
        this.mensaje.set(`Categoría ${categoria.nombre} creada.`);
      },
      error: (error: unknown) => {
        this.catalogoEstado.set('listo');
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudo crear la categoría.'));
      },
    });
  }

  protected crearMarcaRapida(): void {
    this.marcaForm.markAllAsTouched();

    if (this.marcaForm.invalid) {
      this.mensaje.set('Indica un nombre válido para la marca.');
      return;
    }

    const request: CrearMarcaRequest = {
      nombre: this.marcaForm.controls.nombre.value.trim(),
    };

    this.catalogoEstado.set('guardando');
    this.mensaje.set('');

    this.catalogoApi.crearMarca(request).subscribe({
      next: (marca) => {
        this.marcas.update((marcas) => [marca, ...marcas]);
        this.productoForm.patchValue({ marcaId: marca.id });
        this.marcaForm.reset({ nombre: '' });
        this.catalogoEstado.set('listo');
        this.mensaje.set(`Marca ${marca.nombre} creada.`);
      },
      error: (error: unknown) => {
        this.catalogoEstado.set('listo');
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudo crear la marca.'));
      },
    });
  }

  protected alternarVariantes(producto: ProductoResponse): void {
    const estaExpandido = this.productoExpandidoId() === producto.id;

    this.productoExpandidoId.set(estaExpandido ? null : producto.id);

    if (!estaExpandido && this.obtenerVariantesState(producto.id).estado === 'sin-cargar') {
      this.cargarVariantes(producto.id);
    }

    if (!estaExpandido && this.obtenerPresentacionesState(producto.id).estado === 'sin-cargar') {
      this.cargarPresentaciones(producto.id);
    }
  }

  protected cargarVariantes(productoId: string): void {
    this.actualizarVariantesState(productoId, {
      estado: 'cargando',
      mensaje: '',
    });

    this.productosApi.listarVariantes(productoId).subscribe({
      next: (variantes) => {
        this.actualizarVariantesState(productoId, {
          estado: 'listo',
          variantes,
          mensaje: '',
        });
      },
      error: (error: unknown) => {
        this.actualizarVariantesState(productoId, {
          estado: 'error',
          mensaje: this.obtenerMensajeError(error, 'No se pudieron cargar las variantes.'),
        });
      },
    });
  }

  protected cargarPresentaciones(productoId: string): void {
    this.actualizarPresentacionesState(productoId, {
      estado: 'cargando',
      mensaje: '',
    });

    this.productosApi.listarPresentaciones(productoId).subscribe({
      next: (presentaciones) => {
        this.actualizarPresentacionesState(productoId, {
          estado: 'listo',
          presentaciones,
          mensaje: '',
        });
      },
      error: (error: unknown) => {
        this.actualizarPresentacionesState(productoId, {
          estado: 'error',
          mensaje: this.obtenerMensajeError(error, 'No se pudieron cargar las presentaciones.'),
        });
      },
    });
  }

  protected crearVariante(producto: ProductoResponse): void {
    this.varianteForm.markAllAsTouched();

    if (this.varianteForm.invalid) {
      this.mensaje.set('Revisa los datos de la variante antes de guardar.');
      return;
    }

    const request = this.construirCrearVarianteRequest(producto.id);
    this.actualizarVariantesState(producto.id, {
      estado: 'guardando',
      mensaje: '',
    });

    this.productosApi.crearVariante(producto.id, request).subscribe({
      next: (variante) => {
        this.actualizarVariantesState(producto.id, {
          estado: 'listo',
          variantes: [variante, ...this.obtenerVariantesState(producto.id).variantes],
          mensaje: `Variante ${variante.codigoSku || variante.id} creada.`,
        });
        this.varianteForm.reset({
          talla: '',
          color: '',
          codigoSku: '',
          codigoBarras: '',
        });
        this.mensaje.set(`Variante ${variante.codigoSku || variante.id} creada.`);
      },
      error: (error: unknown) => {
        const mensaje = this.obtenerMensajeError(error, 'No se pudo crear la variante.');
        this.actualizarVariantesState(producto.id, {
          estado: 'listo',
          mensaje,
        });
        this.mensaje.set(mensaje);
      },
    });
  }

  protected crearPresentacion(producto: ProductoResponse): void {
    this.presentacionForm.markAllAsTouched();

    if (this.presentacionForm.invalid) {
      this.mensaje.set('Revisa unidad, factor y precio de la presentación antes de guardar.');
      return;
    }

    const request = this.construirCrearPresentacionRequest();
    this.actualizarPresentacionesState(producto.id, {
      estado: 'guardando',
      mensaje: '',
    });

    this.productosApi.crearPresentacion(producto.id, request).subscribe({
      next: (presentacion) => {
        this.actualizarPresentacionesState(producto.id, {
          estado: 'listo',
          presentaciones: [presentacion, ...this.obtenerPresentacionesState(producto.id).presentaciones],
          mensaje: `Presentación ${presentacion.unidadCodigo} creada.`,
        });
        this.presentacionForm.reset({
          unidadMedidaId: '',
          factorConversion: 1,
          esUnidadBase: false,
          precioVenta: 0,
          codigoBarras: '',
        });
        this.mensaje.set(`Presentación ${presentacion.unidadCodigo} creada.`);
      },
      error: (error: unknown) => {
        const mensaje = this.obtenerMensajeError(error, 'No se pudo crear la presentación.');
        this.actualizarPresentacionesState(producto.id, {
          estado: 'listo',
          mensaje,
        });
        this.mensaje.set(mensaje);
      },
    });
  }

  protected activarVariante(productoId: string, varianteId: string): void {
    this.cambiarEstadoVariante(productoId, varianteId, true);
  }

  protected desactivarVariante(productoId: string, varianteId: string): void {
    this.cambiarEstadoVariante(productoId, varianteId, false);
  }

  protected obtenerVariantesState(productoId: string): VariantesProductoState {
    return this.variantesPorProducto()[productoId] ?? crearVariantesState();
  }

  protected obtenerPresentacionesState(productoId: string): PresentacionesProductoState {
    return this.presentacionesPorProducto()[productoId] ?? crearPresentacionesState();
  }

  protected estaGuardandoVariante(productoId: string): boolean {
    return this.obtenerVariantesState(productoId).estado === 'guardando';
  }

  protected estaGuardandoPresentacion(productoId: string): boolean {
    return this.obtenerPresentacionesState(productoId).estado === 'guardando';
  }

  protected obtenerTextoUnidadMedida(unidad: UnidadMedidaResponse): string {
    const abreviatura = unidad.abreviatura || unidad.codigo;
    return `${abreviatura} - ${unidad.nombre}`;
  }

  protected hayErrorUnidadesMedida(): boolean {
    return this.catalogoEstado() === 'error' && this.unidadesMedida().length === 0;
  }

  protected obtenerNombreCategoria(categoriaId: string | null | undefined): string {
    if (!categoriaId) {
      return 'Sin categoría';
    }

    return this.categorias().find((categoria) => categoria.id === categoriaId)?.nombre ?? 'Categoría no disponible';
  }

  protected obtenerNombreMarca(marcaId: string | null | undefined): string {
    if (!marcaId) {
      return 'Sin marca';
    }

    return this.marcas().find((marca) => marca.id === marcaId)?.nombre ?? 'Marca no disponible';
  }

  private construirCrearProductoRequest(): CrearProductoRequest {
    const form = this.productoForm.getRawValue();

    return {
      nombre: form.nombre.trim(),
      precioVenta: normalizarNumero(form.precioVenta),
      codigoSku: normalizarTextoNullable(form.codigoSku),
      codigoBarras: normalizarTextoNullable(form.codigoBarras),
      categoriaId: normalizarTextoNullable(form.categoriaId),
      marcaId: normalizarTextoNullable(form.marcaId),
      costo: form.costo === null ? null : normalizarNumero(form.costo),
      activo: true,
    };
  }

  private construirCrearVarianteRequest(productoId: string): CrearProductoVarianteRequest {
    const form = this.varianteForm.getRawValue();

    return {
      productoId,
      talla: normalizarTextoNullable(form.talla),
      color: normalizarTextoNullable(form.color),
      codigoSku: normalizarTextoNullable(form.codigoSku),
      codigoBarras: normalizarTextoNullable(form.codigoBarras),
      activo: true,
    };
  }

  private construirCrearPresentacionRequest(): CrearProductoPresentacionRequest {
    const form = this.presentacionForm.getRawValue();

    return {
      unidadMedidaId: form.unidadMedidaId,
      factorConversion: normalizarNumero(form.factorConversion),
      esUnidadBase: form.esUnidadBase,
      precioVenta: normalizarNumero(form.precioVenta),
      codigoBarras: normalizarTextoNullable(form.codigoBarras),
    };
  }

  private cambiarEstadoVariante(
    productoId: string,
    varianteId: string,
    activar: boolean,
  ): void {
    this.actualizarVariantesState(productoId, {
      estado: 'guardando',
      mensaje: '',
    });

    const request = activar
      ? this.productosApi.activarVariante(productoId, varianteId)
      : this.productosApi.desactivarVariante(productoId, varianteId);

    request.subscribe({
      next: (varianteActualizada) => {
        const state = this.obtenerVariantesState(productoId);
        this.actualizarVariantesState(productoId, {
          estado: 'listo',
          variantes: state.variantes.map((variante) =>
            variante.id === varianteActualizada.id ? varianteActualizada : variante,
          ),
          mensaje: activar ? 'Variante activada.' : 'Variante desactivada.',
        });
      },
      error: (error: unknown) => {
        this.actualizarVariantesState(productoId, {
          estado: 'listo',
          mensaje: this.obtenerMensajeError(error, 'No se pudo actualizar la variante.'),
        });
      },
    });
  }

  private actualizarVariantesState(
    productoId: string,
    patch: Partial<VariantesProductoState>,
  ): void {
    this.variantesPorProducto.update((variantesPorProducto) => {
      const actual = variantesPorProducto[productoId] ?? crearVariantesState();

      return {
        ...variantesPorProducto,
        [productoId]: {
          ...actual,
          ...patch,
        },
      };
    });
  }

  private actualizarPresentacionesState(
    productoId: string,
    patch: Partial<PresentacionesProductoState>,
  ): void {
    this.presentacionesPorProducto.update((presentacionesPorProducto) => {
      const actual = presentacionesPorProducto[productoId] ?? crearPresentacionesState();

      return {
        ...presentacionesPorProducto,
        [productoId]: {
          ...actual,
          ...patch,
        },
      };
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
        return 'No tienes permisos para operar productos.';
      }
    }

    return fallback;
  }

  private esUnidadMedidaActiva(unidad: UnidadMedidaResponse): boolean {
    return unidad.activo ?? unidad.activa ?? false;
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

function crearVariantesState(): VariantesProductoState {
  return {
    estado: 'sin-cargar',
    variantes: [],
    mensaje: '',
  };
}

function crearPresentacionesState(): PresentacionesProductoState {
  return {
    estado: 'sin-cargar',
    presentaciones: [],
    mensaje: '',
  };
}

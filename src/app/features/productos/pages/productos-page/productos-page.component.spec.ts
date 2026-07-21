import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

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
  CrearProductoVarianteRequest,
  ProductoResponse,
  ProductoVarianteResponse,
} from '../../models/producto.model';
import { ProductosPageComponent } from './productos-page.component';

describe('ProductosPageComponent', () => {
  let fixture: ComponentFixture<ProductosPageComponent>;
  let component: ProductosPageComponent;
  let productosApi: ProductosApiServiceFake;
  let catalogoApi: CatalogoApiServiceFake;

  beforeEach(async () => {
    productosApi = new ProductosApiServiceFake();
    catalogoApi = new CatalogoApiServiceFake();

    await TestBed.configureTestingModule({
      imports: [ProductosPageComponent],
      providers: [
        {
          provide: ProductosApiService,
          useValue: productosApi,
        },
        {
          provide: CatalogoApiService,
          useValue: catalogoApi,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductosPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads existing products', () => {
    expect(fixture.nativeElement.textContent).toContain('Polo demo');
  });

  it('loads categorias and marcas for product selection', () => {
    expect(catalogoApi.listarCategoriasCalls).toBe(1);
    expect(catalogoApi.listarMarcasCalls).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Polos');
    expect(fixture.nativeElement.textContent).toContain('Brooklyn');
  });

  it('creates a basic product and prepends it to the list', () => {
    component['productoForm'].patchValue({
      nombre: 'Casaca demo',
      precioVenta: 120.5,
      codigoSku: 'CAS-001',
      codigoBarras: '',
      categoriaId: 'categoria-1',
      marcaId: 'marca-1',
      costo: null,
    });

    component['crearProducto']();

    expect(productosApi.ultimoCrearProductoRequest).toEqual({
      nombre: 'Casaca demo',
      precioVenta: 120.5,
      codigoSku: 'CAS-001',
      codigoBarras: null,
      categoriaId: 'categoria-1',
      marcaId: 'marca-1',
      costo: null,
      activo: true,
    });
    expect(component['productos']()[0]?.nombre).toBe('Casaca demo');
    expect(component['mensaje']()).toBe('Producto Casaca demo creado.');
  });

  it('creates a product without categoria or marca when none is selected', () => {
    component['productoForm'].patchValue({
      nombre: 'Perfume demo',
      precioVenta: 89.9,
      codigoSku: 'PER-001',
      codigoBarras: '',
      categoriaId: '',
      marcaId: '',
      costo: null,
    });

    component['crearProducto']();

    expect(productosApi.ultimoCrearProductoRequest).toEqual(expect.objectContaining({
      categoriaId: null,
      marcaId: null,
    }));
  });

  it('keeps product creation available when catalog loading fails', async () => {
    catalogoApi.listarCategoriasError = new HttpErrorResponse({
      status: 500,
      error: {
        mensaje: 'No se pudo cargar el catálogo.',
      },
    });
    catalogoApi.listarMarcasError = new HttpErrorResponse({ status: 500 });
    fixture = TestBed.createComponent(ProductosPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    component['productoForm'].patchValue({
      nombre: 'Producto sin catálogo',
      precioVenta: 20,
      codigoSku: '',
      codigoBarras: '',
      categoriaId: '',
      marcaId: '',
      costo: null,
    });
    component['crearProducto']();

    expect(component['productos']().length).toBeGreaterThan(0);
    expect(productosApi.ultimoCrearProductoRequest).toEqual(expect.objectContaining({
      nombre: 'Producto sin catálogo',
      categoriaId: null,
      marcaId: null,
    }));
  });


  it('creates a quick categoria, refreshes the list and selects it', () => {
    component['categoriaForm'].patchValue({ nombre: 'Casacas' });

    component['crearCategoriaRapida']();

    expect(catalogoApi.ultimaCrearCategoriaRequest).toEqual({
      nombre: 'Casacas',
      categoriaPadreId: null,
    });
    expect(component['categorias']()[0]?.nombre).toBe('Casacas');
    expect(component['productoForm'].controls.categoriaId.value).toBe('categoria-2');
    expect(component['mensaje']()).toBe('Categoría Casacas creada.');
  });

  it('creates a quick marca, refreshes the list and selects it', () => {
    component['marcaForm'].patchValue({ nombre: 'Capital' });

    component['crearMarcaRapida']();

    expect(catalogoApi.ultimaCrearMarcaRequest).toEqual({
      nombre: 'Capital',
    });
    expect(component['marcas']()[0]?.nombre).toBe('Capital');
    expect(component['productoForm'].controls.marcaId.value).toBe('marca-2');
    expect(component['mensaje']()).toBe('Marca Capital creada.');
  });

  it('shows backend errors while creating categorias or marcas', () => {
    catalogoApi.crearCategoriaError = new HttpErrorResponse({
      status: 400,
      error: {
        mensaje: 'Ya existe una categoría con ese nombre.',
      },
    });
    component['categoriaForm'].patchValue({ nombre: 'Polos' });

    component['crearCategoriaRapida']();

    expect(component['mensaje']()).toBe('Ya existe una categoría con ese nombre.');

    catalogoApi.crearMarcaError = new HttpErrorResponse({
      status: 400,
      error: {
        mensaje: 'Ya existe una marca con ese nombre.',
      },
    });
    component['marcaForm'].patchValue({ nombre: 'Brooklyn' });

    component['crearMarcaRapida']();

    expect(component['mensaje']()).toBe('Ya existe una marca con ese nombre.');
  });

  it('shows product variants when a product is expanded', () => {
    component['alternarVariantes'](productosApi.productos[0]);
    fixture.detectChanges();

    expect(productosApi.ultimoListarVariantesProductoId).toBe('producto-1');
    expect(fixture.nativeElement.textContent).toContain('POL-BRO-NEG-S');
    expect(fixture.nativeElement.textContent).toContain('Negro');
  });

  it('creates a product variant', () => {
    component['alternarVariantes'](productosApi.productos[0]);
    component['varianteForm'].patchValue({
      talla: 'M',
      color: 'Negro',
      codigoSku: 'POL-BRO-NEG-M',
      codigoBarras: '775000000002',
    });

    component['crearVariante'](productosApi.productos[0]);

    expect(productosApi.ultimoCrearVarianteProductoId).toBe('producto-1');
    expect(productosApi.ultimoCrearVarianteRequest).toEqual({
      productoId: 'producto-1',
      talla: 'M',
      color: 'Negro',
      codigoSku: 'POL-BRO-NEG-M',
      codigoBarras: '775000000002',
      activo: true,
    });
    expect(component['obtenerVariantesState']('producto-1').variantes[0]?.codigoSku).toBe('POL-BRO-NEG-M');
  });

  it('shows backend errors while creating variants', () => {
    component['alternarVariantes'](productosApi.productos[0]);
    productosApi.crearVarianteError = new HttpErrorResponse({
      status: 400,
      error: {
        mensaje: 'Ya existe una variante con el mismo SKU en la empresa activa.',
      },
    });
    component['varianteForm'].patchValue({
      codigoSku: 'POL-BRO-NEG-S',
    });

    component['crearVariante'](productosApi.productos[0]);

    expect(component['mensaje']()).toBe('Ya existe una variante con el mismo SKU en la empresa activa.');
  });

  it('activates and deactivates product variants', () => {
    component['alternarVariantes'](productosApi.productos[0]);

    component['desactivarVariante']('producto-1', 'variante-1');

    expect(productosApi.ultimoDesactivar).toEqual({
      productoId: 'producto-1',
      varianteId: 'variante-1',
    });
    expect(component['obtenerVariantesState']('producto-1').variantes[0]?.activo).toBe(false);

    component['activarVariante']('producto-1', 'variante-1');

    expect(productosApi.ultimoActivar).toEqual({
      productoId: 'producto-1',
      varianteId: 'variante-1',
    });
    expect(component['obtenerVariantesState']('producto-1').variantes[0]?.activo).toBe(true);
  });
});

class CatalogoApiServiceFake {
  listarCategoriasCalls = 0;
  listarMarcasCalls = 0;
  ultimaCrearCategoriaRequest: CrearCategoriaRequest | null = null;
  ultimaCrearMarcaRequest: CrearMarcaRequest | null = null;
  crearCategoriaError: HttpErrorResponse | null = null;
  crearMarcaError: HttpErrorResponse | null = null;
  listarCategoriasError: HttpErrorResponse | null = null;
  listarMarcasError: HttpErrorResponse | null = null;
  categorias: readonly CategoriaResponse[] = [crearCategoriaResponse()];
  marcas: readonly MarcaResponse[] = [crearMarcaResponse()];

  listarCategorias() {
    this.listarCategoriasCalls += 1;
    if (this.listarCategoriasError) {
      return throwError(() => this.listarCategoriasError);
    }
    return of(this.categorias);
  }

  crearCategoria(request: CrearCategoriaRequest) {
    this.ultimaCrearCategoriaRequest = request;

    if (this.crearCategoriaError) {
      return throwError(() => this.crearCategoriaError);
    }

    return of(crearCategoriaResponse({ id: 'categoria-2', nombre: request.nombre }));
  }

  listarMarcas() {
    this.listarMarcasCalls += 1;
    if (this.listarMarcasError) {
      return throwError(() => this.listarMarcasError);
    }
    return of(this.marcas);
  }

  crearMarca(request: CrearMarcaRequest) {
    this.ultimaCrearMarcaRequest = request;

    if (this.crearMarcaError) {
      return throwError(() => this.crearMarcaError);
    }

    return of(crearMarcaResponse({ id: 'marca-2', nombre: request.nombre }));
  }
}

class ProductosApiServiceFake {
  ultimoCrearProductoRequest: CrearProductoRequest | null = null;
  ultimoListarVariantesProductoId: string | null = null;
  ultimoCrearVarianteProductoId: string | null = null;
  ultimoCrearVarianteRequest: CrearProductoVarianteRequest | null = null;
  ultimoActivar: { productoId: string; varianteId: string } | null = null;
  ultimoDesactivar: { productoId: string; varianteId: string } | null = null;
  crearVarianteError: HttpErrorResponse | null = null;
  productos: readonly ProductoResponse[] = [
    {
      id: 'producto-1',
      empresaId: 'empresa-1',
      nombre: 'Polo demo',
      codigoSku: 'POLO-001',
      codigoBarras: '',
      categoriaId: 'categoria-1',
      marcaId: 'marca-1',
      precioVenta: 59.9,
      costo: 25,
      activo: true,
      fechaCreacion: '2026-07-11T00:00:00Z',
    },
  ];
  variantes: readonly ProductoVarianteResponse[] = [
    crearVarianteResponse(),
  ];

  listarProductos() {
    return of(this.productos);
  }

  crearProducto(request: CrearProductoRequest) {
    this.ultimoCrearProductoRequest = request;

    return of<ProductoResponse>({
      id: 'producto-2',
      empresaId: 'empresa-1',
      nombre: request.nombre,
      codigoSku: request.codigoSku ?? '',
      codigoBarras: request.codigoBarras ?? '',
      categoriaId: request.categoriaId ?? null,
      marcaId: request.marcaId ?? null,
      precioVenta: request.precioVenta,
      costo: request.costo,
      activo: true,
      fechaCreacion: '2026-07-11T00:00:00Z',
    });
  }

  listarVariantes(productoId: string) {
    this.ultimoListarVariantesProductoId = productoId;
    return of(this.variantes);
  }

  crearVariante(productoId: string, request: CrearProductoVarianteRequest) {
    this.ultimoCrearVarianteProductoId = productoId;
    this.ultimoCrearVarianteRequest = request;

    if (this.crearVarianteError) {
      return throwError(() => this.crearVarianteError);
    }

    return of<ProductoVarianteResponse>({
      id: 'variante-2',
      empresaId: 'empresa-1',
      productoId,
      talla: request.talla ?? '',
      color: request.color ?? '',
      codigoSku: request.codigoSku ?? '',
      codigoBarras: request.codigoBarras ?? '',
      activo: true,
      fechaCreacion: '2026-07-15T00:00:00Z',
    });
  }

  activarVariante(productoId: string, varianteId: string) {
    this.ultimoActivar = { productoId, varianteId };
    return of(crearVarianteResponse({ activo: true }));
  }

  desactivarVariante(productoId: string, varianteId: string) {
    this.ultimoDesactivar = { productoId, varianteId };
    return of(crearVarianteResponse({ activo: false }));
  }
}

function crearVarianteResponse(
  overrides: Partial<ProductoVarianteResponse> = {},
): ProductoVarianteResponse {
  return {
    id: 'variante-1',
    empresaId: 'empresa-1',
    productoId: 'producto-1',
    talla: 'S',
    color: 'Negro',
    codigoSku: 'POL-BRO-NEG-S',
    codigoBarras: '775000000001',
    activo: true,
    fechaCreacion: '2026-07-15T00:00:00Z',
    ...overrides,
  };
}

function crearCategoriaResponse(overrides: Partial<CategoriaResponse> = {}): CategoriaResponse {
  return {
    id: 'categoria-1',
    empresaId: 'empresa-1',
    categoriaPadreId: null,
    nombre: 'Polos',
    activa: true,
    fechaCreacion: '2026-07-20T10:00:00Z',
    ...overrides,
  };
}

function crearMarcaResponse(overrides: Partial<MarcaResponse> = {}): MarcaResponse {
  return {
    id: 'marca-1',
    empresaId: 'empresa-1',
    nombre: 'Brooklyn',
    activa: true,
    fechaCreacion: '2026-07-20T10:00:00Z',
    ...overrides,
  };
}

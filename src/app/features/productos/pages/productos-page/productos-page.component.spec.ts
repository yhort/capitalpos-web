import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

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

  beforeEach(async () => {
    productosApi = new ProductosApiServiceFake();

    await TestBed.configureTestingModule({
      imports: [ProductosPageComponent],
      providers: [
        {
          provide: ProductosApiService,
          useValue: productosApi,
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

  it('creates a basic product and prepends it to the list', () => {
    component['productoForm'].patchValue({
      nombre: 'Casaca demo',
      precioVenta: 120.5,
      codigoSku: 'CAS-001',
      codigoBarras: '',
      costo: null,
    });

    component['crearProducto']();

    expect(productosApi.ultimoCrearProductoRequest).toEqual({
      nombre: 'Casaca demo',
      precioVenta: 120.5,
      codigoSku: 'CAS-001',
      codigoBarras: null,
      costo: null,
      activo: true,
    });
    expect(component['productos']()[0]?.nombre).toBe('Casaca demo');
    expect(component['mensaje']()).toBe('Producto Casaca demo creado.');
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

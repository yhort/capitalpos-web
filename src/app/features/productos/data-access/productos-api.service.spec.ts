import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CrearProductoRequest, CrearProductoVarianteRequest } from '../models/producto.model';
import { ProductosApiService } from './productos-api.service';

describe('ProductosApiService', () => {
  let service: ProductosApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProductosApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ProductosApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('loads products through capitalpos-api', () => {
    service.listarProductos().subscribe((productos) => {
      expect(productos).toEqual([]);
    });

    const request = httpTestingController.expectOne('/api/productos/');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('creates products through capitalpos-api', () => {
    const productoRequest: CrearProductoRequest = {
      nombre: 'Polo',
      precioVenta: 59.9,
      codigoSku: 'POLO-001',
      codigoBarras: null,
      costo: 25,
      activo: true,
    };

    service.crearProducto(productoRequest).subscribe((producto) => {
      expect(producto.nombre).toBe('Polo');
    });

    const request = httpTestingController.expectOne('/api/productos/');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(productoRequest);
    request.flush({
      id: 'producto-1',
      empresaId: 'empresa-1',
      nombre: 'Polo',
      codigoSku: 'POLO-001',
      codigoBarras: '',
      precioVenta: 59.9,
      costo: 25,
      activo: true,
      fechaCreacion: '2026-07-11T00:00:00Z',
    });
  });

  it('lists product variants through capitalpos-api', () => {
    service.listarVariantes('producto-1').subscribe((variantes) => {
      expect(variantes[0]?.codigoSku).toBe('POL-BRO-NEG-S');
    });

    const request = httpTestingController.expectOne('/api/productos/producto-1/variantes');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('X-API-KEY')).toBe(false);
    request.flush([crearVarianteResponse()]);
  });

  it('creates product variants through capitalpos-api', () => {
    const varianteRequest: CrearProductoVarianteRequest = {
      productoId: 'producto-1',
      talla: 'S',
      color: 'Negro',
      codigoSku: 'POL-BRO-NEG-S',
      codigoBarras: '775000000001',
      activo: true,
    };

    service.crearVariante('producto-1', varianteRequest).subscribe((variante) => {
      expect(variante.codigoSku).toBe('POL-BRO-NEG-S');
    });

    const request = httpTestingController.expectOne('/api/productos/producto-1/variantes');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(varianteRequest);
    expect(request.request.headers.has('X-API-KEY')).toBe(false);
    request.flush(crearVarianteResponse());
  });

  it('activates and deactivates product variants through capitalpos-api', () => {
    service.activarVariante('producto-1', 'variante-1').subscribe((variante) => {
      expect(variante.activo).toBe(true);
    });
    service.desactivarVariante('producto-1', 'variante-1').subscribe((variante) => {
      expect(variante.activo).toBe(false);
    });

    const activarRequest = httpTestingController.expectOne('/api/productos/producto-1/variantes/variante-1/activar');
    expect(activarRequest.request.method).toBe('PATCH');
    expect(activarRequest.request.headers.has('X-API-KEY')).toBe(false);
    activarRequest.flush(crearVarianteResponse({ activo: true }));

    const desactivarRequest = httpTestingController.expectOne('/api/productos/producto-1/variantes/variante-1/desactivar');
    expect(desactivarRequest.request.method).toBe('PATCH');
    expect(desactivarRequest.request.headers.has('X-API-KEY')).toBe(false);
    desactivarRequest.flush(crearVarianteResponse({ activo: false }));
  });
});

function crearVarianteResponse(overrides = {}) {
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

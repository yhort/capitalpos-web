import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CrearProductoRequest } from '../models/producto.model';
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
});

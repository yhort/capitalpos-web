import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AjustarStockProductoRequest, StockProductoResponse } from '../models/stock.model';
import { StockApiService } from './stock-api.service';

describe('StockApiService', () => {
  let service: StockApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StockApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(StockApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('loads product stock through /api/stock', () => {
    service.obtenerStockProducto('producto-1').subscribe((stock) => {
      expect(stock.stockLibre).toBe(8);
    });

    const request = httpTestingController.expectOne('/api/stock/productos/producto-1');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('X-API-KEY')).toBe(false);
    request.flush(crearStockResponse());
  });

  it('loads variant stock through /api/stock', () => {
    service.obtenerStockProductoVariante('producto-1', 'variante-1').subscribe((stock) => {
      expect(stock.productoVarianteId).toBe('variante-1');
    });

    const request = httpTestingController.expectOne('/api/stock/productos/producto-1/variantes/variante-1');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('X-API-KEY')).toBe(false);
    request.flush(crearStockResponse({ productoVarianteId: 'variante-1' }));
  });

  it('adjusts product stock through /api/stock/ajustar without X-API-KEY', () => {
    const ajustarRequest: AjustarStockProductoRequest = {
      productoId: 'producto-1',
      productoVarianteId: null,
      cantidadDisponible: 15,
    };

    service.ajustarStock(ajustarRequest).subscribe((stock) => {
      expect(stock.cantidadDisponible).toBe(15);
    });

    const request = httpTestingController.expectOne('/api/stock/ajustar');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(ajustarRequest);
    expect(request.request.headers.has('X-API-KEY')).toBe(false);
    request.flush(crearStockResponse({ cantidadDisponible: 15, stockLibre: 13 }));
  });
});

function crearStockResponse(overrides: Partial<StockProductoResponse> = {}): StockProductoResponse {
  return {
    ...crearStockBase(),
    ...overrides,
  };
}

function crearStockBase(): StockProductoResponse {
  return {
    empresaId: 'empresa-1',
    productoId: 'producto-1',
    productoVarianteId: null,
    cantidadDisponible: 10,
    cantidadReservada: 2,
    stockLibre: 8,
    fechaActualizacion: '2026-07-14T10:00:00Z',
  };
}

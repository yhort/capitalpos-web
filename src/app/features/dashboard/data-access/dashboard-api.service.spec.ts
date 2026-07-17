import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DashboardApiService } from './dashboard-api.service';

describe('DashboardApiService', () => {
  let service: DashboardApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DashboardApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(DashboardApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('loads the commercial dashboard through capitalpos-api', () => {
    service.obtenerDashboardComercial().subscribe((response) => {
      expect(response.fecha).toBe('2026-07-17');
      expect(response.resumen.canalLider?.canalVenta).toBe('TIENDA');
      expect(response.topProductos[0]?.producto).toBe('Polo básico');
      expect(response.stockBajo[0]?.stockLibre).toBe(4);
    });

    const request = httpTestingController.expectOne('/api/dashboard/comercial');

    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('X-API-KEY')).toBe(false);
    request.flush({
      fecha: '2026-07-17',
      ultimaActualizacion: '2026-07-17T15:42:10-05:00',
      resumen: {
        importeTotalVendido: 1250.5,
        cantidadOperaciones: 12,
        unidadesVendidas: 38,
        canalLider: {
          canalVenta: 'TIENDA',
          importeVendido: 800,
        },
      },
      topProductos: [
        {
          productoId: '00000000-0000-0000-0000-000000000000',
          productoVarianteId: null,
          producto: 'Polo básico',
          talla: null,
          color: null,
          codigoSku: 'POLO-001',
          codigoBarras: null,
          unidades: 10,
          importeVendido: 350,
        },
      ],
      stockBajo: [
        {
          productoId: '00000000-0000-0000-0000-000000000000',
          productoVarianteId: '00000000-0000-0000-0000-000000000001',
          producto: 'Polo básico',
          talla: 'M',
          color: 'Negro',
          codigoSku: 'POLO-M-NEGRO',
          codigoBarras: null,
          cantidadDisponible: 4,
          cantidadReservada: 0,
          stockLibre: 4,
        },
      ],
    });
  });

  it('propagates HTTP errors', () => {
    let status = 0;

    service.obtenerDashboardComercial().subscribe({
      error: (error: unknown) => {
        status = typeof error === 'object' && error !== null && 'status' in error
          ? Number(error.status)
          : 0;
      },
    });

    const request = httpTestingController.expectOne('/api/dashboard/comercial');

    request.flush({ mensaje: 'No autorizado.' }, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
  });
});

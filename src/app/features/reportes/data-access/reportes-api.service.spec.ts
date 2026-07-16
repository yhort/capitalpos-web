import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ReportesApiService } from './reportes-api.service';

describe('ReportesApiService', () => {
  let service: ReportesApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ReportesApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ReportesApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('loads sales by channel report through capitalpos-api', () => {
    service.obtenerVentasPorCanal('2026-05-01', '2026-05-31').subscribe((response) => {
      expect(response.items[0]?.canalVenta).toBe('TIENDA');
    });

    const request = httpTestingController.expectOne((item) =>
      item.url === '/api/reportes/ventas-por-canal' &&
      item.params.get('desde') === '2026-05-01' &&
      item.params.get('hasta') === '2026-05-31',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('X-API-KEY')).toBe(false);
    request.flush({
      desde: '2026-05-01',
      hasta: '2026-05-31',
      items: [
        {
          canalVenta: 'TIENDA',
          cantidadVentas: 120,
          unidades: 7583,
          soles: 424959.36,
          precioPromedio: 56.04,
        },
      ],
      totalGeneral: {
        cantidadVentas: 120,
        unidades: 7583,
        soles: 424959.36,
        precioPromedio: 56.04,
      },
    });
  });
});

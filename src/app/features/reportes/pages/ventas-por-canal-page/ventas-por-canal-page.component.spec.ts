import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ReportesApiService } from '../../data-access/reportes-api.service';
import { ReporteVentasPorCanalResponse } from '../../models/reporte-ventas-por-canal.model';
import {
  formatearSoles,
  obtenerFechaActualLima,
  obtenerPrimerDiaMesActualLima,
  VentasPorCanalPageComponent,
} from './ventas-por-canal-page.component';

describe('VentasPorCanalPageComponent', () => {
  let fixture: ComponentFixture<VentasPorCanalPageComponent>;
  let component: VentasPorCanalPageComponent;
  let reportesApi: ReportesApiServiceFake;

  beforeEach(async () => {
    reportesApi = new ReportesApiServiceFake();

    await TestBed.configureTestingModule({
      imports: [VentasPorCanalPageComponent],
      providers: [
        {
          provide: ReportesApiService,
          useValue: reportesApi,
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function crearComponente(): Promise<void> {
    fixture = TestBed.createComponent(VentasPorCanalPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('loads with default dates for current Lima month', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T15:30:00.000Z'));

    await crearComponente();

    expect(component['filtrosForm'].getRawValue()).toEqual({
      desde: '2026-05-01',
      hasta: '2026-05-18',
    });
    expect(reportesApi.ultimaConsulta).toEqual({
      desde: '2026-05-01',
      hasta: '2026-05-18',
    });
  });

  it('calculates default dates with Lima timezone', () => {
    const fechaUtcDiaSiguiente = new Date('2026-07-13T02:30:00.000Z');

    expect(obtenerFechaActualLima(fechaUtcDiaSiguiente)).toBe('2026-07-12');
    expect(obtenerPrimerDiaMesActualLima(fechaUtcDiaSiguiente)).toBe('2026-07-01');
  });

  it('calls the service when Consultar is clicked', async () => {
    await crearComponente();

    component['filtrosForm'].patchValue({
      desde: '2026-05-01',
      hasta: '2026-05-31',
    });
    const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(reportesApi.consultas).toEqual([
      { desde: expect.any(String), hasta: expect.any(String) },
      { desde: '2026-05-01', hasta: '2026-05-31' },
    ]);
  });

  it('shows total summary and channel table', async () => {
    await crearComponente();

    const textContent = fixture.nativeElement.textContent;

    expect(textContent).toContain('Cantidad de ventas');
    expect(textContent).toContain('250');
    expect(textContent).toContain('14,214');
    expect(textContent).toContain('S/ 769,490.36');
    expect(textContent).toContain('S/ 54.14');
    expect(textContent).toContain('TIENDA');
    expect(textContent).toContain('MARKETING');
  });

  it('formats soles as Peruvian currency', () => {
    expect(formatearSoles(1250)).toBe('S/ 1,250.00');
  });

  it('shows loading state while the report is pending', () => {
    const pendiente = new Subject<ReporteVentasPorCanalResponse>();
    reportesApi.response = pendiente.asObservable();

    fixture = TestBed.createComponent(VentasPorCanalPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component['estado']()).toBe('cargando');
    expect(fixture.nativeElement.textContent).toContain('Cargando reporte comercial...');
    pendiente.complete();
  });

  it('shows backend errors', async () => {
    reportesApi.response = throwError(() =>
      new HttpErrorResponse({
        status: 400,
        error: {
          mensaje: 'El rango de fechas es invalido.',
        },
      }),
    );

    await crearComponente();

    expect(component['estado']()).toBe('error');
    expect(fixture.nativeElement.textContent).toContain('El rango de fechas es invalido.');
  });

  it('shows permission errors clearly', async () => {
    reportesApi.response = throwError(() => new HttpErrorResponse({ status: 403 }));

    await crearComponente();

    expect(fixture.nativeElement.textContent).toContain('No tienes permisos suficientes para consultar reportes.');
  });

  it('shows empty state when there are no items', async () => {
    reportesApi.response = of(crearReporteResponse({ items: [] }));

    await crearComponente();

    expect(component['estado']()).toBe('sin-datos');
    expect(fixture.nativeElement.textContent).toContain('Sin datos para el rango seleccionado.');
  });
});

class ReportesApiServiceFake {
  consultas: { readonly desde: string; readonly hasta: string }[] = [];
  response: Observable<ReporteVentasPorCanalResponse> = of(crearReporteResponse());

  get ultimaConsulta() {
    return this.consultas.at(-1) ?? null;
  }

  obtenerVentasPorCanal(desde: string, hasta: string) {
    this.consultas.push({ desde, hasta });
    return this.response;
  }
}

function crearReporteResponse(
  overrides: Partial<ReporteVentasPorCanalResponse> = {},
): ReporteVentasPorCanalResponse {
  return {
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
      {
        canalVenta: 'MARKETING',
        cantidadVentas: 130,
        unidades: 6631,
        soles: 344531,
        precioPromedio: 51.96,
      },
    ],
    totalGeneral: {
      cantidadVentas: 250,
      unidades: 14214,
      soles: 769490.36,
      precioPromedio: 54.14,
    },
    ...overrides,
  };
}

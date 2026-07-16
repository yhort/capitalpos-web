import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ReportesApiService } from '../../data-access/reportes-api.service';
import { ReporteVentasPorCanalResponse } from '../../models/reporte-ventas-por-canal.model';
import {
  calcularParticipacionPorCanal,
  formatearSoles,
  obtenerCanalLiderPorSoles,
  obtenerCanalMayorPrecioPromedio,
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

  it('shows channel distribution section with one bar per channel', async () => {
    await crearComponente();

    const textContent = fixture.nativeElement.textContent;
    const bars = fixture.nativeElement.querySelectorAll('.distribution-row__bar span') as NodeListOf<HTMLElement>;

    expect(textContent).toContain('Distribución por canal');
    expect(bars.length).toBe(2);
  });

  it('calculates channel participation percentage correctly', async () => {
    await crearComponente();

    const textContent = fixture.nativeElement.textContent;
    const bars = fixture.nativeElement.querySelectorAll('.distribution-row__bar span') as NodeListOf<HTMLElement>;

    expect(calcularParticipacionPorCanal(crearReporteResponse().items[0]!, 769490.36)).toBe(55.2);
    expect(textContent).toContain('55.2%');
    expect(bars[0]?.style.width).toBe('55.2%');
  });

  it('does not divide by zero when total soles is zero', async () => {
    reportesApi.response = of(crearReporteResponse({
      items: [
        {
          canalVenta: 'TIENDA',
          cantidadVentas: 0,
          unidades: 0,
          soles: 0,
          precioPromedio: 0,
        },
      ],
      totalGeneral: {
        cantidadVentas: 0,
        unidades: 0,
        soles: 0,
        precioPromedio: 0,
      },
    }));

    await crearComponente();

    const textContent = fixture.nativeElement.textContent;
    const bar = fixture.nativeElement.querySelector('.distribution-row__bar span') as HTMLElement;

    expect(textContent).toContain('Aún no hay ventas para graficar en este rango.');
    expect(textContent).toContain('0.0%');
    expect(bar.style.width).toBe('0%');
  });

  it('shows management summary metrics', async () => {
    await crearComponente();

    const textContent = fixture.nativeElement.textContent;
    const items = crearReporteResponse().items;

    expect(obtenerCanalLiderPorSoles(items)?.canalVenta).toBe('TIENDA');
    expect(obtenerCanalMayorPrecioPromedio(items)?.canalVenta).toBe('TIENDA');
    expect(textContent).toContain('Canal líder por soles');
    expect(textContent).toContain('Mayor precio promedio');
    expect(textContent).toContain('Canales con ventas');
    expect(textContent).toContain('TIENDA');
    expect(textContent).toContain('2');
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

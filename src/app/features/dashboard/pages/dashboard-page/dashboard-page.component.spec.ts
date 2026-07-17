import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';

import { DashboardApiService } from '../../data-access/dashboard-api.service';
import { DashboardComercialResponse } from '../../models/dashboard-comercial.model';
import {
  calcularBarraTopProducto,
  DashboardPageComponent,
  describirVariante,
  formatearFechaDashboard,
  formatearSoles,
} from './dashboard-page.component';

describe('DashboardPageComponent', () => {
  let fixture: ComponentFixture<DashboardPageComponent>;
  let component: DashboardPageComponent;
  let dashboardApi: DashboardApiServiceFake;

  beforeEach(async () => {
    dashboardApi = new DashboardApiServiceFake();

    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: DashboardApiService,
          useValue: dashboardApi,
        },
      ],
    }).compileComponents();
  });

  async function crearComponente(): Promise<void> {
    fixture = TestBed.createComponent(DashboardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('should create and load on init', async () => {
    await crearComponente();

    expect(component).toBeTruthy();
    expect(dashboardApi.consultas).toBe(1);
  });

  it('shows loading state while the dashboard is pending', () => {
    const pendiente = new Subject<DashboardComercialResponse>();
    dashboardApi.response = pendiente.asObservable();

    fixture = TestBed.createComponent(DashboardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component['estado']()).toBe('cargando');
    expect(fixture.nativeElement.textContent).toContain('Cargando dashboard comercial...');
    pendiente.complete();
  });

  it('renders the four summary cards and leading channel', async () => {
    await crearComponente();

    const textContent = fixture.nativeElement.textContent;

    expect(textContent).toContain('Ventas de hoy');
    expect(textContent).toContain('S/ 1,250.50');
    expect(textContent).toContain('Operaciones');
    expect(textContent).toContain('12');
    expect(textContent).toContain('Unidades vendidas');
    expect(textContent).toContain('38');
    expect(textContent).toContain('Canal líder');
    expect(textContent).toContain('TIENDA');
    expect(textContent).toContain('S/ 800.00');
  });

  it('shows Sin ventas when leading channel is null', async () => {
    dashboardApi.response = of(crearDashboardResponse({
      resumen: {
        importeTotalVendido: 0,
        cantidadOperaciones: 0,
        unidadesVendidas: 0,
        canalLider: null,
      },
    }));

    await crearComponente();

    expect(component['estado']()).toBe('sin-ventas');
    expect(fixture.nativeElement.textContent).toContain('Sin ventas');
    expect(fixture.nativeElement.textContent).toContain('Aún no hay ventas registradas para hoy.');
  });

  it('renders top products with variants and tolerates nullable optional values', async () => {
    await crearComponente();

    const textContent = fixture.nativeElement.textContent;

    expect(textContent).toContain('Top 5 productos');
    expect(textContent).toContain('Polo básico');
    expect(textContent).toContain('Negro / M');
    expect(textContent).toContain('SKU POLO-M-NEGRO');
    expect(textContent).toContain('10 unidades');
    expect(textContent).toContain('S/ 350.00');
    expect(describirVariante({ color: null, talla: null })).toBe('Sin variante');
  });

  it('calculates top product visual bars safely', async () => {
    await crearComponente();

    const bars = fixture.nativeElement.querySelectorAll('.top-product__bar span') as NodeListOf<HTMLElement>;
    const productos = crearDashboardResponse().topProductos;

    expect(calcularBarraTopProducto(productos[0]!, productos)).toBe(100);
    expect(calcularBarraTopProducto(productos[1]!, productos)).toBe(50);
    expect(bars[0]?.style.width).toBe('100%');
    expect(bars[1]?.style.width).toBe('50%');
    expect(calcularBarraTopProducto({ ...productos[0]!, unidades: 0 }, [{ ...productos[0]!, unidades: 0 }])).toBe(0);
  });

  it('protects visual bars from non-finite and invalid numeric values', () => {
    const [producto] = crearDashboardResponse().topProductos;
    const base = producto!;

    expect(calcularBarraTopProducto({ ...base, unidades: Number.NaN }, [base])).toBe(0);
    expect(calcularBarraTopProducto({ ...base, unidades: Number.POSITIVE_INFINITY }, [base])).toBe(0);
    expect(calcularBarraTopProducto({ ...base, unidades: -3 }, [base])).toBe(0);
    expect(calcularBarraTopProducto(base, [{ ...base, unidades: Number.NaN }])).toBe(0);
    expect(calcularBarraTopProducto(base, [{ ...base, unidades: Number.POSITIVE_INFINITY }])).toBe(0);
    expect(calcularBarraTopProducto(base, [{ ...base, unidades: -1 }])).toBe(0);
    expect(calcularBarraTopProducto({ ...base, unidades: 20 }, [{ ...base, unidades: 10 }])).toBe(100);
    expect(calcularBarraTopProducto({ ...base, unidades: 4 }, [{ ...base, unidades: 8 }])).toBe(50);
  });

  it('shows message when top products is empty', async () => {
    dashboardApi.response = of(crearDashboardResponse({ topProductos: [] }));

    await crearComponente();

    expect(fixture.nativeElement.textContent).toContain('Aún no hay productos vendidos para mostrar hoy.');
  });

  it('renders low stock items', async () => {
    await crearComponente();

    const textContent = fixture.nativeElement.textContent;

    expect(textContent).toContain('Stock bajo');
    expect(textContent).toContain('Casaca Brooklyn');
    expect(textContent).toContain('Azul / L');
    expect(textContent).toContain('SKU CAS-BRO-AZU-L');
    expect(textContent).toContain('stock libre');
    expect(textContent).toContain('Disponible 4');
    expect(textContent).toContain('Reservado 0');
  });

  it('shows message when low stock is empty', async () => {
    dashboardApi.response = of(crearDashboardResponse({ stockBajo: [] }));

    await crearComponente();

    expect(fixture.nativeElement.textContent).toContain('No hay alertas de stock bajo.');
  });

  it('shows backend errors', async () => {
    dashboardApi.response = throwError(() =>
      new HttpErrorResponse({
        status: 403,
        error: { mensaje: 'No tienes permiso para ver dashboard.' },
      }),
    );

    await crearComponente();

    expect(component['estado']()).toBe('error');
    expect(fixture.nativeElement.textContent).toContain('No tienes permiso para ver dashboard.');
  });

  it('keeps previous data when a refresh fails and updates it on the next successful retry', async () => {
    const segundaPeticion = new Subject<DashboardComercialResponse>();
    const terceraPeticion = new Subject<DashboardComercialResponse>();
    dashboardApi.responses = [
      of(crearDashboardResponse()),
      segundaPeticion.asObservable(),
      terceraPeticion.asObservable(),
    ];

    await crearComponente();

    expect(fixture.nativeElement.textContent).toContain('Polo básico');

    component['cargarDashboard']();
    fixture.detectChanges();
    segundaPeticion.error(new HttpErrorResponse({
      status: 500,
      error: { mensaje: 'No se pudo actualizar el dashboard.' },
    }));
    fixture.detectChanges();

    expect(component['estado']()).toBe('error');
    expect(fixture.nativeElement.textContent).toContain('Polo básico');
    expect(fixture.nativeElement.textContent).toContain('No se pudo actualizar el dashboard.');

    component['cargarDashboard']();
    fixture.detectChanges();

    expect(component['estado']()).toBe('cargando');
    expect(component['mensaje']()).toBe('');
    terceraPeticion.next(crearDashboardResponse({
      resumen: {
        importeTotalVendido: 2200,
        cantidadOperaciones: 20,
        unidadesVendidas: 44,
        canalLider: {
          canalVenta: 'MARKETING',
          importeVendido: 1200,
        },
      },
      topProductos: [
        {
          productoId: '00000000-0000-0000-0000-000000000009',
          productoVarianteId: null,
          producto: 'Nuevo producto lider',
          talla: null,
          color: null,
          codigoSku: 'NEW-001',
          codigoBarras: null,
          unidades: 12,
          importeVendido: 900,
        },
      ],
    }));
    terceraPeticion.complete();
    fixture.detectChanges();

    expect(component['estado']()).toBe('listo');
    expect(component['mensaje']()).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Nuevo producto lider');
    expect(fixture.nativeElement.textContent).toContain('MARKETING');
    expect(fixture.nativeElement.textContent).not.toContain('No se pudo actualizar el dashboard.');
  });

  it('does not update observable state after the component is destroyed with a pending request', () => {
    const pendiente = new Subject<DashboardComercialResponse>();
    dashboardApi.response = pendiente.asObservable();

    fixture = TestBed.createComponent(DashboardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component['estado']()).toBe('cargando');

    fixture.destroy();
    pendiente.next(crearDashboardResponse({
      resumen: {
        importeTotalVendido: 999,
        cantidadOperaciones: 99,
        unidadesVendidas: 99,
        canalLider: {
          canalVenta: 'OFERTAS',
          importeVendido: 999,
        },
      },
    }));
    pendiente.complete();

    expect(component['estado']()).toBe('cargando');
    expect(component['dashboard']()).toBeNull();
  });

  it('reloads when Actualizar is clicked', async () => {
    await crearComponente();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(dashboardApi.consultas).toBe(2);
  });

  it('avoids duplicate simultaneous loads', () => {
    const pendiente = new Subject<DashboardComercialResponse>();
    dashboardApi.response = pendiente.asObservable();

    fixture = TestBed.createComponent(DashboardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component['cargarDashboard']();

    expect(dashboardApi.consultas).toBe(1);
    pendiente.complete();
  });

  it('renders quick links to existing routes', async () => {
    await crearComponente();

    const links = Array.from(fixture.nativeElement.querySelectorAll('.quick-links a')) as HTMLAnchorElement[];
    const hrefs = links.map((link) => link.getAttribute('href'));

    expect(hrefs).toContain('/app/ventas');
    expect(hrefs).toContain('/app/productos');
    expect(hrefs).toContain('/app/inventario');
    expect(hrefs).toContain('/app/reportes/ventas-por-canal');
  });

  it('formats money and dates without showing Invalid Date', () => {
    expect(formatearSoles(1250)).toBe('S/ 1,250.00');
    expect(formatearFechaDashboard('2026-07-17', false)).toBe('17/07/2026');
    expect(formatearFechaDashboard('2026-07-17T15:42:10-05:00', true)).toBe('17/07/2026 3:42 p. m.');
    expect(formatearFechaDashboard(null, true)).toBe('Sin fecha');
    expect(formatearFechaDashboard('fecha-invalida', true)).toBe('Sin fecha');
  });
});

class DashboardApiServiceFake {
  consultas = 0;
  responses: Observable<DashboardComercialResponse>[] = [];
  response: Observable<DashboardComercialResponse> = of(crearDashboardResponse());

  obtenerDashboardComercial(): Observable<DashboardComercialResponse> {
    this.consultas += 1;
    return this.responses.shift() ?? this.response;
  }
}

function crearDashboardResponse(
  overrides: Partial<DashboardComercialResponse> = {},
): DashboardComercialResponse {
  return {
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
        productoVarianteId: '00000000-0000-0000-0000-000000000001',
        producto: 'Polo básico',
        talla: 'M',
        color: 'Negro',
        codigoSku: 'POLO-M-NEGRO',
        codigoBarras: null,
        unidades: 10,
        importeVendido: 350,
      },
      {
        productoId: '00000000-0000-0000-0000-000000000002',
        productoVarianteId: null,
        producto: 'Perfume demo',
        talla: null,
        color: null,
        codigoSku: null,
        codigoBarras: null,
        unidades: 5,
        importeVendido: 180,
      },
    ],
    stockBajo: [
      {
        productoId: '00000000-0000-0000-0000-000000000003',
        productoVarianteId: '00000000-0000-0000-0000-000000000004',
        producto: 'Casaca Brooklyn',
        talla: 'L',
        color: 'Azul',
        codigoSku: 'CAS-BRO-AZU-L',
        codigoBarras: null,
        cantidadDisponible: 4,
        cantidadReservada: 0,
        stockLibre: 4,
      },
    ],
    ...overrides,
  };
}

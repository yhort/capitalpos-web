import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { EmpresaActivaService } from '../../../../core/empresa/empresa-activa.service';
import { ApiResponse } from '../../../cpe/models/api-response.model';
import { CpeEmisionResponse } from '../../../cpe/models/cpe-emision-response.model';
import { PosApiService } from '../../data-access/pos-api.service';
import { ClienteResponse } from '../../models/cliente.model';
import { ProductoResponse } from '../../models/producto.model';
import { CrearVentaRequest, EmitirCpeDesdeVentaRequest, VentaResponse } from '../../models/venta.model';
import { obtenerFechaActualLima, VentasPageComponent } from './ventas-page.component';

describe('VentasPageComponent', () => {
  let fixture: ComponentFixture<VentasPageComponent>;
  let component: VentasPageComponent;
  let posApi: PosApiServiceFake;

  beforeEach(async () => {
    posApi = new PosApiServiceFake();

    await TestBed.configureTestingModule({
      imports: [VentasPageComponent],
      providers: [
        {
          provide: PosApiService,
          useValue: posApi,
        },
        {
          provide: EmpresaActivaService,
          useValue: {
            empresaId: () => 'empresa-1',
          },
        },
        provideRouter([]),
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function crearComponente(): Promise<void> {
    fixture = TestBed.createComponent(VentasPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('loads products and clients', async () => {
    await crearComponente();

    expect(fixture.nativeElement.textContent).toContain('Polo');
    expect(fixture.nativeElement.textContent).toContain('Cliente Test');
  });

  it('calculates the default sale date with Lima timezone when UTC is already the next day', () => {
    const fechaUtcDiaSiguiente = new Date('2026-07-13T02:30:00.000Z');

    expect(obtenerFechaActualLima(fechaUtcDiaSiguiente)).toBe('2026-07-12');
  });

  it('shows Lima date in the sale date form by default', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-13T02:30:00.000Z'));

    await crearComponente();

    const fechaInput = fixture.nativeElement.querySelector('input[type="date"]') as HTMLInputElement;

    expect(component['ventaForm'].controls.fecha.value).toBe('2026-07-12');
    expect(fechaInput.value).toBe('2026-07-12');
  });

  it('shows a clear path to create products when the catalog is empty', async () => {
    posApi.productos = [];

    await crearComponente();

    const textContent = fixture.nativeElement.textContent;
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];

    expect(textContent).toContain('No hay productos activos para vender.');
    expect(textContent).toContain('Crea al menos un producto activo antes de registrar ventas.');
    expect(textContent).toContain('Crear producto');
    expect(links.some((link) => link.getAttribute('href')?.endsWith('/app/productos'))).toBe(true);
  });

  it('adds products and registers a sale with calculated totals', async () => {
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 2,
    });

    component['agregarProducto']();
    component['registrarVenta']();

    expect(posApi.ultimaVentaRequest).toEqual({
      fecha: expect.any(String),
      clienteId: null,
      detalles: [
        {
          productoId: 'producto-1',
          productoVarianteId: null,
          cantidad: 2,
          precioUnitario: 11.8,
          igv: 3.6,
          total: 23.6,
        },
      ],
    });
    expect(component['ultimaVenta']()?.id).toBe('venta-1');
    expect(component['mensaje']()).toContain('Venta registrada correctamente.');
  });

  it('does not register twice while a sale is already being saved', async () => {
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 1,
    });

    component['agregarProducto']();
    component['estado'].set('guardando');
    component['registrarVenta']();

    expect(posApi.ultimaVentaRequest).toBeNull();
  });

  it('emits CPE from the last registered sale', async () => {
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 1,
    });
    component['emisionForm'].patchValue({
      rucEmisor: '20123456789',
    });

    component['agregarProducto']();
    component['registrarVenta']();
    component['emitirComprobante']();

    expect(posApi.ultimaEmisionVentaId).toBe('venta-1');
    expect(posApi.ultimaEmisionRequest).toEqual({
      tipoComprobante: '03',
      serie: 'B001',
      correlativo: 1,
      rucEmisor: '20123456789',
    });
    expect(component['emisionEstado']()).toBe('exito');
    expect(component['emisionRespuesta']()?.estado).toBe('SIMULADO');
  });
});

class PosApiServiceFake {
  ultimaVentaRequest: CrearVentaRequest | null = null;
  ultimaEmisionVentaId: string | null = null;
  ultimaEmisionRequest: EmitirCpeDesdeVentaRequest | null = null;
  productos: readonly ProductoResponse[] = [
    {
      id: 'producto-1',
      empresaId: 'empresa-1',
      nombre: 'Polo',
      codigoSku: 'POLO-001',
      codigoBarras: '',
      precioVenta: 11.8,
      costo: null,
      activo: true,
      fechaCreacion: '2026-07-11T00:00:00Z',
    },
  ];
  clientes: readonly ClienteResponse[] = [
    {
      id: 'cliente-1',
      empresaId: 'empresa-1',
      tipoDocumento: 'DNI',
      numeroDocumento: '12345678',
      nombreRazonSocial: 'Cliente Test',
      direccion: '',
      activo: true,
      fechaCreacion: '2026-07-11T00:00:00Z',
    },
  ];

  listarProductos() {
    return of(this.productos);
  }

  listarClientes() {
    return of(this.clientes);
  }

  crearCliente() {
    throw new Error('Not implemented in this test.');
  }

  crearVenta(request: CrearVentaRequest) {
    this.ultimaVentaRequest = request;

    return of<VentaResponse>({
      id: 'venta-1',
      empresaId: 'empresa-1',
      clienteId: request.clienteId,
      fecha: request.fecha ?? '2026-07-11T00:00:00Z',
      subtotal: 20,
      igv: 3.6,
      total: 23.6,
      estado: 'Registrada',
      fechaCreacion: '2026-07-11T00:00:00Z',
      detalles: [],
    });
  }

  emitirCpeDesdeVenta(ventaId: string, request: EmitirCpeDesdeVentaRequest) {
    this.ultimaEmisionVentaId = ventaId;
    this.ultimaEmisionRequest = request;

    return of<ApiResponse<CpeEmisionResponse>>({
      ok: true,
      mensaje: 'Comprobante aceptado en modo simulacion.',
      data: {
        ok: true,
        estado: 'SIMULADO',
        mensaje: 'Comprobante aceptado en modo simulacion.',
        codigo: 'SIMULADO',
        comprobante: 'B001-1',
        hash: 'abc123',
        nombreXml: '20123456789-03-B001-1.xml',
        nombreZip: '20123456789-03-B001-1.zip',
        nombreCdr: 'R-20123456789-03-B001-1.zip',
        errores: [],
      },
      errores: [],
    });
  }
}

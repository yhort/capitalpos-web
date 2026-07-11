import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { EmpresaActivaService } from '../../../../core/empresa/empresa-activa.service';
import { ApiResponse } from '../../../cpe/models/api-response.model';
import { CpeEmisionResponse } from '../../../cpe/models/cpe-emision-response.model';
import { PosApiService } from '../../data-access/pos-api.service';
import { ClienteResponse } from '../../models/cliente.model';
import { ProductoResponse } from '../../models/producto.model';
import { CrearVentaRequest, EmitirCpeDesdeVentaRequest, VentaResponse } from '../../models/venta.model';
import { VentasPageComponent } from './ventas-page.component';

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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VentasPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads products and clients', () => {
    expect(fixture.nativeElement.textContent).toContain('Polo');
    expect(fixture.nativeElement.textContent).toContain('Cliente Test');
  });

  it('adds products and registers a sale with calculated totals', () => {
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
  });

  it('emits CPE from the last registered sale', () => {
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

  listarProductos() {
    return of<readonly ProductoResponse[]>([
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
    ]);
  }

  listarClientes() {
    return of<readonly ClienteResponse[]>([
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
    ]);
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

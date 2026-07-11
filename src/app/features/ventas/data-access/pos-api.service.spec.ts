import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CrearClienteRequest } from '../models/cliente.model';
import { CrearVentaRequest, EmitirCpeDesdeVentaRequest } from '../models/venta.model';
import { PosApiService } from './pos-api.service';

describe('PosApiService', () => {
  let service: PosApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PosApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PosApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('loads products and clients through capitalpos-api', () => {
    service.listarProductos().subscribe((productos) => {
      expect(productos).toEqual([]);
    });
    service.listarClientes().subscribe((clientes) => {
      expect(clientes).toEqual([]);
    });

    const productosRequest = httpTestingController.expectOne('/api/productos/');
    expect(productosRequest.request.method).toBe('GET');
    productosRequest.flush([]);

    const clientesRequest = httpTestingController.expectOne('/api/clientes/');
    expect(clientesRequest.request.method).toBe('GET');
    clientesRequest.flush([]);
  });

  it('creates clients and sales through capitalpos-api', () => {
    const clienteRequest: CrearClienteRequest = {
      tipoDocumento: 'DNI',
      numeroDocumento: '12345678',
      nombreRazonSocial: 'Cliente Test',
      direccion: null,
      activo: true,
    };
    const ventaRequest: CrearVentaRequest = {
      fecha: null,
      clienteId: null,
      detalles: [],
    };

    service.crearCliente(clienteRequest).subscribe();
    service.crearVenta(ventaRequest).subscribe();

    const clienteHttpRequest = httpTestingController.expectOne('/api/clientes/');
    expect(clienteHttpRequest.request.method).toBe('POST');
    expect(clienteHttpRequest.request.body).toEqual(clienteRequest);
    clienteHttpRequest.flush({});

    const ventaHttpRequest = httpTestingController.expectOne('/api/ventas/');
    expect(ventaHttpRequest.request.method).toBe('POST');
    expect(ventaHttpRequest.request.body).toEqual(ventaRequest);
    ventaHttpRequest.flush({});
  });

  it('emits CPE from a persisted sale through capitalpos-api', () => {
    const request: EmitirCpeDesdeVentaRequest = {
      tipoComprobante: '03',
      serie: 'B001',
      correlativo: 1,
      rucEmisor: '20123456789',
    };

    service.emitirCpeDesdeVenta('venta-1', request).subscribe((response) => {
      expect(response.data?.estado).toBe('SIMULADO');
    });

    const httpRequest = httpTestingController.expectOne('/api/ventas/venta-1/emitir-cpe');
    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toEqual(request);
    httpRequest.flush({
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
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { EmitirCpeRequest } from '../models/emitir-cpe-request.model';
import { CpeApiService } from './cpe-api.service';

describe('CpeApiService', () => {
  let service: CpeApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CpeApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(CpeApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('posts CPE emissions through capitalpos-api', () => {
    const request = crearRequest();

    service.emitirCpe(request).subscribe();

    const httpRequest = httpTestingController.expectOne('/api/cpe/emitir');
    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toEqual(request);
    httpRequest.flush({
      ok: true,
      mensaje: 'Emitido',
      data: null,
      errores: [],
    });
  });

  it('gets CPE integration status through capitalpos-api', () => {
    service.obtenerEstadoCpe().subscribe();

    const httpRequest = httpTestingController.expectOne('/api/cpe/estado');
    expect(httpRequest.request.method).toBe('GET');
    httpRequest.flush({
      ok: true,
      estado: 'OK',
      mensaje: 'API CPE funcionando correctamente.',
      servicio: 'CapitalPOS CPE API',
      version: '1.0.0',
      modo: 'BETA',
      simularGeneracionXml: false,
      simularFirma: false,
      simularEnvioSunat: true,
      errores: [],
    });
  });
});

function crearRequest(): EmitirCpeRequest {
  return {
    rucEmisor: '20123456789',
    emisor: {
      ruc: '20123456789',
      razonSocial: 'CapitalPOS Test',
      nombreComercial: 'CapitalPOS',
      ubigeo: '150101',
      direccion: 'Lima',
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: 'Lima',
    },
    tipoComprobante: '03',
    serie: 'B001',
    correlativo: 1,
    fechaEmision: '2026-07-08T00:00:00.000Z',
    moneda: 'PEN',
    tipoOperacion: '0101',
    observacion: null,
    formaPago: 'CONTADO',
    montoPendientePago: 0,
    cuotas: [],
    cliente: {
      tipoDocumento: '1',
      numeroDocumento: '12345678',
      razonSocial: 'Cliente Test',
    },
    items: [
      {
        codigo: 'P001',
        descripcion: 'Producto Test',
        unidadMedida: 'NIU',
        cantidad: 1,
        valorUnitario: 10,
        precioUnitario: 11.8,
        subtotal: 10,
        igv: 1.8,
        total: 11.8,
        codigoAfectacionIgv: '10',
      },
    ],
    totalGravada: 10,
    totalExonerada: 0,
    totalInafecta: 0,
    totalIgv: 1.8,
    total: 11.8,
    montoEnLetras: '',
  };
}

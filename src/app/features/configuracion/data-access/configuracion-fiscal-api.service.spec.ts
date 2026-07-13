import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { GuardarConfiguracionFiscalEmpresaRequest } from '../models/configuracion-fiscal-empresa.model';
import { ConfiguracionFiscalApiService } from './configuracion-fiscal-api.service';

describe('ConfiguracionFiscalApiService', () => {
  let service: ConfiguracionFiscalApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ConfiguracionFiscalApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ConfiguracionFiscalApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('loads fiscal configuration through capitalpos-api', () => {
    service.obtenerConfiguracion().subscribe((configuracion) => {
      expect(configuracion.ruc).toBe('20601234567');
    });

    const request = httpTestingController.expectOne('/api/configuracion-fiscal');
    expect(request.request.method).toBe('GET');
    request.flush(crearConfiguracionFiscalResponse());
  });

  it('saves fiscal configuration through capitalpos-api', () => {
    const guardarRequest: GuardarConfiguracionFiscalEmpresaRequest = {
      ruc: '20601234567',
      razonSocial: 'CapitalPOS SAC',
      nombreComercial: 'CapitalPOS',
      ubigeo: '150101',
      direccion: 'Av. Demo 123',
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: 'Lima',
      activa: true,
    };

    service.guardarConfiguracion(guardarRequest).subscribe((configuracion) => {
      expect(configuracion.razonSocial).toBe('CapitalPOS SAC');
    });

    const request = httpTestingController.expectOne('/api/configuracion-fiscal');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(guardarRequest);
    request.flush(crearConfiguracionFiscalResponse());
  });
});

function crearConfiguracionFiscalResponse() {
  return {
    empresaId: 'empresa-1',
    ruc: '20601234567',
    razonSocial: 'CapitalPOS SAC',
    nombreComercial: 'CapitalPOS',
    ubigeo: '150101',
    direccion: 'Av. Demo 123',
    departamento: 'Lima',
    provincia: 'Lima',
    distrito: 'Lima',
    activa: true,
    fechaCreacion: '2026-07-11T00:00:00Z',
  };
}

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AbrirSesionCajaRequest, CerrarSesionCajaRequest } from '../models/caja.model';
import { CajaApiService } from './caja-api.service';

describe('CajaApiService', () => {
  let service: CajaApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CajaApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(CajaApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('gets the open cash session by point of sale', () => {
    service.obtenerSesionAbierta('punto-1').subscribe((sesion) => {
      expect(sesion.id).toBe('sesion-1');
    });

    const request = httpTestingController.expectOne((req) =>
      req.url === '/api/caja/sesiones/abierta' &&
      req.params.get('puntoVentaId') === 'punto-1',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('X-API-KEY')).toBe(false);
    request.flush(crearSesionCajaResponse());
  });

  it('opens a cash session', () => {
    const abrirRequest: AbrirSesionCajaRequest = {
      puntoVentaId: 'punto-1',
      montoInicial: 100,
      observacionApertura: 'Inicio de turno',
    };

    service.abrirSesion(abrirRequest).subscribe((sesion) => {
      expect(sesion.estado).toBe('Abierta');
    });

    const request = httpTestingController.expectOne('/api/caja/sesiones/abrir');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(abrirRequest);
    expect(request.request.headers.has('X-API-KEY')).toBe(false);
    request.flush(crearSesionCajaResponse());
  });

  it('closes a cash session', () => {
    const cerrarRequest: CerrarSesionCajaRequest = {
      montoDeclaradoCierre: 145,
      observacionCierre: 'Cierre correcto',
    };

    service.cerrarSesion('sesion-1', cerrarRequest).subscribe((sesion) => {
      expect(sesion.diferenciaCierre).toBe(5);
    });

    const request = httpTestingController.expectOne('/api/caja/sesiones/sesion-1/cerrar');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(cerrarRequest);
    expect(request.request.headers.has('X-API-KEY')).toBe(false);
    request.flush(crearSesionCajaResponse({
      estado: 'Cerrada',
      montoDeclaradoCierre: 145,
      diferenciaCierre: 5,
      fechaCierre: '2026-07-21T18:00:00-05:00',
      observacionCierre: 'Cierre correcto',
    }));
  });
});

function crearSesionCajaResponse(overrides = {}) {
  return {
    id: 'sesion-1',
    empresaId: 'empresa-1',
    sedeId: 'sede-1',
    puntoVentaId: 'punto-1',
    estado: 'Abierta',
    montoInicial: 100,
    montoDeclaradoCierre: null,
    diferenciaCierre: null,
    fechaApertura: '2026-07-21T09:00:00-05:00',
    fechaCierre: null,
    observacionApertura: 'Inicio de turno',
    observacionCierre: null,
    ...overrides,
  };
}

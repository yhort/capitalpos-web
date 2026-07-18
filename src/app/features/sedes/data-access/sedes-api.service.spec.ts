import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PuntoVentaResponse, SedeResponse } from '../models/sede.model';
import { SedesApiService } from './sedes-api.service';

describe('SedesApiService', () => {
  let service: SedesApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SedesApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(SedesApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('lists sedes through capitalpos-api without X-API-KEY', () => {
    service.listarSedes().subscribe((sedes) => {
      expect(sedes[0]?.nombre).toBe('Tienda Central');
    });

    const request = httpTestingController.expectOne('/api/sedes');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('X-API-KEY')).toBe(false);
    request.flush([crearSedeResponse()]);
  });

  it('lists puntos de venta by sede through capitalpos-api without X-API-KEY', () => {
    service.listarPuntosVenta('sede-1').subscribe((puntosVenta) => {
      expect(puntosVenta[0]?.nombre).toBe('Caja Principal');
    });

    const request = httpTestingController.expectOne('/api/sedes/sede-1/puntos-venta');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('X-API-KEY')).toBe(false);
    request.flush([crearPuntoVentaResponse()]);
  });
});

function crearSedeResponse(overrides: Partial<SedeResponse> = {}): SedeResponse {
  return {
    id: 'sede-1',
    empresaId: 'empresa-1',
    nombre: 'Tienda Central',
    tipo: 'TIENDA',
    codigoEstablecimiento: '0001',
    direccion: 'Av. Lima 123',
    distrito: 'Lima',
    provincia: 'Lima',
    departamento: 'Lima',
    activa: true,
    fechaCreacion: '2026-07-18T10:00:00Z',
    ...overrides,
  };
}

function crearPuntoVentaResponse(overrides: Partial<PuntoVentaResponse> = {}): PuntoVentaResponse {
  return {
    id: 'punto-1',
    empresaId: 'empresa-1',
    sedeId: 'sede-1',
    nombre: 'Caja Principal',
    activo: true,
    ...overrides,
  };
}

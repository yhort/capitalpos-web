import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { EmpresaActivaService } from '../empresa/empresa-activa.service';
import { empresaActivaInterceptor } from './empresa-activa.interceptor';

describe('empresaActivaInterceptor', () => {
  let http: HttpClient;
  let httpTestingController: HttpTestingController;
  let empresaActivaService: EmpresaActivaService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([empresaActivaInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    empresaActivaService = TestBed.inject(EmpresaActivaService);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
  });

  it('adds X-CapitalPos-EmpresaId when active company exists', () => {
    empresaActivaService.establecerEmpresaActiva('empresa-1');

    http.post('/api/cpe/emitir', {}).subscribe();

    const request = httpTestingController.expectOne('/api/cpe/emitir');
    expect(request.request.headers.get('X-CapitalPos-EmpresaId')).toBe('empresa-1');
    request.flush({});
  });

  it('adds X-CapitalPos-EmpresaId in /api/stock endpoints', () => {
    empresaActivaService.establecerEmpresaActiva('empresa-1');

    http.put('/api/stock/ajustar', {}).subscribe();

    const request = httpTestingController.expectOne('/api/stock/ajustar');
    expect(request.request.headers.get('X-CapitalPos-EmpresaId')).toBe('empresa-1');
    expect(request.request.headers.has('X-API-KEY')).toBe(false);
    request.flush({});
  });

  it('does not add X-CapitalPos-EmpresaId in /api/health', () => {
    empresaActivaService.establecerEmpresaActiva('empresa-1');

    http.get('/api/health').subscribe();

    const request = httpTestingController.expectOne('/api/health');
    expect(request.request.headers.has('X-CapitalPos-EmpresaId')).toBe(false);
    request.flush({});
  });

  it('does not add X-CapitalPos-EmpresaId in /api/cpe/estado', () => {
    empresaActivaService.establecerEmpresaActiva('empresa-1');

    http.get('/api/cpe/estado').subscribe();

    const request = httpTestingController.expectOne('/api/cpe/estado');
    expect(request.request.headers.has('X-CapitalPos-EmpresaId')).toBe(false);
    request.flush({});
  });

  it('does not add X-CapitalPos-EmpresaId in /api/auth endpoints', () => {
    empresaActivaService.establecerEmpresaActiva('empresa-1');

    http.post('/api/auth/login', {
      correo: 'usuario@capitalpos.test',
      password: 'password',
    }).subscribe();

    const request = httpTestingController.expectOne('/api/auth/login');
    expect(request.request.headers.has('X-CapitalPos-EmpresaId')).toBe(false);
    request.flush({});
  });

  it('does not add X-CapitalPos-EmpresaId when active company does not exist', () => {
    http.post('/api/cpe/emitir', {}).subscribe();

    const request = httpTestingController.expectOne('/api/cpe/emitir');
    expect(request.request.headers.has('X-CapitalPos-EmpresaId')).toBe(false);
    request.flush({});
  });
});

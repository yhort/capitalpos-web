import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('capitalpos.auth.session', JSON.stringify({
      accessToken: 'jwt-test',
      tokenType: 'Bearer',
      expiresIn: 900,
      expiresAtUtc: '2999-01-01T00:00:00Z',
      usuario: {
        id: 'usuario-id',
        correo: 'usuario@capitalpos.test',
      },
    }));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.clear();
  });

  it('adds Authorization in protected /api endpoints', () => {
    http.get('/api/cpe/emitir').subscribe();

    const request = httpTestingController.expectOne('/api/cpe/emitir');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-test');
    request.flush({});
  });

  it('adds Authorization in /api/cpe/estado', () => {
    http.get('/api/cpe/estado').subscribe();

    const request = httpTestingController.expectOne('/api/cpe/estado');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-test');
    request.flush({});
  });

  it('does not add Authorization in /api/health', () => {
    http.get('/api/health').subscribe();

    const request = httpTestingController.expectOne('/api/health');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('does not add Authorization in /api/auth/login', () => {
    http.post('/api/auth/login', {
      correo: 'usuario@capitalpos.test',
      password: 'password',
    }).subscribe();

    const request = httpTestingController.expectOne('/api/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
});

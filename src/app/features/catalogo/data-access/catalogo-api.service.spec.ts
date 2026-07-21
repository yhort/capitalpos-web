import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CatalogoApiService } from './catalogo-api.service';

describe('CatalogoApiService', () => {
  let service: CatalogoApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CatalogoApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(CatalogoApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('lists and creates categorias through capitalpos-api', () => {
    service.listarCategorias().subscribe((categorias) => {
      expect(categorias[0]?.nombre).toBe('Polos');
    });
    service.crearCategoria({ nombre: 'Casacas', categoriaPadreId: null }).subscribe((categoria) => {
      expect(categoria.nombre).toBe('Casacas');
    });

    const listarRequest = httpTestingController.expectOne((request) =>
      request.url === '/api/categorias' && request.method === 'GET',
    );
    expect(listarRequest.request.method).toBe('GET');
    expect(listarRequest.request.headers.has('X-API-KEY')).toBe(false);
    listarRequest.flush([crearCategoriaResponse()]);

    const crearRequest = httpTestingController.expectOne((request) =>
      request.url === '/api/categorias' && request.method === 'POST',
    );
    expect(crearRequest.request.method).toBe('POST');
    expect(crearRequest.request.body).toEqual({ nombre: 'Casacas', categoriaPadreId: null });
    expect(crearRequest.request.headers.has('X-API-KEY')).toBe(false);
    crearRequest.flush(crearCategoriaResponse({ id: 'categoria-2', nombre: 'Casacas' }));
  });

  it('lists and creates marcas through capitalpos-api', () => {
    service.listarMarcas().subscribe((marcas) => {
      expect(marcas[0]?.nombre).toBe('Brooklyn');
    });
    service.crearMarca({ nombre: 'Capital' }).subscribe((marca) => {
      expect(marca.nombre).toBe('Capital');
    });

    const listarRequest = httpTestingController.expectOne((request) =>
      request.url === '/api/marcas' && request.method === 'GET',
    );
    expect(listarRequest.request.method).toBe('GET');
    expect(listarRequest.request.headers.has('X-API-KEY')).toBe(false);
    listarRequest.flush([crearMarcaResponse()]);

    const crearRequest = httpTestingController.expectOne((request) =>
      request.url === '/api/marcas' && request.method === 'POST',
    );
    expect(crearRequest.request.method).toBe('POST');
    expect(crearRequest.request.body).toEqual({ nombre: 'Capital' });
    expect(crearRequest.request.headers.has('X-API-KEY')).toBe(false);
    crearRequest.flush(crearMarcaResponse({ id: 'marca-2', nombre: 'Capital' }));
  });
});

function crearCategoriaResponse(overrides = {}) {
  return {
    id: 'categoria-1',
    empresaId: 'empresa-1',
    categoriaPadreId: null,
    nombre: 'Polos',
    activa: true,
    fechaCreacion: '2026-07-20T10:00:00Z',
    ...overrides,
  };
}

function crearMarcaResponse(overrides = {}) {
  return {
    id: 'marca-1',
    empresaId: 'empresa-1',
    nombre: 'Brooklyn',
    activa: true,
    fechaCreacion: '2026-07-20T10:00:00Z',
    ...overrides,
  };
}

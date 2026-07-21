import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  CategoriaResponse,
  CrearCategoriaRequest,
  CrearMarcaRequest,
  MarcaResponse,
} from '../models/catalogo.model';

@Injectable({ providedIn: 'root' })
export class CatalogoApiService {
  private readonly http = inject(HttpClient);

  listarCategorias(): Observable<readonly CategoriaResponse[]> {
    return this.http.get<readonly CategoriaResponse[]>('/api/categorias');
  }

  crearCategoria(request: CrearCategoriaRequest): Observable<CategoriaResponse> {
    return this.http.post<CategoriaResponse>('/api/categorias', request);
  }

  listarMarcas(): Observable<readonly MarcaResponse[]> {
    return this.http.get<readonly MarcaResponse[]>('/api/marcas');
  }

  crearMarca(request: CrearMarcaRequest): Observable<MarcaResponse> {
    return this.http.post<MarcaResponse>('/api/marcas', request);
  }
}

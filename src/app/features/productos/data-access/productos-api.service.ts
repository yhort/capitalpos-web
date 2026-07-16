import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  CrearProductoRequest,
  CrearProductoVarianteRequest,
  ProductoResponse,
  ProductoVarianteResponse,
} from '../models/producto.model';

@Injectable({
  providedIn: 'root',
})
export class ProductosApiService {
  private readonly http = inject(HttpClient);

  listarProductos(): Observable<readonly ProductoResponse[]> {
    return this.http.get<readonly ProductoResponse[]>('/api/productos/');
  }

  crearProducto(request: CrearProductoRequest): Observable<ProductoResponse> {
    return this.http.post<ProductoResponse>('/api/productos/', request);
  }

  listarVariantes(productoId: string): Observable<readonly ProductoVarianteResponse[]> {
    return this.http.get<readonly ProductoVarianteResponse[]>(`/api/productos/${productoId}/variantes`);
  }

  crearVariante(
    productoId: string,
    request: CrearProductoVarianteRequest,
  ): Observable<ProductoVarianteResponse> {
    return this.http.post<ProductoVarianteResponse>(`/api/productos/${productoId}/variantes`, request);
  }

  activarVariante(productoId: string, varianteId: string): Observable<ProductoVarianteResponse> {
    return this.http.patch<ProductoVarianteResponse>(
      `/api/productos/${productoId}/variantes/${varianteId}/activar`,
      {},
    );
  }

  desactivarVariante(productoId: string, varianteId: string): Observable<ProductoVarianteResponse> {
    return this.http.patch<ProductoVarianteResponse>(
      `/api/productos/${productoId}/variantes/${varianteId}/desactivar`,
      {},
    );
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CrearProductoRequest, ProductoResponse } from '../models/producto.model';

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
}

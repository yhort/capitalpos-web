import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AjustarStockProductoRequest, StockProductoResponse } from '../models/stock.model';

@Injectable({
  providedIn: 'root',
})
export class StockApiService {
  private readonly http = inject(HttpClient);

  obtenerStockProducto(productoId: string, sedeId: string): Observable<StockProductoResponse> {
    return this.http.get<StockProductoResponse>(
      `/api/stock/productos/${productoId}`,
      { params: crearSedeParams(sedeId) },
    );
  }

  obtenerStockProductoVariante(
    productoId: string,
    productoVarianteId: string,
    sedeId: string,
  ): Observable<StockProductoResponse> {
    return this.http.get<StockProductoResponse>(
      `/api/stock/productos/${productoId}/variantes/${productoVarianteId}`,
      { params: crearSedeParams(sedeId) },
    );
  }

  ajustarStock(request: AjustarStockProductoRequest): Observable<StockProductoResponse> {
    return this.http.put<StockProductoResponse>('/api/stock/ajustar', request);
  }
}

function crearSedeParams(sedeId: string): HttpParams {
  return new HttpParams().set('sedeId', sedeId);
}

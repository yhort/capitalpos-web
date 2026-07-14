import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AjustarStockProductoRequest, StockProductoResponse } from '../models/stock.model';

@Injectable({
  providedIn: 'root',
})
export class StockApiService {
  private readonly http = inject(HttpClient);

  obtenerStockProducto(productoId: string): Observable<StockProductoResponse> {
    return this.http.get<StockProductoResponse>(`/api/stock/productos/${productoId}`);
  }

  obtenerStockProductoVariante(
    productoId: string,
    productoVarianteId: string,
  ): Observable<StockProductoResponse> {
    return this.http.get<StockProductoResponse>(
      `/api/stock/productos/${productoId}/variantes/${productoVarianteId}`,
    );
  }

  ajustarStock(request: AjustarStockProductoRequest): Observable<StockProductoResponse> {
    return this.http.put<StockProductoResponse>('/api/stock/ajustar', request);
  }
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ReporteVentasPorCanalResponse } from '../models/reporte-ventas-por-canal.model';

@Injectable({
  providedIn: 'root',
})
export class ReportesApiService {
  private readonly http = inject(HttpClient);

  obtenerVentasPorCanal(desde: string, hasta: string): Observable<ReporteVentasPorCanalResponse> {
    const params = new HttpParams()
      .set('desde', desde)
      .set('hasta', hasta);

    return this.http.get<ReporteVentasPorCanalResponse>('/api/reportes/ventas-por-canal', { params });
  }
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  AbrirSesionCajaRequest,
  CerrarSesionCajaRequest,
  SesionCajaResponse,
} from '../models/caja.model';

@Injectable({
  providedIn: 'root',
})
export class CajaApiService {
  private readonly http = inject(HttpClient);

  obtenerSesionAbierta(puntoVentaId: string): Observable<SesionCajaResponse> {
    const params = new HttpParams().set('puntoVentaId', puntoVentaId);
    return this.http.get<SesionCajaResponse>('/api/caja/sesiones/abierta', { params });
  }

  abrirSesion(request: AbrirSesionCajaRequest): Observable<SesionCajaResponse> {
    return this.http.post<SesionCajaResponse>('/api/caja/sesiones/abrir', request);
  }

  cerrarSesion(
    sesionCajaId: string,
    request: CerrarSesionCajaRequest,
  ): Observable<SesionCajaResponse> {
    return this.http.post<SesionCajaResponse>(`/api/caja/sesiones/${sesionCajaId}/cerrar`, request);
  }
}

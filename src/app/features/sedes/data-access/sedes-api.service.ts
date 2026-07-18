import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { PuntoVentaResponse, SedeResponse } from '../models/sede.model';

@Injectable({ providedIn: 'root' })
export class SedesApiService {
  private readonly http = inject(HttpClient);

  listarSedes(): Observable<readonly SedeResponse[]> {
    return this.http.get<readonly SedeResponse[]>('/api/sedes');
  }

  listarPuntosVenta(sedeId: string): Observable<readonly PuntoVentaResponse[]> {
    return this.http.get<readonly PuntoVentaResponse[]>(`/api/sedes/${sedeId}/puntos-venta`);
  }
}

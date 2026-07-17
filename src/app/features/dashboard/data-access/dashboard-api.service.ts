import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { DashboardComercialResponse } from '../models/dashboard-comercial.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardApiService {
  private readonly http = inject(HttpClient);

  obtenerDashboardComercial(): Observable<DashboardComercialResponse> {
    return this.http.get<DashboardComercialResponse>('/api/dashboard/comercial');
  }
}

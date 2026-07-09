import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../models/api-response.model';
import { CpeEmisionResponse } from '../models/cpe-emision-response.model';
import { CpeEstadoResponse } from '../models/cpe-estado-response.model';
import { EmitirCpeRequest } from '../models/emitir-cpe-request.model';

@Injectable({
  providedIn: 'root'
})
export class CpeApiService {
  private readonly http = inject(HttpClient);
  private readonly emitirCpeUrl = '/api/cpe/emitir';
  private readonly estadoCpeUrl = '/api/cpe/estado';

  emitirCpe(request: EmitirCpeRequest): Observable<ApiResponse<CpeEmisionResponse>> {
    return this.http.post<ApiResponse<CpeEmisionResponse>>(this.emitirCpeUrl, request);
  }

  obtenerEstadoCpe(): Observable<CpeEstadoResponse> {
    return this.http.get<CpeEstadoResponse>(this.estadoCpeUrl);
  }
}

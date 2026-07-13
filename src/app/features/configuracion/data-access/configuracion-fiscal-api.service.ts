import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ConfiguracionFiscalEmpresa,
  GuardarConfiguracionFiscalEmpresaRequest,
} from '../models/configuracion-fiscal-empresa.model';

@Injectable({
  providedIn: 'root',
})
export class ConfiguracionFiscalApiService {
  private readonly http = inject(HttpClient);

  obtenerConfiguracion(): Observable<ConfiguracionFiscalEmpresa> {
    return this.http.get<ConfiguracionFiscalEmpresa>('/api/configuracion-fiscal');
  }

  guardarConfiguracion(
    request: GuardarConfiguracionFiscalEmpresaRequest,
  ): Observable<ConfiguracionFiscalEmpresa> {
    return this.http.put<ConfiguracionFiscalEmpresa>('/api/configuracion-fiscal', request);
  }
}

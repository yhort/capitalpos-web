import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ClienteResponse, CrearClienteRequest } from '../models/cliente.model';
import { ProductoResponse } from '../models/producto.model';
import { ApiResponse } from '../../cpe/models/api-response.model';
import { CpeEmisionResponse } from '../../cpe/models/cpe-emision-response.model';
import { CrearVentaRequest, EmitirCpeDesdeVentaRequest, VentaResponse } from '../models/venta.model';

@Injectable({
  providedIn: 'root',
})
export class PosApiService {
  private readonly http = inject(HttpClient);

  listarProductos(): Observable<readonly ProductoResponse[]> {
    return this.http.get<readonly ProductoResponse[]>('/api/productos/');
  }

  listarClientes(): Observable<readonly ClienteResponse[]> {
    return this.http.get<readonly ClienteResponse[]>('/api/clientes/');
  }

  crearCliente(request: CrearClienteRequest): Observable<ClienteResponse> {
    return this.http.post<ClienteResponse>('/api/clientes/', request);
  }

  crearVenta(request: CrearVentaRequest): Observable<VentaResponse> {
    return this.http.post<VentaResponse>('/api/ventas/', request);
  }

  emitirCpeDesdeVenta(
    ventaId: string,
    request: EmitirCpeDesdeVentaRequest,
  ): Observable<ApiResponse<CpeEmisionResponse>> {
    return this.http.post<ApiResponse<CpeEmisionResponse>>(`/api/ventas/${ventaId}/emitir-cpe`, request);
  }
}

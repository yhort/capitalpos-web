export type CanalVenta = 'TIENDA' | 'PROVINCIA' | 'MARKETING' | 'MAYORISTA' | 'MAQUILA' | 'OFERTAS';

export interface CrearVentaRequest {
  readonly fecha: string | null;
  readonly clienteId: string | null;
  readonly canalVenta?: CanalVenta;
  readonly puntoVentaId: string;
  readonly vendedorId?: string | null;
  readonly detalles: readonly CrearVentaDetalleRequest[];
}

export interface EmitirCpeDesdeVentaRequest {
  readonly tipoComprobante: string;
  readonly serie: string;
  readonly correlativo: number;
  readonly rucEmisor: string;
}

export interface CrearVentaDetalleRequest {
  readonly productoId: string;
  readonly productoVarianteId: string | null;
  readonly productoPresentacionId?: string | null;
  readonly cantidad: number;
  readonly precioUnitario: number;
  readonly igv: number;
  readonly total: number;
}

export interface VentaResponse {
  readonly id: string;
  readonly empresaId: string;
  readonly sedeId?: string | null;
  readonly clienteId: string | null;
  readonly fecha: string;
  readonly subtotal: number;
  readonly igv: number;
  readonly total: number;
  readonly estado: string;
  readonly canalVenta?: string | null;
  readonly puntoVentaId: string;
  readonly vendedorId?: string | null;
  readonly fechaCreacion: string;
  readonly detalles: readonly VentaDetalleResponse[];
}

export interface VentaDetalleResponse {
  readonly id: string;
  readonly productoId: string;
  readonly productoVarianteId: string | null;
  readonly productoPresentacionId?: string | null;
  readonly cantidad: number;
  readonly precioUnitario: number;
  readonly igv: number;
  readonly total: number;
}

export interface CrearVentaRequest {
  readonly fecha: string | null;
  readonly clienteId: string | null;
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
  readonly cantidad: number;
  readonly precioUnitario: number;
  readonly igv: number;
  readonly total: number;
}

export interface VentaResponse {
  readonly id: string;
  readonly empresaId: string;
  readonly clienteId: string | null;
  readonly fecha: string;
  readonly subtotal: number;
  readonly igv: number;
  readonly total: number;
  readonly estado: string;
  readonly fechaCreacion: string;
  readonly detalles: readonly VentaDetalleResponse[];
}

export interface VentaDetalleResponse {
  readonly id: string;
  readonly productoId: string;
  readonly productoVarianteId: string | null;
  readonly cantidad: number;
  readonly precioUnitario: number;
  readonly igv: number;
  readonly total: number;
}

export interface StockProductoResponse {
  readonly empresaId: string;
  readonly sedeId: string;
  readonly productoId: string;
  readonly productoVarianteId: string | null;
  readonly cantidadDisponible: number;
  readonly cantidadReservada: number;
  readonly stockLibre: number;
  readonly fechaActualizacion: string | null;
}

export interface AjustarStockProductoRequest {
  readonly sedeId: string;
  readonly productoId: string;
  readonly productoVarianteId: string | null;
  readonly cantidadDisponible: number;
}

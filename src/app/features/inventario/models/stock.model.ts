export interface StockProductoResponse {
  readonly empresaId: string;
  readonly productoId: string;
  readonly productoVarianteId: string | null;
  readonly cantidadDisponible: number;
  readonly cantidadReservada: number;
  readonly stockLibre: number;
  readonly fechaActualizacion: string;
}

export interface AjustarStockProductoRequest {
  readonly productoId: string;
  readonly productoVarianteId: string | null;
  readonly cantidadDisponible: number;
}

export interface ReporteVentasPorCanalResponse {
  readonly desde: string;
  readonly hasta: string;
  readonly items: readonly ReporteVentasPorCanalItem[];
  readonly totalGeneral: ReporteVentasPorCanalTotal;
}

export interface ReporteVentasPorCanalItem {
  readonly canalVenta: string;
  readonly cantidadVentas: number;
  readonly unidades: number;
  readonly soles: number;
  readonly precioPromedio: number;
}

export interface ReporteVentasPorCanalTotal {
  readonly cantidadVentas: number;
  readonly unidades: number;
  readonly soles: number;
  readonly precioPromedio: number;
}

export interface DashboardComercialResponse {
  readonly fecha: string;
  readonly ultimaActualizacion: string | null;
  readonly resumen: DashboardComercialResumen;
  readonly topProductos: readonly DashboardComercialTopProducto[];
  readonly stockBajo: readonly DashboardComercialStockBajoItem[];
}

export interface DashboardComercialResumen {
  readonly importeTotalVendido: number;
  readonly cantidadOperaciones: number;
  readonly unidadesVendidas: number;
  readonly canalLider: DashboardComercialCanalLider | null;
}

export interface DashboardComercialCanalLider {
  readonly canalVenta: string;
  readonly importeVendido: number;
}

export interface DashboardComercialTopProducto {
  readonly productoId: string;
  readonly productoVarianteId: string | null;
  readonly producto: string;
  readonly talla: string | null;
  readonly color: string | null;
  readonly codigoSku: string | null;
  readonly codigoBarras: string | null;
  readonly unidades: number;
  readonly importeVendido: number;
}

export interface DashboardComercialStockBajoItem {
  readonly productoId: string;
  readonly productoVarianteId: string | null;
  readonly producto: string;
  readonly talla: string | null;
  readonly color: string | null;
  readonly codigoSku: string | null;
  readonly codigoBarras: string | null;
  readonly cantidadDisponible: number;
  readonly cantidadReservada: number;
  readonly stockLibre: number;
}

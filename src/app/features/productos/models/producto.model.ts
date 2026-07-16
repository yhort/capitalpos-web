export interface ProductoResponse {
  readonly id: string;
  readonly empresaId: string;
  readonly nombre: string;
  readonly codigoSku: string;
  readonly codigoBarras: string;
  readonly precioVenta: number;
  readonly costo: number | null;
  readonly activo: boolean;
  readonly fechaCreacion: string;
}

export interface CrearProductoRequest {
  readonly nombre: string;
  readonly precioVenta: number;
  readonly codigoSku: string | null;
  readonly codigoBarras: string | null;
  readonly costo: number | null;
  readonly activo: boolean;
}

export interface ProductoVarianteResponse {
  readonly id: string;
  readonly empresaId: string;
  readonly productoId: string;
  readonly talla: string;
  readonly color: string;
  readonly codigoSku: string;
  readonly codigoBarras: string;
  readonly activo: boolean;
  readonly fechaCreacion: string;
}

export interface CrearProductoVarianteRequest {
  readonly productoId: string;
  readonly talla: string | null;
  readonly color: string | null;
  readonly codigoSku: string | null;
  readonly codigoBarras: string | null;
  readonly activo: boolean;
}

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

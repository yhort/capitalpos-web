export interface ProductoResponse {
  readonly id: string;
  readonly empresaId: string;
  readonly nombre: string;
  readonly codigoSku: string;
  readonly codigoBarras: string;
  readonly categoriaId?: string | null;
  readonly marcaId?: string | null;
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
  readonly categoriaId?: string | null;
  readonly marcaId?: string | null;
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

export interface UnidadMedidaResponse {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly abreviatura?: string | null;
  readonly activo?: boolean | null;
  readonly activa?: boolean | null;
}

export interface ProductoPresentacionResponse {
  readonly id: string;
  readonly empresaId: string;
  readonly productoId: string;
  readonly productoVarianteId: string | null;
  readonly unidadMedidaId: string;
  readonly unidadCodigo: string;
  readonly unidadNombre: string;
  readonly factorConversion: number;
  readonly esUnidadBase: boolean;
  readonly precioVenta: number;
  readonly codigoBarras: string | null;
  readonly activo: boolean;
  readonly fechaCreacion: string;
}

export interface CrearProductoPresentacionRequest {
  readonly unidadMedidaId: string;
  readonly factorConversion: number;
  readonly esUnidadBase: boolean;
  readonly precioVenta: number;
  readonly codigoBarras: string | null;
}

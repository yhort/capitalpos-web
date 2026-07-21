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

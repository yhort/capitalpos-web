export interface CategoriaResponse {
  readonly id: string;
  readonly empresaId: string;
  readonly categoriaPadreId: string | null;
  readonly nombre: string;
  readonly activa: boolean;
  readonly fechaCreacion: string;
}

export interface CrearCategoriaRequest {
  readonly nombre: string;
  readonly categoriaPadreId: string | null;
}

export interface MarcaResponse {
  readonly id: string;
  readonly empresaId: string;
  readonly nombre: string;
  readonly activa: boolean;
  readonly fechaCreacion: string;
}

export interface CrearMarcaRequest {
  readonly nombre: string;
}

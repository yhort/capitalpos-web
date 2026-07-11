export interface ClienteResponse {
  readonly id: string;
  readonly empresaId: string;
  readonly tipoDocumento: string;
  readonly numeroDocumento: string;
  readonly nombreRazonSocial: string;
  readonly direccion: string;
  readonly activo: boolean;
  readonly fechaCreacion: string;
}

export interface CrearClienteRequest {
  readonly tipoDocumento: string;
  readonly numeroDocumento: string | null;
  readonly nombreRazonSocial: string;
  readonly direccion: string | null;
  readonly activo: boolean;
}

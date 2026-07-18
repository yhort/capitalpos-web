export interface SedeResponse {
  readonly id: string;
  readonly empresaId: string;
  readonly nombre: string;
  readonly tipo: string;
  readonly codigoEstablecimiento: string;
  readonly direccion: string;
  readonly distrito: string;
  readonly provincia: string;
  readonly departamento: string;
  readonly activa: boolean;
  readonly fechaCreacion: string;
}

export interface PuntoVentaResponse {
  readonly id: string;
  readonly empresaId: string;
  readonly sedeId: string;
  readonly nombre: string;
  readonly activo: boolean;
}

export interface ConfiguracionFiscalEmpresa {
  readonly empresaId: string;
  readonly ruc: string;
  readonly razonSocial: string;
  readonly nombreComercial: string;
  readonly ubigeo: string;
  readonly direccion: string;
  readonly departamento: string;
  readonly provincia: string;
  readonly distrito: string;
  readonly activa: boolean;
  readonly fechaCreacion: string;
}

export interface GuardarConfiguracionFiscalEmpresaRequest {
  readonly ruc: string;
  readonly razonSocial: string;
  readonly nombreComercial: string | null;
  readonly ubigeo: string;
  readonly direccion: string;
  readonly departamento: string;
  readonly provincia: string;
  readonly distrito: string;
  readonly activa: boolean;
}

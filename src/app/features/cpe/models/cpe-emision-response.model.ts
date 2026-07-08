export interface CpeEmisionResponse {
  readonly ok: boolean;
  readonly estado: CpeEmisionEstado;
  readonly mensaje: string;
  readonly codigo?: string | null;
  readonly comprobante: string | null;
  readonly hash: string | null;
  readonly nombreXml: string | null;
  readonly nombreZip: string | null;
  readonly xmlFirmado: boolean;
  readonly nombreCdr: string | null;
  readonly fechaProceso: string;
  readonly etapas: readonly CpeEtapaResponse[];
  readonly errores: readonly string[];
}

export interface CpeEtapaResponse {
  readonly etapa: string;
  readonly ok: boolean;
  readonly mensaje: string;
  readonly fecha: string;
}

export type CpeEmisionEstado =
  | 'ACEPTADO'
  | 'RECHAZADO'
  | 'SIMULADO'
  | 'ERROR_VALIDACION'
  | 'ERROR_XML'
  | 'ERROR_FIRMA'
  | 'ERROR_SUNAT'
  | 'ERROR_CDR'
  | 'ERROR_INTERNO';

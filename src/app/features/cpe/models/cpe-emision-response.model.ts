export interface CpeEmisionResponse {
  readonly ok: boolean;
  readonly estado: CpeEmisionEstado;
  readonly mensaje: string | null;
  readonly codigo: string | null;
  readonly comprobante: string | null;
  readonly hash: string | null;
  readonly nombreXml: string | null;
  readonly nombreZip: string | null;
  readonly nombreCdr: string | null;
  readonly errores: readonly CpeEmisionError[];
}

export interface CpeEmisionError {
  readonly codigo: string | null;
  readonly campo: string | null;
  readonly mensaje: string;
}

export type CpeEmisionEstado =
  | 'SIMULADO'
  | 'ACEPTADO'
  | 'RECHAZADO'
  | 'ERROR_VALIDACION'
  | 'ERROR_XML'
  | 'ERROR_FIRMA'
  | 'ERROR_SUNAT'
  | 'ERROR_CDR'
  | 'ERROR_INTERNO'
  | 'ERROR_CPE'
  | 'RESPUESTA_CPE_INVALIDA';

export interface CpeEstadoResponse {
  readonly ok: boolean;
  readonly estado: string;
  readonly mensaje: string;
  readonly servicio: string;
  readonly version: string;
  readonly modo: string;
  readonly simularGeneracionXml: boolean;
  readonly simularFirma: boolean;
  readonly simularEnvioSunat: boolean;
  readonly errores: readonly string[];
}

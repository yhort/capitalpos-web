export interface CpeHealthResponse {
  readonly status: string;
  readonly service: string;
  readonly version: string;
  readonly modo: string;
  readonly simularGeneracionXml: boolean;
  readonly simularFirma: boolean;
  readonly simularEnvioSunat: boolean;
  readonly guardarCdrSimulado: boolean;
  readonly rutaArchivos: string;
  readonly rutaArchivosAbsoluta: string;
  readonly fechaServidor: string;
}

export interface SesionCajaResponse {
  readonly id: string;
  readonly empresaId: string;
  readonly sedeId: string;
  readonly puntoVentaId: string;
  readonly estado: string;
  readonly montoInicial: number;
  readonly montoDeclaradoCierre: number | null;
  readonly diferenciaCierre: number | null;
  readonly fechaApertura: string;
  readonly fechaCierre: string | null;
  readonly observacionApertura: string | null;
  readonly observacionCierre: string | null;
}

export interface AbrirSesionCajaRequest {
  readonly puntoVentaId: string;
  readonly montoInicial: number;
  readonly observacionApertura?: string | null;
}

export interface CerrarSesionCajaRequest {
  readonly montoDeclaradoCierre: number;
  readonly observacionCierre?: string | null;
}

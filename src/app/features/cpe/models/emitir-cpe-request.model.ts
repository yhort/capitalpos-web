export interface EmitirCpeRequest {
  readonly rucEmisor: string;
  readonly emisor: EmisorCpe;
  readonly tipoComprobante: string;
  readonly serie: string;
  readonly correlativo: number;
  readonly fechaEmision: string;
  readonly moneda: string;
  readonly tipoOperacion: string;
  readonly observacion?: string | null;
  readonly formaPago: string;
  readonly montoPendientePago: number;
  readonly cuotas: readonly CuotaPagoCpe[];
  readonly cliente: ClienteCpe;
  readonly items: readonly ItemCpe[];
  readonly totalGravada: number;
  readonly totalExonerada: number;
  readonly totalInafecta: number;
  readonly totalIgv: number;
  readonly total: number;
  readonly montoEnLetras: string;
}

export interface EmisorCpe {
  readonly ruc: string;
  readonly razonSocial: string;
  readonly nombreComercial: string;
  readonly ubigeo: string;
  readonly direccion: string;
  readonly departamento: string;
  readonly provincia: string;
  readonly distrito: string;
}

export interface ClienteCpe {
  readonly tipoDocumento: string;
  readonly numeroDocumento: string;
  readonly razonSocial: string;
}

export interface CuotaPagoCpe {
  readonly numero: number;
  readonly fechaVencimiento: string;
  readonly monto: number;
}

export interface ItemCpe {
  readonly codigo: string;
  readonly descripcion: string;
  readonly unidadMedida: string;
  readonly cantidad: number;
  readonly valorUnitario: number;
  readonly precioUnitario: number;
  readonly subtotal: number;
  readonly igv: number;
  readonly total: number;
  readonly codigoAfectacionIgv: string;
}

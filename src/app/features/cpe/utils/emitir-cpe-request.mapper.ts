import { EmisorCpe, EmitirCpeRequest, ItemCpe } from '../models/emitir-cpe-request.model';

export type CodigoAfectacionIgv = '10' | '20' | '30';

export interface TotalesCpeCalculados {
  readonly totalGravada: number;
  readonly totalExonerada: number;
  readonly totalInafecta: number;
  readonly totalIgv: number;
  readonly total: number;
}

export interface ComprobanteCpeFormValue {
  readonly tipoComprobante: string;
  readonly serie: string;
  readonly correlativo: number;
  readonly fechaEmision: string;
  readonly moneda: string;
  readonly tipoOperacion: string;
  readonly observacion: string;
}

export interface ClienteCpeFormValue {
  readonly tipoDocumento: string;
  readonly numeroDocumento: string;
  readonly razonSocial: string;
}

export interface ItemCpeFormValue {
  readonly codigo: string;
  readonly descripcion: string;
  readonly unidadMedida: string;
  readonly cantidad: number;
  readonly valorUnitario: number;
  readonly codigoAfectacionIgv: CodigoAfectacionIgv;
  readonly precioUnitario: number;
  readonly subtotal: number;
  readonly igv: number;
  readonly total: number;
}

export interface ConstruirEmitirCpeRequestParams {
  readonly comprobante: ComprobanteCpeFormValue;
  readonly cliente: ClienteCpeFormValue;
  readonly items: readonly ItemCpeFormValue[];
  readonly totales: TotalesCpeCalculados;
  readonly emisor: EmisorCpe;
}

export function construirEmitirCpeRequest(params: ConstruirEmitirCpeRequestParams): EmitirCpeRequest {
  const { comprobante, cliente, emisor, items, totales } = params;

  return {
    rucEmisor: emisor.ruc,
    emisor,
    tipoComprobante: comprobante.tipoComprobante,
    serie: comprobante.serie.toUpperCase(),
    correlativo: comprobante.correlativo,
    fechaEmision: new Date(`${comprobante.fechaEmision}T00:00:00`).toISOString(),
    moneda: comprobante.moneda,
    tipoOperacion: comprobante.tipoOperacion,
    observacion: comprobante.observacion.trim() || null,
    formaPago: 'CONTADO',
    montoPendientePago: 0,
    cuotas: [],
    cliente: {
      tipoDocumento: cliente.tipoDocumento,
      numeroDocumento: cliente.numeroDocumento,
      razonSocial: cliente.razonSocial,
    },
    items: items.map(mapearItem),
    totalGravada: totales.totalGravada,
    totalExonerada: totales.totalExonerada,
    totalInafecta: totales.totalInafecta,
    totalIgv: totales.totalIgv,
    total: totales.total,
    montoEnLetras: '',
  };
}

export function redondearImporteCpe(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function mapearItem(item: ItemCpeFormValue): ItemCpe {
  return {
    codigo: item.codigo,
    descripcion: item.descripcion,
    unidadMedida: item.unidadMedida,
    cantidad: item.cantidad,
    valorUnitario: item.valorUnitario,
    precioUnitario: item.precioUnitario,
    subtotal: item.subtotal,
    igv: item.igv,
    total: item.total,
    codigoAfectacionIgv: item.codigoAfectacionIgv,
  };
}

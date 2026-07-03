import { EmitirCpeRequest } from '../models/emitir-cpe-request.model';
import { redondearImporteCpe } from './emitir-cpe-request.mapper';

export function validarEmitirCpeRequest(request: EmitirCpeRequest): readonly string[] {
  const errores: string[] = [];

  if (!request.rucEmisor || request.rucEmisor !== request.emisor.ruc) {
    errores.push('El RUC principal del emisor debe coincidir con emisor.ruc.');
  }

  if (request.tipoComprobante !== '01' && request.tipoComprobante !== '03') {
    errores.push('El tipo de comprobante debe ser 01 Factura o 03 Boleta.');
  }

  if (request.tipoComprobante === '01' && !request.serie.toUpperCase().startsWith('F')) {
    errores.push('Para factura, la serie debe comenzar con F.');
  }

  if (request.tipoComprobante === '03' && !request.serie.toUpperCase().startsWith('B')) {
    errores.push('Para boleta, la serie debe comenzar con B.');
  }

  if (request.correlativo <= 0) {
    errores.push('El correlativo debe ser mayor a 0.');
  }

  if (!clienteEsValidoParaComprobante(request)) {
    errores.push('El cliente no cumple las reglas del tipo de comprobante.');
  }

  if (request.items.length === 0) {
    errores.push('El comprobante debe tener al menos un ítem.');
  }

  for (const [index, item] of request.items.entries()) {
    const numeroItem = index + 1;

    if (item.cantidad <= 0) {
      errores.push(`El ítem ${numeroItem} debe tener cantidad mayor a 0.`);
    }

    if (
      item.valorUnitario < 0 ||
      item.precioUnitario < 0 ||
      item.subtotal < 0 ||
      item.igv < 0 ||
      item.total < 0
    ) {
      errores.push(`El ítem ${numeroItem} contiene importes negativos.`);
    }
  }

  const sumaTotales = redondearImporteCpe(
    request.totalGravada + request.totalExonerada + request.totalInafecta + request.totalIgv
  );

  if (!montosCoinciden(sumaTotales, request.total)) {
    errores.push('El total no coincide con gravada + exonerada + inafecta + IGV.');
  }

  const totalItems = redondearImporteCpe(request.items.reduce((total, item) => total + item.total, 0));

  if (!montosCoinciden(totalItems, request.total)) {
    errores.push('La suma de los totales de ítems no coincide con el total general.');
  }

  if (request.formaPago !== 'CONTADO') {
    errores.push('La forma de pago debe ser CONTADO en esta versión.');
  }

  if (request.cuotas.length > 0) {
    errores.push('Las cuotas deben estar vacías cuando la forma de pago es CONTADO.');
  }

  return errores;
}

function montosCoinciden(izquierda: number, derecha: number): boolean {
  return Math.abs(izquierda - derecha) <= 0.01;
}

function clienteEsValidoParaComprobante(request: EmitirCpeRequest): boolean {
  const { tipoDocumento, numeroDocumento } = request.cliente;

  if (request.tipoComprobante === '01') {
    return tipoDocumento === '6' && /^\d{11}$/.test(numeroDocumento);
  }

  if (request.tipoComprobante === '03') {
    return (
      (tipoDocumento === '1' && /^\d{8}$/.test(numeroDocumento)) ||
      (tipoDocumento === '6' && /^\d{11}$/.test(numeroDocumento))
    );
  }

  return false;
}

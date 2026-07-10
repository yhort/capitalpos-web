import { HttpErrorResponse } from '@angular/common/http';

import { ApiResponse } from '../../models/api-response.model';
import { CpeEmisionEstado, CpeEmisionResponse } from '../../models/cpe-emision-response.model';
import {
  clasificarEstadoEmisionCpe,
  EmisionCpeEstado,
  resolverErrorHttpEmisionCpe,
} from './emitir-cpe-page.component';

describe('clasificarEstadoEmisionCpe', () => {
  it.each([
    ['SIMULADO', true, 'exito'],
    ['ACEPTADO', true, 'exito'],
    ['RECHAZADO', false, 'rechazo'],
    ['ERROR_VALIDACION', false, 'error-validacion'],
    ['ERROR_SUNAT', false, 'error'],
    ['ERROR_CPE', false, 'error'],
  ] satisfies readonly (readonly [CpeEmisionEstado, boolean, EmisionCpeEstado])[])(
    'classifies %s as %s',
    (estado, apiOk, estadoVisual) => {
      expect(clasificarEstadoEmisionCpe(apiOk, crearEmisionResponse(estado, apiOk))).toBe(estadoVisual);
    },
  );

  it.each([
    'ERROR_XML',
    'ERROR_FIRMA',
    'ERROR_SUNAT',
    'ERROR_CDR',
    'ERROR_INTERNO',
    'ERROR_CPE',
    'RESPUESTA_CPE_INVALIDA',
  ] satisfies readonly CpeEmisionEstado[])('does not classify %s as success', (estado) => {
    expect(clasificarEstadoEmisionCpe(false, crearEmisionResponse(estado, false))).not.toBe('exito');
  });
});

describe('resolverErrorHttpEmisionCpe', () => {
  it('uses a normalized HTTP 400 RECHAZADO body as functional rejection', () => {
    const response = crearApiResponse('RECHAZADO', false, 'El comprobante fue rechazado.');
    const resultado = resolverErrorHttpEmisionCpe(crearHttpError(400, response));

    expect(resultado.estado).toBe('rechazo');
    expect(resultado.mensaje).toBe('El comprobante fue rechazado.');
    expect(resultado.errores).toEqual(['No se pudo completar la emision.']);
    expect(resultado.respuesta).toEqual(response.data);
  });

  it('uses a normalized HTTP 400 ERROR_VALIDACION body as validation error', () => {
    const response = crearApiResponse('ERROR_VALIDACION', false, 'El comprobante tiene errores de validacion.');
    const resultado = resolverErrorHttpEmisionCpe(crearHttpError(400, response));

    expect(resultado.estado).toBe('error-validacion');
    expect(resultado.mensaje).toBe('El comprobante tiene errores de validacion.');
    expect(resultado.respuesta).toEqual(response.data);
  });

  it('uses a normalized HTTP 502 RESPUESTA_CPE_INVALIDA body as technical error with contract message', () => {
    const response = crearApiResponse(
      'RESPUESTA_CPE_INVALIDA',
      false,
      'No se pudo interpretar la respuesta del servicio CPE.',
    );
    const resultado = resolverErrorHttpEmisionCpe(crearHttpError(502, response));

    expect(resultado.estado).toBe('error');
    expect(resultado.mensaje).toBe('No se pudo interpretar la respuesta del servicio CPE.');
    expect(resultado.respuesta).toEqual(response.data);
  });

  it('accepts normalized bodies with nullable emission message and codes', () => {
    const response: ApiResponse<CpeEmisionResponse> = {
      ok: false,
      mensaje: 'Servicio CPE no disponible.',
      data: {
        ...crearEmisionResponse('ERROR_CPE', false),
        mensaje: null,
        codigo: null,
        errores: [
          {
            codigo: null,
            campo: null,
            mensaje: 'Servicio CPE no disponible.',
          },
        ],
      },
      errores: ['Servicio CPE no disponible.'],
    };

    const resultado = resolverErrorHttpEmisionCpe(crearHttpError(502, response));

    expect(resultado.estado).toBe('error');
    expect(resultado.mensaje).toBe('Servicio CPE no disponible.');
    expect(resultado.errores).toEqual(['Servicio CPE no disponible.']);
    expect(resultado.respuesta).toEqual(response.data);
  });

  it('uses generic fallback when the HTTP error has no normalized body', () => {
    const resultado = resolverErrorHttpEmisionCpe(crearHttpError(500, 'upstream failure'));

    expect(resultado.estado).toBe('error');
    expect(resultado.mensaje).toBe('capitalpos-api respondió con estado HTTP 500.');
    expect(resultado.errores).toEqual([]);
    expect(resultado.respuesta).toBeNull();
  });
});

function crearHttpError(status: number, error: unknown): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error,
    statusText: 'Error',
    url: '/api/cpe/emitir',
  });
}

function crearApiResponse(
  estado: CpeEmisionEstado,
  ok: boolean,
  mensaje: string,
): ApiResponse<CpeEmisionResponse> {
  return {
    ok,
    mensaje,
    data: crearEmisionResponse(estado, ok, mensaje),
    errores: ok ? [] : ['No se pudo completar la emision.'],
  };
}

function crearEmisionResponse(
  estado: CpeEmisionEstado,
  ok: boolean,
  mensaje = 'Resultado de emision CPE.',
): CpeEmisionResponse {
  return {
    ok,
    estado,
    mensaje,
    codigo: estado,
    comprobante: ok ? 'B001-1' : null,
    hash: ok ? 'abc123' : null,
    nombreXml: ok ? '20123456789-03-B001-1.xml' : null,
    nombreZip: ok ? '20123456789-03-B001-1.zip' : null,
    nombreCdr: ok ? 'R-20123456789-03-B001-1.zip' : null,
    errores: ok
      ? []
      : [
          {
            codigo: estado,
            campo: null,
            mensaje: 'No se pudo completar la emision.',
          },
        ],
  };
}

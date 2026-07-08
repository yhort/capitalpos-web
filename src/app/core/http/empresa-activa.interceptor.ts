import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { EmpresaActivaService } from '../empresa/empresa-activa.service';

export const empresaActivaInterceptor: HttpInterceptorFn = (request, next) => {
  const empresaId = inject(EmpresaActivaService).empresaId()?.trim();

  if (!empresaId || !requiereEmpresaActiva(request.url)) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        'X-CapitalPos-EmpresaId': empresaId,
      },
    }),
  );
};

function requiereEmpresaActiva(url: string): boolean {
  const path = obtenerPath(url);

  return (
    path.startsWith('/api/') &&
    !path.startsWith('/api/auth/') &&
    path !== '/api/health'
  );
}

function obtenerPath(url: string): string {
  return url.split(/[?#]/, 1)[0];
}

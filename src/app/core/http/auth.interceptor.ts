import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const authorization = authService.obtenerAuthorizationHeader();

  if (!authorization || !requiereAuthorization(request.url)) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: authorization,
      },
    }),
  );
};

function requiereAuthorization(url: string): boolean {
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

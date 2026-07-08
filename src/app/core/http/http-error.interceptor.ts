import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';

export const httpErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && esApiCapitalPos(request.url)) {
        if (error.status === 401) {
          authService.logout();
          router.navigate(['/auth/login'], {
            queryParams: {
              returnUrl: router.url,
              error: 'unauthorized',
            },
          });
        }

        if (error.status === 403) {
          router.navigate(['/auth/login'], {
            queryParams: {
              returnUrl: router.url,
              error: 'forbidden',
            },
          });
        }
      }

      return throwError(() => error);
    }),
  );
};

function esApiCapitalPos(url: string): boolean {
  return url.startsWith('/api/');
}

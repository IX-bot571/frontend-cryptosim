import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { ORIGENES_CON_JWT } from './core/api.config';

/** Agrega Authorization: Bearer <JWT> a las llamadas hacia ms-alertas, ms-precios y ms-admin-kafka. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!ORIGENES_CON_JWT.some((origen) => req.url.startsWith(origen))) {
    return next(req);
  }
  const auth = inject(AuthService);
  return from(auth.getToken()).pipe(
    switchMap((token) =>
      next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })),
    ),
  );
};

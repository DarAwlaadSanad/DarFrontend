import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';

let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error) => {
      if (
        error instanceof HttpErrorResponse && 
        error.status === 401 && 
        !req.url.includes('/login') && 
        !req.url.includes('/refresh')
      ) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap((authResponse: any) => {
              isRefreshing = false;
              refreshTokenSubject.next(authResponse.token);
              return next(req.clone({
                setHeaders: { Authorization: `Bearer ${authResponse.token}` }
              }));
            }),
            catchError((err) => {
              isRefreshing = false;
              authService.logout();
              return throwError(() => err);
            })
          );
        } else {
          return refreshTokenSubject.pipe(
            filter(newToken => newToken != null),
            take(1),
            switchMap((jwt) => {
              return next(req.clone({
                setHeaders: { Authorization: `Bearer ${jwt}` }
              }));
            })
          );
        }
      }
      return throwError(() => error);
    })
  );
};

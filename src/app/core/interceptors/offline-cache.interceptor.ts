import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { OfflineCacheService } from '../services/offline-cache.service';

export const offlineCacheInterceptor: HttpInterceptorFn = (req, next) => {
  const cache = inject(OfflineCacheService);

  // 1. Invalidate cache on mutations (POST, PUT, DELETE, PATCH)
  if (req.method !== 'GET') {
    return next(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse && event.status >= 200 && event.status < 300) {
          cache.invalidateForUrl(req.url);
        }
      })
    );
  }

  // 2. Skip non-cacheable endpoints
  if (
    req.url.includes('/login') ||
    req.url.includes('/refresh') ||
    req.url.includes('/logout') ||
    req.url.includes('/hubs/') ||
    req.url.includes('/export') ||
    req.headers.has('X-Skip-Cache')
  ) {
    return next(req);
  }

  const cacheKey = req.urlWithParams;

  // 3. If offline, serve directly from Local Storage cache immediately
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const cachedData = cache.get(cacheKey);
    if (cachedData !== null) {
      cache.recordCacheHit(cacheKey);
      return of(
        new HttpResponse({
          status: 200,
          statusText: 'OK (Served from Offline LocalStorage)',
          body: cachedData,
          headers: req.headers.set('X-Served-From-Cache', 'true')
        })
      );
    }
  }

  // 4. Network-first with automatic local caching and offline fallback
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse && event.status === 200) {
        // Cache the fresh response in Local Storage
        cache.set(cacheKey, event.body);
      }
    }),
    catchError((error: any) => {
      // If network fails (error.status === 0, 502, 503, 504, or browser went offline)
      const isNetworkIssue =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error.status === 0 ||
        error.status === 502 ||
        error.status === 503 ||
        error.status === 504;

      if (isNetworkIssue) {
        const cachedData = cache.get(cacheKey);
        if (cachedData !== null) {
          cache.recordCacheHit(cacheKey);
          return of(
            new HttpResponse({
              status: 200,
              statusText: 'OK (Fallback from Offline LocalStorage)',
              body: cachedData,
              headers: req.headers.set('X-Served-From-Cache', 'true')
            })
          );
        }
      }

      return throwError(() => error);
    })
  );
};

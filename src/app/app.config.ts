import { ApplicationConfig, LOCALE_ID, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { GlobalErrorHandler } from './core/handlers/global-error.handler';
import { registerLocaleData } from '@angular/common';
import localeArEg from '@angular/common/locales/ar-EG';

registerLocaleData(localeArEg);

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: LOCALE_ID, useValue: 'ar-EG' }
  ],
};

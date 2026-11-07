import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideApiConfiguration } from './api/generated/api-configuration';
import { userInterceptor } from './core/user.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([userInterceptor])),
    // The dev server proxies /api to intellect-api (proxy.conf.json); in production the ingress does.
    provideApiConfiguration('/api'),
  ],
};

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ApiConfiguration } from '../api/generated/api-configuration';
import { Session } from './session';

/** Stub auth: tells the API who is asking. Real auth replaces this interceptor and nothing else. */
export const userInterceptor: HttpInterceptorFn = (req, next) => {
  const rootUrl = inject(ApiConfiguration).rootUrl;
  if (!req.url.startsWith(rootUrl)) return next(req);
  const userId = inject(Session).userId();
  return next(req.clone({ setHeaders: { 'X-Intellect-User': userId } }));
};

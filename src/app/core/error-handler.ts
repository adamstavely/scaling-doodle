import { ErrorHandler, Injectable } from '@angular/core';

/**
 * Angular's handler, without the browser's "ResizeObserver loop" notice. Browsers raise it when a ResizeObserver
 * callback (a chart sizing itself, say) changes layout in the same frame; the rest of the notifications arrive in the
 * next one, so nothing is lost. provideBrowserGlobalErrorListeners forwards it as an app error otherwise.
 */
@Injectable()
export class AppErrorHandler extends ErrorHandler {
  override handleError(error: unknown): void {
    if (isResizeObserverLoop(error)) return;
    super.handleError(error);
  }
}

export function isResizeObserverLoop(error: unknown): boolean {
  const message = (e: unknown) => (e instanceof ErrorEvent || e instanceof Error ? e.message : String(e ?? ''));
  const cause = error instanceof Error ? error.cause : undefined;
  return [error, cause].some((e) => message(e).startsWith('ResizeObserver loop'));
}

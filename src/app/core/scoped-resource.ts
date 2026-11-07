import { inject, resource } from '@angular/core';
import { Api } from '../api/generated/api';
import { Session } from './session';

/**
 * Loads API data for the current viewer. Every screen is scoped by role on the server, so the data reloads
 * whenever the role switch changes. Call from an injection context (a field initializer).
 */
export function scopedResource<R>(load: (api: Api) => Promise<R>) {
  const api = inject(Api);
  const session = inject(Session);
  return resource({
    params: () => session.viewAs(),
    loader: () => load(api),
  });
}

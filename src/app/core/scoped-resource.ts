import { inject, resource } from '@angular/core';
import { Api } from '../api/generated/api';
import { Session } from './session';

/**
 * Loads API data for the current viewer. Every screen is scoped by role on the server, so the data reloads
 * whenever the role switch changes. Pass `when` to hold off until it's true (e.g. until a dialog opens), and `key`
 * for anything else the request depends on (e.g. a period), so a change to it reloads too.
 * Call from an injection context (a field initializer).
 */
export function scopedResource<R>(load: (api: Api) => Promise<R>, when?: () => boolean, key?: () => unknown) {
  const api = inject(Api);
  const session = inject(Session);
  return resource({
    params: () => (when && !when() ? undefined : { as: session.viewAs(), key: key?.() }),
    loader: () => load(api),
  });
}

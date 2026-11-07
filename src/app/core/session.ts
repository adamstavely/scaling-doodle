import { Injectable, inject, resource, signal } from '@angular/core';
import { Api } from '../api/generated/api';
import { meControllerMe } from '../api/generated/fn/me/me-controller-me';

/** The people the role switch acts as until real auth replaces the stub (ids from the seed). */
export const VIEW_AS = {
  chief: { id: 'hv', label: 'Chief view' },
  pi: { id: 'mo', label: 'PI view' },
} as const;

export type ViewAs = keyof typeof VIEW_AS;

const STORAGE_KEY = 'intellect.viewAs';

function storedViewAs(): ViewAs {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'pi' ? 'pi' : 'chief';
  } catch {
    return 'chief';
  }
}

/**
 * Who the app is acting as. The API's auth is stubbed: every request carries `X-Intellect-User`
 * (see `userInterceptor`), and this service is the only place that decides its value.
 */
@Injectable({ providedIn: 'root' })
export class Session {
  readonly #api = inject(Api);

  readonly viewAs = signal<ViewAs>(storedViewAs());

  /** The current person, refetched whenever the role switch changes. */
  readonly me = resource({
    params: () => this.viewAs(),
    loader: () => this.#api.invoke(meControllerMe),
  });

  userId(): string {
    return VIEW_AS[this.viewAs()].id;
  }

  setViewAs(next: ViewAs): void {
    this.viewAs.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the switch still works for this tab.
    }
  }
}

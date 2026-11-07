import { Component, computed, inject, resource, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommandMenu } from '@adamstavely/trenchcoat/angular/command-menu';
import { Api } from '../../api/generated/api';
import { searchControllerSearch } from '../../api/generated/fn/search/search-controller-search';
import { read } from '../../core/scoped-resource';
import { Session } from '../../core/session';
import { searchGroups, searchTarget } from './search';

const DEBOUNCE_MS = 200;
const MIN_CHARS = 2;

/** The top bar's ⌘K search over topics, gaps, papers and people, scoped to the viewer like everything else. */
@Component({
  selector: 'app-search-box',
  imports: [CommandMenu],
  template: `
    <tc-command-menu
      layout="popover"
      filter="none"
      assistant="false"
      inverse
      label="Search"
      placeholder="Search topics, gaps, papers, people…"
      empty-text="Nothing matches “{query}”"
      [groups]="groups()"
      [loading]="results.isLoading()"
      [onRun]="run"
      (tc-query-change)="query.set($event.detail.query)"
    ></tc-command-menu>
  `,
  styles: `
    :host {
      display: block;
      width: min(420px, 40vw);
    }
  `,
})
export class SearchBox {
  readonly #api = inject(Api);
  readonly #router = inject(Router);
  readonly #session = inject(Session);

  protected readonly query = signal('');

  protected readonly results = resource({
    params: () => {
      const q = this.query().trim();
      return q.length >= MIN_CHARS ? { q, as: this.#session.viewAs() } : undefined;
    },
    loader: async ({ params, abortSignal }) => {
      // Wait for typing to pause; a newer query aborts this one.
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, DEBOUNCE_MS);
        abortSignal.addEventListener('abort', () => (clearTimeout(t), reject(abortSignal.reason)));
      });
      return this.#api.invoke(searchControllerSearch, { q: params.q, limit: 5 });
    },
  });

  protected readonly groups = computed(() => {
    const r = read(this.results);
    return r && this.query().trim().length >= MIN_CHARS ? searchGroups(r) : [];
  });

  protected readonly run = (id: string): void => {
    const target = searchTarget(id);
    if (target) void this.#router.navigate(target);
  };
}

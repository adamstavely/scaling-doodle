import { Component, computed, ElementRef, inject, resource, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommandMenu } from '@adamstavely/trenchcoat/angular/command-menu';
import type { CommandMenuGroup } from '@adamstavely/trenchcoat/command-menu';
import { Api } from '../../api/generated/api';
import { searchControllerSearch } from '../../api/generated/fn/search/search-controller-search';
import { read } from '../../core/scoped-resource';
import { Session } from '../../core/session';
import { searchGroups, searchTargets } from './search';

const DEBOUNCE_MS = 200;
const MIN_CHARS = 2;

/** The command that runs a failed search again. */
const RETRY = 'search:retry';
/** What shows when the search itself failed, as opposed to finding nothing. */
const SEARCH_FAILED: CommandMenuGroup = {
  id: 'failed',
  label: "Couldn't search – the server didn't answer",
  commands: [{ id: RETRY, label: 'Try again' }],
};

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
    /* At the top bar's 32px, with the bell, the app picker and the avatar */
    tc-command-menu {
      --tc-control-h-md: 32px;
      --tc-control-h-sm: 28px;
    }
    /* On a narrow screen the search has its own row across the top bar */
    @media (max-width: 640px) {
      :host {
        width: 100%;
      }
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

  /**
   * The results – or, when the search failed, a group that says so with a Try again command, so a failure never reads
   * as "Nothing matches".
   */
  protected readonly groups = computed(() => {
    if (this.query().trim().length < MIN_CHARS) return [];
    if (this.results.error()) return [SEARCH_FAILED];
    const r = read(this.results);
    return r ? searchGroups(r) : [];
  });
  /** Where each shown command leads. */
  readonly #targets = computed(() => {
    const r = read(this.results);
    return r ? searchTargets(r) : new Map<string, string[]>();
  });

  readonly #host = inject(ElementRef<HTMLElement>);

  protected readonly run = (id: string): Promise<void> | void => {
    if (id === RETRY) return this.#retry();
    const target = this.#targets().get(id);
    if (target) void this.#router.navigate(target);
  };

  /**
   * Runs the search again. The menu shows it pending, then "Couldn't run Try again" if it fails once more; when it
   * works, focusing the field opens the results again – unless the viewer has moved on meanwhile, to another page or
   * another field, when the focus stays where they put it.
   */
  async #retry(): Promise<void> {
    const url = this.#router.url;
    this.results.reload();
    await new Promise<void>((resolve, reject) => {
      const check = () => {
        if (this.results.isLoading()) return void setTimeout(check, 50);
        if (this.results.error()) reject(this.results.error());
        else resolve();
      };
      setTimeout(check, 0);
    });
    const host = this.#host.nativeElement;
    const focused = document.activeElement;
    const stayed = this.#router.url === url && (!focused || focused === document.body || host.contains(focused));
    if (stayed) host.querySelector('input')?.focus();
  }
}

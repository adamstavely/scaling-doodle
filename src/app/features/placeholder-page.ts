import { Component, inject, input } from '@angular/core';
import { Session } from '../core/session';

/** Stands in for a screen until it's built (milestone 1, step E). Shows the API wiring works. */
@Component({
  selector: 'app-placeholder-page',
  template: `
    <h1>{{ heading() }}</h1>
    @if (session.me.value(); as me) {
      <p>Viewing as {{ me.name }} · {{ me.title }}</p>
    } @else if (session.me.error()) {
      <p role="alert">Can't reach the API. Is intellect-api running on port 3000?</p>
    }
  `,
  styles: `
    h1 { font-size: var(--tc-font-size-2xl); font-weight: var(--tc-font-weight-semibold); margin: 0 0 var(--tc-space-2); }
    p { color: var(--tc-text-secondary); margin: 0; }
  `,
})
export class PlaceholderPage {
  protected readonly session = inject(Session);
  readonly heading = input.required<string>();
}

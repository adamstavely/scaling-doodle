import { Component, computed, inject, input, output, resource } from '@angular/core';
import { Router } from '@angular/router';
import { html } from 'lit';
import { Dialog } from '@adamstavely/trenchcoat/angular';
import '@adamstavely/trenchcoat/button';
import '@adamstavely/trenchcoat/data-table';
import '@adamstavely/trenchcoat/digest';
import '@adamstavely/trenchcoat/gap-exposure';
import '@adamstavely/trenchcoat/ops-overview';
import '@adamstavely/trenchcoat/results-list';
import '@adamstavely/trenchcoat/shimmer-loader';
import { Api } from '../../api/generated/api';
import { briefControllerBrief } from '../../api/generated/fn/brief/brief-controller-brief';
import { Session } from '../../core/session';
import { briefTemplate } from './brief';

@Component({
  selector: 'app-brief-dialog',
  imports: [Dialog],
  template: `
    <tc-dialog
      class="brief-dialog"
      label="Directorate brief"
      description="The portfolio's state for the period, ready to print or share."
      close-label="Close"
      [open]="!!period()"
      [content]="content()"
      [actions]="actions"
      (tc-open-change)="onOpenChange($event)"
    ></tc-dialog>
  `,
})
export class BriefDialog {
  readonly #api = inject(Api);
  readonly #router = inject(Router);
  readonly #session = inject(Session);

  /** The period to brief (`ytd`, `FY26`, `FY26-Q2`); unset keeps the dialog closed. */
  readonly period = input<string | undefined>();
  readonly closed = output<void>();

  readonly #brief = resource({
    params: () => (this.period() ? { period: this.period()!, as: this.#session.viewAs() } : undefined),
    loader: ({ params }) => this.#api.invoke(briefControllerBrief, { period: params.period }),
  });

  protected readonly actions = html`<tc-button label="Print" variant="primary" @click=${() => window.print()}></tc-button>`;

  protected readonly content = computed(() => {
    if (!this.period()) return undefined;
    if (this.#brief.error()) return html`<p role="alert">Couldn't generate the brief. Try again.</p>`;
    const brief = this.#brief.hasValue() ? this.#brief.value() : undefined;
    if (!brief) return html`<tc-skeleton height="480" radius="12"></tc-skeleton>`;
    return briefTemplate(brief, {
      route: (url) => {
        this.closed.emit();
        void this.#router.navigateByUrl(url);
      },
    });
  });

  protected onOpenChange(event: CustomEvent<{ open: boolean }>): void {
    if (!event.detail.open) this.closed.emit();
  }
}

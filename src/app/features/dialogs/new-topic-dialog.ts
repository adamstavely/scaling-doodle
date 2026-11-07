import { Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { html } from 'lit';
import { Dialog } from '@adamstavely/trenchcoat/angular';
import '@adamstavely/trenchcoat/stepper-form';
import { orgControllerTree } from '../../api/generated/fn/org/org-controller-tree';
import { peopleControllerList } from '../../api/generated/fn/people/people-controller-list';
import { topicsControllerCreate } from '../../api/generated/fn/topics/topics-controller-create';
import { Api } from '../../api/generated/api';
import { scopedResource } from '../../core/scoped-resource';
import { Session } from '../../core/session';
import { createBody, EMPTY_TOPIC, NewTopicValues, newTopicSteps, teamOptions } from './new-topic';

@Component({
  selector: 'app-new-topic-dialog',
  imports: [Dialog],
  template: `
    <tc-dialog
      label="New topic"
      description="Define it, place it in a team, and fund it. Health and coverage are computed once work is linked."
      close-label="Cancel"
      [open]="open()"
      [content]="content()"
      (tc-open-change)="onOpenChange($event)"
    ></tc-dialog>
  `,
})
export class NewTopicDialog {
  readonly #api = inject(Api);
  readonly #router = inject(Router);
  readonly #session = inject(Session);

  readonly open = input(false);
  readonly closed = output<void>();

  readonly #org = scopedResource((api) => api.invoke(orgControllerTree), this.open);
  readonly #people = scopedResource((api) => api.invoke(peopleControllerList), this.open);

  readonly #teams = computed(() => {
    const me = this.#session.me.value();
    return me ? teamOptions(this.#org.value(), this.#people.value() ?? [], me) : [];
  });

  /** Rebuilt each time the dialog opens, so a new topic starts from a clean form. */
  protected readonly content = computed(() => {
    if (!this.open()) return undefined;
    const me = this.#session.me.value();
    const teams = this.#teams();
    if (!me || !teams.length) return html`<tc-skeleton height="240" radius="12"></tc-skeleton>`;
    // A PI has one team, so center and team come pre-picked.
    const only = teams.length === 1 ? teams[0] : undefined;
    const values: NewTopicValues = { ...EMPTY_TOPIC, centerId: only?.centerId ?? '', teamId: only?.id ?? '' };
    return html`<tc-stepper-form
      submit-label="Create topic"
      submitting-label="Creating…"
      .steps=${newTopicSteps(teams)}
      .values=${values}
      .onComplete=${(v: NewTopicValues) => this.#create(v, teams, me)}
      .success=${null}
    ></tc-stepper-form>`;
  });

  async #create(values: NewTopicValues, teams: ReturnType<typeof teamOptions>, me: { id: string; role: string }) {
    try {
      const topic = await this.#api.invoke(topicsControllerCreate, { body: createBody(values, teams, me) });
      this.closed.emit();
      await this.#router.navigate(['/topics', topic.id]);
    } catch {
      // tc-stepper-form shows a thrown message beside Finish, which retries.
      throw new Error("Couldn't create the topic. Check the details and try again.");
    }
  }

  protected onOpenChange(event: CustomEvent<{ open: boolean }>): void {
    if (!event.detail.open) this.closed.emit();
  }
}

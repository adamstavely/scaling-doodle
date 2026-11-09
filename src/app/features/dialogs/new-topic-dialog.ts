import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { html } from 'lit';
import { Dialog } from '@adamstavely/trenchcoat/angular/dialog';
import type { TcPriorityList } from '@adamstavely/trenchcoat/priority-list';
import '@adamstavely/trenchcoat/button';
import '@adamstavely/trenchcoat/priority-list';
import '@adamstavely/trenchcoat/slider-field';
import '@adamstavely/trenchcoat/stepper-form';
import { orgControllerTree } from '../../api/generated/fn/org/org-controller-tree';
import { peopleControllerList } from '../../api/generated/fn/people/people-controller-list';
import { topicsControllerCreate } from '../../api/generated/fn/topics/topics-controller-create';
import type { TopicDetailDto } from '../../api/generated/models/topic-detail-dto';
import { Api } from '../../api/generated/api';
import { PRIORITY_TIERS } from '../../core/format';
import { read, scopedResource } from '../../core/scoped-resource';
import { Session } from '../../core/session';
import { createBody, EMPTY_TOPIC, NewTopicValues, newTopicSteps, previewItem, teamOptions } from './new-topic';

/** A fresh Idempotency-Key: 128 random bits as hex (crypto.randomUUID needs HTTPS; this works on plain HTTP too). */
const newKey = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');

@Component({
  selector: 'app-new-topic-dialog',
  imports: [Dialog],
  template: `
    <tc-dialog
      size="lg"
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
  /** A topic was created; the page behind can refresh. */
  readonly created = output<TopicDetailDto>();

  readonly #org = scopedResource((api) => api.invoke(orgControllerTree), this.open);
  readonly #people = scopedResource((api) => api.invoke(peopleControllerList), this.open);

  /** Everything the form needs has arrived – the form opens only then, so a late answer never resets a draft. */
  readonly #loaded = computed(() => !!read(this.#session.me) && this.#org.hasValue() && this.#people.hasValue());

  readonly #teams = computed(() => {
    const me = read(this.#session.me);
    return me && this.#loaded() ? teamOptions(read(this.#org), read(this.#people) ?? [], me) : [];
  });
  readonly #steps = computed(() => newTopicSteps(this.#teams()));

  /**
   * The form's starting values, rebuilt each time the dialog opens so a new topic starts clean. Kept apart from the
   * draft below so redrawing the preview never hands the form new values (which would reset it).
   */
  readonly #initial = computed<NewTopicValues | undefined>(() => {
    if (!this.open() || !this.#loaded()) return undefined;
    const teams = this.#teams();
    if (!teams.length) return undefined;
    // The scope step only asks for a center when there's more than one, and for a team when its center has more than
    // one, so pre-pick whichever is the only choice (a PI's one team; a single center with several teams).
    const centerIds = [...new Set(teams.map((t) => t.centerId))];
    const only = teams.length === 1 ? teams[0] : undefined;
    return { ...EMPTY_TOPIC, centerId: centerIds.length === 1 ? centerIds[0] : '', teamId: only?.id ?? '' };
  });
  /** What's been entered so far, for the live preview. */
  readonly #draft = signal<NewTopicValues | undefined>(undefined);
  readonly #createdTopic = signal<TopicDetailDto | undefined>(undefined);
  /**
   * The Idempotency-Key for this New Topic: one per opening, kept across Create's retries, so a retry after the topic
   * was saved but the answer was lost finishes that topic instead of making a second.
   */
  #idempotencyKey = newKey();

  /**
   * The live preview. tc-dialog redraws its whole content when the template changes, which would rebuild the form
   * and lose what's been typed, so the template never depends on the draft: this one element is placed in it and its
   * items are updated directly as the draft changes.
   */
  readonly #preview = Object.assign(document.createElement('tc-priority-list') as TcPriorityList, {
    heading: 'Live preview',
    description: 'How it will appear in Priorities',
    noFilters: true,
    tiers: PRIORITY_TIERS,
  });

  constructor() {
    // However the dialog closed – Cancel, Escape, or the browser's Back taking `?new=topic` away, which never passes
    // through #close – it opens clean: a new key, so a different topic isn't refused as a replay of the last one.
    effect(() => {
      if (this.open()) untracked(() => this.#reset());
    });
    effect(() => {
      const me = read(this.#session.me);
      const draft = this.#draft() ?? this.#initial();
      if (me && draft) this.#preview.items = [previewItem(draft, this.#teams(), me)];
    });
  }

  protected readonly content = computed(() => {
    if (!this.open()) return undefined;
    if (this.#org.error() || this.#people.error() || this.#session.me.error()) {
      return html`<p role="alert">Couldn't load the teams to choose from. Close this and try again.</p>`;
    }
    const me = read(this.#session.me);
    if (!me || !this.#loaded()) return html`<tc-skeleton height="240" radius="12"></tc-skeleton>`;
    const teams = this.#teams();
    const initial = this.#initial();
    // Loaded, but no team to create a topic in: say so rather than loading forever
    if (!initial) return html`<p role="status">You're not on a team that can hold topics yet, so there's nowhere to create one. Ask the Directorate to add you to a team.</p>`;
    return html`<div class="new-topic">
      <tc-stepper-form
        submit-label="Create topic"
        submitting-label="Creating…"
        .steps=${this.#steps()}
        .values=${initial}
        .onComplete=${(v: NewTopicValues) => this.#create(v, teams, me)}
        .success=${() => this.#success()}
        @tc-values-change=${(e: CustomEvent<{ values: NewTopicValues }>) => this.#draft.set(e.detail.values)}
      ></tc-stepper-form>
      <aside class="new-topic-preview" aria-label="Live preview">${this.#preview}</aside>
    </div>`;
  });

  #success() {
    const topic = this.#createdTopic();
    if (!topic) return html``;
    const where = [topic.center?.name, topic.team?.name].filter(Boolean).join(' · ');
    return html`<tc-stepper-success
      heading="Topic created"
      description=${`${topic.name} is now tracked${where ? ` under ${where}` : ''}. It's live on the dashboard.`}
    >
      <tc-button label="Open topic" variant="primary" @click=${() => this.#leave(['/topics', topic.id])}></tc-button>
      <tc-button label="View on dashboard" variant="secondary" @click=${() => this.#leave(['/'])}></tc-button>
    </tc-stepper-success>`;
  }

  async #create(values: NewTopicValues, teams: ReturnType<typeof teamOptions>, me: { id: string; role: string }) {
    try {
      const topic = await this.#api.invoke(topicsControllerCreate, {
        'idempotency-key': this.#idempotencyKey,
        body: createBody(values, teams, me),
      });
      this.#createdTopic.set(topic);
      this.created.emit(topic);
    } catch (e) {
      // tc-stepper-form shows a thrown message beside Finish, which retries.
      if (e instanceof HttpErrorResponse && e.status === 409) {
        // An earlier try saved the topic, and the details have changed since: the key can't make a second one
        throw new Error('This topic was already saved with the earlier details. Close this to find it under Research Topics.');
      }
      throw new Error("Couldn't create the topic. Check the details and try again.");
    }
  }

  #leave(commands: string[]): void {
    this.#close();
    void this.#router.navigate(commands);
  }

  /** Forget the draft, the created topic and the key, so the next New topic starts clean. */
  #reset(): void {
    this.#draft.set(undefined);
    this.#createdTopic.set(undefined);
    this.#idempotencyKey = newKey();
  }

  #close(): void {
    this.#reset();
    this.closed.emit();
  }

  protected onOpenChange(event: CustomEvent<{ open: boolean }>): void {
    if (!event.detail.open) this.#close();
  }
}

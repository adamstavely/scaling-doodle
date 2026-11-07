import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '@adamstavely/trenchcoat/angular/button';
import { PriorityList } from '@adamstavely/trenchcoat/angular/priority-list';
import { Skeleton } from '@adamstavely/trenchcoat/angular/shimmer-loader';
import type { PriorityItem, PriorityOpen } from '@adamstavely/trenchcoat/priority-list';
import { topicsControllerList } from '../../api/generated/fn/topics/topics-controller-list';
import { PRIORITY_TIERS } from '../../core/format';
import { read, scopedResource } from '../../core/scoped-resource';
import { Session } from '../../core/session';
import { topicPriorityItem } from '../../core/topics';
import { NewTopicDialog } from '../dialogs/new-topic-dialog';

/** Every topic in view, grouped by priority, with the list's own health filters. */
@Component({
  selector: 'app-topics-page',
  imports: [PriorityList, Button, Skeleton, NewTopicDialog],
  templateUrl: './topics.page.html',
  styleUrl: './topics.page.css',
})
export class TopicsPage {
  readonly #router = inject(Router);
  readonly #session = inject(Session);

  /** `?new=topic` opens the New Topic dialog, as on the dashboard. */
  readonly newParam = input<string | undefined>(undefined, { alias: 'new' });

  readonly #topics = scopedResource((api) => api.invoke(topicsControllerList, { sort: 'risk' }));

  protected readonly tiers = PRIORITY_TIERS;
  protected readonly error = computed(() => this.#topics.error());
  protected readonly ready = computed(() => this.#topics.hasValue());
  protected readonly items = computed<PriorityItem[]>(() => (read(this.#topics) ?? []).map(topicPriorityItem));
  protected readonly scopeLabel = computed(() =>
    this.#session.viewAs() === 'chief' ? 'Directorate · all topics' : `${read(this.#session.me)?.name ?? ''} · your topics`,
  );

  protected openTopic(event: CustomEvent<PriorityOpen>): void {
    void this.#router.navigate(['/topics', event.detail.id]);
  }

  protected setNew(value: string | null): void {
    void this.#router.navigate([], { queryParams: { new: value }, queryParamsHandling: 'merge' });
  }

  protected onTopicCreated(): void {
    this.#topics.reload();
  }
}

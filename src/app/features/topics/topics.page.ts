import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '@adamstavely/trenchcoat/angular/button';
import { FacetSidebar } from '@adamstavely/trenchcoat/angular/facet-sidebar';
import { PriorityList } from '@adamstavely/trenchcoat/angular/priority-list';
import { Skeleton } from '@adamstavely/trenchcoat/angular/shimmer-loader';
import type { FacetQueryChange, FacetValueChange } from '@adamstavely/trenchcoat/facet-sidebar';
import type { PriorityItem, PriorityOpen } from '@adamstavely/trenchcoat/priority-list';
import { orgControllerTree } from '../../api/generated/fn/org/org-controller-tree';
import { topicsControllerList } from '../../api/generated/fn/topics/topics-controller-list';
import { PRIORITY_TIERS } from '../../core/format';
import { read, scopedResource } from '../../core/scoped-resource';
import { Session } from '../../core/session';
import { facetValue, filterParams, filterTopics, parseFilters, QueryParam, TopicFilters, topicFacets } from '../../core/topic-filters';
import { topicPriorityItem } from '../../core/topics';
import { NewTopicDialog } from '../dialogs/new-topic-dialog';

/**
 * Every topic in view, grouped by priority, with the list's own health filters – and beside it a search box and filters
 * by priority, priority type, region and subject, kept in the URL so a filtered list can be linked to.
 */
@Component({
  selector: 'app-topics-page',
  imports: [PriorityList, FacetSidebar, Button, Skeleton, NewTopicDialog],
  templateUrl: './topics.page.html',
  styleUrl: './topics.page.css',
})
export class TopicsPage {
  readonly #router = inject(Router);
  readonly #session = inject(Session);

  /** `?new=topic` opens the New Topic dialog, as on the dashboard. */
  readonly newParam = input<string | undefined>(undefined, { alias: 'new' });
  /**
   * The filters, from the query params: `?q=quantum&priority=1&priority=2&type=national&region=c-nemc&subject=climate`.
   * Each may come once or repeated, whatever the URL says, so parseFilters checks them.
   */
  readonly q = input<QueryParam>();
  readonly priority = input<QueryParam>();
  readonly type = input<QueryParam>();
  readonly region = input<QueryParam>();
  readonly subject = input<QueryParam>();

  readonly #topics = scopedResource((api) => api.invoke(topicsControllerList, { sort: 'risk' }));
  readonly #org = scopedResource((api) => api.invoke(orgControllerTree));

  protected readonly tiers = PRIORITY_TIERS;
  protected readonly error = computed(() => this.#topics.error());
  // The centers too, so Region doesn't show empty while they load; without them, the other filters still work.
  protected readonly ready = computed(() => this.#topics.hasValue() && (this.#org.hasValue() || !!this.#org.error()));
  /**
   * The filters: the URL's, and set here as they change so a second change before the URL catches up (Clear all
   * empties the search, then the filters) builds on the first rather than on the URL it replaces.
   */
  protected readonly filters = linkedSignal(() =>
    parseFilters({ q: this.q(), priority: this.priority(), type: this.type(), region: this.region(), subject: this.subject() }),
  );
  readonly #all = computed(() => read(this.#topics) ?? []);
  readonly #shown = computed(() => filterTopics(this.#all(), this.filters()));
  protected readonly items = computed<PriorityItem[]>(() => this.#shown().map(topicPriorityItem));
  protected readonly facets = computed(() => topicFacets(this.#all(), read(this.#org)?.centers ?? [], this.filters()));
  protected readonly facetValue = computed(() => facetValue(this.filters()));
  protected readonly description = computed(() => {
    const all = this.#all().length;
    const shown = this.#shown().length;
    return shown === all ? 'Grouped by priority, most at risk first' : `${shown} of ${all} topics · grouped by priority, most at risk first`;
  });
  /** The result announcement: the count of topics left, or that none match. */
  protected readonly resultStatus = computed(() => {
    const all = this.#all().length;
    const shown = this.#shown().length;
    if (!shown && all) return 'No topics match. Change the search or clear a filter.';
    return shown === all ? `Showing all ${all} topics` : `Showing ${shown} of ${all} topics`;
  });
  protected readonly scopeLabel = computed(() =>
    this.#session.viewAs() === 'chief' ? 'Directorate · all topics' : `${read(this.#session.me)?.name ?? ''} · your topics`,
  );

  protected openTopic(event: CustomEvent<PriorityOpen>): void {
    void this.#router.navigate(['/topics', event.detail.id]);
  }

  protected onQuery(event: CustomEvent<FacetQueryChange>): void {
    this.#setFilters({ ...this.filters(), q: event.detail.query });
  }

  /** The URL holds the filters: the change goes there, and the sidebar follows it. */
  protected onFilter(event: CustomEvent<FacetValueChange>): void {
    event.preventDefault();
    const v = event.detail.value;
    const pick = (id: string) => (v[id] as string[] | undefined) ?? [];
    this.#setFilters({ ...this.filters(), priority: pick('priority'), type: pick('type'), region: pick('region'), subject: pick('subject') });
  }

  #setFilters(f: TopicFilters): void {
    this.filters.set(f);
    void this.#router.navigate([], { queryParams: filterParams(f), queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected setNew(value: string | null): void {
    void this.#router.navigate([], { queryParams: { new: value }, queryParamsHandling: 'merge' });
  }

  protected onTopicCreated(): void {
    this.#topics.reload();
  }
}

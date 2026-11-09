import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { OpsOverview } from '@adamstavely/trenchcoat/angular/ops-overview';
import { PriorityList } from '@adamstavely/trenchcoat/angular/priority-list';
import { ResultsList } from '@adamstavely/trenchcoat/angular/results-list';
import { SegmentedBar } from '@adamstavely/trenchcoat/angular/segmented-bar';
import { Skeleton } from '@adamstavely/trenchcoat/angular/shimmer-loader';
import type { PriorityOpen } from '@adamstavely/trenchcoat/priority-list';
import type { ResultsOpen } from '@adamstavely/trenchcoat/results-list';
import { partnersControllerList } from '../../api/generated/fn/partners/partners-controller-list';
import { topicsControllerList } from '../../api/generated/fn/topics/topics-controller-list';
import { PRIORITY_TIERS } from '../../core/format';
import { findLab, labPapers, labStartedSplit, labTiles } from '../../core/partners';
import { read, scopedResource } from '../../core/scoped-resource';
import { topicPriorityItem } from '../../core/topics';

/** One partner lab up close: our joint papers with it, who started them, and the topics they're in. */
@Component({
  selector: 'app-partner-lab-page',
  imports: [OpsOverview, PriorityList, SegmentedBar, ResultsList, Skeleton],
  templateUrl: './partner-lab.page.html',
  styleUrl: './partner-lab.page.css',
})
export class PartnerLabPage {
  readonly #router = inject(Router);

  /** The lab's address, from the route: its name as a slug (labSlug). */
  readonly lab = input.required<string>();

  protected readonly tiers = PRIORITY_TIERS;

  readonly #partners = scopedResource((api) => api.invoke(partnersControllerList));
  readonly #topics = scopedResource((api) => api.invoke(topicsControllerList, { sort: 'risk' }));

  protected readonly error = computed(() => this.#partners.error() ?? this.#topics.error());
  protected readonly ready = computed(() => this.#partners.hasValue() && this.#topics.hasValue());

  /** The lab, if it's in the caller's view. */
  protected readonly data = computed(() => {
    const p = read(this.#partners);
    return p ? findLab(p, this.lab()) : undefined;
  });
  protected readonly tiles = computed(() => {
    const l = this.data();
    return l ? labTiles(l) : [];
  });
  protected readonly split = computed(() => {
    const l = this.data();
    return l ? labStartedSplit(l) : [];
  });
  protected readonly papers = computed(() => {
    const l = this.data();
    return l ? labPapers(l) : [];
  });
  /** The topics the joint papers are in, as the caller sees them, by priority and most at risk first. */
  protected readonly topics = computed(() => {
    const ids = new Set(this.data()?.topics.map((t) => t.id) ?? []);
    return (read(this.#topics) ?? []).filter((t) => ids.has(t.id)).map(topicPriorityItem);
  });

  protected openTopic(event: CustomEvent<PriorityOpen>): void {
    void this.#router.navigate(['/topics', event.detail.id]);
  }

  protected openPaper(event: CustomEvent<ResultsOpen>): void {
    event.preventDefault();
    void this.#router.navigateByUrl(event.detail.result.href ?? '/papers');
  }
}

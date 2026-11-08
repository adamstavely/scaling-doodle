import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { OpsOverview } from '@adamstavely/trenchcoat/angular/ops-overview';
import { OrgUnitCard } from '@adamstavely/trenchcoat/angular/org-unit-card';
import { PriorityList } from '@adamstavely/trenchcoat/angular/priority-list';
import { ResultsList } from '@adamstavely/trenchcoat/angular/results-list';
import { SegmentedBar } from '@adamstavely/trenchcoat/angular/segmented-bar';
import { Select } from '@adamstavely/trenchcoat/angular/select';
import { Skeleton } from '@adamstavely/trenchcoat/angular/shimmer-loader';
import type { OrgOpen } from '@adamstavely/trenchcoat/org-unit-card';
import type { PriorityFigureColumn, PriorityOpen } from '@adamstavely/trenchcoat/priority-list';
import type { ResultsOpen } from '@adamstavely/trenchcoat/results-list';
import { orgControllerTree } from '../../api/generated/fn/org/org-controller-tree';
import { papersControllerList } from '../../api/generated/fn/papers/papers-controller-list';
import { peopleControllerList } from '../../api/generated/fn/people/people-controller-list';
import { portfolioControllerSummary } from '../../api/generated/fn/portfolio/portfolio-controller-summary';
import { topicsControllerList } from '../../api/generated/fn/topics/topics-controller-list';
import { centerCollaboration, centerData, centerPaperResults, centerTiles, centerTopicItems } from '../../core/center';
import { collaborationParts } from '../../core/collaboration';
import { PRIORITY_TIERS } from '../../core/format';
import { asOfDate, DEFAULT_PERIOD_INDEX, periodOptions, todayIso } from '../../core/period';
import { read, scopedResource } from '../../core/scoped-resource';
import { centerCard } from '../org/org.page';

const PAPER_COLUMNS: PriorityFigureColumn[] = [
  { id: 'lastMonth', label: 'Last mo.' },
  { id: 'thisMonth', label: 'This mo.' },
];

/** One mission center up close: its topics, papers, people and teams. */
@Component({
  selector: 'app-center-page',
  imports: [OpsOverview, PriorityList, SegmentedBar, ResultsList, OrgUnitCard, Select, Skeleton],
  templateUrl: './center.page.html',
  styleUrl: './center.page.css',
})
export class CenterPage {
  readonly #router = inject(Router);

  /** The center's id, from the route. */
  readonly id = input.required<string>();
  /** `?period=` picks the reporting period; unset is this quarter. */
  readonly periodParam = input<string | undefined>(undefined, { alias: 'period' });

  protected readonly periods = periodOptions(todayIso());
  protected readonly period = computed(() => {
    const p = this.periodParam();
    return this.periods.some((o) => o.value === p) ? p! : this.periods[DEFAULT_PERIOD_INDEX].value;
  });
  protected readonly periodChoices = this.periods.map((p) => ({ value: p.value, label: p.label }));
  protected readonly asOf = asOfDate(todayIso());
  protected readonly tiers = PRIORITY_TIERS;
  protected readonly paperColumns = PAPER_COLUMNS;

  readonly #org = scopedResource((api) => api.invoke(orgControllerTree));
  readonly #topics = scopedResource((api) => api.invoke(topicsControllerList, { sort: 'risk' }));
  readonly #people = scopedResource((api) => api.invoke(peopleControllerList));
  readonly #papers = scopedResource((api) => api.invoke(papersControllerList, { period: this.period() }), undefined, () => this.period());
  readonly #summary = scopedResource((api) => api.invoke(portfolioControllerSummary, { period: this.period() }), undefined, () => this.period());

  protected readonly error = computed(
    () => this.#org.error() ?? this.#topics.error() ?? this.#people.error() ?? this.#papers.error() ?? this.#summary.error(),
  );
  protected readonly ready = computed(
    () => this.#org.hasValue() && this.#topics.hasValue() && this.#people.hasValue() && this.#papers.hasValue() && this.#summary.hasValue(),
  );

  /** The center, if it's in the caller's view. */
  protected readonly center = computed(() => read(this.#org)?.centers.find((c) => c.id === this.id()));

  readonly #data = computed(() => {
    const center = this.center();
    const period = read(this.#summary)?.period;
    return center && period
      ? centerData(center, read(this.#topics) ?? [], read(this.#people) ?? [], read(this.#papers) ?? [], period.from, period.to)
      : undefined;
  });
  protected readonly tiles = computed(() => {
    const d = this.#data();
    return d ? centerTiles(d) : [];
  });
  protected readonly topics = computed(() => {
    const d = this.#data();
    return d ? centerTopicItems(d) : [];
  });
  protected readonly papers = computed(() => {
    const d = this.#data();
    return d ? centerPaperResults(d) : [];
  });
  protected readonly collaboration = computed(() => {
    const d = this.#data();
    return collaborationParts(d ? centerCollaboration(d) : undefined);
  });
  protected readonly teamsCard = computed(() => {
    const c = this.center();
    return c ? centerCard(c) : undefined;
  });

  /** The period in words for the cards: "this quarter", "this year". */
  protected readonly periodWords = computed(() => {
    const shown = read(this.#summary)?.period.label ?? this.period();
    const when = this.periods.find((p) => p.value.toLowerCase() === shown.toLowerCase())?.label.toLowerCase() ?? 'this period';
    return when === 'year to date' ? 'this year' : when === 'fiscal year' ? 'this fiscal year' : when;
  });

  protected onPeriodChange(event: CustomEvent<{ value: string }>): void {
    void this.#router.navigate([], { queryParams: { period: event.detail.value }, queryParamsHandling: 'merge' });
  }

  protected openTopic(event: CustomEvent<PriorityOpen>): void {
    void this.#router.navigate(['/topics', event.detail.id]);
  }

  protected openTeamTopic(event: CustomEvent<OrgOpen>): void {
    void this.#router.navigate(['/topics', event.detail.item.id]);
  }

  protected openPaper(event: CustomEvent<ResultsOpen>): void {
    event.preventDefault();
    void this.#router.navigateByUrl(event.detail.result.href ?? '/papers');
  }
}

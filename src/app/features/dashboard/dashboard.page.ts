import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { Select } from '@adamstavely/trenchcoat/angular/select';
import { PriorityList } from '@adamstavely/trenchcoat/angular/priority-list';
import { SegmentedBar } from '@adamstavely/trenchcoat/angular/segmented-bar';
import { Skeleton } from '@adamstavely/trenchcoat/angular/shimmer-loader';
import type { PriorityFigureColumn, PriorityItem, PriorityOpen } from '@adamstavely/trenchcoat/priority-list';
import type { OrgCenterDto } from '../../api/generated/models/org-center-dto';
import type { RecentPapersDto } from '../../api/generated/models/recent-papers-dto';
import { orgControllerTree } from '../../api/generated/fn/org/org-controller-tree';
import { portfolioControllerSummary } from '../../api/generated/fn/portfolio/portfolio-controller-summary';
import { topicsControllerList } from '../../api/generated/fn/topics/topics-controller-list';
import { centerPriorityRows } from '../../core/center-priorities';
import { collaborationParts } from '../../core/collaboration';
import { priorityHealth, PRIORITY_TIERS } from '../../core/format';
import { DEFAULT_PERIOD_INDEX, periodOptions, todayIso } from '../../core/period';
import { topicPriorityItem } from '../../core/topics';
import { read, scopedResource } from '../../core/scoped-resource';
import { Session } from '../../core/session';
import { BriefDialog } from '../dialogs/brief-dialog';

const PAPER_COLUMNS: PriorityFigureColumn[] = [
  // Short, to fit the column; each list's description says these count papers published.
  { id: 'lastMonth', label: 'Last mo.' },
  { id: 'thisMonth', label: 'This mo.' },
];

function paperFigures(r: RecentPapersDto | undefined): Record<string, number> {
  return { lastMonth: r?.lastMonth ?? 0, thisMonth: r?.thisMonth ?? 0 };
}

/** A center → a priority-list row: its code in place of a tier, health from its mean score. */
export function centerRow(c: OrgCenterDto): PriorityItem {
  const r = c.rollup;
  return {
    id: c.id,
    name: c.name,
    badge: c.code ?? undefined,
    owner: c.lead?.name,
    // A center with no topics has no health of its own; show it as on track rather than alarm.
    health: priorityHealth(r.health ?? 'healthy'),
    trend: r.trend,
    change: r.momentum / 100,
    coverage: r.coverage,
    open: r.openGaps,
    work: r.work,
    figures: paperFigures(r.recentPapers),
  };
}

@Component({
  selector: 'app-dashboard-page',
  imports: [PriorityList, SegmentedBar, Skeleton, Select, BriefDialog],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css',
})
export class DashboardPage {
  readonly #router = inject(Router);
  readonly #session = inject(Session);

  /** `?brief=<period>` opens the Directorate Brief, so it can be linked to. */
  readonly brief = input<string | undefined>();
  /** `?period=` picks the reporting period; unset is this quarter. */
  readonly periodParam = input<string | undefined>(undefined, { alias: 'period' });

  protected readonly periods = periodOptions(todayIso());
  protected readonly period = computed(() => {
    const p = this.periodParam();
    return this.periods.some((o) => o.value === p) ? p! : this.periods[DEFAULT_PERIOD_INDEX].value;
  });
  protected readonly periodChoices = this.periods.map((p) => ({ value: p.value, label: p.label }));

  protected readonly tiers = PRIORITY_TIERS;

  readonly #summary = scopedResource((api) => api.invoke(portfolioControllerSummary, { period: this.period() }), undefined, () => this.period());
  readonly #topics = scopedResource((api) => api.invoke(topicsControllerList, { sort: 'risk' }));
  readonly #org = scopedResource((api) => api.invoke(orgControllerTree));

  protected readonly error = computed(
    () => this.#summary.error() ?? this.#topics.error() ?? this.#org.error(),
  );

  /** Elements show "Nothing to show" for empty data, so hold them back until the first load lands. */
  protected readonly ready = computed(
    () =>
      this.#summary.hasValue() && this.#topics.hasValue() && this.#org.hasValue(),
  );

  protected readonly isChief = computed(() => this.#session.viewAs() === 'chief');

  /** This period's papers, done alone vs. with partner labs, over the caller's scope. */
  protected readonly collaboration = computed(() => collaborationParts(read(this.#summary)?.collaborationInPeriod));
  protected readonly collaborationNote = computed(() => {
    const when = this.periods.find((p) => p.value === this.period())?.label.toLowerCase() ?? 'this period';
    return `Papers published ${when === 'year to date' ? 'this year' : when === 'fiscal year' ? 'this fiscal year' : when}${this.isChief() ? ' across the portfolio' : ' on your topics'}`;
  });

  protected readonly priorities = computed<PriorityItem[]>(() =>
    (read(this.#topics) ?? []).map((t) => ({ ...topicPriorityItem(t), figures: paperFigures(t.recentPapers) })),
  );

  /** The paper-count columns both lists share. */
  protected readonly paperColumns = PAPER_COLUMNS;

  /** One row per center in the caller's view, laid out like the priorities. */
  protected readonly centers = computed<PriorityItem[]>(() => (read(this.#org)?.centers ?? []).map(centerRow));

  /** Each center against each priority tier, from the same topics the Priorities list shows. */
  protected readonly centerPriorities = computed<PriorityItem[]>(() =>
    centerPriorityRows(read(this.#org)?.centers ?? [], read(this.#topics) ?? []),
  );


  protected openTopic(event: CustomEvent<PriorityOpen>): void {
    void this.#router.navigate(['/topics', event.detail.id]);
  }

  protected openCenter(event: CustomEvent<PriorityOpen>): void {
    void this.#router.navigate(['/org'], { fragment: event.detail.id });
  }

  /** A center-by-priority row opens its center; the row id is `<center>:<tier>`. */
  protected openCenterTier(event: CustomEvent<PriorityOpen>): void {
    void this.#router.navigate(['/org'], { fragment: event.detail.id.split(':')[0] });
  }

  protected onPeriodChange(event: CustomEvent<{ value: string }>): void {
    void this.#router.navigate([], { queryParams: { period: event.detail.value }, queryParamsHandling: 'merge' });
  }

  protected setDialog(params: { brief?: string | null }): void {
    void this.#router.navigate([], { queryParams: params, queryParamsHandling: 'merge' });
  }
}

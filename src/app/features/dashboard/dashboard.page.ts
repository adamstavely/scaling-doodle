import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { SegmentedControl } from '@adamstavely/trenchcoat/angular/segmented-control';
import { CoverageRing } from '@adamstavely/trenchcoat/angular/coverage-ring';
import { GapExposure } from '@adamstavely/trenchcoat/angular/gap-exposure';
import { OpsOverview } from '@adamstavely/trenchcoat/angular/ops-overview';
import { PriorityList } from '@adamstavely/trenchcoat/angular/priority-list';
import { ResultsList } from '@adamstavely/trenchcoat/angular/results-list';
import { SegmentedBar } from '@adamstavely/trenchcoat/angular/segmented-bar';
import { Skeleton } from '@adamstavely/trenchcoat/angular/shimmer-loader';
import type { CoverageSegment } from '@adamstavely/trenchcoat/coverage-ring';
import type { ExposureGap, GapOpen } from '@adamstavely/trenchcoat/gap-exposure';
import type { OpsHealth, OpsTile } from '@adamstavely/trenchcoat/ops-overview';
import type { PriorityFigureColumn, PriorityItem, PriorityOpen } from '@adamstavely/trenchcoat/priority-list';
import type { ResultsOpen, SearchResult } from '@adamstavely/trenchcoat/results-list';
import type { SegmentValueChange } from '@adamstavely/trenchcoat/segmented-control';
import type { OrgCenterDto } from '../../api/generated/models/org-center-dto';
import type { RecentPapersDto } from '../../api/generated/models/recent-papers-dto';
import { gapsControllerList } from '../../api/generated/fn/gaps/gaps-controller-list';
import { orgControllerTree } from '../../api/generated/fn/org/org-controller-tree';
import { papersControllerTop } from '../../api/generated/fn/papers/papers-controller-top';
import { portfolioControllerSummary } from '../../api/generated/fn/portfolio/portfolio-controller-summary';
import { topicsControllerList } from '../../api/generated/fn/topics/topics-controller-list';
import { centerPriorityRows } from '../../core/center-priorities';
import { collaborationParts } from '../../core/collaboration';
import { compactNumber, localDate, priorityHealth, PRIORITY_TIERS } from '../../core/format';
import { periodOptions, todayIso } from '../../core/period';
import { exposureGap } from '../../core/gaps';
import { portfolioTiles } from '../../core/portfolio';
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
  imports: [OpsOverview, PriorityList, CoverageRing, SegmentedBar, GapExposure, ResultsList, Skeleton, SegmentedControl, BriefDialog],
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
    return this.periods.some((o) => o.value === p) ? p! : this.periods[0].value;
  });
  protected readonly periodChoices = this.periods.map((p) => ({ value: p.value, label: p.label }));

  protected readonly tiers = PRIORITY_TIERS;
  protected readonly healthLabels = { nominal: 'Portfolio healthy', degraded: 'Topics at risk', down: 'Portfolio at risk' };

  readonly #summary = scopedResource((api) => api.invoke(portfolioControllerSummary, { period: this.period() }), undefined, () => this.period());
  readonly #topics = scopedResource((api) => api.invoke(topicsControllerList, { sort: 'risk' }));
  readonly #gaps = scopedResource((api) => api.invoke(gapsControllerList, { attention: true, limit: 5 }));
  readonly #papers = scopedResource((api) => api.invoke(papersControllerTop, { limit: 3, period: this.period() }), undefined, () => this.period());
  readonly #org = scopedResource((api) => api.invoke(orgControllerTree));

  protected readonly error = computed(
    () => this.#summary.error() ?? this.#topics.error() ?? this.#gaps.error() ?? this.#papers.error() ?? this.#org.error(),
  );

  /** Elements show "Nothing to show" for empty data, so hold them back until the first load lands. */
  protected readonly ready = computed(
    () =>
      this.#summary.hasValue() && this.#topics.hasValue() && this.#gaps.hasValue() && this.#papers.hasValue() && this.#org.hasValue(),
  );

  protected readonly isChief = computed(() => this.#session.viewAs() === 'chief');

  protected readonly status = computed(() => {
    const s = read(this.#summary);
    if (!s) return undefined;
    const { healthy, watch, atRisk } = s.healthMix;
    return `${atRisk} at risk · ${watch} watch · ${healthy} on track`;
  });

  protected readonly health = computed<OpsHealth | undefined>(() => {
    const s = read(this.#summary);
    if (!s) return undefined;
    const atRiskShare = s.topics ? s.healthMix.atRisk / s.topics : 0;
    return atRiskShare >= 0.5 ? 'down' : atRiskShare > 0 ? 'degraded' : 'nominal';
  });

  /** This period's papers, done alone vs. with partner labs, over the caller's scope. */
  protected readonly collaboration = computed(() => collaborationParts(read(this.#summary)?.collaborationInPeriod));
  protected readonly collaborationNote = computed(() => {
    const when = this.periods.find((p) => p.value === this.period())?.label.toLowerCase() ?? 'this period';
    return `Papers published ${when === 'year to date' ? 'this year' : when === 'fiscal year' ? 'this fiscal year' : when}${this.isChief() ? ' across the portfolio' : ' on your topics'}`;
  });

  protected readonly tiles = computed<OpsTile[]>(() => {
    const s = read(this.#summary);
    return s ? portfolioTiles(s, this.isChief()) : [];
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

  protected readonly coverage = computed(() => read(this.#summary)?.gapsCovered ?? 0);

  protected readonly healthSegments = computed<CoverageSegment[]>(() => {
    const mix = read(this.#summary)?.healthMix;
    if (!mix) return [];
    return [
      { id: 'healthy', label: 'On track', count: mix.healthy, tone: 'success' },
      { id: 'watch', label: 'Watch', count: mix.watch, tone: 'warning' },
      { id: 'at-risk', label: 'At risk', count: mix.atRisk, tone: 'danger' },
    ];
  });

  protected readonly gaps = computed<ExposureGap[]>(() => (read(this.#gaps) ?? []).map(exposureGap));


  protected readonly papers = computed<SearchResult[]>(() =>
    (read(this.#papers) ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      source: p.venue,
      kind: p.topic.name,
      href: `/papers/${p.id}`,
      date: localDate(p.published),
      meta: [`${compactNumber(p.totals.downloads)} downloads`, `${p.totals.citations} citations`],
    })),
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

  protected openGap(event: CustomEvent<GapOpen>): void {
    const gap = read(this.#gaps)?.find((g) => g.id === event.detail.id);
    if (gap) void this.#router.navigate(['/topics', gap.topicId]);
  }

  protected openPaper(event: CustomEvent<ResultsOpen>): void {
    event.preventDefault();
    void this.#router.navigate(['/papers', event.detail.id]);
  }

  protected onPeriodChange(event: CustomEvent<SegmentValueChange>): void {
    void this.#router.navigate([], { queryParams: { period: event.detail.value }, queryParamsHandling: 'merge' });
  }

  protected setDialog(params: { brief?: string | null }): void {
    void this.#router.navigate([], { queryParams: params, queryParamsHandling: 'merge' });
  }
}

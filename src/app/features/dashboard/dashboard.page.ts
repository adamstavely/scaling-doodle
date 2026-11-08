import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Select } from '@adamstavely/trenchcoat/angular/select';
import { AiSummary } from '@adamstavely/trenchcoat/angular/ai-summary';
import { BarChart } from '@adamstavely/trenchcoat/angular/bar-chart';
import { PriorityList } from '@adamstavely/trenchcoat/angular/priority-list';
import { SegmentedBar } from '@adamstavely/trenchcoat/angular/segmented-bar';
import { Skeleton } from '@adamstavely/trenchcoat/angular/shimmer-loader';
import type { PriorityColumn, PriorityFigureColumn, PriorityItem, PriorityOpen } from '@adamstavely/trenchcoat/priority-list';
import type { OrgCenterDto } from '../../api/generated/models/org-center-dto';
import type { RecentPapersDto } from '../../api/generated/models/recent-papers-dto';
import { orgControllerTree } from '../../api/generated/fn/org/org-controller-tree';
import { papersControllerList } from '../../api/generated/fn/papers/papers-controller-list';
import { portfolioControllerSummary } from '../../api/generated/fn/portfolio/portfolio-controller-summary';
import { topicsControllerList } from '../../api/generated/fn/topics/topics-controller-list';
import { collaborationParts } from '../../core/collaboration';
import { priorityHealth } from '../../core/format';
import { DEFAULT_PERIOD_INDEX, periodOptions, todayIso } from '../../core/period';
import { pageSummary } from '../../core/page-summary';
import { priorityCharts, type PaperBar } from '../../core/topics';
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
  imports: [AiSummary, PriorityList, BarChart, SegmentedBar, Skeleton, Select, BriefDialog],
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


  readonly #summary = scopedResource((api) => api.invoke(portfolioControllerSummary, { period: this.period() }), undefined, () => this.period());
  readonly #topics = scopedResource((api) => api.invoke(topicsControllerList, { sort: 'risk' }));
  readonly #papers = scopedResource((api) => api.invoke(papersControllerList, {}));
  readonly #org = scopedResource((api) => api.invoke(orgControllerTree));

  protected readonly error = computed(
    () => this.#summary.error() ?? this.#topics.error() ?? this.#org.error() ?? this.#papers.error(),
  );

  /** Elements show "Nothing to show" for empty data, so hold them back until the first load lands. */
  protected readonly ready = computed(
    () =>
      this.#summary.hasValue() && this.#topics.hasValue() && this.#org.hasValue() && this.#papers.hasValue(),
  );

  protected readonly isChief = computed(() => this.#session.viewAs() === 'chief');

  /** This period's papers, done alone vs. with partner labs, over the caller's scope. */
  protected readonly collaboration = computed(() => collaborationParts(read(this.#summary)?.collaborationInPeriod));
  /**
   * The period in words, for the cards' descriptions: "this quarter", "this year". It names the period the loaded numbers
   * are for, not the one just picked, so words and numbers agree while a new period loads.
   */
  protected readonly periodWords = computed(() => {
    const shown = read(this.#summary)?.period.label ?? this.period();
    const when = this.periods.find((p) => p.value.toLowerCase() === shown.toLowerCase())?.label.toLowerCase() ?? 'this period';
    return when === 'year to date' ? 'this year' : when === 'fiscal year' ? 'this fiscal year' : when;
  });
  protected readonly collaborationNote = computed(
    () => `Papers published ${this.periodWords()}${this.isChief() ? ' across the portfolio' : ' on your topics'}`,
  );

  /** Each priority's papers in the period, stacked by the authors' centers. */
  protected readonly priorityCharts = computed(() => {
    const period = read(this.#summary)?.period;
    return period ? priorityCharts(read(this.#topics) ?? [], read(this.#papers) ?? [], period.from, period.to) : [];
  });
  /** The page explained in words, from the same numbers; regenerated whenever they change. */
  readonly #regenerated = signal(0);
  protected readonly explainer = computed(() => {
    this.#regenerated();
    const period = read(this.#summary)?.period;
    if (!period) return undefined;
    const papers = (read(this.#papers) ?? []).filter((p) => p.published >= period.from && p.published <= period.to);
    return pageSummary({ centers: read(this.#org)?.centers ?? [], topics: read(this.#topics) ?? [], papers, period: this.periodWords() });
  });
  protected readonly generatedAt = computed(() => (this.explainer(), Date.now()));
  /** Donovan shows it's rewriting while a newly picked period's numbers load. */
  protected readonly explainerStatus = computed(() => (this.#summary.isLoading() ? 'summarising' : 'done'));
  protected regenerate(): void {
    this.#regenerated.update((n) => n + 1);
  }
  protected readonly papersNote = computed(() => `Papers published ${this.periodWords()}, by the authors' center`);

  /** The Centers list shows momentum and papers only. */
  protected readonly centerHiddenColumns: PriorityColumn[] = ['coverage', 'open', 'work'];

  /** The paper-count columns both lists share. */
  protected readonly paperColumns = PAPER_COLUMNS;

  /** One row per center in the caller's view, laid out like the priorities. */
  protected readonly centers = computed<PriorityItem[]>(() => (read(this.#org)?.centers ?? []).map(centerRow));


  protected openTopicBar(event: CustomEvent<{ event: unknown }>): void {
    const id = ((event.detail.event as { datum?: PaperBar | null }).datum)?.id;
    if (id) void this.#router.navigate(['/topics', id]);
  }

  /** A cited center or topic opens where the page links it. */
  protected openSource(event: CustomEvent<{ sourceId: string }>): void {
    event.preventDefault();
    const [kind, id] = event.detail.sourceId.split(':');
    if (kind === 'topic') void this.#router.navigate(['/topics', id]);
    else if (kind === 'center') void this.#router.navigate(['/org'], { fragment: id });
  }

  protected openCenter(event: CustomEvent<PriorityOpen>): void {
    void this.#router.navigate(['/org'], { fragment: event.detail.id });
  }

  protected onPeriodChange(event: CustomEvent<{ value: string }>): void {
    void this.#router.navigate([], { queryParams: { period: event.detail.value }, queryParamsHandling: 'merge' });
  }

  protected setDialog(params: { brief?: string | null }): void {
    void this.#router.navigate([], { queryParams: params, queryParamsHandling: 'merge' });
  }
}

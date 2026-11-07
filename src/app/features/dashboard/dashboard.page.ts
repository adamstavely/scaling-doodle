import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '@adamstavely/trenchcoat/angular/button';
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
import type { PriorityItem, PriorityOpen } from '@adamstavely/trenchcoat/priority-list';
import type { ResultsOpen, SearchResult } from '@adamstavely/trenchcoat/results-list';
import type { SegmentValueChange } from '@adamstavely/trenchcoat/segmented-control';
import { gapsControllerList } from '../../api/generated/fn/gaps/gaps-controller-list';
import { papersControllerTop } from '../../api/generated/fn/papers/papers-controller-top';
import { portfolioControllerSummary } from '../../api/generated/fn/portfolio/portfolio-controller-summary';
import { topicsControllerList } from '../../api/generated/fn/topics/topics-controller-list';
import { collaborationParts } from '../../core/collaboration';
import { compactNumber, localDate, priorityHealth, PRIORITY_TIERS } from '../../core/format';
import { periodOptions, todayIso } from '../../core/period';
import { portfolioTiles } from '../../core/portfolio';
import { scopedResource } from '../../core/scoped-resource';
import { Session } from '../../core/session';
import { BriefDialog } from '../dialogs/brief-dialog';
import { NewTopicDialog } from '../dialogs/new-topic-dialog';

@Component({
  selector: 'app-dashboard-page',
  imports: [OpsOverview, PriorityList, CoverageRing, SegmentedBar, GapExposure, ResultsList, Skeleton, Button, SegmentedControl, NewTopicDialog, BriefDialog],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css',
})
export class DashboardPage {
  readonly #router = inject(Router);
  readonly #session = inject(Session);

  /** `?new=topic` opens the New Topic dialog and `?brief=<period>` the Directorate Brief, so both can be linked to. */
  readonly newParam = input<string | undefined>(undefined, { alias: 'new' });
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

  protected readonly error = computed(
    () => this.#summary.error() ?? this.#topics.error() ?? this.#gaps.error() ?? this.#papers.error(),
  );

  /** Elements show "Nothing to show" for empty data, so hold them back until the first load lands. */
  protected readonly ready = computed(
    () => this.#summary.hasValue() && this.#topics.hasValue() && this.#gaps.hasValue() && this.#papers.hasValue(),
  );

  protected readonly isChief = computed(() => this.#session.viewAs() === 'chief');

  protected readonly scopeLabel = computed(() =>
    this.isChief() ? 'Directorate · whole portfolio' : `${this.#session.me.value()?.name ?? ''} · your topics`,
  );

  protected readonly status = computed(() => {
    const s = this.#summary.value();
    if (!s) return undefined;
    const { healthy, watch, atRisk } = s.healthMix;
    return `${atRisk} at risk · ${watch} watch · ${healthy} on track`;
  });

  protected readonly health = computed<OpsHealth | undefined>(() => {
    const s = this.#summary.value();
    if (!s) return undefined;
    const atRiskShare = s.topics ? s.healthMix.atRisk / s.topics : 0;
    return atRiskShare >= 0.5 ? 'down' : atRiskShare > 0 ? 'degraded' : 'nominal';
  });

  /** This period's papers, done alone vs. with partner labs, over the caller's scope. */
  protected readonly collaboration = computed(() => collaborationParts(this.#summary.value()?.collaborationInPeriod));
  protected readonly collaborationNote = computed(() => {
    const when = this.periods.find((p) => p.value === this.period())?.label.toLowerCase() ?? 'this period';
    return `Papers published ${when === 'year to date' ? 'this year' : when === 'fiscal year' ? 'this fiscal year' : when}${this.isChief() ? ' across the portfolio' : ' on your topics'}`;
  });

  protected readonly tiles = computed<OpsTile[]>(() => {
    const s = this.#summary.value();
    return s ? portfolioTiles(s, this.isChief()) : [];
  });

  protected readonly priorities = computed<PriorityItem[]>(() =>
    (this.#topics.value() ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      owner: t.lead?.name,
      priority: t.bin,
      health: priorityHealth(t.health),
      trend: t.trend,
      // Momentum is health points on a 0–100 scale; the list wants a fraction, so −3 points shows as ▼ 3%.
      change: t.momentum / 100,
      coverage: t.stats.coverage,
      open: t.stats.openGaps,
      work: t.stats.work,
    })),
  );

  protected readonly coverage = computed(() => this.#summary.value()?.gapsCovered ?? 0);

  protected readonly healthSegments = computed<CoverageSegment[]>(() => {
    const mix = this.#summary.value()?.healthMix;
    if (!mix) return [];
    return [
      { id: 'healthy', label: 'On track', count: mix.healthy, tone: 'success' },
      { id: 'watch', label: 'Watch', count: mix.watch, tone: 'warning' },
      { id: 'at-risk', label: 'At risk', count: mix.atRisk, tone: 'danger' },
    ];
  });

  protected readonly gaps = computed<ExposureGap[]>(() => {
    const bins = new Map((this.#topics.value() ?? []).map((t) => [t.id, t.bin]));
    return (this.#gaps.value() ?? []).map((g) => ({
      id: g.id,
      text: g.text,
      severity: g.severity,
      item: g.topic.name,
      priority: bins.get(g.topicId),
      work: g.covered ? 1 : 0,
      owner: g.owner?.name,
    }));
  });

  protected readonly papers = computed<SearchResult[]>(() =>
    (this.#papers.value() ?? []).map((p) => ({
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

  protected openGap(event: CustomEvent<GapOpen>): void {
    const gap = this.#gaps.value()?.find((g) => g.id === event.detail.id);
    if (gap) void this.#router.navigate(['/topics', gap.topicId]);
  }

  protected openPaper(event: CustomEvent<ResultsOpen>): void {
    event.preventDefault();
    void this.#router.navigate(['/papers', event.detail.id]);
  }

  protected onPeriodChange(event: CustomEvent<SegmentValueChange>): void {
    void this.#router.navigate([], { queryParams: { period: event.detail.value }, queryParamsHandling: 'merge' });
  }

  protected setDialog(params: { new?: string | null; brief?: string | null }): void {
    void this.#router.navigate([], { queryParams: params, queryParamsHandling: 'merge' });
  }
}

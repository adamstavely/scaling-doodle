import { Component, computed, DestroyRef, effect, inject, input, resource, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { Select } from '@adamstavely/trenchcoat/angular/select';
import { AiSummary } from '@adamstavely/trenchcoat/angular/ai-summary';
import { Button } from '@adamstavely/trenchcoat/angular/button';
import { Footnotes } from '@adamstavely/trenchcoat/angular/footnotes';
import type { AiSummaryLength, AiSummaryMessage, AiSummarySource } from '@adamstavely/trenchcoat/ai-summary';
import type { FootnoteNote } from '@adamstavely/trenchcoat/footnotes';
import { BarChart } from '@adamstavely/trenchcoat/angular/bar-chart';
import { KpiChart } from '@adamstavely/trenchcoat/angular/kpi-chart';
import { PriorityList } from '@adamstavely/trenchcoat/angular/priority-list';
import { SegmentedBar } from '@adamstavely/trenchcoat/angular/segmented-bar';
import { Skeleton } from '@adamstavely/trenchcoat/angular/shimmer-loader';
import type { PriorityColumn, PriorityFigureColumn, PriorityItem, PriorityOpen } from '@adamstavely/trenchcoat/priority-list';
import type { OrgCenterDto } from '../../api/generated/models/org-center-dto';
import type { RecentPapersDto } from '../../api/generated/models/recent-papers-dto';
import { orgControllerTree } from '../../api/generated/fn/org/org-controller-tree';
import { papersControllerList } from '../../api/generated/fn/papers/papers-controller-list';
import { portfolioControllerHistory } from '../../api/generated/fn/portfolio/portfolio-controller-history';
import { portfolioControllerSummary } from '../../api/generated/fn/portfolio/portfolio-controller-summary';
import { topicsControllerList } from '../../api/generated/fn/topics/topics-controller-list';
import { collaborationParts } from '../../core/collaboration';
import { priorityHealth } from '../../core/format';
import { asOfLabel, DEFAULT_PERIOD_INDEX, periodOptions, todayIso } from '../../core/period';
import { historyCard, yearChange } from '../../core/history';
import { answerFollowUp } from '../../core/donovan';
import { pageSummary, type PageSummaryInput } from '../../core/page-summary';
import { priorityCharts, priorityMetricCharts, type PaperBar } from '../../core/topics';
import { read, scopedResource } from '../../core/scoped-resource';
import { Session } from '../../core/session';
import { BriefDialog } from '../dialogs/brief-dialog';

/** Papers last month and this month, in full: the codes leave Mission Centers room for wider columns. */
const PAPER_COLUMNS: PriorityFigureColumn[] = [
  { id: 'lastMonth', label: 'Last month', width: 88, align: 'center' },
  { id: 'thisMonth', label: 'This month', width: 88, align: 'center' },
];

function paperFigures(r: RecentPapersDto | undefined): Record<string, number> {
  return { lastMonth: r?.lastMonth ?? 0, thisMonth: r?.thisMonth ?? 0 };
}

/**
 * A center → a priority-list row, health from its mean score. The code stands in for the name, so the row is narrow
 * enough to keep its trend line. A center with a logo shows it in the badge column (the code its screen-reader text);
 * without one the column stays empty rather than repeat the code.
 */
export function centerRow(c: OrgCenterDto): PriorityItem {
  const r = c.rollup;
  return {
    id: c.id,
    name: c.code ?? c.name,
    ...(c.logo ? { badge: c.code ?? c.name, badgeImage: c.logo } : {}),
    // A center with no topics has no health of its own; show it as on track rather than alarm.
    health: priorityHealth(r.health ?? 'healthy'),
    trend: r.trend,
    // With no topics there's no trend to report: an empty cell, not "– 0%".
    ...(r.topics > 0 ? { change: r.momentum / 100 } : {}),
    coverage: r.coverage,
    open: r.openGaps,
    work: r.work,
    figures: paperFigures(r.recentPapers),
  };
}

@Component({
  selector: 'app-dashboard-page',
  imports: [AiSummary, Button, Footnotes, PriorityList, BarChart, KpiChart, SegmentedBar, Skeleton, Select, BriefDialog],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css',
})
export class DashboardPage {
  readonly #router = inject(Router);
  readonly #session = inject(Session);

  /** `?brief=<period>` opens the Directorate Brief, so it can be linked to. */
  readonly brief = input<string | undefined>();
  /** `?period=` picks the reporting period; unset is this month. */
  readonly periodParam = input<string | undefined>(undefined, { alias: 'period' });

  protected readonly periods = periodOptions(todayIso());
  /** Today, DD MM YYYY, beside the heading: the page's numbers are as of now. */
  protected readonly period = computed(() => {
    const p = this.periodParam();
    return this.periods.some((o) => o.value === p) ? p! : this.periods[DEFAULT_PERIOD_INDEX].value;
  });
  protected readonly periodChoices = this.periods.map((p) => ({ value: p.value, label: p.label }));


  readonly #summary = scopedResource((api) => api.invoke(portfolioControllerSummary, { period: this.period() }), undefined, () => this.period());
  /** When the page's numbers were loaded: "as of: Today, 8 November 2026 at 22:00". New numbers, new time. */
  protected readonly asOf = computed(() => (read(this.#summary), asOfLabel(new Date())));
  readonly #topics = scopedResource((api) => api.invoke(topicsControllerList, { sort: 'risk' }));
  /** Every paper in scope, each with its views and citations within the period. */
  readonly #papers = scopedResource((api) => api.invoke(papersControllerList, { period: this.period() }), undefined, () => this.period());
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
  /** Donovan's logo, for the summary's header and answers. */
  protected readonly donovanIcon = Object.assign(document.createElement('img'), { src: '/brand/donovan.svg', alt: '', width: 20, height: 20 });

  /** The page's numbers as Donovan reads them: centers, topics and the period's papers. */
  readonly #pageData = computed<PageSummaryInput | undefined>(() => {
    const period = read(this.#summary)?.period;
    if (!period) return undefined;
    const papers = (read(this.#papers) ?? []).filter((p) => p.published >= period.from && p.published <= period.to);
    return { centers: read(this.#org)?.centers ?? [], topics: read(this.#topics) ?? [], papers, period: this.periodWords() };
  });

  /** Short or Detailed, as picked on Donovan's card. Short fits beside the KPI cards, the ask box in view. */
  protected readonly length = signal<AiSummaryLength>('short');
  protected onLength(event: CustomEvent<{ length: AiSummaryLength }>): void {
    this.length.set(event.detail.length);
  }

  /** The page explained in words, from the same numbers; regenerated whenever they change. */
  readonly #regenerated = signal(0);
  protected readonly explainer = computed(() => {
    this.#regenerated();
    const data = this.#pageData();
    if (!data) return undefined;
    const summary = pageSummary(data, this.length());
    // Answers cite centers and topics the summary may not, so their sources join the summary's
    const extra = this.messages().flatMap((m) => m.sources ?? []);
    const sources = [...summary.sources];
    for (const x of extra) if (!sources.some((s) => s.id === x.id)) sources.push(x);
    return { ...summary, sources };
  });

  /**
   * Follow-ups to Donovan. The first one turns the page into a chat: everything but Donovan fades away and its card
   * takes the page, the summary at the top and the conversation under it. Each answer keeps the period it was worked
   * out for, so when the time frame changes the conversation says which answers are about another period.
   */
  readonly #messages = signal<(AiSummaryMessage & { sources?: AiSummarySource[]; period?: string })[]>([]);
  protected readonly messages = computed<(AiSummaryMessage & { sources?: AiSummarySource[] })[]>(() => {
    const now = this.#pageData()?.period;
    return this.#messages().map(({ period, ...m }) =>
      period && now && period !== now ? { ...m, text: `Answered for ${period}: ${m.text}` } : m,
    );
  });
  protected readonly chatting = computed(() => this.#messages().length > 0);

  /**
   * The conversation belongs to the viewer who had it. Switching viewer clears it, with its sources, and drops answers
   * still being worked out, so a PI never sees what Donovan told the Chief about the whole portfolio. Leaving the page
   * drops them too.
   */
  #context = 0;

  constructor() {
    effect(() => {
      this.#session.viewAs();
      untracked(() => {
        this.#context++;
        if (this.#messages().length) this.#messages.set([]);
      });
    });
    inject(DestroyRef).onDestroy(() => this.#context++);
  }
  /** The page's numbers for one period, with nothing still loading for a newly picked one. */
  readonly #settled = computed(() => (this.#summary.isLoading() || this.#papers.isLoading() ? undefined : this.#pageData()));
  #asked = 0;

  protected onAsk(event: CustomEvent<{ question: string }>): void {
    if (!this.#pageData()) return event.preventDefault();
    const n = ++this.#asked;
    const context = this.#context;
    const question = { id: `q${n}`, role: 'user' as const, text: event.detail.question, status: 'done' as const };
    const thinking = { id: `a${n}`, role: 'assistant' as const, text: '', status: 'thinking' as const };
    this.#morph(() => this.#messages.update((m) => [...m, question, thinking]));
    // Rules answer at once; a short pause reads as Donovan considering it, and leaves room for a model later. The
    // answer is worked out from the numbers on the page when it's given – a time frame picked meanwhile is the one it
    // answers for, once its numbers have loaded.
    const answer = () => {
      if (context !== this.#context) return;
      const data = this.#settled();
      if (!data) return void setTimeout(answer, 150);
      const a = answerFollowUp(event.detail.question, data);
      this.#messages.update((m) =>
        m.map((x) =>
          x.id === thinking.id ? { ...x, text: a.text, points: a.points, sources: a.sources, period: data.period, status: 'done' as const } : x,
        ),
      );
    };
    setTimeout(answer, 450);
  }

  /** Back to the whole page; the conversation is cleared. */
  protected endChat(): void {
    this.#morph(() => this.#messages.set([]));
  }

  /** A layout change animated as a morph where the browser can (View Transitions), instantly where it can't. */
  #morph(change: () => void): void {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (doc.startViewTransition && !reduced) doc.startViewTransition(change);
    else change();
  }

  /** The caveats under the charts, from public/summary-notes.json so they can change without a release. */
  readonly #notes = resource({
    loader: async () => (await fetch('/summary-notes.json')).json() as Promise<{ heading: string; notes: FootnoteNote[] }>,
  });
  protected readonly notes = computed(() => (this.#notes.hasValue() ? this.#notes.value() : undefined));
  /** A note's link opens in the app, not as a page load. */
  protected openNote(event: CustomEvent<{ href: string }>): void {
    if (!event.detail.href.startsWith('/')) return;
    event.preventDefault();
    void this.#router.navigateByUrl(event.detail.href);
  }
  protected readonly generatedAt = computed(() => (this.explainer(), Date.now()));
  /** Donovan shows it's rewriting while a newly picked period's numbers load. */
  protected readonly explainerStatus = computed(() => (this.#summary.isLoading() ? 'summarising' : 'done'));
  protected regenerate(): void {
    this.#regenerated.update((n) => n + 1);
  }
  /** Papers to date and headcount over two years: the top row's Papers and People cards. */
  readonly #history = scopedResource((api) => api.invoke(portfolioControllerHistory, {}));
  protected readonly historyCards = computed(() => {
    const h = read(this.#history);
    return h ? [historyCard('Papers', h.papers, h.months, h.forecastMonths, 'var(--tc-chart-1)'), historyCard('People', h.people, h.months, h.forecastMonths, 'var(--tc-chart-2)')] : [];
  });
  protected readonly yearChange = yearChange;
  protected readonly wholeNumber = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);

  /** Readership and citations within the period, per priority, by the authors' centers. */
  protected readonly metricCharts = computed(() => priorityMetricCharts(read(this.#topics) ?? [], read(this.#papers) ?? []));
  protected readonly metricNote = computed(() => `${this.periodWords()[0].toUpperCase()}${this.periodWords().slice(1)}, any paper's, by the authors' center`);
  protected readonly papersNote = computed(() => `Papers published ${this.periodWords()}, by the authors' center`);

  /** The Mission Centers list shows each center's name, trend and papers only: no coverage, gaps, work or health word. */
  protected readonly centerHiddenColumns: PriorityColumn[] = ['coverage', 'open', 'work', 'health'];

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
    else if (kind === 'center') void this.#router.navigate(['/centers', id]);
  }

  /** A Mission Centers row opens that center's page. */
  protected openCenter(event: CustomEvent<PriorityOpen>): void {
    void this.#router.navigate(['/centers', event.detail.id]);
  }

  protected onPeriodChange(event: CustomEvent<{ value: string }>): void {
    void this.#router.navigate([], { queryParams: { period: event.detail.value }, queryParamsHandling: 'merge' });
  }

  protected setDialog(params: { brief?: string | null }): void {
    void this.#router.navigate([], { queryParams: params, queryParamsHandling: 'merge' });
  }
}

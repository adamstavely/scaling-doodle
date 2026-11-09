import type { PriorityItem } from '@adamstavely/trenchcoat/priority-list';
import type { PaperListItemDto } from '../api/generated/models/paper-list-item-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { priorityHealth } from './format';

/** A topic → a tc-priority-list row, as the dashboard's Priorities and the Research Topics page show it. */
export function topicPriorityItem(t: TopicSummaryDto): PriorityItem {
  return {
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
  };
}

/** Topics per priority chart. */
const CHART_SIZE = 4;

/** One segment of a priority's bar: its papers by one contributing center, for tc-bar-chart's long table. */
export type PaperBar = {
  /** The topic's id, to open it */
  id: string;
  /** The topic's name, numbered when another topic shares it: the bar */
  x: string;
  /** The center's code: the segment */
  center: string;
  y: number;
};

/**
 * The Summary's priority charts: the topics in priority order (P1 first, most at risk first within a tier), four to a
 * chart, each headed by the tiers it covers. A bar per topic counts its papers published from `from` to `to`
 * (inclusive ISO dates), stacked by the centers their authors are in – a paper with authors in two centers counts
 * toward both. Every chart lists every contributing center, in one order, so their colours match.
 */
export function priorityCharts(
  topics: TopicSummaryDto[],
  papers: PaperListItemDto[],
  from: string,
  to: string,
): { id: string; heading: string; bars: PaperBar[] }[] {
  const inPeriod = papers.filter((p) => p.published >= from && p.published <= to);
  const centers = contributingCenters(inPeriod);
  const bars = (group: TopicSummaryDto[]) => topicBars(group, inPeriod, centers, () => 1);
  const ordered = byPriority(topics);
  const groups = Array.from({ length: Math.ceil(ordered.length / CHART_SIZE) }, (_, i) => ordered.slice(i * CHART_SIZE, (i + 1) * CHART_SIZE));
  return groups.map((group, i) => {
    const lo = group[0].bin;
    const hi = group[group.length - 1].bin;
    return { id: `priorities-${i + 1}`, heading: lo === hi ? `P${lo}` : `P${lo}–P${hi}`, bars: bars(group) };
  });
}

/** Topics in priority order; sort is stable, so within a tier the given (most at risk first) order holds. */
const byPriority = (topics: TopicSummaryDto[]) => [...topics].sort((a, b) => a.bin - b.bin);

/** The segment for papers whose authors are in no center – the API allows that – so they're counted, not lost. */
export const UNASSIGNED = 'Unassigned';

/** The segments a paper counts toward: its authors' centers by code, or Unassigned when it has none. */
const paperCenters = (p: PaperListItemDto) => (p.authorCenters.length ? p.authorCenters.map((c) => c.code ?? c.name) : [UNASSIGNED]);

/**
 * The centers papers' authors are in, by code, sorted, with Unassigned last if any paper has no center: one order for
 * every chart, so a center keeps its colour.
 */
function contributingCenters(papers: PaperListItemDto[]): string[] {
  const all = new Set(papers.flatMap(paperCenters));
  const named = [...all].filter((c) => c !== UNASSIGNED).sort();
  return all.has(UNASSIGNED) ? [...named, UNASSIGNED] : named;
}

/**
 * Each topic's bar label, one per topic id: its name, numbered from the second on when names repeat – "Grid Storage",
 * "Grid Storage (2)" – since the chart makes one bar per label, and two topics under one label would merge into one bar
 * that opens only one of them. A number another topic's name already uses is skipped: "AI", "AI", "AI (2)" label as
 * "AI", "AI (3)", "AI (2)".
 */
function barLabels(topics: TopicSummaryDto[]): Map<string, string> {
  const used = new Set<string>();
  const labels = new Map<string, string>();
  // Names as given go first, so a topic named "AI (2)" keeps its name and the numbering works around it
  const firsts = new Set<string>();
  for (const t of topics) {
    if (!used.has(t.name)) {
      used.add(t.name);
      firsts.add(t.id);
      labels.set(t.id, t.name);
    }
  }
  for (const t of topics) {
    if (firsts.has(t.id)) continue;
    let n = 2;
    while (used.has(`${t.name} (${n})`)) n++;
    const label = `${t.name} (${n})`;
    used.add(label);
    labels.set(t.id, label);
  }
  return labels;
}

/**
 * A bar per topic, a segment per center: the sum of `value` over the topic's papers with an author in that center – a
 * paper with authors in two centers counts toward both. Every center is on every bar, at 0 where it has none, so the
 * bars line up and the colours stay put.
 */
function topicBars(topics: TopicSummaryDto[], papers: PaperListItemDto[], centers: string[], value: (p: PaperListItemDto) => number): PaperBar[] {
  const labels = barLabels(topics);
  return topics.flatMap((t) => {
    const own = papers.filter((p) => p.topicId === t.id);
    return (centers.length ? centers : ['']).map((center) => ({
      id: t.id,
      x: labels.get(t.id)!,
      center,
      y: own.filter((p) => paperCenters(p).includes(center)).reduce((s, p) => s + value(p), 0),
    }));
  });
}

/**
 * Readership and citations per priority: every topic in priority order, each bar its papers' views (or citations)
 * within the period – any paper's, whenever it was published – stacked by the authors' centers. Papers need
 * `periodTotals` (asked for with `period`); without them they count 0.
 */
export function priorityMetricCharts(topics: TopicSummaryDto[], papers: PaperListItemDto[]): { id: string; heading: string; unit: string; bars: PaperBar[] }[] {
  const centers = contributingCenters(papers);
  const ordered = byPriority(topics);
  return [
    { id: 'readership', heading: 'Readership by priority', unit: 'views', bars: topicBars(ordered, papers, centers, (p) => p.periodTotals?.views ?? 0) },
    { id: 'citations', heading: 'Citations by priority', unit: 'citations', bars: topicBars(ordered, papers, centers, (p) => p.periodTotals?.citations ?? 0) },
  ];
}

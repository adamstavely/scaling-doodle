import type { AiSummaryPoint, AiSummarySource } from '@adamstavely/trenchcoat/ai-summary';
import type { OrgCenterDto } from '../api/generated/models/org-center-dto';
import type { PaperListItemDto } from '../api/generated/models/paper-list-item-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';

export interface PageSummaryInput {
  centers: OrgCenterDto[];
  topics: TopicSummaryDto[];
  /** Papers published in the period, in the caller's scope */
  papers: PaperListItemDto[];
  /** The period in words: "this quarter", "this year" */
  period: string;
}

export interface PageSummary {
  tldr: string;
  summary: string;
  points: AiSummaryPoint[];
  questions: string[];
  sources: AiSummarySource[];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const list = (names: string[]) =>
  names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
const centerName = (c: OrgCenterDto) => c.code ?? c.name;

/**
 * The Metrics Summary explained in words, from the numbers the page shows – written by fixed rules, not a model. Its
 * points cite the centers and topics they're drawn from.
 */
export function pageSummary({ centers, topics, papers, period }: PageSummaryInput): PageSummary {
  const sources: AiSummarySource[] = [];
  const cite = (id: string, label: string, href: string) => {
    if (!sources.some((s) => s.id === id)) sources.push({ id, label, href, kind: 'other' });
    return id;
  };
  const citeTopic = (t: TopicSummaryDto) => cite(`topic:${t.id}`, t.name, `/topics/${t.id}`);
  const citeCenter = (c: OrgCenterDto) => cite(`center:${c.id}`, c.name, `/centers/${c.id}`);

  const staffed = centers.filter((c) => c.rollup.topics > 0);
  const empty = centers.filter((c) => c.rollup.topics === 0);
  const atRisk = topics.filter((t) => t.health === 'at-risk');
  const joint = papers.filter((p) => p.partners.length > 0).length;

  // Papers per center (a paper with authors in two centers counts for both)
  const byCenter = new Map<string, number>();
  for (const p of papers) for (const c of p.authorCenters) byCenter.set(c.id, (byCenter.get(c.id) ?? 0) + 1);
  const most = Math.max(0, ...byCenter.values());
  const leaders = centers.filter((c) => most > 0 && byCenter.get(c.id) === most);

  const papersByTopic = new Map<string, number>();
  for (const p of papers) papersByTopic.set(p.topicId, (papersByTopic.get(p.topicId) ?? 0) + 1);
  const topicMost = Math.max(0, ...papersByTopic.values());
  const topTopics = topics.filter((t) => topicMost > 0 && papersByTopic.get(t.id) === topicMost);

  const falling = [...staffed].sort((a, b) => a.rollup.momentum - b.rollup.momentum)[0];

  const tldr =
    `${plural(topics.length, 'topic')} across ${plural(staffed.length, 'center')}` +
    (atRisk.length ? `, ${atRisk.length} at risk` : ', none at risk') +
    `; ${plural(papers.length, 'paper')} published ${period}` +
    (papers.length ? `, ${joint} with partner labs.` : '.');

  const summary = [
    `This page shows the portfolio ${period}. Mission Centers, on the right, rolls each center's topics up: its trend and the papers it published last month and this month.`,
    `The charts below take the topics four at a time in priority order – P1 first, the most at risk first within a tier – and count each one's papers ${period}, split by the centers their authors belong to. A paper written across two centers counts for both.`,
    `Unilateral vs. joint research, beside them, splits the same papers into work done alone and work done with partner labs.`,
  ].join('\n\n');

  const points: AiSummaryPoint[] = [];
  if (atRisk.length) {
    points.push({
      id: 'at-risk',
      text: `${list(atRisk.map((t) => t.name))} ${atRisk.length === 1 ? 'is' : 'are'} at risk.`,
      sources: atRisk.map(citeTopic),
    });
  }
  if (empty.length) {
    points.push({
      id: 'coverage',
      text: `Only ${list(staffed.map(centerName))} ${staffed.length === 1 ? 'has' : 'have'} topics; the other ${plural(empty.length, 'center')} ${empty.length === 1 ? 'has' : 'have'} none yet.`,
      sources: staffed.map(citeCenter),
    });
  }
  if (falling && falling.rollup.momentum < 0) {
    points.push({
      id: 'trend',
      text: `${falling.name}'s health fell the most: ${Math.abs(falling.rollup.momentum)} points over three months.`,
      sources: [citeCenter(falling)],
    });
  }
  if (leaders.length) {
    // Ties share the top spot: "CCI and NEMC contributed the most papers this year (1 each)"
    const each = (n: number, tied: boolean) => `(${n}${tied ? ' each' : ''})`;
    const who = leaders.length === 1 ? leaders[0].name : list(leaders.map(centerName));
    const byTopic = topTopics.length
      ? `; ${list(topTopics.map((t) => t.name))} published the most of any topic ${each(topicMost, topTopics.length > 1)}`
      : '';
    points.push({
      id: 'papers',
      text: `${who} contributed the most papers ${period} ${each(most, leaders.length > 1)}${byTopic}.`,
      sources: [...leaders.map(citeCenter), ...topTopics.map(citeTopic)],
    });
  }
  if (papers.length) {
    points.push({ id: 'joint', text: `${joint} of the ${plural(papers.length, 'paper')} ${period} ${joint === 1 ? 'was' : 'were'} written with partner labs.` });
  }

  const questions: string[] = [];
  if (!papers.length) questions.push(`No papers were published ${period}. Is that expected, or are papers still to be recorded?`);
  if (empty.length) questions.push(`Which teams belong to the ${plural(empty.length, 'center')} with no topics yet?`);
  const unworked = atRisk.filter((t) => t.stats.work === 0);
  if (unworked.length) questions.push(`${list(unworked.map((t) => t.name))} ${unworked.length === 1 ? 'is' : 'are'} at risk with no work in flight. Who picks ${unworked.length === 1 ? 'it' : 'them'} up?`);

  return { tldr, summary, points, questions, sources };
}

import type { AiSummaryPoint, AiSummarySource } from '@adamstavely/trenchcoat/ai-summary';
import type { OrgCenterDto } from '../api/generated/models/org-center-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { PRIORITY_TIERS, percent } from './format';
import type { PageSummaryInput } from './page-summary';

/** Donovan's answer to a follow-up: its text, cited points, and the sources those points cite. */
export interface DonovanAnswer {
  text: string;
  points: AiSummaryPoint[];
  sources: AiSummarySource[];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const list = (names: string[]) =>
  names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
const words = (s: string): string[] => s.toLowerCase().match(/[a-z0-9]+/g) ?? [];
const HEALTH: Record<TopicSummaryDto['health'], string> = { healthy: 'on track', watch: 'on watch', 'at-risk': 'at risk' };
const trendWords = (points: number) => (points === 0 ? 'holding steady' : `${points > 0 ? 'up' : 'down'} ${Math.abs(points)} points over three months`);

/** Words too common to tell one center or topic from another. */
const STOP = new Set(['the', 'and', 'for', 'of', 'center', 'centers', 'mission', 'what', 'how', 'is', 'are', 'about', 'tell', 'me', 'on', 'in', 'with', 'a', 'an', 'its', 'doing']);

/**
 * Answers a follow-up about the Metrics Summary by fixed rules over the page's own numbers – not a model. It knows a
 * named center or topic, what's at risk, papers, partner labs, trends and empty centers; anything else gets a reply
 * that says what it can answer.
 */
export function answerFollowUp(question: string, { centers, topics, papers, period }: PageSummaryInput): DonovanAnswer {
  const sources: AiSummarySource[] = [];
  const cite = (id: string, label: string, href: string) => {
    if (!sources.some((s) => s.id === id)) sources.push({ id, label, href, kind: 'other' });
    return id;
  };
  const citeTopic = (t: TopicSummaryDto) => cite(`topic:${t.id}`, t.name, `/topics/${t.id}`);
  const citeCenter = (c: OrgCenterDto) => cite(`center:${c.id}`, c.name, `/centers/${c.id}`);
  const answer = (text: string, points: AiSummaryPoint[] = []): DonovanAnswer => ({ text, points, sources });

  const q = words(question);
  const has = (...stems: string[]) => q.some((w) => stems.some((s) => w.startsWith(s)));
  const papersOf = (pred: (p: PageSummaryInput['papers'][number]) => boolean) => papers.filter(pred).length;

  // A center named by its code, or by the distinctive words of its name ("near east", "cyber")
  const center = centers.find((c) => {
    if (c.code && q.includes(c.code.toLowerCase())) return true;
    const key = words(c.name).filter((w) => !STOP.has(w));
    return key.length > 0 && key.every((w) => q.includes(w));
  });
  if (center) {
    const own = topics.filter((t) => t.centerId === center.id);
    const r = center.rollup;
    const count = papersOf((p) => p.authorCenters.some((c) => c.id === center.id));
    if (!own.length) {
      return answer(`${center.name} has no topics yet, so there's nothing of its own to show ${period}${count ? `, though its people co-wrote ${plural(count, 'paper')}` : ''}.`, [
        { id: 'center', text: `${center.name} (${center.code}) has no teams or topics recorded.`, sources: [citeCenter(center)] },
      ]);
    }
    const atRisk = own.filter((t) => t.health === 'at-risk');
    return answer(
      `${center.name} has ${plural(own.length, 'topic')}, ${atRisk.length ? `${atRisk.length} at risk` : 'none at risk'}. Its health is ${trendWords(r.momentum)}, and its people contributed to ${plural(count, 'paper')} ${period}.`,
      [
        ...(atRisk.length ? [{ id: 'risk', text: `At risk: ${list(atRisk.map((t) => t.name))}.`, sources: atRisk.map(citeTopic) }] : []),
        { id: 'coverage', text: `${percent(r.coverage)} of its ${plural(r.openGaps, 'open gap')} have work against them.`, sources: [citeCenter(center)] },
        { id: 'recent', text: `${plural(r.recentPapers.lastMonth, 'paper')} last month, ${r.recentPapers.thisMonth} so far this month.`, sources: [citeCenter(center)] },
      ],
    );
  }

  // A topic named by the distinctive words of its name ("neuromorphic", "grid storage")
  const topic = topics
    .map((t) => ({ t, hits: words(t.name).filter((w) => w.length > 3 && !STOP.has(w) && q.includes(w)).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)[0]?.t;
  if (topic) {
    const home = centers.find((c) => c.id === topic.centerId);
    const count = papersOf((p) => p.topicId === topic.id);
    return answer(
      `${topic.name} is ${PRIORITY_TIERS[topic.bin] ?? `P${topic.bin}`}${home ? ` in ${home.name}` : ''}, ${HEALTH[topic.health]} with a health score of ${topic.healthScore}, ${trendWords(topic.momentum)}. It published ${plural(count, 'paper')} ${period}.`,
      [
        { id: 'gaps', text: `${plural(topic.stats.openGaps, 'open gap')}, ${percent(topic.stats.coverage)} with work against them; ${plural(topic.stats.work, 'work item')} in flight.`, sources: [citeTopic(topic)] },
        ...(topic.lead ? [{ id: 'lead', text: `Led by ${topic.lead.name}.`, sources: [citeTopic(topic)] }] : []),
      ],
    );
  }

  if (has('risk', 'danger', 'worr', 'trouble', 'problem')) {
    const atRisk = topics.filter((t) => t.health === 'at-risk').sort((a, b) => a.healthScore - b.healthScore);
    if (!atRisk.length) return answer(`No topics are at risk ${period}.`);
    return answer(
      `${plural(atRisk.length, 'topic')} ${atRisk.length === 1 ? 'is' : 'are'} at risk, weakest first:`,
      atRisk.map((t) => ({
        id: t.id,
        text: `${t.name}: health ${t.healthScore}, ${plural(t.stats.openGaps, 'open gap')}, ${t.stats.work ? plural(t.stats.work, 'work item') + ' in flight' : 'no work in flight'}.`,
        sources: [citeTopic(t)],
      })),
    );
  }

  if (has('joint', 'partner', 'unilateral', 'collab', 'lab')) {
    const joint = papers.filter((p) => p.partners.length);
    const labs = [...new Set(joint.flatMap((p) => p.partners))].sort();
    return answer(
      papers.length
        ? `${joint.length} of the ${plural(papers.length, 'paper')} ${period} ${joint.length === 1 ? 'was' : 'were'} written with partner labs${labs.length ? `: ${list(labs)}` : ''}. Partner Labs has the detail, including who started each.`
        : `No papers were published ${period}, so there's no joint work to count.`,
    );
  }

  if (has('paper', 'publish', 'publication', 'output', 'wrote', 'written')) {
    if (!papers.length) return answer(`No papers were published ${period}. Try a longer period from the picker at the top, like Year to date.`);
    const byCenter = new Map<string, number>();
    for (const p of papers) for (const c of p.authorCenters) byCenter.set(c.id, (byCenter.get(c.id) ?? 0) + 1);
    return answer(
      `${plural(papers.length, 'paper')} ${papers.length === 1 ? 'was' : 'were'} published ${period}. By the authors' centers:`,
      centers
        .filter((c) => byCenter.has(c.id))
        .sort((a, b) => byCenter.get(b.id)! - byCenter.get(a.id)!)
        .map((c) => ({ id: c.id, text: `${c.name}: ${byCenter.get(c.id)}`, sources: [citeCenter(c)] })),
    );
  }

  if (has('trend', 'momentum', 'fall', 'drop', 'declin', 'improv', 'rising', 'better', 'worse')) {
    const moving = centers.filter((c) => c.rollup.topics > 0).sort((a, b) => a.rollup.momentum - b.rollup.momentum);
    return answer(
      `How each center's health has moved over the last three months, steepest fall first:`,
      moving.map((c) => ({ id: c.id, text: `${c.name}: ${trendWords(c.rollup.momentum)}.`, sources: [citeCenter(c)] })),
    );
  }

  if (has('empty', 'team', 'staff', 'which', 'center', 'coverage')) {
    const staffed = centers.filter((c) => c.rollup.topics > 0);
    const empty = centers.filter((c) => c.rollup.topics === 0);
    return answer(`${plural(staffed.length, 'center')} ${staffed.length === 1 ? 'has' : 'have'} topics; ${empty.length} ${empty.length === 1 ? 'has' : 'have'} none yet.`, [
      { id: 'staffed', text: `With topics: ${list(staffed.map((c) => c.code ?? c.name))}.`, sources: staffed.map(citeCenter) },
      ...(empty.length ? [{ id: 'empty', text: `Without: ${list(empty.map((c) => c.code ?? c.name))}.` }] : []),
    ]);
  }

  return answer(
    "I can't answer that yet. For now I work from fixed rules over this page's numbers, not a language model, so I know a center (by name or code, like CCI), a topic by name, what's at risk, papers, partner labs, trends, and which centers have topics.",
  );
}

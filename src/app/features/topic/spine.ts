import type { SpineNode, SpineStage, SpineTone } from '@adamstavely/trenchcoat/traceability-spine';
import type { SpineDto } from '../../api/generated/models/spine-dto';
import { gradeInfo } from '../../core/grades';

export const SPINE_STAGES: SpineStage[] = [
  { id: 'questions', label: 'Questions', noun: ['question', 'questions'] },
  { id: 'gaps', label: 'Gaps', noun: ['gap', 'gaps'] },
  { id: 'work', label: 'Work in flight', noun: ['work item', 'work items'] },
  { id: 'papers', label: 'Papers', noun: ['paper', 'papers'] },
  { id: 'citations', label: 'Cited by', noun: ['citing work', 'citing works'] },
];

const QUESTION: Record<string, [string, SpineTone]> = {
  open: ['Open', 'warning'],
  partially: ['Partial', 'info'],
  answered: ['Answered', 'success'],
};
const SEVERITY: Record<string, SpineTone> = { critical: 'danger', high: 'warning', medium: 'neutral' };
const WORK: Record<string, [string, SpineTone]> = {
  planning: ['Planning', 'neutral'],
  active: ['Active', 'info'],
  blocked: ['Blocked', 'danger'],
  review: ['In review', 'warning'],
  complete: ['Complete', 'success'],
};

/** The API's spine → tc-traceability-spine nodes. Edges become each node's `links` (from → to). */
export function spineNodes(spine: SpineDto, names: Map<string, string>): SpineNode[] {
  const links = new Map<string, string[]>();
  for (const e of spine.edges) links.set(e.from, [...(links.get(e.from) ?? []), e.to]);

  // A gap is covered when active work points at it (the same rule the API's coverage uses).
  const activeWork = new Set(spine.work.filter((w) => w.status === 'active').map((w) => w.id));
  const covered = (gapId: string) => (links.get(gapId) ?? []).some((id) => activeWork.has(id));
  const person = (id: string) => names.get(id) ?? id;

  return [
    ...spine.questions.map((q) => ({
      id: q.id,
      stage: 'questions',
      title: q.text,
      kind: 'Question',
      status: QUESTION[q.status]?.[0],
      tone: QUESTION[q.status]?.[1],
      people: [person(q.ownerId)],
      links: links.get(q.id),
    })),
    ...spine.gaps.map((g) => ({
      id: g.id,
      stage: 'gaps',
      title: g.text,
      kind: `Gap · ${g.severity}`,
      status: g.status === 'closed' ? 'Closed' : undefined,
      tone: SEVERITY[g.severity],
      flag: g.status !== 'closed' && !covered(g.id) ? 'Uncovered' : undefined,
      people: [person(g.ownerId)],
      links: links.get(g.id),
    })),
    ...spine.work.map((w) => ({
      id: w.id,
      stage: 'work',
      title: w.title,
      status: WORK[w.status]?.[0],
      tone: WORK[w.status]?.[1],
      progress: w.progress,
      people: w.memberIds.map(person),
      links: links.get(w.id),
    })),
    ...spine.papers.map((p) => ({
      id: p.id,
      stage: 'papers',
      title: p.title,
      kind: p.venue,
      status: gradeInfo(p.grade)?.label,
      tone: gradeInfo(p.grade)?.tone,
      meta: p.published.slice(0, 4),
      links: links.get(p.id),
    })),
    ...spine.citations.map((c) => ({
      id: c.id,
      stage: 'citations',
      title: c.title,
      kind: c.sector,
      meta: [c.venue, c.year, c.org].filter(Boolean).join(' · '),
      links: links.get(c.id),
    })),
  ];
}

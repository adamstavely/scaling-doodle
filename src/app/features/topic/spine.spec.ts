import type { SpineDto } from '../../api/generated/models/spine-dto';
import { spineNodes } from './spine';

const spine = {
  topicId: 't',
  questions: [{ id: 'q1', topicId: 't', text: 'Q?', status: 'open', ownerId: 'mo' }],
  gaps: [
    { id: 'g1', topicId: 't', text: 'Covered gap', severity: 'high', status: 'addressing', ownerId: 'mo', questionIds: ['q1'] },
    { id: 'g2', topicId: 't', text: 'Blocked gap', severity: 'critical', status: 'open', ownerId: 'ec', questionIds: ['q1'] },
  ],
  work: [
    { id: 'w1', topicId: 't', title: 'Active', status: 'active', leadId: 'jt', memberIds: ['jt'], progress: 0.6, due: '2026-08-15', budget: { allocated: 1, spent: 0.5 }, fte: 1, gapIds: ['g1'], note: '' },
    { id: 'w2', topicId: 't', title: 'Blocked', status: 'blocked', leadId: 'ec', memberIds: ['ec'], progress: 0.3, due: '2026-10-01', budget: { allocated: 1, spent: 0.2 }, fte: 1, gapIds: ['g2'], note: '' },
  ],
  papers: [],
  citations: [],
  edges: [
    { from: 'q1', to: 'g1', kind: 'question-gap' },
    { from: 'q1', to: 'g2', kind: 'question-gap' },
    { from: 'g1', to: 'w1', kind: 'gap-work' },
    { from: 'g2', to: 'w2', kind: 'gap-work' },
  ],
} as unknown as SpineDto;

describe('spineNodes', () => {
  const nodes = spineNodes(spine, new Map([['mo', 'Marcus Okonkwo']]));
  const node = (id: string) => nodes.find((n) => n.id === id)!;

  it('turns edges into links', () => {
    expect(node('q1').links).toEqual(['g1', 'g2']);
    expect(node('g1').links).toEqual(['w1']);
  });

  it('flags gaps without active work as uncovered (blocked work does not count)', () => {
    expect(node('g1').flag).toBeUndefined();
    expect(node('g2').flag).toBe('Uncovered');
  });

  it('names people, falling back to their id', () => {
    expect(node('q1').people).toEqual(['Marcus Okonkwo']);
    expect(node('g2').people).toEqual(['ec']);
  });
});

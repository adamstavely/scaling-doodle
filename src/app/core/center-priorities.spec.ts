import type { OrgCenterDto } from '../api/generated/models/org-center-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { centerPriorities } from './center-priorities';

const center = (id: string, code: string | null, name: string) => ({ id, code, name }) as unknown as OrgCenterDto;
const topic = (name: string, centerId: string, bin: number, health: string, healthScore: number) =>
  ({ id: name, name, centerId, bin, health, healthScore }) as unknown as TopicSummaryDto;

describe('centerPriorities', () => {
  const centers = [center('cec', 'CEC', 'Center for Energy & Climate'), center('cis', null, 'Center for Intelligent Systems')];
  const topics = [
    topic('Grid storage', 'cec', 1, 'healthy', 80),
    topic('Fusion', 'cec', 1, 'at-risk', 30),
    topic('Carbon capture', 'cec', 2, 'watch', 55),
    topic('Robotics', 'cis', 2, 'healthy', 75),
  ];

  it('makes a row per center and a column per tier that has topics', () => {
    const m = centerPriorities(centers, topics);
    expect(m.checks).toEqual([
      { id: 'cec', label: 'CEC', description: 'Center for Energy & Climate' },
      { id: 'cis', label: 'Center for Intelligent Systems', description: undefined },
    ]);
    expect(m.parts.map((p) => p.id)).toEqual(['1', '2']);
  });

  it("gives a cell its weakest topic's health and lists the topics, weakest first", () => {
    const { coverage } = centerPriorities(centers, topics);
    expect(coverage['cec']['1']).toEqual({
      status: 'gap',
      detail: '2 topics: 1 at risk, 1 on track.',
      evidence: 'Fusion (at risk, 30) · Grid storage (on track, 80)',
    });
    expect(coverage['cec']['2']).toMatchObject({ status: 'partial', detail: '1 topic: 1 watch.' });
    expect(coverage['cis']['2']).toMatchObject({ status: 'covered' });
  });

  it('leaves a tier the center has no topics in empty', () => {
    expect(centerPriorities(centers, topics).coverage['cis']['1']).toBeUndefined();
  });
});

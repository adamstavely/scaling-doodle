import type { OrgCenterDto } from '../api/generated/models/org-center-dto';
import type { PaperListItemDto } from '../api/generated/models/paper-list-item-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { answerFollowUp } from './donovan';
import type { PageSummaryInput } from './page-summary';

const center = (id: string, code: string, name: string, topics: number, momentum = 0) =>
  ({ id, code, name, rollup: { topics, momentum, coverage: 0.5, openGaps: 4, recentPapers: { lastMonth: 1, thisMonth: 0 } } }) as unknown as OrgCenterDto;
const topic = (id: string, name: string, centerId: string, health: string, healthScore: number, work = 1) =>
  ({ id, name, centerId, health, healthScore, bin: 1, momentum: -3, lead: { name: 'Marcus Okonkwo' }, stats: { work, openGaps: 2, coverage: 0.5 } }) as unknown as TopicSummaryDto;
const paper = (topicId: string, centers: string[], partners: string[] = []) =>
  ({ topicId, partners, authorCenters: centers.map((c) => ({ id: c, code: c.toUpperCase(), name: c })) }) as unknown as PaperListItemDto;

const page: PageSummaryInput = {
  centers: [center('cci', 'CCI', 'Center for Cyber Intelligence', 2, -2), center('nemc', 'NEMC', 'Near East Mission Center', 1, -5), center('afmc', 'AFMC', 'Africa Mission Center', 0)],
  topics: [
    topic('t-neuro', 'Neuromorphic Computing', 'cci', 'at-risk', 18, 0),
    topic('t-advml', 'Adversarial ML Robustness', 'cci', 'healthy', 90),
    topic('t-grid', 'Grid-Scale Energy Storage', 'nemc', 'at-risk', 30),
  ],
  papers: [paper('t-neuro', ['cci']), paper('t-grid', ['nemc', 'cci'], ['NREL'])],
  period: 'this year',
};
const ask = (q: string) => answerFollowUp(q, page);

describe('answerFollowUp', () => {
  it('knows a center by its code or name', () => {
    const a = ask('How is CCI doing?');
    expect(a.text).toBe('Center for Cyber Intelligence has 2 topics, 1 at risk. Its health is down 2 points over three months, and its people contributed to 2 papers this year.');
    expect(a.points[0]).toEqual({ id: 'risk', text: 'At risk: Neuromorphic Computing.', sources: ['topic:t-neuro'] });
    expect(ask('tell me about near east').text).toMatch(/^Near East Mission Center has 1 topic/);
  });

  it('says when a center has no topics', () => {
    expect(ask('what about AFMC').text).toBe("Africa Mission Center has no topics yet, so there's nothing of its own to show this year.");
  });

  it('knows a topic by the words of its name', () => {
    const a = ask('why is neuromorphic struggling?');
    expect(a.text).toBe('Neuromorphic Computing is P1 · Flagship in Center for Cyber Intelligence, at risk with a health score of 18, down 3 points over three months. It published 1 paper this year.');
    expect(a.sources.map((s) => s.id)).toEqual(['topic:t-neuro']);
  });

  it('lists what is at risk, weakest first', () => {
    const a = ask('What is at risk?');
    expect(a.text).toBe('2 topics are at risk, weakest first:');
    expect(a.points.map((p) => p.text)).toEqual([
      'Neuromorphic Computing: health 18, 2 open gaps, no work in flight.',
      'Grid-Scale Energy Storage: health 30, 2 open gaps, 1 work item in flight.',
    ]);
  });

  it('counts papers by center, and joint work with its labs', () => {
    expect(ask('how many papers were published?').points.map((p) => p.text)).toEqual(['Center for Cyber Intelligence: 2', 'Near East Mission Center: 1']);
    expect(ask('any joint work with partners?').text).toMatch(/^1 of the 2 papers this year was written with partner labs: NREL\./);
  });

  it('orders centers by trend, steepest fall first', () => {
    expect(ask("what's the trend?").points.map((p) => p.text)).toEqual([
      'Near East Mission Center: down 5 points over three months.',
      'Center for Cyber Intelligence: down 2 points over three months.',
    ]);
  });

  it('says which centers have topics', () => {
    expect(ask('which centers have teams?').text).toBe('2 centers have topics; 1 has none yet.');
  });

  it('says what it can answer when it cannot', () => {
    expect(ask('what is the weather?').text).toMatch(/^I can't answer that yet\. For now I work from fixed rules/);
  });
});

import type { OrgCenterDto } from '../api/generated/models/org-center-dto';
import type { PaperListItemDto } from '../api/generated/models/paper-list-item-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { pageSummary } from './page-summary';

const center = (id: string, code: string, name: string, topics: number, momentum = 0) =>
  ({ id, code, name, rollup: { topics, momentum } }) as unknown as OrgCenterDto;
const topic = (id: string, name: string, health: string, work = 1) => ({ id, name, health, stats: { work } }) as unknown as TopicSummaryDto;
const paper = (topicId: string, centers: string[], partners: string[] = []) =>
  ({ topicId, partners, authorCenters: centers.map((c) => ({ id: c, code: c.toUpperCase(), name: c })) }) as unknown as PaperListItemDto;

describe('pageSummary', () => {
  const centers = [center('cci', 'CCI', 'Center for Cyber Intelligence', 4, -2), center('nemc', 'NEMC', 'Near East Mission Center', 4, -5), center('afmc', 'AFMC', 'Africa Mission Center', 0)];
  const topics = [topic('t-neuro', 'Neuromorphic Computing', 'at-risk', 0), topic('t-carbon', 'Carbon-Negative Materials', 'at-risk'), topic('t-grid', 'Grid Storage', 'healthy')];
  const papers = [paper('t-neuro', ['cci']), paper('t-neuro', ['cci', 'nemc'], ['Sandia']), paper('t-carbon', ['nemc'])];
  const s = pageSummary({ centers, topics, papers, period: 'this year' }, 'detailed');

  it('gives the gist in one line', () => {
    expect(s.tldr).toBe('3 topics across 2 centers, 2 at risk; 3 papers published this year, 1 with partner labs.');
  });

  it('keeps Short to the gist and two points, citing only what they cite', () => {
    const short = pageSummary({ centers, topics, papers, period: 'this year' });
    expect(short.tldr).toBe(s.tldr);
    expect(short.summary).toBe('');
    expect(short.questions).toEqual([]);
    expect(short.points.map((p) => p.id)).toEqual(['at-risk', 'coverage']);
    expect(short.sources.map((x) => x.id).sort()).toEqual(['center:cci', 'center:nemc', 'topic:t-carbon', 'topic:t-neuro']);
  });

  it('explains what each part of the page shows', () => {
    expect(s.summary.split('\n\n')).toHaveLength(3);
    expect(s.summary).toContain('four at a time in priority order');
  });

  it('makes points citing the topics and centers they come from', () => {
    const point = (id: string) => s.points.find((p) => p.id === id)!;
    expect(point('at-risk')).toEqual({
      id: 'at-risk',
      text: 'Neuromorphic Computing and Carbon-Negative Materials are at risk.',
      sources: ['topic:t-neuro', 'topic:t-carbon'],
    });
    expect(point('coverage').text).toBe('Only CCI and NEMC have topics; the other 1 center has none yet.');
    expect(point('trend').text).toBe("Near East Mission Center's health fell the most: 5 points over three months.");
    // A joint CCI–NEMC paper counts for both, so they tie
    expect(point('papers').text).toBe('CCI and NEMC contributed the most papers this year (2 each); Neuromorphic Computing published the most of any topic (2).');
    const single = pageSummary({ centers, topics, papers: [paper('t-neuro', ['cci']), paper('t-neuro', ['cci'])], period: 'this year' }, 'detailed');
    expect(single.points.find((p) => p.id === 'papers')!.text).toBe(
      'Center for Cyber Intelligence contributed the most papers this year (2); Neuromorphic Computing published the most of any topic (2).',
    );
    const tied = pageSummary({ centers, topics, papers: [paper('t-neuro', ['cci']), paper('t-carbon', ['nemc'])], period: 'this year' }, 'detailed');
    expect(tied.points.find((p) => p.id === 'papers')!.text).toBe(
      'CCI and NEMC contributed the most papers this year (1 each); Neuromorphic Computing and Carbon-Negative Materials published the most of any topic (1 each).',
    );
    expect(s.sources.find((x) => x.id === 'topic:t-neuro')).toMatchObject({ label: 'Neuromorphic Computing', href: '/topics/t-neuro' });
    expect(s.sources.find((x) => x.id === 'center:nemc')).toMatchObject({ href: '/centers/nemc' });
  });

  it('asks what the numbers leave open', () => {
    expect(s.questions).toEqual([
      'Which teams belong to the 1 center with no topics yet?',
      'Neuromorphic Computing is at risk with no work in flight. Who picks it up?',
    ]);
  });

  it('says so when nothing was published', () => {
    const quiet = pageSummary({ centers, topics, papers: [], period: 'this quarter' }, 'detailed');
    expect(quiet.tldr).toBe('3 topics across 2 centers, 2 at risk; 0 papers published this quarter.');
    expect(quiet.points.map((p) => p.id)).not.toContain('papers');
    expect(quiet.questions[0]).toBe('No papers were published this quarter. Is that expected, or are papers still to be recorded?');
  });
});

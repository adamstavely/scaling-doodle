import type { PaperDetailDto } from '../../api/generated/models/paper-detail-dto';
import { impactOf } from './papers.page';

const paper = {
  id: 'p1',
  topicId: 't-neuro',
  topic: { id: 't-neuro', name: 'Neuromorphic Computing' },
  title: 'Sparse Spiking Networks',
  venue: 'Nature Machine Intelligence',
  published: '2025-11-01',
  grade: 'excellent',
  authors: [{ id: 'mo', name: 'Marcus Okonkwo', initials: 'MO' }],
  totals: { downloads: 18420, views: 46100, citations: 73, altmetric: 284, mentions: { news: 11, policy: 3 } },
  metrics: [{ views: 253 }, { views: 533 }],
  audience: { academic: 54, industry: 46 },
  split: { internal: 6, external: 94 },
  geo: [{ country: 'United States', share: 38 }],
  feedback: [{ type: 'peer', who: 'Reviewer 2', sentiment: 'mixed', text: 'Rerun the baseline.', date: '2025-09-02' }],
} as unknown as PaperDetailDto;

describe('impactOf', () => {
  const impact = impactOf(paper);

  it('maps the grade through the shared grade table', () => {
    expect(impact.grade).toEqual({ label: 'Excellent', tone: 'info' });
  });

  it('renames altmetric to attention and keeps the read trend', () => {
    expect(impact.metrics).toEqual({ downloads: 18420, views: 46100, citations: 73, attention: 284 });
    expect(impact.reads).toEqual([253, 533]);
  });

  it('builds mentions, audience and feedback', () => {
    expect(impact.mentions).toEqual([
      { label: 'News', value: 11 },
      { label: 'Policy', value: 3 },
    ]);
    expect(impact.audience.places).toEqual([{ label: 'United States', value: 38 }]);
    expect(impact.feedback[0]).toMatchObject({ kind: 'peer', sentiment: 'mixed', quote: 'Rerun the baseline.' });
  });

  it('falls back for feedback types the element does not know', () => {
    const odd = impactOf({ ...paper, feedback: [{ ...paper.feedback[0], type: 'blog', sentiment: '?' }] });
    expect(odd.feedback[0]).toMatchObject({ kind: 'reader', sentiment: 'mixed' });
  });
});

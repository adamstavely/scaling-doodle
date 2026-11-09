import type { PartnerLabsDto } from '../api/generated/models/partner-labs-dto';
import type { TopicSummaryDto } from '../api/generated/models/topic-summary-dto';
import { findLab, gapCoverage, labCard, labPapers, labSlug, labStartedSplit, labTiles, partnerTiles } from './partners';

const paper = (id: string, initiatedBy: 'us' | 'partner' | 'other-partner', initiator: string | null, otherPartners: string[] = []) => ({
  id,
  title: `Paper ${id}`,
  venue: 'Nature',
  published: '2026-02-01',
  topic: { id: 't-carbon', name: 'Carbon' },
  initiatedBy,
  initiator,
  otherPartners,
  citations: 5,
  views: 1200,
});

const data: PartnerLabsDto = {
  papers: 4,
  joint: 2,
  initiatedByUs: 1,
  initiatedByPartners: 1,
  labs: [
    { name: 'NREL', joint: 2, initiatedByUs: 1, initiatedByThem: 0, initiatedByOthers: 1, citations: 10, views: 2400, topics: [], lastPublished: '2026-02-01', papers: [paper('p5', 'us', null, ['Scripps']), paper('p6', 'other-partner', 'Scripps', ['Scripps'])] },
    { name: 'Scripps', joint: 1, initiatedByUs: 0, initiatedByThem: 1, initiatedByOthers: 0, citations: 5, views: 1200, topics: [], lastPublished: '2026-02-01', papers: [paper('p6', 'partner', 'Scripps', ['NREL'])] },
  ],
};

describe('partners', () => {
  it('sums labs, joint papers and who started them', () => {
    expect(partnerTiles(data).map((t) => [t.label, t.value, t.sub])).toEqual([
      ['Partner labs', '2', 'published with'],
      ['Joint papers', '2', '50% of 4 papers'],
      ['We started', '1', '50% of joint papers'],
      ['Partners started', '1', '50% of joint papers'],
    ]);
  });
});

describe('a partner lab', () => {
  it('has an address from its name, which finds it again', () => {
    expect(labSlug('Sandia National Laboratories')).toBe('sandia-national-laboratories');
    expect(labSlug('Scripps Institution of Oceanography')).toBe('scripps-institution-of-oceanography');
    expect(labSlug('  École Polytechnique (EPFL) ')).toBe('ecole-polytechnique-epfl');
    expect(findLab(data, 'scripps')?.name).toBe('Scripps');
    expect(findLab(data, 'nowhere')).toBeUndefined();
  });

  it('is a card as Centers & Teams draws a center: stats, the health of its topics, and our teams that wrote with it', () => {
    const topic = (id: string, teamId: string, health: TopicSummaryDto['health']) =>
      ({ id, name: id, teamId, health, bin: 1, momentum: -3, stats: { coverage: 0.5, openGaps: 2, fte: 1.5 } }) as unknown as TopicSummaryDto;
    const nrel = { ...data.labs[0], topics: [{ id: 't-carbon', name: 'Carbon' }] };
    const card = labCard(nrel, [topic('t-carbon', 'tm-1', 'at-risk'), topic('t-other', 'tm-1', 'healthy')], new Map([['tm-1', { name: 'Materials', lead: { name: 'Sofia Almeida' } }]]));
    expect(card.id).toBe('nrel');
    expect(card.heading).toBe('NREL');
    expect(card.actions).toEqual([{ id: 'open', label: 'Open lab' }]);
    // Another partner started one of NREL's papers, so that stat shows
    expect(card.stats.map((s) => [s.label, s.value])).toEqual([
      ['Joint papers', '2'],
      ['We started', '1'],
      ['They started', '0'],
      ['Another partner started', '1'],
      ['Citations', '10'],
      ['Topics', '1'],
    ]);
    expect(card.stats[1]).toMatchObject({ sub: '50% of joint papers', meter: 0.5 });
    // Only the topics the joint papers are in: t-other isn't one
    expect(card.health).toEqual({ 'on-track': 0, watch: 0, 'at-risk': 1 });
    expect(card.teams).toEqual([
      expect.objectContaining({
        id: 'tm-1',
        name: 'Materials',
        lead: { name: 'Sofia Almeida' },
        coverage: 0.5,
        gaps: 2,
        fte: 1.5,
        figures: [{ id: 'joint', value: '2', label: 'joint papers' }],
        items: [expect.objectContaining({ id: 't-carbon', priority: 1, health: 'at-risk', momentum: -0.03 })],
      }),
    ]);
  });

  it('sums its joint papers, who started them, citations and topics', () => {
    const [nrel] = data.labs;
    expect(labTiles(nrel).map((t) => [t.label, t.value])).toEqual([
      ['Joint papers', '2'],
      ['We started', '1'],
      ['They started', '0'],
      ['Citations', '10'],
      ['Topics', '0'],
    ]);
    expect(labTiles(nrel)[1].sub).toBe('50% of joint papers');
  });

  it('splits who started the work, with a third partner only when one did', () => {
    const [nrel, scripps] = data.labs;
    expect(labStartedSplit(nrel)).toEqual([
      { label: 'We started', value: 1 },
      { label: 'They started', value: 0 },
      { label: 'Another partner started', value: 1 },
    ]);
    expect(labStartedSplit(scripps).map((p) => p.label)).toEqual(['We started', 'They started']);
  });

  it('lists its joint papers under their topics, saying who started each', () => {
    const results = labPapers(data.labs[0]);
    expect(results.map((r) => [r.id, r.kind, r.href])).toEqual([
      ['p5', 'Carbon', '/papers/p5'],
      ['p6', 'Carbon', '/papers/p6'],
    ]);
    expect(results[0].meta).toEqual(['We started', 'with Scripps', '5 citations', '1.2K views']);
    expect(results[1].meta?.[0]).toBe('Scripps started');
  });
});

describe('coverage across topics', () => {
  const topic = (coverage: number, openGaps: number) => ({ stats: { coverage, openGaps } }) as unknown as TopicSummaryDto;

  it('weighs each topic by its open gaps: one covered gap beside 99 uncovered is 1%, not 50%', () => {
    expect(gapCoverage([topic(1, 1), topic(0, 99)])).toBeCloseTo(0.01);
  });

  it('counts everything covered when no gaps are open', () => {
    expect(gapCoverage([topic(1, 0), topic(1, 0)])).toBe(1);
  });
});

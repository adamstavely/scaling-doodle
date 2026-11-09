import type { PartnerLabsDto } from '../api/generated/models/partner-labs-dto';
import { findLab, labPapers, labRows, labSlug, labStartedSplit, labTiles, partnerBreakdown, partnerPapers, partnerTiles, startedSplit } from './partners';

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
    expect(startedSplit(data)).toEqual([
      { label: 'We started', value: 1 },
      { label: 'Partners started', value: 1 },
    ]);
  });

  it('makes a breakdown record per lab per paper', () => {
    const b = partnerBreakdown(data);
    expect(b.records).toEqual([
      { lab: 'NREL', started: 'We started', topic: 'Carbon', citations: 5 },
      { lab: 'NREL', started: 'Another partner started', topic: 'Carbon', citations: 5 },
      { lab: 'Scripps', started: 'They started', topic: 'Carbon', citations: 5 },
    ]);
    expect(b.dimensions[0].values).toEqual(['NREL', 'Scripps']);
  });

  it('lists each lab’s papers under it, saying who started each', () => {
    const results = partnerPapers(data);
    expect(results.map((r) => [r.id, r.kind, r.meta?.[0]])).toEqual([
      ['NREL|p5', 'NREL', 'We started'],
      ['NREL|p6', 'NREL', 'Scripps started'],
      ['Scripps|p6', 'Scripps', 'They started'],
    ]);
    expect(results[0].meta).toEqual(['We started', 'Carbon', 'with Scripps', '5 citations', '1.2K views']);
    expect(results[0].href).toBe('/papers/p5');
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

  it('is a row of the Labs table, its id the address its name links to', () => {
    expect(labRows(data)[0]).toEqual({ id: 'nrel', name: 'NREL', joint: 2, us: 1, them: 0, citations: 10, topics: 0, last: '2026-02-01' });
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

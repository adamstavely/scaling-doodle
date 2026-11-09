import type { SearchResultsDto } from '../../api/generated/models/search-results-dto';
import { searchGroups, searchTargets } from './search';

const results = {
  topics: [{ id: 't-neuro', label: 'Neuromorphic Computing', detail: 'at-risk', topicId: null, score: 3 }],
  gaps: [
    { id: 'g2', label: 'Learning rule unproven', detail: 'critical', topicId: 't-neuro', score: 2 },
    { id: 'g3', label: 'Endurance unproven', detail: 'high', topicId: 't-neuro', score: 1 },
  ],
  papers: [{ id: 'p4', label: 'A Retargetable Compiler', detail: 'MLSys', topicId: 't-neuro', score: 1 }],
  people: [{ id: 'mo', label: 'Marcus Okonkwo', detail: 'PI', topicId: null, score: 1 }],
} as unknown as SearchResultsDto;

/** Every feature switched on, whatever FEATURES says today */
const allOn = () => true;

describe('search', () => {
  it('groups hits by kind, each command with its own id', () => {
    expect(searchGroups(results, allOn)).toEqual([
      { id: 'topics', label: 'Topics', commands: [{ id: 'topics:t-neuro', label: 'Neuromorphic Computing', hint: 'at-risk' }] },
      {
        id: 'gaps',
        label: 'Gaps',
        commands: [
          { id: 'gaps:g2', label: 'Learning rule unproven', hint: 'critical' },
          { id: 'gaps:g3', label: 'Endurance unproven', hint: 'high' },
        ],
      },
      { id: 'papers', label: 'Papers', commands: [{ id: 'papers:p4', label: 'A Retargetable Compiler', hint: 'MLSys' }] },
      { id: 'people', label: 'People', commands: [{ id: 'people:mo', label: 'Marcus Okonkwo', hint: 'PI' }] },
    ]);
  });

  it('never gives two commands one id – two gaps of one topic used to share it', () => {
    const ids = searchGroups(results, allOn).flatMap((g) => g.commands.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('opens topics and gaps on the topic, papers on the paper, people on the roster', () => {
    const t = searchTargets(results, allOn);
    expect(t.get('topics:t-neuro')).toEqual(['/topics', 't-neuro']);
    expect(t.get('gaps:g2')).toEqual(['/topics', 't-neuro']);
    expect(t.get('gaps:g3')).toEqual(['/topics', 't-neuro']);
    expect(t.get('papers:p4')).toEqual(['/papers', 'p4']);
    expect(t.get('people:mo')).toEqual(['/people']);
    expect(t.get('nonsense')).toBeUndefined();
  });

  it('leaves out people, group and all, while People is switched off: they would open its roster', () => {
    const peopleOff = (feature: string) => feature !== 'people';
    expect(searchGroups(results, peopleOff).map((g) => g.id)).toEqual(['topics', 'gaps', 'papers']);
    expect(searchTargets(results, peopleOff).has('people:mo')).toBe(false);
    // Gaps open their topic, so they stay whatever Gaps & Coverage's switch says
    expect(searchTargets(results, (f) => f !== 'gaps').get('gaps:g2')).toEqual(['/topics', 't-neuro']);
  });
});

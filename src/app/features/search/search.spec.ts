import type { SearchResultsDto } from '../../api/generated/models/search-results-dto';
import { searchGroups, searchTarget } from './search';

const results = {
  topics: [{ id: 't-neuro', label: 'Neuromorphic Computing', detail: 'at-risk', topicId: null, score: 3 }],
  gaps: [{ id: 'g2', label: 'Learning rule unproven', detail: 'critical', topicId: 't-neuro', score: 2 }],
  papers: [],
  people: [{ id: 'mo', label: 'Marcus Okonkwo', detail: 'PI', topicId: null, score: 1 }],
} as unknown as SearchResultsDto;

describe('search', () => {
  it('groups hits by kind, leaving out empty kinds', () => {
    expect(searchGroups(results)).toEqual([
      { id: 'topics', label: 'Topics', commands: [{ id: 'topics:t-neuro', label: 'Neuromorphic Computing', hint: 'at-risk' }] },
      { id: 'gaps', label: 'Gaps', commands: [{ id: 'gaps:t-neuro', label: 'Learning rule unproven', hint: 'critical' }] },
      { id: 'people', label: 'People', commands: [{ id: 'people:mo', label: 'Marcus Okonkwo', hint: 'PI' }] },
    ]);
  });

  it('opens topics and gaps on the topic, papers on the paper, people on the roster', () => {
    expect(searchTarget('topics:t-neuro')).toEqual(['/topics', 't-neuro']);
    expect(searchTarget('gaps:t-neuro')).toEqual(['/topics', 't-neuro']);
    expect(searchTarget('papers:p4')).toEqual(['/papers', 'p4']);
    expect(searchTarget('people:mo')).toEqual(['/people']);
    expect(searchTarget('nonsense')).toBeUndefined();
  });
});

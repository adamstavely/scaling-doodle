import type { OrgDto } from '../../api/generated/models/org-dto';
import type { PersonSummaryDto } from '../../api/generated/models/person-summary-dto';
import { rosterRow, teamNames } from './people.page';

const org = {
  centers: [{ teams: [{ id: 'team-climate', name: 'Climate Systems' }] }],
  otherTeams: [{ id: 'team-solo', name: 'Solo' }],
} as unknown as OrgDto;

const person = (over: Partial<PersonSummaryDto>) =>
  ({
    id: 'am',
    name: 'Arjun Mehta',
    initials: 'AM',
    role: 'pi',
    title: 'Principal Investigator',
    team: 'team-climate',
    allocations: [
      { topicId: 't-climate', fte: 0.7 },
      { topicId: 't-wildfire', fte: 0.5 },
    ],
    capacity: 1,
    load: 1.2,
    overCapacity: true,
    ...over,
  }) as PersonSummaryDto;

describe('roster', () => {
  const teams = teamNames(org);

  it('names teams from centers and from teams outside any center', () => {
    expect(teams.get('team-climate')).toBe('Climate Systems');
    expect(teams.get('team-solo')).toBe('Solo');
  });

  it('flags people over capacity', () => {
    expect(rosterRow(person({}), teams)).toEqual({
      id: 'am',
      name: 'Arjun Mehta',
      role: 'PI',
      team: 'Climate Systems',
      topics: 2,
      load: 1.2,
      status: 'Over capacity',
    });
  });

  it('puts people without a team in the directorate', () => {
    const chief = rosterRow(person({ role: 'chief', team: null, allocations: [], load: 0, overCapacity: false }), teams);
    expect(chief).toMatchObject({ role: 'Chief', team: 'Directorate', topics: 0, status: 'Within capacity' });
  });
});

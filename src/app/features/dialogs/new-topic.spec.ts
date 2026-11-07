import type { OrgDto } from '../../api/generated/models/org-dto';
import type { PersonSummaryDto } from '../../api/generated/models/person-summary-dto';
import { createBody, EMPTY_TOPIC, teamOptions } from './new-topic';

const org = {
  centers: [
    {
      id: 'sl-energy',
      name: 'Center for Energy & Climate',
      code: 'CEC',
      teams: [
        { id: 'team-climate', name: 'Climate Systems', lead: { id: 'am', name: 'Arjun Mehta' } },
        { id: 'team-materials', name: 'Energy & Materials', lead: null },
      ],
    },
  ],
  otherTeams: [],
} as unknown as OrgDto;
const people = [{ id: 'sa', name: 'Sofia Almeida', role: 'pi', team: 'team-materials' }] as PersonSummaryDto[];

describe('teamOptions', () => {
  it('gives the Chief every team, falling back to the team PI as lead', () => {
    const teams = teamOptions(org, people, { id: 'hv', role: 'chief', team: null });
    expect(teams.map((t) => [t.id, t.leadId])).toEqual([
      ['team-climate', 'am'],
      ['team-materials', 'sa'],
    ]);
  });

  it("gives a PI only their own team", () => {
    const teams = teamOptions(org, people, { id: 'am', role: 'pi', team: 'team-climate' });
    expect(teams.map((t) => t.id)).toEqual(['team-climate']);
  });
});

describe('createBody', () => {
  const teams = teamOptions(org, people, { id: 'hv', role: 'chief', team: null });
  const values = {
    ...EMPTY_TOPIC,
    name: '  Ocean Alkalinity  ',
    centerId: 'sl-energy',
    teamId: 'team-climate',
    questions: ' Can it be verified? \n\n How cheaply?',
    budget: '1.5',
    tags: ['climate'],
  };

  it("has the Chief assign the team's PI as lead", () => {
    expect(createBody(values, teams, { id: 'hv', role: 'chief' })).toEqual({
      name: 'Ocean Alkalinity',
      summary: undefined,
      tags: ['climate'],
      bin: 2,
      teamId: 'team-climate',
      leadId: 'am',
      questions: ['Can it be verified?', 'How cheaply?'],
      budget: { allocated: 1.5 },
      sponsors: undefined,
    });
  });

  it('makes a PI the lead of their own topic and drops empty extras', () => {
    const body = createBody({ ...values, questions: ' \n ', budget: '0', tags: [] }, teams, { id: 'am', role: 'pi' });
    expect(body).toMatchObject({ leadId: 'am', questions: undefined, budget: undefined, tags: undefined });
  });
});

import { html } from 'lit';
import type { StepperFormStep } from '@adamstavely/trenchcoat/stepper-form';
import type { CreateTopicDto } from '../../api/generated/models/create-topic-dto';
import type { OrgDto } from '../../api/generated/models/org-dto';
import type { PersonSummaryDto } from '../../api/generated/models/person-summary-dto';
import { PRIORITY_TIERS } from '../../core/format';

export type NewTopicValues = {
  name: string;
  summary: string;
  tags: string[];
  bin: string;
  centerId: string;
  teamId: string;
  questions: string;
  budget: string;
  sponsors: string[];
};

export const EMPTY_TOPIC: NewTopicValues = {
  name: '',
  summary: '',
  tags: [],
  bin: '2',
  centerId: '',
  teamId: '',
  questions: '',
  budget: '1.5',
  sponsors: [],
};

/** Free-text chips: tc-stepper-tags checks for email addresses unless told otherwise. */
const anyText = () => null;

export type TeamOption = {
  id: string;
  name: string;
  centerId: string;
  center: string;
  leadId: string | null;
  leadName: string | null;
};

/** Teams the viewer may create topics in. A PI only leads topics in their own team. */
export function teamOptions(org: OrgDto | undefined, people: PersonSummaryDto[], me: { id: string; role: string; team: string | null }): TeamOption[] {
  const pis = people.filter((p) => p.role === 'pi');
  const all = (org?.centers ?? []).flatMap((c) =>
    c.teams.map((t) => {
      const lead = t.lead ?? pis.find((p) => p.team === t.id);
      return {
        id: t.id,
        name: t.name,
        centerId: c.id,
        center: c.code ?? c.name,
        leadId: lead?.id ?? null,
        leadName: lead?.name ?? null,
      };
    }),
  );
  return me.role === 'chief' ? all : all.filter((t) => t.id === me.team);
}

/** The form's values → the API's create body. The Chief assigns the team's PI as lead; a PI leads their own topic. */
export function createBody(v: NewTopicValues, teams: TeamOption[], me: { id: string; role: string }): CreateTopicDto {
  const team = teams.find((t) => t.id === v.teamId);
  const questions = v.questions
    .split('\n')
    .map((q) => q.trim())
    .filter(Boolean);
  const allocated = Number(v.budget);
  return {
    name: v.name.trim(),
    summary: v.summary.trim() || undefined,
    tags: v.tags.length ? v.tags : undefined,
    bin: Number(v.bin),
    teamId: v.teamId,
    leadId: me.role === 'chief' ? (team?.leadId ?? me.id) : me.id,
    questions: questions.length ? questions : undefined,
    budget: allocated > 0 ? { allocated } : undefined,
    sponsors: v.sponsors.length ? v.sponsors : undefined,
  };
}

const input = (
  value: string,
  set: (v: string) => void,
  attrs: { type?: string; step?: string; min?: string; prefix?: string } = {},
) => html`
  <tc-stepper-input .prefixText=${attrs.prefix ?? ''}>
    <input
      .value=${value}
      type=${attrs.type ?? 'text'}
      step=${attrs.step ?? ''}
      min=${attrs.min ?? ''}
      @input=${(e: Event) => set((e.target as HTMLInputElement).value)}
    />
  </tc-stepper-input>
`;

export function newTopicSteps(teams: TeamOption[]): StepperFormStep<NewTopicValues>[] {
  return [
    {
      id: 'define',
      title: 'Define',
      heading: 'What is the topic?',
      validate: (v) => ({ name: v.name.trim() ? undefined : 'Give the topic a name' }),
      render: ({ values, setValues }) => html`
        <tc-stepper-field name="name" label="Name">${input(values.name, (name) => setValues({ name }))}</tc-stepper-field>
        <tc-stepper-field name="summary" label="Summary" optional hint="One sentence on what the topic is for.">
          ${input(values.summary, (summary) => setValues({ summary }))}
        </tc-stepper-field>
        <tc-stepper-field name="tags" label="Tags" optional hint="Press Enter after each tag.">
          <tc-stepper-tags
            .value=${values.tags}
            .validate=${anyText}
            placeholder="e.g. climate"
            @tc-value-change=${(e: CustomEvent<{ value: string[] }>) => setValues({ tags: e.detail.value })}
          ></tc-stepper-tags>
        </tc-stepper-field>
      `,
    },
    {
      id: 'scope',
      title: 'Scope',
      heading: 'Where does it sit?',
      validate: (v) => ({
        centerId: v.centerId ? undefined : 'Pick the center the topic belongs to',
        teamId: v.teamId ? undefined : 'Pick the team that will run it',
      }),
      render: ({ values, setValues }) => {
        // tc-stepper-choices lays its cards out in one row, so pick a center first and then one of its few teams.
        const centers = [...new Map(teams.map((t) => [t.centerId, t.center])).entries()];
        const inCenter = teams.filter((t) => t.centerId === values.centerId);
        return html`
          <tc-stepper-field name="bin" label="Priority">
            <tc-stepper-choices
              label="Priority"
              .value=${values.bin}
              .options=${[1, 2, 3, 4].map((b) => ({ value: String(b), title: `P${b}`, aside: PRIORITY_TIERS[b].split(' · ')[1] }))}
              @tc-value-change=${(e: CustomEvent<{ value: string }>) => setValues({ bin: e.detail.value })}
            ></tc-stepper-choices>
          </tc-stepper-field>
          ${centers.length > 1
            ? html`<tc-stepper-field name="centerId" label="Center">
                <tc-stepper-choices
                  label="Center"
                  .value=${values.centerId}
                  .options=${centers.map(([value, title]) => ({ value, title }))}
                  @tc-value-change=${(e: CustomEvent<{ value: string }>) => setValues({ centerId: e.detail.value, teamId: '' })}
                ></tc-stepper-choices>
              </tc-stepper-field>`
            : null}
          ${inCenter.length
            ? html`<tc-stepper-field name="teamId" label="Team">
                <tc-stepper-choices
                  label="Team"
                  .value=${values.teamId}
                  .options=${inCenter.map((t) => ({ value: t.id, title: t.name, aside: t.leadName ?? undefined }))}
                  @tc-value-change=${(e: CustomEvent<{ value: string }>) => setValues({ teamId: e.detail.value })}
                ></tc-stepper-choices>
              </tc-stepper-field>`
            : null}
          <tc-stepper-field name="questions" label="Opening questions" optional hint="One per line. They're owned by the topic lead.">
            <tc-stepper-input>
              <textarea
                rows="3"
                .value=${values.questions}
                @input=${(e: Event) => setValues({ questions: (e.target as HTMLTextAreaElement).value })}
              ></textarea>
            </tc-stepper-input>
          </tc-stepper-field>
        `;
      },
    },
    {
      id: 'resourcing',
      title: 'Resourcing',
      heading: 'How is it funded?',
      validate: (v) => ({ budget: Number(v.budget) >= 0 ? undefined : 'Enter a budget of 0 or more' }),
      render: ({ values, setValues }) => html`
        <tc-stepper-field name="budget" label="Budget ($M)" hint="Millions of dollars allocated this fiscal year.">
          ${input(values.budget, (budget) => setValues({ budget }), { type: 'number', step: '0.1', min: '0', prefix: '$' })}
        </tc-stepper-field>
        <tc-stepper-field name="sponsors" label="Sponsors" optional hint="Press Enter after each sponsor.">
          <tc-stepper-tags
            .value=${values.sponsors}
            .validate=${anyText}
            placeholder="e.g. DOE"
            @tc-value-change=${(e: CustomEvent<{ value: string[] }>) => setValues({ sponsors: e.detail.value })}
          ></tc-stepper-tags>
        </tc-stepper-field>
      `,
    },
    {
      id: 'review',
      title: 'Review',
      heading: 'Create this topic?',
      render: ({ values, goTo }) => {
        const team = teams.find((t) => t.id === values.teamId);
        return html`<tc-stepper-review
          editable
          @tc-edit=${(e: CustomEvent<{ step: string }>) => goTo(e.detail.step)}
          .rows=${[
            { label: 'Name', value: values.name, step: 'define' },
            { label: 'Priority', value: PRIORITY_TIERS[Number(values.bin)], step: 'scope' },
            { label: 'Team', value: team ? `${team.name} (lead: ${team.leadName ?? 'you'})` : '—', step: 'scope' },
            { label: 'Opening questions', value: String(values.questions.split('\n').filter((q) => q.trim()).length), step: 'scope' },
            { label: 'Budget', value: `$${values.budget}M`, step: 'resourcing' },
            { label: 'Sponsors', value: values.sponsors.join(', ') || '—', step: 'resourcing' },
          ]}
        ></tc-stepper-review>`;
      },
    },
  ];
}

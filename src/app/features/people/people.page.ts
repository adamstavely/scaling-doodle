import { Component, computed } from '@angular/core';
import { CapacityBars } from '@adamstavely/trenchcoat/angular/capacity-bars';
import { DataTable } from '@adamstavely/trenchcoat/angular/data-table';
import { Skeleton } from '@adamstavely/trenchcoat/angular/shimmer-loader';
import type { CapacityPerson } from '@adamstavely/trenchcoat/capacity-bars';
import type { DataColumn, DataRow, TagTone } from '@adamstavely/trenchcoat/data-table';
import { orgControllerTree } from '../../api/generated/fn/org/org-controller-tree';
import { peopleControllerList } from '../../api/generated/fn/people/people-controller-list';
import { topicsControllerList } from '../../api/generated/fn/topics/topics-controller-list';
import type { OrgDto } from '../../api/generated/models/org-dto';
import type { PersonSummaryDto } from '../../api/generated/models/person-summary-dto';
import { scopedResource } from '../../core/scoped-resource';

const ROLE: Record<PersonSummaryDto['role'], string> = {
  chief: 'Chief',
  pi: 'PI',
  staff: 'Staff',
  postdoc: 'Postdoc',
};

export const ROSTER_COLUMNS: DataColumn[] = [
  { key: 'name', label: 'Name', type: 'title' },
  { key: 'role', label: 'Role', type: 'tag' },
  { key: 'team', label: 'Team', type: 'text' },
  { key: 'topics', label: 'Topics', type: 'number' },
  { key: 'load', label: 'Load (FTE)', type: 'number' },
  { key: 'status', label: 'Capacity', type: 'tag' },
];

export const ROSTER_TONES: Record<string, TagTone> = {
  Chief: 'violet',
  PI: 'blue',
  Staff: 'green',
  Postdoc: 'amber',
  'Over capacity': 'pink',
  'Within capacity': 'gray',
};

/** Team ids → names, from the org tree. */
export function teamNames(org: OrgDto | undefined): Map<string, string> {
  const teams = [...(org?.centers.flatMap((c) => c.teams) ?? []), ...(org?.otherTeams ?? [])];
  return new Map(teams.map((t) => [t.id, t.name]));
}

export function rosterRow(p: PersonSummaryDto, teams: Map<string, string>): DataRow {
  return {
    id: p.id,
    name: p.name,
    role: ROLE[p.role],
    team: p.team ? (teams.get(p.team) ?? p.team) : 'Directorate',
    topics: p.allocations.length,
    load: p.load,
    status: p.overCapacity ? 'Over capacity' : 'Within capacity',
  };
}

@Component({
  selector: 'app-people-page',
  imports: [CapacityBars, DataTable, Skeleton],
  templateUrl: './people.page.html',
  styleUrl: './people.page.css',
})
export class PeoplePage {
  readonly #people = scopedResource((api) => api.invoke(peopleControllerList));
  readonly #topics = scopedResource((api) => api.invoke(topicsControllerList));
  readonly #org = scopedResource((api) => api.invoke(orgControllerTree));

  protected readonly error = computed(() => this.#people.error() ?? this.#topics.error() ?? this.#org.error());
  protected readonly ready = computed(() => this.#people.hasValue() && this.#topics.hasValue() && this.#org.hasValue());

  protected readonly columns = ROSTER_COLUMNS;
  protected readonly tones = ROSTER_TONES;

  readonly #topicNames = computed(() => new Map((this.#topics.value() ?? []).map((t) => [t.id, t.name])));

  protected readonly overCount = computed(() => (this.#people.value() ?? []).filter((p) => p.overCapacity).length);

  /** Only people with allocations: the load chart has nothing to draw for the rest. */
  protected readonly capacity = computed<CapacityPerson[]>(() =>
    (this.#people.value() ?? [])
      .filter((p) => p.allocations.length)
      .map((p) => ({
        id: p.id,
        name: p.name,
        role: p.title,
        capacity: p.capacity,
        allocations: p.allocations.map((a) => ({
          id: a.topicId,
          label: this.#topicNames().get(a.topicId) ?? a.topicId,
          amount: a.fte,
        })),
      })),
  );

  protected readonly rows = computed<DataRow[]>(() => {
    const teams = teamNames(this.#org.value());
    return (this.#people.value() ?? []).map((p) => rosterRow(p, teams));
  });
}

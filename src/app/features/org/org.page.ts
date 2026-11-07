import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OpsOverview } from '@adamstavely/trenchcoat/angular/ops-overview';
import { OrgUnitCard } from '@adamstavely/trenchcoat/angular/org-unit-card';
import { Skeleton } from '@adamstavely/trenchcoat/angular/shimmer-loader';
import type { OpsTile } from '@adamstavely/trenchcoat/ops-overview';
import type { OrgHealthCounts, OrgOpen, OrgStat, OrgTeam } from '@adamstavely/trenchcoat/org-unit-card';
import { orgControllerTree } from '../../api/generated/fn/org/org-controller-tree';
import { peopleControllerList } from '../../api/generated/fn/people/people-controller-list';
import type { OrgCenterDto } from '../../api/generated/models/org-center-dto';
import type { OrgDto } from '../../api/generated/models/org-dto';
import type { OrgRollupDto } from '../../api/generated/models/org-rollup-dto';
import type { OrgTeamDto } from '../../api/generated/models/org-team-dto';
import type { PersonSummaryDto } from '../../api/generated/models/person-summary-dto';
import { jointShare } from '../../core/collaboration';
import { percent, priorityHealth, PRIORITY_TIERS } from '../../core/format';
import { read, scopedResource } from '../../core/scoped-resource';

function healthCounts(r: OrgRollupDto): OrgHealthCounts {
  return { 'on-track': r.healthMix.healthy, watch: r.healthMix.watch, 'at-risk': r.healthMix.atRisk };
}

function stats(r: OrgRollupDto): OrgStat[] {
  const tone = (n: number) => (n >= 0.7 ? 'success' : n >= 0.5 ? 'warning' : 'danger');
  const burn = r.budget.allocated ? r.budget.spent / r.budget.allocated : 0;
  // A unit with no topics has no average health.
  const health: OrgStat =
    r.avgHealthScore === null
      ? { id: 'health', label: 'Avg health', value: '—' }
      : {
          id: 'health',
          label: 'Avg health',
          value: `${r.avgHealthScore}`,
          sub: 'of 100',
          meter: r.avgHealthScore / 100,
          tone: tone(r.avgHealthScore / 100),
        };
  return [
    { id: 'topics', label: 'Topics', value: String(r.topics) },
    health,
    { id: 'gaps', label: 'Open gaps', value: String(r.openGaps) },
    { id: 'coverage', label: 'Coverage', value: percent(r.coverage), meter: r.coverage, tone: tone(r.coverage) },
    { id: 'fte', label: 'FTE', value: String(r.fte) },
    { id: 'budget', label: 'Budget', value: `$${r.budget.spent}M`, sub: `of $${r.budget.allocated}M`, meter: burn },
    joint(r),
  ];
}

/** Joint papers as a share of everything the unit has published. */
function joint(r: OrgRollupDto): OrgStat {
  const share = jointShare(r.collaboration);
  if (share === null) return { id: 'joint', label: 'Joint research', value: '—', sub: 'no papers yet' };
  return {
    id: 'joint',
    label: 'Joint research',
    value: percent(share),
    sub: `${r.collaboration.joint} joint · ${r.collaboration.unilateral} unilateral`,
    meter: share,
  };
}

function team(t: OrgTeamDto): OrgTeam {
  return {
    id: t.id,
    name: t.name,
    lead: t.lead ? { name: t.lead.name } : undefined,
    health: healthCounts(t.rollup),
    coverage: t.rollup.coverage,
    gaps: t.rollup.openGaps,
    fte: t.rollup.fte,
    items: t.topics.map((topic) => ({
      id: topic.id,
      label: topic.name,
      priority: topic.bin,
      tag: PRIORITY_TIERS[topic.bin],
      coverage: topic.coverage,
      open: topic.openGaps,
      // Health points on a 0–100 scale, as a fraction (see the dashboard).
      momentum: topic.momentum / 100,
      health: priorityHealth(topic.health),
    })),
  };
}

/** The row above the centers: topics, researchers and budget across everything in view. */
export function orgSummaryTiles(org: OrgDto, people: PersonSummaryDto[]): OpsTile[] {
  const rollups = [...org.centers.map((c) => c.rollup), ...org.otherTeams.map((t) => t.rollup)];
  const sum = (pick: (r: OrgRollupDto) => number) => Math.round(rollups.reduce((s, r) => s + pick(r), 0) * 10) / 10;
  // Researchers: anyone allocated to at least one topic in view.
  const researchers = people.filter((p) => p.allocations.length > 0).length;
  return [
    { id: 'topics', label: 'Active topics', value: sum((r) => r.topics), sub: 'tracked' },
    { id: 'researchers', label: 'Researchers', value: researchers, sub: `${sum((r) => r.fte)} FTE allocated` },
    { id: 'budget', label: 'Budget', value: `$${sum((r) => r.budget.allocated)}M`, sub: `$${sum((r) => r.budget.spent)}M spent` },
  ];
}

/** One center → tc-org-unit-card's properties. */
export function centerCard(c: OrgCenterDto) {
  return {
    id: c.id,
    heading: c.name,
    code: c.code ?? undefined,
    description: c.focus ?? undefined,
    lead: c.lead ? { name: c.lead.name, title: 'Center lead' } : null,
    stats: stats(c.rollup),
    health: healthCounts(c.rollup),
    teams: c.teams.map(team),
  };
}

@Component({
  selector: 'app-org-page',
  imports: [OpsOverview, OrgUnitCard, Skeleton],
  templateUrl: './org.page.html',
  styleUrl: './org.page.css',
})
export class OrgPage {
  readonly #router = inject(Router);
  readonly #org = scopedResource((api) => api.invoke(orgControllerTree));
  readonly #people = scopedResource((api) => api.invoke(peopleControllerList));

  protected readonly error = computed(() => this.#org.error());
  protected readonly ready = computed(() => this.#org.hasValue());
  protected readonly centers = computed(() => (read(this.#org)?.centers ?? []).map(centerCard));
  protected readonly summary = computed(() => {
    const org = read(this.#org);
    const people = read(this.#people);
    return org && people ? orgSummaryTiles(org, people) : [];
  });
  protected readonly otherTeams = computed(() => (read(this.#org)?.otherTeams ?? []).map(team));

  protected openTopic(event: CustomEvent<OrgOpen>): void {
    void this.#router.navigate(['/topics', event.detail.item.id]);
  }
}

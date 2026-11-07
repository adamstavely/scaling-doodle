import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OrgUnitCard } from '@adamstavely/trenchcoat/angular/org-unit-card';
import { Skeleton } from '@adamstavely/trenchcoat/angular/shimmer-loader';
import type { OrgHealthCounts, OrgOpen, OrgStat, OrgTeam } from '@adamstavely/trenchcoat/org-unit-card';
import { orgControllerTree } from '../../api/generated/fn/org/org-controller-tree';
import type { OrgCenterDto } from '../../api/generated/models/org-center-dto';
import type { OrgRollupDto } from '../../api/generated/models/org-rollup-dto';
import type { OrgTeamDto } from '../../api/generated/models/org-team-dto';
import { percent, priorityHealth, PRIORITY_TIERS } from '../../core/format';
import { scopedResource } from '../../core/scoped-resource';

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
  ];
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
  imports: [OrgUnitCard, Skeleton],
  templateUrl: './org.page.html',
  styleUrl: './org.page.css',
})
export class OrgPage {
  readonly #router = inject(Router);
  readonly #org = scopedResource((api) => api.invoke(orgControllerTree));

  protected readonly error = computed(() => this.#org.error());
  protected readonly ready = computed(() => this.#org.hasValue());
  protected readonly centers = computed(() => (this.#org.value()?.centers ?? []).map(centerCard));
  protected readonly otherTeams = computed(() => (this.#org.value()?.otherTeams ?? []).map(team));

  protected openTopic(event: CustomEvent<OrgOpen>): void {
    void this.#router.navigate(['/topics', event.detail.item.id]);
  }
}

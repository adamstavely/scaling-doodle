import { Component, computed, inject, input, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BudgetBurn } from '@adamstavely/trenchcoat/angular/budget-burn';
import { CapacityBars } from '@adamstavely/trenchcoat/angular/capacity-bars';
import { CoverageRing } from '@adamstavely/trenchcoat/angular/coverage-ring';
import { GradeDistribution } from '@adamstavely/trenchcoat/angular/grade-distribution';
import { ProfileHeader } from '@adamstavely/trenchcoat/angular/profile-header';
import { SegmentedBar } from '@adamstavely/trenchcoat/angular/segmented-bar';
import { Skeleton } from '@adamstavely/trenchcoat/angular/shimmer-loader';
import { TraceabilitySpine } from '@adamstavely/trenchcoat/angular/traceability-spine';
import { WorkItem } from '@adamstavely/trenchcoat/angular/work-item';
import type { BurnItem } from '@adamstavely/trenchcoat/budget-burn';
import type { CapacityPerson } from '@adamstavely/trenchcoat/capacity-bars';
import type { CoverageSegment } from '@adamstavely/trenchcoat/coverage-ring';
import type { ProfileMeta, ProfilePill } from '@adamstavely/trenchcoat/profile-header';
import type { WorkStatus } from '@adamstavely/trenchcoat/work-item';
import { Api } from '../../api/generated/api';
import { peopleControllerList } from '../../api/generated/fn/people/people-controller-list';
import { topicsControllerGet } from '../../api/generated/fn/topics/topics-controller-get';
import { topicsControllerSpine } from '../../api/generated/fn/topics/topics-controller-spine';
import type { WorkDto } from '../../api/generated/models/work-dto';
import { read, scopedResource } from '../../core/scoped-resource';
import { collaborationParts } from '../../core/collaboration';
import { gradeCounts } from '../../core/grades';
import { localDate, PRIORITY_TIERS } from '../../core/format';
import { Session } from '../../core/session';
import { SPINE_STAGES, spineNodes } from './spine';

const HEALTH: Record<string, ProfilePill> = {
  healthy: { label: 'On track', tone: 'success' },
  watch: { label: 'Watch', tone: 'warning' },
  'at-risk': { label: 'At risk', tone: 'danger' },
};

const WORK_STATUS: Record<WorkDto['status'], WorkStatus> = {
  planning: 'paused',
  active: 'active',
  blocked: 'blocked',
  review: 'review',
  complete: 'done',
};

@Component({
  selector: 'app-topic-page',
  imports: [
    RouterLink,
    ProfileHeader,
    TraceabilitySpine,
    CoverageRing,
    BudgetBurn,
    CapacityBars,
    GradeDistribution,
    SegmentedBar,
    WorkItem,
    Skeleton,
  ],
  templateUrl: './topic.page.html',
  styleUrl: './topic.page.css',
})
export class TopicPage {
  readonly #api = inject(Api);
  readonly #session = inject(Session);

  /** From the route (`/topics/:id`). */
  readonly id = input.required<string>();

  readonly #topic = resource({
    params: () => ({ id: this.id(), as: this.#session.viewAs() }),
    loader: ({ params }) => this.#api.invoke(topicsControllerGet, { id: params.id }),
  });
  readonly #spine = resource({
    params: () => ({ id: this.id(), as: this.#session.viewAs() }),
    loader: ({ params }) => this.#api.invoke(topicsControllerSpine, { id: params.id }),
  });
  readonly #people = scopedResource((api) => api.invoke(peopleControllerList));

  protected readonly topic = computed(() => read(this.#topic));
  protected readonly ready = computed(() => this.#topic.hasValue() && this.#spine.hasValue() && this.#people.hasValue());
  protected readonly error = computed(() => this.#topic.error() ?? this.#spine.error() ?? this.#people.error());

  readonly #names = computed(() => new Map((read(this.#people) ?? []).map((p) => [p.id, p.name])));

  protected readonly status = computed(() => HEALTH[this.topic()?.health ?? 'healthy']);

  protected readonly tags = computed<ProfilePill[]>(() => {
    const t = this.topic();
    if (!t) return [];
    return [{ label: PRIORITY_TIERS[t.bin] ?? `P${t.bin}` }, ...t.tags.map((label) => ({ label: `#${label}` }))];
  });

  protected readonly meta = computed<ProfileMeta[]>(() => {
    const t = this.topic();
    if (!t) return [];
    return [
      `Lead: ${t.lead?.name ?? t.leadId}`,
      t.team?.name,
      t.center?.name,
      t.sponsors.length ? `Sponsors: ${t.sponsors.join(', ')}` : undefined,
      `Health ${t.healthScore}/100`,
      t.plannedFte ? `Staffing: ${t.stats.fte} of ${t.plannedFte} FTE planned` : undefined,
      this.funded(),
    ].filter((m): m is string => !!m);
  });

  /** "Experiments funded: 4 in flight · $2.4M committed" – work not yet complete and the budget allocated to it. */
  protected readonly funded = computed(() => {
    const spine = read(this.#spine);
    if (!spine) return undefined;
    const live = spine.work.filter((w) => w.status !== 'complete');
    const committed = live.reduce((s, w) => s + w.budget.allocated, 0);
    return `Experiments funded: ${live.length} in flight · $${Math.round(committed * 10) / 10}M committed`;
  });

  protected readonly coverageSegments = computed<CoverageSegment[]>(() => {
    const s = this.topic()?.stats;
    if (!s) return [];
    const covered = Math.round(s.coverage * s.openGaps);
    return [
      { id: 'covered', label: 'Covered', count: covered, tone: 'success' },
      { id: 'uncovered', label: 'Uncovered', count: s.openGaps - covered, tone: 'danger' },
    ];
  });

  protected readonly burn = computed<BurnItem[]>(() =>
    (read(this.#spine)?.work ?? []).map((w) => ({
      id: w.id,
      label: w.title,
      owner: this.#names().get(w.leadId),
      // The API keeps money in $M; the element formats whole currency units.
      budget: w.budget.allocated * 1_000_000,
      spent: w.budget.spent * 1_000_000,
    })),
  );

  protected readonly capacity = computed<CapacityPerson[]>(() => {
    const t = this.topic();
    if (!t) return [];
    return t.people.map((p) => ({
      id: p.person.id,
      name: p.person.name,
      capacity: 1,
      allocations: [{ id: t.id, label: t.name, amount: p.fte }],
    }));
  });

  protected readonly grades = computed(() => gradeCounts(this.topic()?.stats.grades ?? {}));
  protected readonly collaboration = computed(() => collaborationParts(this.topic()?.stats.collaboration));
  protected readonly gradedCount = computed(() => this.grades().reduce((n, g) => n + g.count, 0));

  protected readonly stages = SPINE_STAGES;
  protected readonly nodes = computed(() => {
    const spine = read(this.#spine);
    return spine ? spineNodes(spine, this.#names()) : [];
  });

  protected readonly work = computed(() =>
    (read(this.#spine)?.work ?? []).map((w) => ({
      id: w.id,
      title: w.title,
      status: WORK_STATUS[w.status],
      note: w.note || undefined,
      progress: w.progress,
      due: localDate(w.due),
      people: w.memberIds.map((id) => ({ name: this.#names().get(id) ?? id })),
      spent: w.budget.spent * 1_000_000,
      budget: w.budget.allocated * 1_000_000,
      effort: `${w.fte} FTE`,
    })),
  );
}

import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BudgetBurn } from '@adamstavely/trenchcoat/angular/budget-burn';
import { CapacityBars } from '@adamstavely/trenchcoat/angular/capacity-bars';
import { InvestmentBalance } from '@adamstavely/trenchcoat/angular/investment-balance';
import { OpsOverview } from '@adamstavely/trenchcoat/angular/ops-overview';
import { Skeleton } from '@adamstavely/trenchcoat/angular/shimmer-loader';
import type { BurnOpen } from '@adamstavely/trenchcoat/budget-burn';
import { peopleControllerList } from '../../api/generated/fn/people/people-controller-list';
import { topicsControllerList } from '../../api/generated/fn/topics/topics-controller-list';
import { todayIso } from '../../core/period';
import { burnGroups, capacityPeople, investmentTiers, resourcingTiles } from '../../core/resourcing';
import { read, scopedResource } from '../../core/scoped-resource';
import { Session } from '../../core/session';

/** People and research dollars against priority, for the topics in view. */
@Component({
  selector: 'app-resourcing-page',
  imports: [OpsOverview, InvestmentBalance, BudgetBurn, CapacityBars, Skeleton],
  templateUrl: './resourcing.page.html',
  styleUrl: './resourcing.page.css',
})
export class ResourcingPage {
  readonly #router = inject(Router);
  readonly #session = inject(Session);

  readonly #topics = scopedResource((api) => api.invoke(topicsControllerList, { sort: 'risk' }));
  readonly #people = scopedResource((api) => api.invoke(peopleControllerList));

  protected readonly isChief = computed(() => this.#session.viewAs() === 'chief');
  protected readonly error = computed(() => this.#topics.error() ?? this.#people.error());
  protected readonly ready = computed(() => this.#topics.hasValue() && this.#people.hasValue());
  protected readonly scopeLabel = computed(() =>
    this.isChief() ? 'Directorate · whole portfolio' : `${read(this.#session.me)?.name ?? ''} · your topics`,
  );

  protected readonly tiles = computed(() => resourcingTiles(read(this.#topics) ?? [], read(this.#people) ?? []));
  protected readonly tiers = computed(() => investmentTiers(read(this.#topics) ?? []));
  /** A burn card per budget year, each paced against its own year. */
  protected readonly burnGroups = computed(() => burnGroups(read(this.#topics) ?? [], todayIso()));
  protected readonly capacity = computed(() => {
    const names = new Map((read(this.#topics) ?? []).map((t) => [t.id, t.name]));
    return capacityPeople(read(this.#people) ?? [], names);
  });
  protected readonly overCount = computed(() => (read(this.#people) ?? []).filter((p) => p.overCapacity).length);

  protected openTopic(event: CustomEvent<BurnOpen>): void {
    void this.#router.navigate(['/topics', event.detail.id]);
  }
}

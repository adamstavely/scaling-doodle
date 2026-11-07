import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BreakdownChart } from '@adamstavely/trenchcoat/angular/breakdown-chart';
import { OpsOverview } from '@adamstavely/trenchcoat/angular/ops-overview';
import { ResultsList } from '@adamstavely/trenchcoat/angular/results-list';
import { SegmentedBar } from '@adamstavely/trenchcoat/angular/segmented-bar';
import { Skeleton } from '@adamstavely/trenchcoat/angular/shimmer-loader';
import type { ResultsOpen } from '@adamstavely/trenchcoat/results-list';
import { partnersControllerList } from '../../api/generated/fn/partners/partners-controller-list';
import { partnerBreakdown, partnerPapers, partnerTiles, startedSplit } from '../../core/partners';
import { read, scopedResource } from '../../core/scoped-resource';
import { Session } from '../../core/session';

/** The labs we publish with: joint papers per lab, and who started the work, us or them. */
@Component({
  selector: 'app-partners-page',
  imports: [OpsOverview, BreakdownChart, SegmentedBar, ResultsList, Skeleton],
  templateUrl: './partners.page.html',
  styleUrl: './partners.page.css',
})
export class PartnersPage {
  readonly #router = inject(Router);
  readonly #session = inject(Session);

  readonly #partners = scopedResource((api) => api.invoke(partnersControllerList));

  protected readonly error = computed(() => this.#partners.error());
  protected readonly ready = computed(() => this.#partners.hasValue());
  protected readonly scopeLabel = computed(() =>
    this.#session.viewAs() === 'chief' ? 'Directorate · whole portfolio' : `${read(this.#session.me)?.name ?? ''} · your topics`,
  );

  readonly #data = computed(() => read(this.#partners));
  protected readonly hasLabs = computed(() => !!this.#data()?.labs.length);
  protected readonly tiles = computed(() => {
    const d = this.#data();
    return d ? partnerTiles(d) : [];
  });
  protected readonly split = computed(() => {
    const d = this.#data();
    return d ? startedSplit(d) : [];
  });
  protected readonly breakdown = computed(() => {
    const d = this.#data();
    return d ? partnerBreakdown(d) : { records: [], dimensions: [], measures: [] };
  });
  protected readonly papers = computed(() => {
    const d = this.#data();
    return d ? partnerPapers(d) : [];
  });

  protected openPaper(event: CustomEvent<ResultsOpen>): void {
    event.preventDefault();
    void this.#router.navigateByUrl(event.detail.result.href ?? '/papers');
  }
}

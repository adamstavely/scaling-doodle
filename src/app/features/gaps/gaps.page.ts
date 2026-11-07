import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '@adamstavely/trenchcoat/angular/button';
import { GapExposure } from '@adamstavely/trenchcoat/angular/gap-exposure';
import { Skeleton } from '@adamstavely/trenchcoat/angular/shimmer-loader';
import type { ExposureGap, GapOpen } from '@adamstavely/trenchcoat/gap-exposure';
import { gapsControllerList } from '../../api/generated/fn/gaps/gaps-controller-list';
import { PRIORITY_TIERS } from '../../core/format';
import { exposureGap, gapReviewCsv } from '../../core/gaps';
import { todayIso } from '../../core/period';
import { read, scopedResource } from '../../core/scoped-resource';
import { Session } from '../../core/session';

/** Every open gap in view and whether anyone is working on it, grouped by priority or severity. */
@Component({
  selector: 'app-gaps-page',
  imports: [GapExposure, Button, Skeleton],
  templateUrl: './gaps.page.html',
  styleUrl: './gaps.page.css',
})
export class GapsPage {
  readonly #router = inject(Router);
  readonly #session = inject(Session);

  // Open, addressing and closing gaps: everything but closed. The API sorts most severe, then least healthy topic, first.
  readonly #gaps = scopedResource(async (api) => {
    const statuses = ['open', 'addressing', 'closing'] as const;
    const lists = await Promise.all(statuses.map((status) => api.invoke(gapsControllerList, { status, limit: 100 })));
    const severity = { critical: 0, high: 1, medium: 2 } as const;
    return lists.flat().sort((a, b) => severity[a.severity] - severity[b.severity] || a.topic.healthScore - b.topic.healthScore);
  });

  protected readonly tiers = PRIORITY_TIERS;
  protected readonly error = computed(() => this.#gaps.error());
  protected readonly ready = computed(() => this.#gaps.hasValue());
  protected readonly gaps = computed<ExposureGap[]>(() => (read(this.#gaps) ?? []).map(exposureGap));
  protected readonly scopeLabel = computed(() =>
    this.#session.viewAs() === 'chief' ? 'Directorate · whole portfolio' : `${read(this.#session.me)?.name ?? ''} · your topics`,
  );

  protected openGap(event: CustomEvent<GapOpen>): void {
    const gap = read(this.#gaps)?.find((g) => g.id === event.detail.id);
    if (gap) void this.#router.navigate(['/topics', gap.topicId]);
  }

  /** Downloads the gaps in view as a CSV for the review meeting. */
  protected exportReview(): void {
    const gaps = read(this.#gaps);
    if (!gaps) return;
    const url = URL.createObjectURL(new Blob([gapReviewCsv(gaps)], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `gap-review-${todayIso()}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }
}

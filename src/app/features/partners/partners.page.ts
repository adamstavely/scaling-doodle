import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OpsOverview } from '@adamstavely/trenchcoat/angular/ops-overview';
import { OrgUnitCard } from '@adamstavely/trenchcoat/angular/org-unit-card';
import { Skeleton } from '@adamstavely/trenchcoat/angular/shimmer-loader';
import type { OrgOpen } from '@adamstavely/trenchcoat/org-unit-card';
import { orgControllerTree } from '../../api/generated/fn/org/org-controller-tree';
import { partnersControllerList } from '../../api/generated/fn/partners/partners-controller-list';
import { topicsControllerList } from '../../api/generated/fn/topics/topics-controller-list';
import { labCard, partnerTiles, TeamRef } from '../../core/partners';
import { read, scopedResource } from '../../core/scoped-resource';

/**
 * The labs we publish with, laid out as Centers & Teams is: the joint research across them, then a card per lab with
 * its joint papers, who started them, and our teams that wrote them – Open lab goes to the lab's own page.
 */
@Component({
  selector: 'app-partners-page',
  imports: [OpsOverview, OrgUnitCard, Skeleton],
  templateUrl: './partners.page.html',
  styleUrl: './partners.page.css',
})
export class PartnersPage {
  readonly #router = inject(Router);

  readonly #partners = scopedResource((api) => api.invoke(partnersControllerList));
  readonly #topics = scopedResource((api) => api.invoke(topicsControllerList, { sort: 'risk' }));
  readonly #org = scopedResource((api) => api.invoke(orgControllerTree));

  protected readonly error = computed(() => this.#partners.error() ?? this.#topics.error());
  // The org tree only names the teams, so the cards don't wait on it if it fails.
  protected readonly ready = computed(() => this.#partners.hasValue() && this.#topics.hasValue() && (this.#org.hasValue() || !!this.#org.error()));

  readonly #teams = computed(() => {
    const org = read(this.#org);
    const all = [...(org?.centers.flatMap((c) => c.teams) ?? []), ...(org?.otherTeams ?? [])];
    return new Map<string, TeamRef>(all.map((t) => [t.id, { name: t.name, lead: t.lead }]));
  });
  protected readonly summary = computed(() => {
    const p = read(this.#partners);
    return p ? partnerTiles(p) : [];
  });
  protected readonly labs = computed(() => (read(this.#partners)?.labs ?? []).map((l) => labCard(l, read(this.#topics) ?? [], this.#teams())));

  /** A lab card's Open lab goes to that lab's page. */
  protected openLab(id: string): void {
    void this.#router.navigate(['/partners', id]);
  }

  protected openTopic(event: CustomEvent<OrgOpen>): void {
    void this.#router.navigate(['/topics', event.detail.item.id]);
  }
}

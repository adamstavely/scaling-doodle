import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BreakdownChart } from '@adamstavely/trenchcoat/angular/breakdown-chart';
import { DataTable } from '@adamstavely/trenchcoat/angular/data-table';
import { OpsOverview } from '@adamstavely/trenchcoat/angular/ops-overview';
import { ResultsList } from '@adamstavely/trenchcoat/angular/results-list';
import { SegmentedBar } from '@adamstavely/trenchcoat/angular/segmented-bar';
import { Skeleton } from '@adamstavely/trenchcoat/angular/shimmer-loader';
import type { DataColumn, DataRow } from '@adamstavely/trenchcoat/data-table';
import type { ResultsOpen } from '@adamstavely/trenchcoat/results-list';
import { partnersControllerList } from '../../api/generated/fn/partners/partners-controller-list';
import { LAB_COLUMNS, labRows, partnerBreakdown, partnerPapers, partnerTiles, startedSplit } from '../../core/partners';
import { read, scopedResource } from '../../core/scoped-resource';
import { Session } from '../../core/session';

/** The labs we publish with: each lab, linked to its own page; joint papers per lab, and who started the work. */
@Component({
  selector: 'app-partners-page',
  imports: [OpsOverview, DataTable, BreakdownChart, SegmentedBar, ResultsList, Skeleton],
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
  protected readonly labColumns = LAB_COLUMNS;
  protected readonly labs = computed(() => {
    const d = this.#data();
    return d ? labRows(d) : [];
  });
  /** A lab's name is a link to its page; the table draws the rest. */
  protected readonly labCell = (row: DataRow, column: DataColumn): Node | undefined => {
    if (column.key !== 'name') return undefined;
    const link = Object.assign(document.createElement('a'), { href: `/partners/${row.id}`, textContent: String(row['name']), className: 'lab-link' });
    // Drawn inside the table, out of reach of this page's styles
    link.style.color = 'var(--tc-accent-text)';
    link.style.fontWeight = 'var(--tc-font-weight-medium)';
    return link;
  };

  protected readonly papers = computed(() => {
    const d = this.#data();
    return d ? partnerPapers(d) : [];
  });

  /** A lab's link opens its page in the app rather than reloading it; a modified click is left to the browser. */
  protected openLabLink(event: MouseEvent): void {
    const link = (event.target as Element).closest?.('a.lab-link');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void this.#router.navigateByUrl(link.getAttribute('href')!);
  }

  protected openPaper(event: CustomEvent<ResultsOpen>): void {
    event.preventDefault();
    void this.#router.navigateByUrl(event.detail.result.href ?? '/papers');
  }
}

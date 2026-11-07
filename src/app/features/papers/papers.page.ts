import { Component, computed, effect, inject, input, resource, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OpsOverview } from '@adamstavely/trenchcoat/angular/ops-overview';
import { PublicationImpact } from '@adamstavely/trenchcoat/angular/publication-impact';
import { ResultsList } from '@adamstavely/trenchcoat/angular/results-list';
import { SegmentedControl } from '@adamstavely/trenchcoat/angular/segmented-control';
import { Skeleton } from '@adamstavely/trenchcoat/angular/shimmer-loader';
import type {
  PublicationFeedback,
  PublicationFeedbackKind,
  PublicationMention,
  PublicationSentiment,
} from '@adamstavely/trenchcoat/publication-impact';
import type { ResultsOpen, SearchResult } from '@adamstavely/trenchcoat/results-list';
import type { SegmentValueChange } from '@adamstavely/trenchcoat/segmented-control';
import { Api } from '../../api/generated/api';
import { papersControllerFirstCitation } from '../../api/generated/fn/papers/papers-controller-first-citation';
import { papersControllerGet } from '../../api/generated/fn/papers/papers-controller-get';
import { papersControllerGrade } from '../../api/generated/fn/papers/papers-controller-grade';
import { papersControllerList } from '../../api/generated/fn/papers/papers-controller-list';
import type { PaperDetailDto } from '../../api/generated/models/paper-detail-dto';
import { collaborationLabel } from '../../core/collaboration';
import { firstCitationLabel, firstCitationTiles } from '../../core/first-citation';
import { compactNumber, localDate } from '../../core/format';
import { GRADES, GradeId, gradeInfo } from '../../core/grades';
import { scopedResource } from '../../core/scoped-resource';
import { Session } from '../../core/session';

const UNGRADED = 'ungraded';

// The API types these as free strings; anything unexpected falls back rather than breaking the element.
const KINDS: readonly PublicationFeedbackKind[] = ['peer', 'reader', 'sponsor'];
const SENTIMENTS: readonly PublicationSentiment[] = ['positive', 'mixed', 'negative'];
const kindOf = (t: string) => KINDS.find((k) => k === t) ?? 'reader';
const sentimentOf = (t: string) => SENTIMENTS.find((k) => k === t) ?? 'mixed';

/** One paper's detail → tc-publication-impact's properties. */
export function impactOf(p: PaperDetailDto) {
  const grade = gradeInfo(p.grade);
  const mentions: PublicationMention[] = Object.entries(p.totals.mentions ?? {}).map(([label, value]) => ({
    label: label[0].toUpperCase() + label.slice(1),
    value: value as number,
  }));
  const feedback: PublicationFeedback[] = p.feedback.map((f, i) => ({
    id: `${p.id}-f${i}`,
    kind: kindOf(f.type),
    who: f.who,
    date: localDate(f.date),
    quote: f.text,
    sentiment: sentimentOf(f.sentiment),
  }));
  return {
    heading: p.title,
    venue: p.venue,
    date: localDate(p.published),
    topic: { label: p.topic.name, href: `/topics/${p.topicId}` },
    grade: grade ? { label: grade.label, tone: grade.tone } : undefined,
    authors: p.authors.map((a) => ({ name: a.name })),
    metrics: {
      downloads: p.totals.downloads,
      views: p.totals.views,
      citations: p.totals.citations,
      attention: p.totals.altmetric,
    },
    reads: p.metrics.map((m) => m.views),
    mentions,
    audience: {
      sectors: Object.entries(p.audience ?? {}).map(([label, value]) => ({
        label: label[0].toUpperCase() + label.slice(1),
        value: value as number,
      })),
      split: p.split ?? null,
      places: p.geo.map((g) => ({ label: g.country, value: g.share })),
    },
    feedback,
  };
}

@Component({
  selector: 'app-papers-page',
  imports: [OpsOverview, ResultsList, PublicationImpact, SegmentedControl, Skeleton],
  templateUrl: './papers.page.html',
  styleUrl: './papers.page.css',
})
export class PapersPage {
  readonly #api = inject(Api);
  readonly #router = inject(Router);
  readonly #session = inject(Session);

  /** From the route (`/papers/:id`); unset on `/papers`, which opens the first paper. */
  readonly id = input<string>();

  readonly #list = scopedResource((api) => api.invoke(papersControllerList));
  readonly #firstCitation = scopedResource((api) => api.invoke(papersControllerFirstCitation));
  readonly #detail = resource({
    params: () => (this.id() ? { id: this.id()!, as: this.#session.viewAs() } : undefined),
    loader: ({ params }) => this.#api.invoke(papersControllerGet, { id: params.id }),
  });

  protected readonly isChief = computed(() => this.#session.viewAs() === 'chief');
  protected readonly listError = computed(() => this.#list.error());
  protected readonly detailError = computed(() => this.#detail.error());
  protected readonly listReady = computed(() => this.#list.hasValue());
  protected readonly paper = computed(() => (this.#detail.hasValue() ? this.#detail.value() : undefined));
  protected readonly impact = computed(() => {
    const p = this.paper();
    return p ? impactOf(p) : undefined;
  });

  /** Time to first citation across the papers in view. */
  protected readonly citationTiles = computed(() => {
    const s = this.#firstCitation.value();
    return s ? firstCitationTiles(s) : [];
  });

  protected readonly results = computed<SearchResult[]>(() =>
    (this.#list.value() ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      source: p.venue,
      kind: gradeInfo(p.grade)?.label ?? 'Ungraded',
      href: `/papers/${p.id}`,
      date: localDate(p.published),
      meta: [
        p.topic.name,
        collaborationLabel(p.partners),
        `${compactNumber(p.totals.downloads)} downloads`,
        `${p.totals.citations} citations`,
        firstCitationLabel(p.firstCitation),
      ],
    })),
  );

  protected readonly gradeOptions = [
    ...GRADES.map((g) => ({ value: g.id, label: g.label })),
    { value: UNGRADED, label: 'Ungraded' },
  ];
  protected readonly gradeValue = computed(() => this.paper()?.grade ?? UNGRADED);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  constructor() {
    // `/papers` with no id opens the first paper, so the detail pane is never empty.
    effect(() => {
      const first = this.#list.value()?.[0];
      if (!this.id() && first) void this.#router.navigate(['/papers', first.id], { replaceUrl: true });
    });
  }

  protected openPaper(event: CustomEvent<ResultsOpen>): void {
    event.preventDefault();
    void this.#router.navigate(['/papers', event.detail.id]);
  }

  protected async onGradeChange(event: CustomEvent<SegmentValueChange>): Promise<void> {
    const id = this.id();
    if (!id || !this.isChief()) return;
    const value = event.detail.value;
    const grade = value === UNGRADED ? null : (value as GradeId);
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const updated = await this.#api.invoke(papersControllerGrade, { id, body: { grade } });
      this.#detail.set(updated);
      this.#list.reload();
    } catch {
      this.saveError.set("Couldn't save the grade. Try again.");
      this.#detail.reload();
    } finally {
      this.saving.set(false);
    }
  }
}

import { html } from 'lit';
import type { DataColumn, DataRow } from '@adamstavely/trenchcoat/data-table';
import type { DigestItem } from '@adamstavely/trenchcoat/digest';
import type { ExposureGap } from '@adamstavely/trenchcoat/gap-exposure';
import type { SearchResult } from '@adamstavely/trenchcoat/results-list';
import type { BriefDto } from '../../api/generated/models/brief-dto';
import { collaborationParts, jointShare } from '../../core/collaboration';
import { compactNumber, localDate, percent, PRIORITY_TIERS } from '../../core/format';
import { daysToQuarterEnd, periodOptions, periodShort, todayIso } from '../../core/period';
import { portfolioTiles } from '../../core/portfolio';

const CENTER_COLUMNS: DataColumn[] = [
  { key: 'name', label: 'Center', type: 'title' },
  { key: 'topics', label: 'Topics', type: 'number' },
  { key: 'health', label: 'Avg health', type: 'number' },
  { key: 'coverage', label: 'Coverage', type: 'text' },
  { key: 'gaps', label: 'Open gaps', type: 'number' },
  { key: 'budget', label: 'Budget spent', type: 'text' },
  { key: 'joint', label: 'Joint research', type: 'text' },
];

const INVESTMENT_COLUMNS: DataColumn[] = [
  { key: 'tier', label: 'Priority', type: 'title' },
  { key: 'topics', label: 'Topics', type: 'text' },
  { key: 'budget', label: 'Budget', type: 'text' },
  { key: 'fte', label: 'FTE', type: 'text' },
];

/** "1 of 2 (50%)": joint papers out of everything published; "—" with none. */
function jointOf(c: BriefDto['centers'][number]['rollup']['collaboration']): string {
  const share = jointShare(c);
  return share === null ? '—' : `${c.joint} of ${c.joint + c.unilateral} (${percent(share)})`;
}

/** The API's brief → the pieces each section renders. Pure, so it's tested without the DOM. */
export function briefModel(b: BriefDto) {
  const decisions: DigestItem[] = b.decisions.map((d, i) => ({
    id: `d${i}`,
    text: `${d.tag}: ${d.lead} ${d.body}`,
    source: d.topicId ? { label: 'Open topic', href: `/topics/${d.topicId}` } : undefined,
  }));
  const centers: DataRow[] = b.centers.map((c) => ({
    id: c.id,
    name: c.code ? `${c.name} (${c.code})` : c.name,
    topics: c.rollup.topics,
    health: c.rollup.avgHealthScore ?? '—',
    coverage: percent(c.rollup.coverage),
    gaps: c.rollup.openGaps,
    budget: `$${c.rollup.budget.spent}M of $${c.rollup.budget.allocated}M`,
    joint: jointOf(c.rollup.collaboration),
  }));
  const exposure: ExposureGap[] = b.exposure.map((g) => ({
    id: g.id,
    text: g.text,
    severity: g.severity,
    item: g.topic.name,
    work: g.covered ? 1 : 0,
    owner: g.owner?.name,
  }));
  const investment: DataRow[] = b.investment.map((i) => ({
    id: `bin-${i.bin}`,
    tier: PRIORITY_TIERS[i.bin] ?? i.label,
    topics: `${i.topics} (${percent(i.topicShare)})`,
    budget: `$${i.budget}M (${percent(i.budgetShare)})`,
    fte: `${i.fte} (${percent(i.fteShare)})`,
  }));
  const impact: SearchResult[] = b.impact.map((p) => ({
    id: p.id,
    title: p.title,
    source: p.venue,
    kind: p.topic.name,
    href: `/papers/${p.id}`,
    date: localDate(p.published),
    meta: [`${compactNumber(p.periodTotals.downloads)} downloads in period`, `${p.periodTotals.citations} citations`],
  }));
  return {
    summary: b.executiveSummary,
    decisions,
    tiles: portfolioTiles(b.atAGlance, true),
    collaboration: collaborationParts(b.atAGlance.collaborationInPeriod),
    centers,
    exposure,
    investment,
    impact,
  };
}

export function briefTemplate(
  b: BriefDto,
  on: { route: (url: string) => void; period: (value: string) => void },
  today = todayIso(),
) {
  const m = briefModel(b);
  const period = b.period.label === 'ytd' ? 'Year to date' : periodShort(b.period.label);
  const periods = periodOptions(today).map((p) => ({ value: p.value, label: p.label }));
  const review = daysToQuarterEnd(today);
  // Links inside the brief route in-app instead of reloading the page.
  const route = (href: string | undefined) => (e: Event) => {
    if (!href) return;
    e.preventDefault();
    on.route(href);
  };
  return html`
    <div class="brief">
      <div class="brief-head">
        <tc-select
          label="Brief period"
          .options=${periods}
          .value=${b.period.label}
          @tc-value-change=${(e: CustomEvent<{ value: string }>) => on.period(e.detail.value)}
        ></tc-select>
        <p class="brief-review">
          Next quarterly review ${review === 0 ? html`<strong>today</strong>` : html`in <strong>${review} ${review === 1 ? 'day' : 'days'}</strong>`}
        </p>
      </div>
      <p class="brief-meta">
        ${period} · ${b.period.from} to ${b.period.to} · prepared for ${b.preparedFor.name} ·
        generated ${new Date(b.generatedAt).toLocaleString()}
      </p>

      <h3>1. Executive summary and decisions</h3>
      <tc-digest
        heading="This period"
        .matters=${m.summary}
        .actions=${m.decisions}
        .changes=${[]}
        .ignore=${[]}
        @tc-cite-open=${(e: CustomEvent<{ source: { href?: string } }>) => route(e.detail.source.href)(e)}
      ></tc-digest>

      <h3>2. Portfolio at a glance</h3>
      <tc-ops-overview heading="At a glance" .tiles=${m.tiles}></tc-ops-overview>

      <h3>3. Centers</h3>
      <tc-data-table heading="Centers" readonly .selectable=${false} .columns=${CENTER_COLUMNS} .rows=${m.centers}></tc-data-table>

      <h3>4. Exposure</h3>
      <tc-gap-exposure heading="Critical and high gaps" group-by="severity" .gaps=${m.exposure}></tc-gap-exposure>

      <h3>5. Investment by priority</h3>
      <tc-data-table
        heading="Investment by priority"
        readonly
        .selectable=${false}
        .columns=${INVESTMENT_COLUMNS}
        .rows=${m.investment}
      ></tc-data-table>

      <h3>6. Impact</h3>
      <tc-segmented-bar
        heading="Unilateral vs. joint research"
        description="Papers published this period, done alone or with partner labs"
        sort="false"
        .highlight=${'Joint'}
        .data=${m.collaboration}
      ></tc-segmented-bar>
      <tc-results-list
        heading="Top papers this period"
        group="none"
        .results=${m.impact}
        @tc-open=${(e: CustomEvent<{ result: SearchResult }>) => route(e.detail.result.href)(e)}
      ></tc-results-list>
    </div>
  `;
}

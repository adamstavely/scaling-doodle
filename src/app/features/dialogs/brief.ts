import { html } from 'lit';
import type { DataColumn, DataRow } from '@adamstavely/trenchcoat/data-table';
import type { DigestItem } from '@adamstavely/trenchcoat/digest';
import type { ExposureGap } from '@adamstavely/trenchcoat/gap-exposure';
import type { SearchResult } from '@adamstavely/trenchcoat/results-list';
import type { BriefDto } from '../../api/generated/models/brief-dto';
import { compactNumber, localDate, percent, PRIORITY_TIERS } from '../../core/format';
import { portfolioTiles } from '../../core/portfolio';

const CENTER_COLUMNS: DataColumn[] = [
  { key: 'name', label: 'Center', type: 'title' },
  { key: 'topics', label: 'Topics', type: 'number' },
  { key: 'health', label: 'Avg health', type: 'number' },
  { key: 'coverage', label: 'Coverage', type: 'text' },
  { key: 'gaps', label: 'Open gaps', type: 'number' },
  { key: 'budget', label: 'Budget spent', type: 'text' },
];

const INVESTMENT_COLUMNS: DataColumn[] = [
  { key: 'tier', label: 'Priority', type: 'title' },
  { key: 'topics', label: 'Topics', type: 'text' },
  { key: 'budget', label: 'Budget', type: 'text' },
  { key: 'fte', label: 'FTE', type: 'text' },
];

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
    centers,
    exposure,
    investment,
    impact,
  };
}

const PERIOD_LABEL: Record<string, string> = { ytd: 'Year to date' };

export function briefTemplate(
  b: BriefDto,
  on: { route: (url: string) => void },
) {
  const m = briefModel(b);
  const period = PERIOD_LABEL[b.period.label] ?? b.period.label;
  // Links inside the brief route in-app instead of reloading the page.
  const route = (href: string | undefined) => (e: Event) => {
    if (!href) return;
    e.preventDefault();
    on.route(href);
  };
  return html`
    <div class="brief">
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
      <tc-results-list
        heading="Top papers this period"
        group="none"
        .results=${m.impact}
        @tc-open=${(e: CustomEvent<{ result: SearchResult }>) => route(e.detail.result.href)(e)}
      ></tc-results-list>
    </div>
  `;
}

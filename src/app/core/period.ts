/**
 * Reporting periods, in the API's terms (`ytd`, `FY27`, `FY27-Q1`). Fiscal years follow the US federal calendar:
 * FY27 runs 2026-10-01 to 2027-09-30, and Q1 is Oct–Dec.
 */
export interface PeriodOption {
  /** What the API takes. */
  value: string;
  /** What the picker shows. */
  label: string;
  /** Short form for tile labels: "Q1 FY27", "YTD", "FY27". */
  short: string;
}

/** The fiscal year and quarter a date falls in. */
export function fiscalQuarter(date: string): { fy: number; q: number } {
  const [y, m] = date.split('-').map(Number);
  const fy = m >= 10 ? y + 1 : y;
  const q = Math.floor(((m + 2) % 12) / 3) + 1; // Oct→1, Jan→2, Apr→3, Jul→4
  return { fy, q };
}

const yy = (fy: number) => String(fy % 100).padStart(2, '0');

/** The dashboard's choices, newest first: this quarter, last quarter, year to date, this fiscal year. */
export function periodOptions(today: string): PeriodOption[] {
  const { fy, q } = fiscalQuarter(today);
  const last = q === 1 ? { fy: fy - 1, q: 4 } : { fy, q: q - 1 };
  return [
    { value: `FY${yy(fy)}-Q${q}`, label: 'This quarter', short: `Q${q} FY${yy(fy)}` },
    { value: `FY${yy(last.fy)}-Q${last.q}`, label: 'Last quarter', short: `Q${last.q} FY${yy(last.fy)}` },
    { value: 'ytd', label: 'Year to date', short: 'YTD' },
    { value: `FY${yy(fy)}`, label: 'Fiscal year', short: `FY${yy(fy)}` },
  ];
}

/** The short label for any period value the API accepts. */
export function periodShort(value: string): string {
  const m = /^FY(\d{2})(?:-Q([1-4]))?$/i.exec(value);
  if (!m) return 'YTD';
  return m[2] ? `Q${m[2]} FY${m[1]}` : `FY${m[1]}`;
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

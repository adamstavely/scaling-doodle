/**
 * Reporting periods, in the API's terms (`2026-11`, `ytd`, `FY27`, `FY27-Q1`). Fiscal years follow the US federal calendar:
 * FY27 runs 2026-10-01 to 2027-09-30, and Q1 is Oct–Dec.
 */
export interface PeriodOption {
  /** What the API takes. */
  value: string;
  /** What the picker shows. */
  label: string;
  /** Short form for tile labels: "Nov 2026", "Q1 FY27", "YTD", "FY27". */
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A calendar month as the API takes it ("2026-11") and as a tile shows it ("Nov 2026"). */
function monthOption(y: number, m: number, label: string): PeriodOption {
  return { value: `${y}-${String(m).padStart(2, '0')}`, label, short: `${MONTHS[m - 1]} ${y}` };
}

/** The pickers' choices, shortest first: this and last month, this and last quarter, year to date, this fiscal year. */
export function periodOptions(today: string): PeriodOption[] {
  const [y, m] = today.split('-').map(Number);
  const { fy, q } = fiscalQuarter(today);
  const last = q === 1 ? { fy: fy - 1, q: 4 } : { fy, q: q - 1 };
  return [
    monthOption(y, m, 'This month'),
    m === 1 ? monthOption(y - 1, 12, 'Last month') : monthOption(y, m - 1, 'Last month'),
    { value: `FY${yy(fy)}-Q${q}`, label: 'This quarter', short: `Q${q} FY${yy(fy)}` },
    { value: `FY${yy(last.fy)}-Q${last.q}`, label: 'Last quarter', short: `Q${last.q} FY${yy(last.fy)}` },
    { value: 'ytd', label: 'Year to date', short: 'YTD' },
    { value: `FY${yy(fy)}`, label: 'Fiscal year', short: `FY${yy(fy)}` },
  ];
}

/** The period a page shows when none is picked: this quarter. */
export const DEFAULT_PERIOD_INDEX = 2;

/** The short label for any period value the API accepts. */
export function periodShort(value: string): string {
  const month = /^(\d{4})-(\d{2})$/.exec(value);
  if (month) return `${MONTHS[Number(month[2]) - 1]} ${month[1]}`;
  const m = /^FY(\d{2})(?:-Q([1-4]))?$/i.exec(value);
  if (!m) return 'YTD';
  return m[2] ? `Q${m[2]} FY${m[1]}` : `FY${m[1]}`;
}

/** Days from `today` to the last day of its fiscal quarter, when the quarterly review falls; 0 on that day. */
export function daysToQuarterEnd(today: string): number {
  const [y, m, d] = today.split('-').map(Number);
  // Fiscal quarters end with Dec, Mar, Jun and Sep.
  const endMonth = Math.ceil(m / 3) * 3;
  const end = Date.UTC(y, endMonth, 0);
  return Math.round((end - Date.UTC(y, m - 1, d)) / 86_400_000);
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A date as the page headings show it: "2026-11-08" → "08 November 2026" (day, month by name, year). */
export function asOfDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d} ${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

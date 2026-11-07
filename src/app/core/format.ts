const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** 101047 → "101K" */
export function compactNumber(n: number): string {
  return compact.format(n);
}

/** 0.363 → "36%" */
export function percent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/** The API's health words → Trench Coat's. */
export function priorityHealth(health: 'healthy' | 'watch' | 'at-risk'): 'on-track' | 'watch' | 'at-risk' {
  return health === 'healthy' ? 'on-track' : health;
}

export const PRIORITY_TIERS: Record<number, string> = { 1: 'P1 · Flagship', 2: 'P2 · Core', 3: 'P3 · Core', 4: 'P4 · Emerging' };

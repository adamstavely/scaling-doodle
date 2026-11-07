import type { Grade, GradeTone } from '@adamstavely/trenchcoat/grade-distribution';

/** The fixed four-level paper assessment, best first. The one place grade names and tones are defined. */
export const GRADES = [
  { id: 'outstanding', label: 'Outstanding', tone: 'success' },
  { id: 'excellent', label: 'Excellent', tone: 'info' },
  { id: 'satisfactory', label: 'Satisfactory', tone: 'warning' },
  { id: 'dissatisfactory', label: 'Dissatisfactory', tone: 'danger' },
] as const satisfies readonly { id: string; label: string; tone: GradeTone }[];

export type GradeId = (typeof GRADES)[number]['id'];

export function gradeInfo(id: string | null | undefined) {
  return GRADES.find((g) => g.id === id);
}

/** Per-grade counts → tc-grade-distribution's grades. */
export function gradeCounts(counts: Partial<Record<GradeId, number>>): Grade[] {
  return GRADES.map((g) => ({ id: g.id, label: g.label, tone: g.tone, count: counts[g.id] ?? 0 }));
}

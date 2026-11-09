/**
 * Feature flags: which sections the side nav shows. A section switched off leaves the nav, but its page still opens
 * from a link or its URL – nothing is taken away, it's just not offered yet.
 */
export const FEATURES = {
  gaps: false,
  resourcing: false,
  people: false,
} as const;

export type Feature = keyof typeof FEATURES;

/** On unless it's a flag that's switched off: sections without a flag are always on. */
export const featureOn = (id: string): boolean => FEATURES[id as Feature] ?? true;

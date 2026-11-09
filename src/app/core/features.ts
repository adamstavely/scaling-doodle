/**
 * Feature flags: the sections that are switched on. A section switched off leaves the side nav, its URL goes to the
 * Summary, and nothing links to it – search leaves out results that would open it. Its code stays, ready to switch on.
 */
export const FEATURES = {
  gaps: false,
  resourcing: false,
  people: false,
} as const;

export type Feature = keyof typeof FEATURES;

/** On unless it's a flag that's switched off: sections without a flag are always on. */
export const featureOn = (id: string): boolean => FEATURES[id as Feature] ?? true;

/** For a route's canMatch: a switched-off section's URL matches nothing, so it falls through to the Summary. */
export const whenOn = (feature: Feature) => () => featureOn(feature);

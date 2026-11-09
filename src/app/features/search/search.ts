import type { CommandMenuGroup } from '@adamstavely/trenchcoat/command-menu';
import type { SearchResultsDto } from '../../api/generated/models/search-results-dto';
import { featureOn } from '../../core/features';

const KINDS = [
  { key: 'topics', label: 'Topics' },
  { key: 'gaps', label: 'Gaps' },
  { key: 'papers', label: 'Papers' },
  { key: 'people', label: 'People' },
] as const;

type Kind = (typeof KINDS)[number]['key'];

/** The feature a kind's results open, where it's switched off they're left out: people open the People roster. */
const OPENS: Partial<Record<Kind, string>> = { people: 'people' };
const shownKinds = (on: (feature: string) => boolean) => KINDS.filter(({ key }) => !OPENS[key] || on(OPENS[key]));

/**
 * Search results → tc-command-menu groups. Every command's id is the hit's own, "kind:id" ("gaps:g2"), so no two
 * share one – the menu's arrow keys move by id, and two gaps of one topic used to trap them. Where each leads is kept
 * apart, in `searchTargets`.
 */
export function searchGroups(r: SearchResultsDto, on = featureOn): CommandMenuGroup[] {
  return shownKinds(on).map(({ key, label }) => ({
    id: key,
    label,
    commands: r[key].map((hit) => ({ id: `${key}:${hit.id}`, label: hit.label, hint: hit.detail })),
  })).filter((g) => g.commands.length);
}

/**
 * Where each command leads, by its id. A gap opens its topic; topics and papers open themselves; people have no page
 * of their own yet, so they open the People roster – and are left out, with their group, while People is switched off.
 */
export function searchTargets(r: SearchResultsDto, on = featureOn): Map<string, string[]> {
  const targets = new Map<string, string[]>();
  for (const { key } of shownKinds(on)) {
    for (const hit of r[key]) {
      const to = target(key, hit.id, hit.topicId);
      if (to) targets.set(`${key}:${hit.id}`, to);
    }
  }
  return targets;
}

function target(kind: Kind, id: string, topicId: string | null | undefined): string[] | undefined {
  switch (kind) {
    case 'topics':
      return ['/topics', id];
    case 'gaps':
      return topicId ? ['/topics', topicId] : undefined;
    case 'papers':
      return ['/papers', id];
    case 'people':
      return ['/people'];
  }
}

import type { CommandMenuGroup } from '@adamstavely/trenchcoat/command-menu';
import type { SearchResultsDto } from '../../api/generated/models/search-results-dto';

const KINDS = [
  { key: 'topics', label: 'Topics' },
  { key: 'gaps', label: 'Gaps' },
  { key: 'papers', label: 'Papers' },
  { key: 'people', label: 'People' },
] as const;

type Kind = (typeof KINDS)[number]['key'];

/** Search results → tc-command-menu groups. Each command's id says where it leads: "topics:t-neuro", "gaps:t-neuro". */
export function searchGroups(r: SearchResultsDto): CommandMenuGroup[] {
  return KINDS.map(({ key, label }) => ({
    id: key,
    label,
    commands: r[key].map((hit) => ({
      // A gap opens its topic; everything else opens itself.
      id: `${key}:${key === 'gaps' ? hit.topicId : hit.id}`,
      label: hit.label,
      hint: hit.detail,
    })),
  })).filter((g) => g.commands.length);
}

/** Where a picked result goes. People have no page of their own yet, so they open the People roster. */
export function searchTarget(commandId: string): string[] | undefined {
  const [kind, id] = commandId.split(':') as [Kind, string];
  if (!id) return undefined;
  switch (kind) {
    case 'topics':
    case 'gaps':
      return ['/topics', id];
    case 'papers':
      return ['/papers', id];
    case 'people':
      return ['/people'];
  }
}

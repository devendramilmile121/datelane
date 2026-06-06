// resources/timeline-rows.ts
// Pure: flatten resource definitions + grouping config into the row list the Timeline views
// consume. Single-level grouping is fully supported; deeper hierarchies render flattened with
// a depth hint (full tree expansion is a later milestone — see scheduler-plan.md §5).

import { GroupingConfig, ResourceDefinition } from '../core/models';
import { TimelineRowInput } from '../engine/horizontal-time-layout';

export interface TimelineRowsResult {
  rows: TimelineRowInput[];
  /** Header label for the resource gutter (the grouped resource's title). */
  title: string;
}

export function buildTimelineRows(
  resources: ReadonlyArray<ResourceDefinition>,
  grouping?: GroupingConfig,
): TimelineRowsResult {
  if (!resources.length) return { rows: [], title: '' };

  // Pick the resource(s) named by grouping, else the first defined resource.
  const names = grouping?.resources?.length ? grouping.resources : [resources[0].name];
  const chosen = names
    .map((n) => resources.find((r) => r.name === n))
    .filter((r): r is ResourceDefinition => !!r);
  if (!chosen.length) return { rows: [], title: '' };

  const primary = chosen[0];
  const rows: TimelineRowInput[] = primary.dataSource.map((rec) => ({
    resourceId: rec[primary.idField] as string | number,
    label: String(rec[primary.textField] ?? ''),
    color: primary.colorField ? (rec[primary.colorField] as string) : undefined,
    depth: 0,
  }));

  return { rows, title: primary.title };
}

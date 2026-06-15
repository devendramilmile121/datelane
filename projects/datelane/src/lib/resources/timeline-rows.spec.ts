// resources/timeline-rows.spec.ts — pure resource→row flattening tests.

import { ResourceDefinition, GroupingConfig } from '../core/models';
import { buildTimelineRows } from './timeline-rows';

function resource(p: Partial<ResourceDefinition> = {}): ResourceDefinition {
  return {
    field: 'OwnerId', title: 'Owners', name: 'Owners', idField: 'id', textField: 'text',
    colorField: 'color',
    dataSource: [
      { id: 1, text: 'Alice', color: '#a00' },
      { id: 2, text: 'Bob', color: '#0a0' },
    ],
    ...p,
  };
}

describe('buildTimelineRows', () => {
  it('returns no rows and an empty title with no resources', () => {
    expect(buildTimelineRows([])).toEqual({ rows: [], title: '' });
  });

  it('flattens the first resource into rows with id/label/color', () => {
    const { rows, title } = buildTimelineRows([resource()]);
    expect(title).toBe('Owners');
    expect(rows).toEqual([
      { resourceId: 1, label: 'Alice', color: '#a00', depth: 0 },
      { resourceId: 2, label: 'Bob', color: '#0a0', depth: 0 },
    ]);
  });

  it('picks the resource named by the grouping config', () => {
    const rooms = resource({ name: 'Rooms', title: 'Rooms', dataSource: [{ id: 9, text: 'R9' }] });
    const grouping: GroupingConfig = { resources: ['Rooms'] };
    const { rows, title } = buildTimelineRows([resource(), rooms], grouping);
    expect(title).toBe('Rooms');
    expect(rows.map((r) => r.resourceId)).toEqual([9]);
  });

  it('omits color when colorField is undefined', () => {
    const { rows } = buildTimelineRows([resource({ colorField: undefined })]);
    expect(rows[0].color).toBeUndefined();
  });

  it('returns empty when the grouping names an unknown resource', () => {
    expect(buildTimelineRows([resource()], { resources: ['Nope'] })).toEqual({ rows: [], title: '' });
  });
});

// Tests for the horizontal-time engine + timeline column builder (Timeline views).
import { NativeDateAdapter } from '../date-adapter/native-date-adapter';
import { layoutHorizontalTime } from './horizontal-time-layout';
import { buildTimelineColumns } from './timeline-columns';
import { SchedulerEvent } from '../core/models';

describe('layoutHorizontalTime', () => {
  const a = new NativeDateAdapter('en-US');
  const ev = (id: number, s: Date, e: Date, resourceIds?: Array<string | number>): SchedulerEvent<Date> =>
    ({ id, subject: `e${id}`, start: s, end: e, isAllDay: false, resourceIds, raw: {} });

  it('builds 24 hour columns for a Timeline Day', () => {
    const cols = buildTimelineColumns('timelineDay', new Date(2025, 4, 12), a, { startHour: 0, endHour: 24 });
    expect(cols.length).toBe(24);
    expect(a.getHours(cols[0].start)).toBe(0);
  });

  it('builds 12 month columns for a Timeline Year', () => {
    const cols = buildTimelineColumns('timelineYear', new Date(2025, 4, 12), a);
    expect(cols.length).toBe(12);
    expect(cols[0].label).toBeTruthy();
  });

  it('positions a bar at the correct column fraction', () => {
    const cols = buildTimelineColumns('timelineDay', new Date(2025, 4, 12), a, { startHour: 0, endHour: 24 });
    const out = layoutHorizontalTime(cols, [], [ev(1, new Date(2025, 4, 12, 6), new Date(2025, 4, 12, 12))], a);
    const bar = out.rows[0].bars[0];
    expect(bar.left).toBeCloseTo((6 / 24) * 100, 4);
    expect(bar.width).toBeCloseTo((6 / 24) * 100, 4);
  });

  it('filters events into resource rows', () => {
    const cols = buildTimelineColumns('timelineDay', new Date(2025, 4, 12), a, { startHour: 0, endHour: 24 });
    const out = layoutHorizontalTime(
      cols,
      [{ resourceId: 1 }, { resourceId: 2 }],
      [ev(1, new Date(2025, 4, 12, 9), new Date(2025, 4, 12, 10), [1]),
       ev(2, new Date(2025, 4, 12, 9), new Date(2025, 4, 12, 10), [2])],
      a,
    );
    expect(out.rows[0].bars.map((b) => b.event.id)).toEqual([1]);
    expect(out.rows[1].bars.map((b) => b.event.id)).toEqual([2]);
  });

  it('overflows beyond maxLanes into per-column +more counts', () => {
    const cols = buildTimelineColumns('timelineDay', new Date(2025, 4, 12), a, { startHour: 9, endHour: 10 });
    const overlapping = [1, 2, 3].map((id) =>
      ev(id, new Date(2025, 4, 12, 9, 0), new Date(2025, 4, 12, 9, 30)));
    const out = layoutHorizontalTime(cols, [], overlapping, a, { maxLanes: 2 });
    const row = out.rows[0];
    expect(row.bars.length).toBe(2);             // two lanes shown
    expect(row.moreCounts[0]).toBe(1);           // third hidden → +1 on the covered column
  });
});

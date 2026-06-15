// engine/timeline-columns.spec.ts — pure column-generation tests for all timeline view types.

import { NativeDateAdapter } from '../date-adapter/native-date-adapter';
import { buildTimelineColumns } from './timeline-columns';

const adapter = new NativeDateAdapter('en-US');
const date = new Date(2026, 5, 10); // Wed 10 Jun 2026

describe('buildTimelineColumns', () => {
  it('timelineDay: one hour column per hour of the day window', () => {
    const cols = buildTimelineColumns('timelineDay', date, adapter, { startHour: 8, endHour: 18 });
    expect(cols.length).toBe(10);
    expect(cols[0].label).toMatch(/^8.?AM$/i); // narrow no-break space between digit and AM
    expect(cols.every((c) => c.major === 'Wed, Jun 10')).toBe(true);
  });

  it('timelineDay: sub-slots only label on whole hours', () => {
    const cols = buildTimelineColumns('timelineDay', date, adapter, { startHour: 9, endHour: 10, slotCount: 2 });
    expect(cols.length).toBe(2);
    expect(cols[0].label).toMatch(/^9.?AM$/i);
    expect(cols[1].label).toBe(''); // 9:30 → no label
  });

  it('timelineWeek spans 7 day-major groups; work week filters to 5', () => {
    const week = buildTimelineColumns('timelineWeek', date, adapter, { startHour: 0, endHour: 24 });
    const workWeek = buildTimelineColumns('timelineWorkWeek', date, adapter, { startHour: 0, endHour: 24 });
    expect(new Set(week.map((c) => c.major)).size).toBe(7);
    expect(new Set(workWeek.map((c) => c.major)).size).toBe(5);
  });

  it('timelineMonth: one column per day of the month', () => {
    const cols = buildTimelineColumns('timelineMonth', date, adapter);
    expect(cols.length).toBe(30); // June
    expect(cols[0].label).toBe('1');
    expect(cols[0].major).toBe('June 2026');
  });

  it('timelineMonth honours an interval multiplier', () => {
    const cols = buildTimelineColumns('timelineMonth', date, adapter, { interval: 2 });
    expect(cols.length).toBe(30 + 31); // June + July
  });

  it('timelineYear: 12 month columns labelled with short month names', () => {
    const cols = buildTimelineColumns('timelineYear', date, adapter);
    expect(cols.length).toBe(12);
    expect(cols[0].label).toBe('Jan');
    expect(cols[11].label).toBe('Dec');
    expect(cols[0].major).toBe('2026');
  });

  it('returns [] for a non-timeline view type', () => {
    expect(buildTimelineColumns('week', date, adapter)).toEqual([]);
  });
});

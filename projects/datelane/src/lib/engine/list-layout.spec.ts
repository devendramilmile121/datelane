// Tests for the list engine (Agenda / Month Agenda day grouping).
import { NativeDateAdapter } from '../date-adapter/native-date-adapter';
import { layoutList } from './list-layout';
import { SchedulerEvent } from '../core/models';

describe('layoutList', () => {
  const a = new NativeDateAdapter('en-US');
  const ev = (id: number, s: Date, e: Date, allDay = false): SchedulerEvent<Date> =>
    ({ id, subject: `e${id}`, start: s, end: e, isAllDay: allDay, raw: {} });
  const at = (day: number, h = 0, m = 0) => new Date(2025, 4, 12 + day, h, m);

  it('buckets events into the right day and counts dayCount days', () => {
    const out = layoutList(at(0), [ev(1, at(0, 9), at(0, 10)), ev(2, at(2, 14), at(2, 15))], a, { dayCount: 5 });
    expect(out.days.length).toBe(5);
    expect(out.days[0].events.map((e) => e.id)).toEqual([1]);
    expect(out.days[2].events.map((e) => e.id)).toEqual([2]);
    expect(out.nonEmptyCount).toBe(2);
  });

  it('places a multi-day event under every day it covers', () => {
    const out = layoutList(at(0), [ev(1, at(0, 9), at(2, 10))], a, { dayCount: 4 });
    expect(out.days[0].events.length).toBe(1);
    expect(out.days[1].events.length).toBe(1);
    expect(out.days[2].events.length).toBe(1);
    expect(out.days[3].events.length).toBe(0);
  });

  it('sorts all-day before timed, then by start', () => {
    const out = layoutList(at(0), [
      ev(1, at(0, 14), at(0, 15)),
      ev(2, at(0), at(1), true),
      ev(3, at(0, 9), at(0, 10)),
    ], a, { dayCount: 1 });
    expect(out.days[0].events.map((e) => e.id)).toEqual([2, 3, 1]);
  });

  it('hideEmptyDays drops days with no events', () => {
    const out = layoutList(at(0), [ev(1, at(3, 9), at(3, 10))], a, { dayCount: 5, hideEmptyDays: true });
    expect(out.days.length).toBe(1);
    expect(a.getDate(out.days[0].date)).toBe(15); // day index 3 = 15 May
  });
});

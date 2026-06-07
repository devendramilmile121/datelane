import { NativeDateAdapter } from '../date-adapter/native-date-adapter';
import { SchedulerEvent } from '../core/models';
import { layoutVerticalTime, parseHour } from './vertical-time-layout';

describe('vertical-time layout', () => {
  const a = new NativeDateAdapter('en-US');
  const day = a.fromNative(new Date(2026, 5, 4)); // Thu 4 Jun 2026

  const ev = (id: string, sh: number, sm: number, eh: number, em: number): SchedulerEvent<Date> => ({
    id,
    subject: id,
    start: a.setTime(day, sh, sm),
    end: a.setTime(day, eh, em),
    isAllDay: false,
    raw: {},
  });

  it('parseHour reads HH:mm and falls back', () => {
    expect(parseHour('08:30', 0)).toBe(8.5);
    expect(parseHour(undefined, 7)).toBe(7);
  });

  it('positions an event by its start/duration', () => {
    const out = layoutVerticalTime([day], [ev('a', 9, 0, 10, 0)], a, 8, 18); // 10h body
    const p = out.columns[0].events[0];
    expect(p.top).toBeCloseTo(10, 5); // 1h after 08:00 → 1/10 = 10%
    expect(p.height).toBeCloseTo(10, 5); // 1h duration → 10%
    expect(p.colCount).toBe(1);
  });

  it('places two overlapping events in side-by-side columns', () => {
    const out = layoutVerticalTime([day], [ev('a', 9, 0, 11, 0), ev('b', 10, 0, 12, 0)], a, 8, 18);
    const evs = out.columns[0].events;
    expect(evs.length).toBe(2);
    expect(evs.every((e) => e.colCount === 2)).toBe(true);
    expect(new Set(evs.map((e) => e.colIndex)).size).toBe(2);
  });

  it('non-overlapping events reuse a single column', () => {
    const out = layoutVerticalTime([day], [ev('a', 9, 0, 10, 0), ev('b', 10, 0, 11, 0)], a, 8, 18);
    expect(out.columns[0].events.every((e) => e.colCount === 1)).toBe(true);
  });

  describe('all-day band', () => {
    const week = Array.from({ length: 5 }, (_, i) => a.fromNative(new Date(2026, 5, 8 + i))); // Mon8…Fri12
    const allDay = (id: string, startDay: number, endDay: number): SchedulerEvent<Date> => ({
      id, subject: id, isAllDay: true, raw: {},
      start: a.fromNative(new Date(2026, 5, startDay)),
      end: a.fromNative(new Date(2026, 5, endDay)), // exclusive end-of-range day
    });

    it('lays a multi-day all-day event as one spanning segment', () => {
      const out = layoutVerticalTime(week, [allDay('Offsite', 9, 12)], a, 8, 18); // covers 9,10,11
      expect(out.allDay.lanes).toBe(1);
      expect(out.allDay.segments).toHaveLength(1);
      const s = out.allDay.segments[0];
      expect([s.startCol, s.span]).toEqual([1, 3]); // cols for 9,10,11 (Mon8 = col0)
      expect(s.continuesBefore).toBe(false);
      expect(s.continuesAfter).toBe(false);
    });

    it('marks continuesBefore/After when the event runs past the visible range', () => {
      const out = layoutVerticalTime(week, [allDay('Trip', 5, 16)], a, 8, 18); // before Mon, after Fri
      const s = out.allDay.segments[0];
      expect([s.startCol, s.span]).toEqual([0, 5]);
      expect(s.continuesBefore).toBe(true);
      expect(s.continuesAfter).toBe(true);
    });

    it('stacks overlapping all-day events into separate lanes', () => {
      const out = layoutVerticalTime(week, [allDay('A', 9, 11), allDay('B', 10, 13)], a, 8, 18);
      expect(out.allDay.lanes).toBe(2);
      expect(new Set(out.allDay.segments.map((s) => s.lane)).size).toBe(2);
    });

    it('keeps timed events out of the band and all-day events out of the grid', () => {
      const tue = a.fromNative(new Date(2026, 5, 9));
      const timed: SchedulerEvent<Date> = {
        id: 'timed', subject: 'timed', isAllDay: false, raw: {},
        start: a.setTime(tue, 9, 0), end: a.setTime(tue, 10, 0),
      };
      const out = layoutVerticalTime(week, [timed, allDay('A', 9, 10)], a, 8, 18);
      expect(out.allDay.segments.map((s) => s.event.id)).toEqual(['A']);
      const gridIds = out.columns.flatMap((c) => c.events.map((e) => e.event.id));
      expect(gridIds).toContain('timed');
      expect(gridIds).not.toContain('A');
    });
  });
});

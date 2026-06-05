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
});

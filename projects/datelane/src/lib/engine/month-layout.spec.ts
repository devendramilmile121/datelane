import { NativeDateAdapter } from '../date-adapter/native-date-adapter';
import { SchedulerEvent } from '../core/models';
import { layoutMonth } from './month-layout';

describe('month layout', () => {
  const a = new NativeDateAdapter('en-US');
  const view = a.fromNative(new Date(2026, 5, 15)); // Jun 2026

  const ev = (
    id: string, s: [number, number, number], e: [number, number, number], allDay = true,
  ): SchedulerEvent<Date> => ({
    id, subject: id,
    start: a.fromNative(new Date(s[0], s[1], s[2])),
    end: a.fromNative(new Date(e[0], e[1], e[2], allDay ? 23 : 1, allDay ? 59 : 0)),
    isAllDay: allDay, raw: {},
  });

  it('covers the month in whole weeks of 7', () => {
    const { weeks } = layoutMonth(view, [], a, { firstDayOfWeek: 0 });
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(weeks.every((w) => w.days.length === 7)).toBe(true);
  });

  it('starts each week on the configured first day', () => {
    const { weeks } = layoutMonth(view, [], a, { firstDayOfWeek: 1 }); // Monday
    expect(a.getDayOfWeek(weeks[0].days[0].date)).toBe(1);
  });

  it('flags in-month vs spill-over days and counts June (30)', () => {
    const cells = layoutMonth(view, [], a, { firstDayOfWeek: 0 }).weeks.flatMap((w) => w.days);
    expect(cells.some((c) => !c.inMonth)).toBe(true);
    expect(cells.filter((c) => c.inMonth).length).toBe(30);
  });

  it('renders a multi-day event as one spanning segment', () => {
    // Mon 2026-06-15 → Wed 2026-06-17 (3 days)
    const { weeks } = layoutMonth(view, [ev('trip', [2026, 5, 15], [2026, 5, 17])], a, {
      firstDayOfWeek: 0,
    });
    const seg = weeks.flatMap((w) => w.segments).find((s) => s.event.id === 'trip')!;
    expect(seg.span).toBe(3);
    expect(seg.continuesBefore).toBe(false);
    expect(seg.continuesAfter).toBe(false);
  });

  it('splits an event that crosses a week boundary into two segments', () => {
    // Sat 2026-06-20 → Mon 2026-06-22 crosses the Sun week boundary.
    const segs = layoutMonth(view, [ev('x', [2026, 5, 20], [2026, 5, 22])], a, { firstDayOfWeek: 0 })
      .weeks.flatMap((w) => w.segments)
      .filter((s) => s.event.id === 'x');
    expect(segs.length).toBe(2);
    expect(segs[0].continuesAfter).toBe(true);
    expect(segs[1].continuesBefore).toBe(true);
  });

  it('stacks overlapping events into separate lanes', () => {
    const segs = layoutMonth(view, [
      ev('a', [2026, 5, 10], [2026, 5, 12]),
      ev('b', [2026, 5, 11], [2026, 5, 13]),
    ], a, { firstDayOfWeek: 0 }).weeks.flatMap((w) => w.segments);
    const lanes = new Set(segs.filter((s) => ['a', 'b'].includes(String(s.event.id))).map((s) => s.lane));
    expect(lanes.size).toBe(2);
  });

  it('collapses lanes beyond maxLanes into per-day moreCount', () => {
    const events = ['a', 'b', 'c', 'd'].map((id) => ev(id, [2026, 5, 10], [2026, 5, 10]));
    const { weeks } = layoutMonth(view, events, a, { firstDayOfWeek: 0, maxLanes: 2 });
    const day = weeks.flatMap((w) => w.days).find((d) => d.inMonth && a.getDate(d.date) === 10)!;
    expect(day.moreCount).toBe(2); // 4 events, 2 lanes shown → 2 hidden
  });
});

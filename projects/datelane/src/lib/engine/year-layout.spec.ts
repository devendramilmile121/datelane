// Tests for the Year engine (12 mini-calendars + per-day event counts).
import { NativeDateAdapter } from '../date-adapter/native-date-adapter';
import { layoutYear, countEventsOn } from './year-layout';
import { SchedulerEvent } from '../core/models';

describe('layoutYear', () => {
  const a = new NativeDateAdapter('en-US');
  const ev = (id: number, s: Date, e: Date): SchedulerEvent<Date> =>
    ({ id, subject: `e${id}`, start: s, end: e, isAllDay: false, raw: {} });

  it('produces 12 months, each a 6×7 day grid', () => {
    const out = layoutYear(new Date(2025, 5, 15), [], a);
    expect(out.year).toBe(2025);
    expect(out.months.length).toBe(12);
    out.months.forEach((m) => {
      expect(m.weeks.length).toBe(6);
      m.weeks.forEach((w) => expect(w.length).toBe(7));
    });
  });

  it('flags inMonth correctly for leading/trailing days', () => {
    const out = layoutYear(new Date(2025, 0, 1), [], a, { firstDayOfWeek: 0 });
    const jan = out.months[0];
    // 1 Jan 2025 is a Wednesday → first row has leading Dec days marked out-of-month.
    expect(jan.weeks[0][0].inMonth).toBe(false);
    expect(jan.weeks[0][3].inMonth).toBe(true); // Wed = 1 Jan
  });

  it('counts events on a day via countEventsOn', () => {
    const day = new Date(2025, 5, 10);
    const events = [ev(1, new Date(2025, 5, 10, 9), new Date(2025, 5, 10, 10)),
                    ev(2, new Date(2025, 5, 10, 14), new Date(2025, 5, 10, 15))];
    expect(countEventsOn(day, events, a)).toBe(2);
    expect(countEventsOn(new Date(2025, 5, 11), events, a)).toBe(0);
  });
});

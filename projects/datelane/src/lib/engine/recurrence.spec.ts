// Tests for the RRULE expansion engine (subset). Uses the Native adapter.
import { NativeDateAdapter } from '../date-adapter/native-date-adapter';
import { expandOccurrences, parseRecurrenceRule } from './recurrence';
import { SchedulerEvent } from '../core/models';

describe('parseRecurrenceRule', () => {
  it('parses freq/interval/count and tolerates an RRULE: prefix + casing', () => {
    const r = parseRecurrenceRule('RRULE:freq=weekly;interval=2;count=5');
    expect(r?.freq).toBe('WEEKLY');
    expect(r?.interval).toBe(2);
    expect(r?.count).toBe(5);
  });

  it('defaults interval to 1', () => {
    expect(parseRecurrenceRule('FREQ=DAILY')?.interval).toBe(1);
  });

  it('parses BYDAY into 0=Sun..6=Sat and ignores ordinal prefixes', () => {
    expect(parseRecurrenceRule('FREQ=WEEKLY;BYDAY=MO,WE,FR')?.byDay).toEqual([1, 3, 5]);
    expect(parseRecurrenceRule('FREQ=MONTHLY;BYDAY=2MO')?.byDay).toEqual([1]);
  });

  it('returns null for empty / missing-FREQ / unknown-FREQ input', () => {
    expect(parseRecurrenceRule('')).toBeNull();
    expect(parseRecurrenceRule(undefined)).toBeNull();
    expect(parseRecurrenceRule('INTERVAL=2')).toBeNull();
    expect(parseRecurrenceRule('FREQ=HOURLY')).toBeNull();
  });
});

describe('expandOccurrences', () => {
  const a = new NativeDateAdapter('en-US');
  const D = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo, d, h, mi);
  const range = (s: Date, e: Date) => ({ start: s, end: e });
  const ev = (start: Date, end: Date, rule?: string, ex?: string): SchedulerEvent<Date> =>
    ({ id: 's1', subject: 'x', start, end, isAllDay: false, recurrenceRule: rule, recurrenceExceptions: ex, raw: {} });
  const starts = (out: SchedulerEvent<Date>[]) => out.map((o) => o.start.getTime());

  const wholeYear = range(D(2025, 0, 1), D(2025, 11, 31, 23, 59));

  it('non-recurring event: returned when it overlaps the range, dropped otherwise', () => {
    const e = ev(D(2025, 0, 6, 9), D(2025, 0, 6, 10));
    expect(expandOccurrences(e, range(D(2025, 0, 1), D(2025, 0, 31)), a).length).toBe(1);
    expect(expandOccurrences(e, range(D(2025, 1, 1), D(2025, 1, 28)), a).length).toBe(0);
  });

  it('DAILY COUNT=3 yields three consecutive days with series metadata', () => {
    const out = expandOccurrences(ev(D(2025, 0, 6, 9), D(2025, 0, 6, 10), 'FREQ=DAILY;COUNT=3'), wholeYear, a);
    expect(starts(out)).toEqual([D(2025, 0, 6, 9), D(2025, 0, 7, 9), D(2025, 0, 8, 9)].map((d) => d.getTime()));
    expect(out[0].seriesId).toBe('s1');
    expect((out[1].recurrenceId as Date).getTime()).toBe(D(2025, 0, 7, 9).getTime());
  });

  it('DAILY INTERVAL=2 steps every other day', () => {
    const out = expandOccurrences(ev(D(2025, 0, 6, 9), D(2025, 0, 6, 10), 'FREQ=DAILY;INTERVAL=2;COUNT=3'), wholeYear, a);
    expect(starts(out)).toEqual([D(2025, 0, 6, 9), D(2025, 0, 8, 9), D(2025, 0, 10, 9)].map((d) => d.getTime()));
  });

  it('WEEKLY BYDAY=MO,WE,FR emits the listed weekdays in order', () => {
    // 2025-01-06 is a Monday.
    const out = expandOccurrences(ev(D(2025, 0, 6, 9), D(2025, 0, 6, 10), 'FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=4'), wholeYear, a);
    expect(starts(out)).toEqual([D(2025, 0, 6, 9), D(2025, 0, 8, 9), D(2025, 0, 10, 9), D(2025, 0, 13, 9)].map((d) => d.getTime()));
  });

  it('WEEKLY without BYDAY repeats the DTSTART weekday', () => {
    const out = expandOccurrences(ev(D(2025, 0, 7, 9), D(2025, 0, 7, 10), 'FREQ=WEEKLY;COUNT=3'), wholeYear, a);
    expect(starts(out)).toEqual([D(2025, 0, 7, 9), D(2025, 0, 14, 9), D(2025, 0, 21, 9)].map((d) => d.getTime()));
  });

  it('MONTHLY BYMONTHDAY=31 skips months without that day (counts only valid occurrences)', () => {
    const out = expandOccurrences(ev(D(2025, 0, 31, 9), D(2025, 0, 31, 10), 'FREQ=MONTHLY;BYMONTHDAY=31;COUNT=3'), wholeYear, a);
    expect(starts(out)).toEqual([D(2025, 0, 31, 9), D(2025, 2, 31, 9), D(2025, 4, 31, 9)].map((d) => d.getTime()));
  });

  it('YEARLY repeats on the anniversary', () => {
    const out = expandOccurrences(
      ev(D(2025, 0, 6, 9), D(2025, 0, 6, 10), 'FREQ=YEARLY;COUNT=2'),
      range(D(2025, 0, 1), D(2026, 11, 31)), a,
    );
    expect(starts(out)).toEqual([D(2025, 0, 6, 9), D(2026, 0, 6, 9)].map((d) => d.getTime()));
  });

  it('UNTIL (date-only) is inclusive of the whole final day', () => {
    const out = expandOccurrences(ev(D(2025, 0, 6, 9), D(2025, 0, 6, 10), 'FREQ=DAILY;UNTIL=20250108'), wholeYear, a);
    expect(starts(out)).toEqual([D(2025, 0, 6, 9), D(2025, 0, 7, 9), D(2025, 0, 8, 9)].map((d) => d.getTime()));
  });

  it('EXDATE removes the matching day but still consumes COUNT', () => {
    const out = expandOccurrences(ev(D(2025, 0, 6, 9), D(2025, 0, 6, 10), 'FREQ=DAILY;COUNT=3', '20250107'), wholeYear, a);
    expect(starts(out)).toEqual([D(2025, 0, 6, 9), D(2025, 0, 8, 9)].map((d) => d.getTime()));
  });

  it('windows an open-ended series to the visible range only', () => {
    const out = expandOccurrences(ev(D(2025, 0, 1, 9), D(2025, 0, 1, 10), 'FREQ=DAILY'), range(D(2025, 0, 10), D(2025, 0, 12, 23, 59)), a);
    expect(starts(out)).toEqual([D(2025, 0, 10, 9), D(2025, 0, 11, 9), D(2025, 0, 12, 9)].map((d) => d.getTime()));
  });

  it('windows a long-running DAILY series far in the future (fast-forward, no iteration cap miss)', () => {
    // DTSTART 26 years before the window — naive iteration from start would exhaust the cap.
    const out = expandOccurrences(
      ev(D(2000, 0, 1, 9), D(2000, 0, 1, 10), 'FREQ=DAILY'),
      range(D(2026, 5, 1), D(2026, 5, 3, 23, 59)), a,
    );
    expect(starts(out)).toEqual([D(2026, 5, 1, 9), D(2026, 5, 2, 9), D(2026, 5, 3, 9)].map((d) => d.getTime()));
  });

  it('fast-forwards a WEEKLY series while preserving the weekday + time alignment', () => {
    // 2000-01-03 is a Monday; BYDAY=MO. Window is a single Monday 26 years later.
    const out = expandOccurrences(
      ev(D(2000, 0, 3, 9), D(2000, 0, 3, 10), 'FREQ=WEEKLY;BYDAY=MO'),
      range(D(2026, 5, 15), D(2026, 5, 15, 23, 59)), a, // 15 Jun 2026 is a Monday
    );
    expect(out.length).toBe(1);
    expect(out[0].start.getDay()).toBe(1);          // still a Monday
    expect(out[0].start.getHours()).toBe(9);        // time preserved
    expect(out[0].start.getDate()).toBe(15);
  });

  it('preserves wall-clock start time across many daily occurrences (DST-safe)', () => {
    const out = expandOccurrences(ev(D(2025, 2, 1, 9, 30), D(2025, 2, 1, 10, 30), 'FREQ=DAILY;COUNT=20'), wholeYear, a);
    expect(out.every((o) => o.start.getHours() === 9 && o.start.getMinutes() === 30)).toBe(true);
  });
});

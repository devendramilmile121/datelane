// engine/recurrence.ts
// Pure, framework-free RFC 5545 RRULE expansion (a pragmatic subset — no external rrule dep).
// All date math goes through the DateAdapter; the engine never touches `Date` directly.
//
// Supported: FREQ=DAILY|WEEKLY|MONTHLY|YEARLY, INTERVAL, COUNT, UNTIL, BYDAY, BYMONTHDAY.
// EXDATE (recurrenceExceptions) matched per-day. Out of scope (v1): ordinal BYDAY ("2MO"),
// BYSETPOS, BYMONTH, RDATE — document and revisit if needed.

import { DateAdapter } from '../date-adapter/date-adapter';
import { SchedulerEvent } from '../core/models';

/** RFC weekday codes indexed by adapter day-of-week (0=Sun .. 6=Sat). */
const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

/** Safety cap so a malformed/open-ended rule can never spin forever. */
const MAX_ITERATIONS = 3700;

export type RecurrenceFreq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

/** Calendar parts of a date literal (month is 0-11, matching the adapter). */
export interface DateParts {
  year: number; month: number; day: number;
  hours: number; minutes: number; seconds: number;
  /** False for date-only literals (e.g. `20251231`) — UNTIL then spans the whole day. */
  hasTime: boolean;
}

export interface ParsedRecurrenceRule {
  freq: RecurrenceFreq;
  interval: number;
  count?: number;
  until?: DateParts;
  byDay?: number[];       // 0=Sun .. 6=Sat
  byMonthDay?: number[];  // 1..31
}

export interface DateRange<D> { start: D; end: D; }

/**
 * Parse an RRULE string into a typed rule, or `null` if it is empty/invalid.
 * Tolerates an optional `RRULE:` prefix and arbitrary key casing/order.
 */
export function parseRecurrenceRule(rule: string | undefined): ParsedRecurrenceRule | null {
  if (!rule) return null;
  const body = rule.replace(/^RRULE:/i, '').trim();
  if (!body) return null;

  const parts = new Map<string, string>();
  for (const seg of body.split(';')) {
    const eq = seg.indexOf('=');
    if (eq < 0) continue;
    parts.set(seg.slice(0, eq).trim().toUpperCase(), seg.slice(eq + 1).trim());
  }

  const freq = (parts.get('FREQ') ?? '').toUpperCase();
  if (freq !== 'DAILY' && freq !== 'WEEKLY' && freq !== 'MONTHLY' && freq !== 'YEARLY') return null;

  const interval = parsePositiveInt(parts.get('INTERVAL')) ?? 1;
  const count = parsePositiveInt(parts.get('COUNT'));
  const until = parts.has('UNTIL') ? parseDateLiteral(parts.get('UNTIL')!) : undefined;
  const byDay = parts.has('BYDAY') ? parseByDay(parts.get('BYDAY')!) : undefined;
  const byMonthDay = parts.has('BYMONTHDAY') ? parseByMonthDay(parts.get('BYMONTHDAY')!) : undefined;

  return { freq, interval, count, until, byDay, byMonthDay };
}

/**
 * Expand an event into the occurrences that overlap `range`. Non-recurring events return
 * themselves (when in range). Occurrences carry `seriesId` + `recurrenceId` for edit-scope/EXDATE.
 * COUNT/UNTIL are evaluated against the full series (per RFC); EXDATE'd slots still consume COUNT.
 */
export function expandOccurrences<D>(
  event: SchedulerEvent<D>,
  range: DateRange<D>,
  adapter: DateAdapter<D>,
): SchedulerEvent<D>[] {
  const durationMin = adapter.diffMinutes(event.start, event.end);

  const rule = parseRecurrenceRule(event.recurrenceRule);
  if (!rule) {
    return overlapsRange(event.start, event.end, range, adapter) ? [event] : [];
  }

  // Exclusive upper bound for occurrence starts. A date-only UNTIL covers the whole day,
  // so the bound is the start of the following day; a timed UNTIL is inclusive of that instant.
  let untilBound: D | undefined;
  if (rule.until) {
    const u = adapter.fromParts(rule.until.year, rule.until.month, rule.until.day,
      rule.until.hours, rule.until.minutes, rule.until.seconds);
    untilBound = rule.until.hasTime ? adapter.addMinutes(u, 1) : adapter.addDays(adapter.startOfDay(u), 1);
  }
  const exdates = parseExceptions(event.recurrenceExceptions, adapter);

  // Fast-forward the iteration anchor toward the window for high-frequency, open-ended series so a
  // daily/weekly event whose DTSTART is years before the view doesn't exhaust MAX_ITERATIONS before
  // reaching it. Only safe when COUNT is absent (COUNT must be counted from the true series start).
  // The shift is a whole number of periods, so weekday/time alignment is preserved.
  const anchor = rule.count == null
    ? { ...event, start: fastForwardStart(event.start, rule, range.start, adapter) }
    : event;

  const out: SchedulerEvent<D>[] = [];
  let count = 0;
  let iterations = 0;

  for (const start of candidateStarts(anchor, rule, adapter)) {
    if (++iterations > MAX_ITERATIONS) break;
    if (untilBound && adapter.compare(start, untilBound) >= 0) break;
    if (rule.count != null && count >= rule.count) break;
    count++;

    // Candidates are chronological — once we pass the window's end we are done.
    if (adapter.compare(start, range.end) > 0) break;

    const end = adapter.addMinutes(start, durationMin);
    if (adapter.compare(end, range.start) < 0) continue;     // entirely before the window
    if (isExcluded(start, exdates, adapter)) continue;

    out.push({ ...event, start, end, seriesId: event.id, recurrenceId: start });
  }

  return out;
}

/** Expand a list of events against a visible range (convenience for the view pipeline). */
export function expandEvents<D>(
  events: ReadonlyArray<SchedulerEvent<D>>,
  range: DateRange<D>,
  adapter: DateAdapter<D>,
): SchedulerEvent<D>[] {
  return events.flatMap((e) => expandOccurrences(e, range, adapter));
}

// ── internals ────────────────────────────────────────────────────────────────

/** Lazily yield occurrence start dates in chronological order (infinite — driver bounds it). */
function* candidateStarts<D>(
  event: SchedulerEvent<D>,
  rule: ParsedRecurrenceRule,
  adapter: DateAdapter<D>,
): Generator<D> {
  const start = event.start;
  const hours = adapter.getHours(start);
  const minutes = adapter.getMinutes(start);
  const withTime = (d: D): D => adapter.setTime(d, hours, minutes);

  switch (rule.freq) {
    case 'DAILY': {
      let d = start;
      for (;;) { yield d; d = adapter.addDays(d, rule.interval); }
    }

    case 'WEEKLY': {
      // WKST defaults to Monday (firstDayOfWeek = 1) per RFC.
      const weekdays = (rule.byDay?.length ? [...rule.byDay] : [adapter.getDayOfWeek(start)])
        .sort((a, b) => weekOffset(a) - weekOffset(b));
      let weekStart = adapter.startOfWeek(start, 1);
      for (;;) {
        for (const wd of weekdays) {
          const occ = withTime(adapter.addDays(weekStart, weekOffset(wd)));
          if (adapter.compare(occ, start) >= 0) yield occ;     // skip pre-DTSTART days in week 1
        }
        weekStart = adapter.addDays(weekStart, 7 * rule.interval);
      }
    }

    case 'MONTHLY': {
      const monthDays = rule.byMonthDay?.length ? [...rule.byMonthDay].sort((a, b) => a - b)
        : [adapter.getDate(start)];
      let monthStart = adapter.startOfMonth(start);
      for (;;) {
        for (const md of monthDays) {
          const candidate = adapter.addDays(monthStart, md - 1);
          // addDays past the month length spills into the next month — drop those (e.g. day 31 in Feb).
          if (adapter.getDate(candidate) !== md) continue;
          const occ = withTime(candidate);
          if (adapter.compare(occ, start) >= 0) yield occ;
        }
        monthStart = adapter.addMonths(monthStart, rule.interval);
      }
    }

    case 'YEARLY': {
      let d = start;
      for (;;) { yield d; d = adapter.addYears(d, rule.interval); }
    }
  }
}

/** Days from the Monday week-start for an adapter weekday (Mon=1→0 … Sun=0→6). */
function weekOffset(weekday: number): number {
  return (weekday - 1 + 7) % 7;
}

/**
 * Advance a DAILY/WEEKLY start by whole periods to just before `windowStart`, so iteration begins
 * near the visible range instead of the (possibly far-past) DTSTART. Shifting by whole periods keeps
 * weekday + time-of-day alignment, so the generated set is identical — just trimmed at the front.
 * MONTHLY/YEARLY iterate slowly enough to never need this. Returns the original start when no shift.
 */
function fastForwardStart<D>(
  start: D, rule: ParsedRecurrenceRule, windowStart: D, adapter: DateAdapter<D>,
): D {
  const periodDays = rule.freq === 'DAILY' ? rule.interval
    : rule.freq === 'WEEKLY' ? rule.interval * 7
    : 0;
  if (periodDays === 0) return start;
  const gap = adapter.diffDays(start, windowStart);
  if (gap <= periodDays) return start;
  const periods = Math.floor(gap / periodDays);
  return periods > 0 ? adapter.addDays(start, periods * periodDays) : start;
}

function isExcluded<D>(start: D, exdates: D[], adapter: DateAdapter<D>): boolean {
  return exdates.some((ex) => adapter.isSameDay(ex, start));
}

function overlapsRange<D>(start: D, end: D, range: DateRange<D>, adapter: DateAdapter<D>): boolean {
  return adapter.compare(start, range.end) <= 0 && adapter.compare(end, range.start) >= 0;
}

/** Pull every date literal out of an EXDATE string (commas, newlines, TZID params tolerated). */
function parseExceptions<D>(raw: string | undefined, adapter: DateAdapter<D>): D[] {
  if (!raw) return [];
  const out: D[] = [];
  const re = /(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    out.push(adapter.fromParts(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0)));
  }
  return out;
}

function parseDateLiteral(value: string): DateParts | undefined {
  const m = /(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/.exec(value);
  if (!m) return undefined;
  return {
    year: +m[1], month: +m[2] - 1, day: +m[3],
    hours: +(m[4] ?? 0), minutes: +(m[5] ?? 0), seconds: +(m[6] ?? 0),
    hasTime: m[4] != null,
  };
}

function parseByDay(value: string): number[] {
  const out: number[] = [];
  for (const token of value.split(',')) {
    // Strip any ordinal prefix (e.g. "2MO", "-1FR") — ordinals unsupported in v1.
    const code = token.trim().replace(/^[+-]?\d+/, '').toUpperCase();
    const idx = WEEKDAY_CODES.indexOf(code as (typeof WEEKDAY_CODES)[number]);
    if (idx >= 0) out.push(idx);
  }
  return out;
}

function parseByMonthDay(value: string): number[] {
  return value.split(',')
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 31);
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (value == null) return undefined;
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

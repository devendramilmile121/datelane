// engine/year-layout.ts
// Pure, framework-free layout for the Year view: twelve mini month-calendars, each a 6×7
// day grid, with a per-day event count used to render dots. All date math via the adapter.

import { DateAdapter } from '../date-adapter/date-adapter';
import { SchedulerEvent } from '../core/models';

export interface YearDay<D = unknown> {
  date: D;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  /** Number of events touching this day (0 → no dot). */
  eventCount: number;
}

export interface YearMonth<D = unknown> {
  month: number;          // 0-11
  /** Up to 6 week rows × 7 days, leading/trailing days from sibling months included. */
  weeks: YearDay<D>[][];
}

export interface YearLayout<D = unknown> {
  year: number;
  months: YearMonth<D>[];
}

export interface YearLayoutOptions {
  firstDayOfWeek?: number;
}

export function layoutYear<D>(
  viewDate: D,
  events: ReadonlyArray<SchedulerEvent<D>>,
  adapter: DateAdapter<D>,
  opts: YearLayoutOptions = {},
): YearLayout<D> {
  const fdow = opts.firstDayOfWeek ?? 0;
  const year = adapter.getYear(viewDate);
  const today = adapter.today();
  const yearStart = adapter.startOfYear(viewDate);

  const months: YearMonth<D>[] = [];
  for (let m = 0; m < 12; m++) {
    const monthStart = adapter.addMonths(yearStart, m);
    const weeks: YearDay<D>[][] = [];
    const weekStart = adapter.startOfWeek(monthStart, fdow);

    for (let w = 0; w < 6; w++) {
      const row: YearDay<D>[] = [];
      for (let i = 0; i < 7; i++) {
        const date = adapter.addDays(weekStart, i + w * 7);
        const dow = adapter.getDayOfWeek(date);
        row.push({
          date,
          inMonth: adapter.getMonth(date) === m,
          isToday: adapter.isSameDay(date, today),
          isWeekend: dow === 0 || dow === 6,
          eventCount: countEventsOn(date, events, adapter),
        });
      }
      weeks.push(row);
    }
    months.push({ month: m, weeks });
  }

  return { year, months };
}

/** Count events covering a single day (timed end-at-midnight excluded from next day). */
export function countEventsOn<D>(
  date: D,
  events: ReadonlyArray<SchedulerEvent<D>>,
  adapter: DateAdapter<D>,
): number {
  const dayStart = adapter.startOfDay(date);
  const dayEnd = adapter.addDays(dayStart, 1);
  let n = 0;
  for (const e of events) {
    if (adapter.compare(e.start, dayEnd) < 0 && adapter.compare(e.end, dayStart) > 0) n++;
  }
  return n;
}

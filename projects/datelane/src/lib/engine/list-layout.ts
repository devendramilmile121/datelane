// engine/list-layout.ts
// Pure, framework-free layout for the list engine (Agenda) and the day-list portion of
// Month Agenda. Groups normalized events into per-day buckets across a date range.
// Multi-day events appear in every day they cover within the range. All date math via adapter.

import { DateAdapter } from '../date-adapter/date-adapter';
import { SchedulerEvent } from '../core/models';

/** One day bucket: its date plus the events that touch it, sorted all-day-first then by start. */
export interface ListDay<D = unknown> {
  date: D;
  isToday: boolean;
  isWeekend: boolean;
  events: SchedulerEvent<D>[];
}

export interface ListLayout<D = unknown> {
  days: ListDay<D>[];
  /** Days that hold at least one event (useful for hideEmptyDays consumers). */
  nonEmptyCount: number;
}

export interface ListLayoutOptions {
  /** Number of days to include starting at `start`. */
  dayCount?: number;
  /** Drop days with no events from the output. */
  hideEmptyDays?: boolean;
}

/**
 * Build a day-grouped list starting at `start` for `dayCount` days.
 * @param start    first day (adapter date); normalized to start-of-day internally.
 * @param events   normalized events to bucket.
 */
export function layoutList<D>(
  start: D,
  events: ReadonlyArray<SchedulerEvent<D>>,
  adapter: DateAdapter<D>,
  opts: ListLayoutOptions = {},
): ListLayout<D> {
  const dayCount = Math.max(1, opts.dayCount ?? 7);
  const hideEmpty = opts.hideEmptyDays ?? false;
  const today = adapter.today();
  const first = adapter.startOfDay(start);

  const days: ListDay<D>[] = [];
  let nonEmptyCount = 0;

  for (let i = 0; i < dayCount; i++) {
    const date = adapter.addDays(first, i);
    const dayStart = date;
    const dayEnd = adapter.addDays(date, 1);
    const dow = adapter.getDayOfWeek(date);

    const dayEvents = events
      .filter((e) => adapter.compare(e.start, dayEnd) < 0 && adapter.compare(e.end, dayStart) > 0)
      .slice()
      .sort(sortEvents(adapter));

    if (dayEvents.length) nonEmptyCount++;
    if (hideEmpty && !dayEvents.length) continue;

    days.push({
      date,
      isToday: adapter.isSameDay(date, today),
      isWeekend: dow === 0 || dow === 6,
      events: dayEvents,
    });
  }

  return { days, nonEmptyCount };
}

/** All-day events sort before timed; otherwise by start time. */
export function sortEvents<D>(adapter: DateAdapter<D>) {
  return (a: SchedulerEvent<D>, b: SchedulerEvent<D>): number => {
    if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1;
    return adapter.compare(a.start, b.start);
  };
}

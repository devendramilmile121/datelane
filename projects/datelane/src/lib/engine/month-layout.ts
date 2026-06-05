// engine/month-layout.ts
// Pure, framework-free layout for the calendar-grid engine (Month).
// Week rows × 7 day columns. Events become horizontal SEGMENTS that span the days they
// cover within a week and stack into lanes; overflow beyond `maxLanes` becomes a per-day
// “+N more”. All date math via the adapter.

import { DateAdapter } from '../date-adapter/date-adapter';
import { SchedulerEvent } from '../core/models';

export interface MonthSegment<D = unknown> {
  event: SchedulerEvent<D>;
  startCol: number;      // 0–6 within the week
  span: number;          // number of day columns covered
  lane: number;          // vertical stack index (0-based)
  continuesBefore: boolean; // event started in a previous week
  continuesAfter: boolean;  // event continues into a later week
}

export interface MonthDay<D = unknown> {
  date: D;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  /** Events covering this day that are hidden behind the “+N more”. */
  moreCount: number;
}

export interface MonthWeek<D = unknown> {
  days: MonthDay<D>[];          // exactly 7
  segments: MonthSegment<D>[];  // visible (lane < maxLanes) only
}

export interface MonthLayout<D = unknown> {
  weeks: MonthWeek<D>[];
  /** Max lanes rendered per week before collapsing into “+N more”. */
  maxLanes: number;
}

export interface MonthLayoutOptions {
  firstDayOfWeek?: number;
  maxLanes?: number;
}

export function layoutMonth<D>(
  viewDate: D,
  events: ReadonlyArray<SchedulerEvent<D>>,
  adapter: DateAdapter<D>,
  opts: MonthLayoutOptions = {},
): MonthLayout<D> {
  const fdow = opts.firstDayOfWeek ?? 0;
  const maxLanes = opts.maxLanes ?? 3;

  const month = adapter.getMonth(viewDate);
  const monthStart = adapter.startOfMonth(viewDate);
  const monthEnd = adapter.addDays(adapter.addMonths(monthStart, 1), -1);
  const today = adapter.today();

  const weeks: MonthWeek<D>[] = [];
  let weekStart = adapter.startOfWeek(monthStart, fdow);

  while (weeks.length < 6) {
    const weekEnd = adapter.addDays(weekStart, 6);

    const days: MonthDay<D>[] = Array.from({ length: 7 }, (_, i) => {
      const date = adapter.addDays(weekStart, i);
      const dow = adapter.getDayOfWeek(date);
      return {
        date,
        inMonth: adapter.getMonth(date) === month,
        isToday: adapter.isSameDay(date, today),
        isWeekend: dow === 0 || dow === 6,
        moreCount: 0,
      };
    });

    // Build segments for events that touch this week, sorted for tidy packing.
    const segs = events
      .map((e) => toSegment(e, weekStart, weekEnd, adapter))
      .filter((s): s is MonthSegment<D> => s !== null)
      .sort((a, b) =>
        a.startCol - b.startCol || b.span - a.span ||
        adapter.compare(a.event.start, b.event.start),
      );

    assignLanes(segs);

    const visible = segs.filter((s) => s.lane < maxLanes);
    const hidden = segs.filter((s) => s.lane >= maxLanes);
    // Per-day overflow counts from hidden segments.
    hidden.forEach((s) => {
      for (let c = s.startCol; c < s.startCol + s.span; c++) days[c].moreCount++;
    });

    weeks.push({ days, segments: visible });

    weekStart = adapter.addDays(weekStart, 7);
    if (adapter.compare(weekStart, monthEnd) > 0) break;
  }

  return { weeks, maxLanes };
}

/** Last calendar day an event covers (handles midnight-exclusive end of timed events). */
function lastCoveredDay<D>(e: SchedulerEvent<D>, adapter: DateAdapter<D>): D {
  const endDay = adapter.startOfDay(e.end);
  if (!e.isAllDay && adapter.getHours(e.end) === 0 && adapter.getMinutes(e.end) === 0
      && adapter.compare(e.end, e.start) > 0) {
    return adapter.addDays(endDay, -1); // ends at 00:00 → previous day is the last covered
  }
  return endDay;
}

function toSegment<D>(
  e: SchedulerEvent<D>,
  weekStart: D,
  weekEnd: D,
  adapter: DateAdapter<D>,
): MonthSegment<D> | null {
  const firstDay = adapter.startOfDay(e.start);
  const lastDay = lastCoveredDay(e, adapter);

  const segStart = adapter.compare(firstDay, weekStart) > 0 ? firstDay : weekStart;
  const segEnd = adapter.compare(lastDay, weekEnd) < 0 ? lastDay : weekEnd;
  if (adapter.compare(segStart, segEnd) > 0) return null; // no coverage this week

  const startCol = adapter.diffDays(weekStart, segStart);
  const lastCol = adapter.diffDays(weekStart, segEnd);
  return {
    event: e,
    startCol,
    span: lastCol - startCol + 1,
    lane: 0,
    continuesBefore: adapter.compare(firstDay, weekStart) < 0,
    continuesAfter: adapter.compare(lastDay, weekEnd) > 0,
  };
}

/** Greedy lane packing: first lane whose occupied column ranges don't overlap. */
function assignLanes<D>(segs: MonthSegment<D>[]): void {
  const lanes: Array<Array<{ s: number; e: number }>> = [];
  for (const seg of segs) {
    const end = seg.startCol + seg.span - 1;
    let lane = 0;
    for (; lane < lanes.length; lane++) {
      const overlaps = lanes[lane].some((r) => seg.startCol <= r.e && r.s <= end);
      if (!overlaps) break;
    }
    if (lane === lanes.length) lanes.push([]);
    lanes[lane].push({ s: seg.startCol, e: end });
    seg.lane = lane;
  }
}

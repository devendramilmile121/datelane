// engine/vertical-time-layout.ts
// Pure, framework-free layout for the vertical-time engine (Day / Week / WorkWeek).
// All date math goes through the injected DateAdapter — no `new Date()`, no direct math here.

import { DateAdapter } from '../date-adapter/date-adapter';
import { SchedulerEvent } from '../core/models';

/** A single event placed inside one day column. Positions are percentages (0–100). */
export interface PositionedEvent<D = unknown> {
  event: SchedulerEvent<D>;
  /** Distance from the top of the day body, as a % of the visible hour range. */
  top: number;
  /** Height as a % of the visible hour range. */
  height: number;
  /** Column index within an overlap cluster, and how many columns the cluster has. */
  colIndex: number;
  colCount: number;
}

/** One day column: its date plus the events laid out inside it. */
export interface DayColumn<D = unknown> {
  date: D;
  events: PositionedEvent<D>[];
}

/** A spanning all-day event bar across one or more visible day columns (the all-day band). */
export interface AllDaySegment<D = unknown> {
  event: SchedulerEvent<D>;
  /** First covered column index in the visible `days` array. */
  startCol: number;
  /** Number of visible columns covered (contiguous run). */
  span: number;
  /** Stacking lane (0-based) within the band. */
  lane: number;
  /** The event extends earlier than this run's first visible day. */
  continuesBefore: boolean;
  /** The event extends later than this run's last visible day. */
  continuesAfter: boolean;
}

/** The all-day band above the time grid: spanning segments + how many lanes they need. */
export interface AllDayBand<D = unknown> {
  segments: AllDaySegment<D>[];
  lanes: number;
}

export interface VerticalTimeLayout<D = unknown> {
  /** Hour marks (integers) drawn as gridlines/labels, from startHour..endHour inclusive. */
  hours: number[];
  columns: DayColumn<D>[];
  /** All-day / multi-day events laid out as spanning bars above the grid. */
  allDay: AllDayBand<D>;
  startHour: number;
  endHour: number;
}

/** Parse a "HH:mm" short-time string to a fractional hour. Defaults applied by caller. */
export function parseHour(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const [h, m] = value.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h)) return fallback;
  return h + (Number.isNaN(m) ? 0 : m) / 60;
}

/**
 * Lay out events across day columns for a vertical-time view.
 * @param days     visible day dates (adapter date type), already in display order.
 * @param events   normalized, non-all-day events to place.
 * @param adapter  the active date adapter.
 * @param startHour/endHour fractional hours bounding the visible body (e.g. 7, 21).
 */
export function layoutVerticalTime<D>(
  days: D[],
  events: ReadonlyArray<SchedulerEvent<D>>,
  adapter: DateAdapter<D>,
  startHour: number,
  endHour: number,
): VerticalTimeLayout<D> {
  const totalMinutes = (endHour - startHour) * 60;
  // Hour marks are SLOT STARTS (one per hour block): start … end-1. The end boundary
  // (e.g. 24:00) is rendered separately by the view, not as an extra slot.
  const hours: number[] = [];
  for (let h = Math.ceil(startHour); h < endHour; h++) hours.push(h);

  const columns: DayColumn<D>[] = days.map((day) => {
    const bodyStart = adapter.setTime(day, Math.floor(startHour), Math.round((startHour % 1) * 60));
    const bodyEnd = adapter.setTime(day, Math.floor(endHour), Math.round((endHour % 1) * 60));

    // Events that intersect this day's visible window.
    const dayEvents = events
      .filter(
        (e) =>
          !e.isAllDay &&
          adapter.compare(e.start, bodyEnd) < 0 &&
          adapter.compare(e.end, bodyStart) > 0,
      )
      .sort((a, b) => adapter.compare(a.start, b.start));

    const positioned = assignColumns(dayEvents, adapter).map(({ event, colIndex, colCount }) => {
      const startMin = clamp(adapter.diffMinutes(bodyStart, event.start), 0, totalMinutes);
      const endMin = clamp(adapter.diffMinutes(bodyStart, event.end), 0, totalMinutes);
      const top = (startMin / totalMinutes) * 100;
      const height = Math.max(((endMin - startMin) / totalMinutes) * 100, 1.5);
      return { event, top, height, colIndex, colCount };
    });

    return { date: day, events: positioned };
  });

  return { hours, columns, allDay: layoutAllDayBand(days, events, adapter), startHour, endHour };
}

/**
 * Lay out all-day / multi-day events as spanning bars across the visible day columns.
 * Hidden columns (e.g. weekends in Work Week) split a span into multiple contiguous runs;
 * lanes are assigned greedily so overlapping events stack instead of colliding.
 */
function layoutAllDayBand<D>(
  days: D[],
  events: ReadonlyArray<SchedulerEvent<D>>,
  adapter: DateAdapter<D>,
): AllDayBand<D> {
  if (!days.length) return { segments: [], lanes: 0 };

  const dayStarts = days.map((d) => adapter.startOfDay(d));
  const rangeStart = dayStarts[0];
  const rangeEnd = adapter.addDays(dayStarts[dayStarts.length - 1], 1);
  const covers = (e: SchedulerEvent<D>, i: number): boolean => {
    const ds = dayStarts[i];
    const de = adapter.addDays(ds, 1);
    return adapter.compare(e.start, de) < 0 && adapter.compare(e.end, ds) > 0;
  };

  const allDay = events
    .filter(
      (e) =>
        e.isAllDay &&
        adapter.compare(e.start, rangeEnd) < 0 &&
        adapter.compare(e.end, rangeStart) > 0,
    )
    .sort((a, b) => adapter.compare(a.start, b.start));

  const laneEnds: number[] = []; // last covered column index per lane
  const segments: AllDaySegment<D>[] = [];

  for (const event of allDay) {
    const cols: number[] = [];
    for (let i = 0; i < days.length; i++) if (covers(event, i)) cols.push(i);
    if (!cols.length) continue;

    // One lane reserved for the whole min..max span so runs of the same event align.
    const minCol = cols[0];
    const maxCol = cols[cols.length - 1];
    let lane = laneEnds.findIndex((end) => end < minCol);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(maxCol); } else laneEnds[lane] = maxCol;

    // Split the covered columns into contiguous runs (gaps = hidden columns).
    let s = cols[0];
    let prev = cols[0];
    for (let k = 1; k <= cols.length; k++) {
      const c = cols[k];
      if (k === cols.length || c !== prev + 1) {
        segments.push({
          event,
          startCol: s,
          span: prev - s + 1,
          lane,
          continuesBefore: adapter.compare(event.start, dayStarts[s]) < 0,
          continuesAfter: adapter.compare(event.end, adapter.addDays(dayStarts[prev], 1)) > 0,
        });
        s = c;
      }
      prev = c;
    }
  }

  return { segments, lanes: laneEnds.length };
}

/** Greedy interval-graph column assignment so overlapping events sit side by side. */
function assignColumns<D>(
  events: ReadonlyArray<SchedulerEvent<D>>,
  adapter: DateAdapter<D>,
): Array<{ event: SchedulerEvent<D>; colIndex: number; colCount: number }> {
  const result: Array<{ event: SchedulerEvent<D>; colIndex: number; colCount: number }> = [];
  let cluster: SchedulerEvent<D>[] = [];
  let colEnds: D[] = []; // last end time per active column

  const flush = () => {
    const colCount = colEnds.length || 1;
    for (const e of cluster) {
      const placed = result.find((r) => r.event === e)!;
      placed.colCount = colCount;
    }
    cluster = [];
    colEnds = [];
  };

  for (const e of events) {
    // New cluster if this event starts after every active column has ended.
    if (colEnds.length && colEnds.every((end) => adapter.compare(e.start, end) >= 0)) {
      flush();
    }
    let col = colEnds.findIndex((end) => adapter.compare(e.start, end) >= 0);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(e.end);
    } else {
      colEnds[col] = e.end;
    }
    cluster.push(e);
    result.push({ event: e, colIndex: col, colCount: 1 });
  }
  flush();
  return result;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

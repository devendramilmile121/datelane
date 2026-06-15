// engine/horizontal-time-layout.ts
// Pure, framework-free layout for the horizontal-time engine — all five Timeline views
// (Day / Week / WorkWeek / Month / Year). Rows are resources (or one default row); the
// horizontal axis is time. The CALLER builds the concrete column boundaries (it knows the
// ViewDescriptor: hour slots vs day cells vs month cells); this engine only positions events
// as time-proportional bars and packs them into lanes per row. All date math via the adapter.

import { DateAdapter } from '../date-adapter/date-adapter';
import { SchedulerEvent } from '../core/models';

/** A grid column: a contiguous time cell. `major` groups columns under a header band. */
export interface TimelineColumn<D = unknown> {
  start: D;
  end: D;
  label: string;
  /** Key for the upper header band (e.g. the date over hour sub-columns). */
  major?: string;
  isToday?: boolean;
  isWeekend?: boolean;
}

/** A resource row (or the single default row when no grouping). */
export interface TimelineRowInput {
  /** Resource id this row represents; omit for the single default row. */
  resourceId?: string | number;
  label?: string;
  /** Indentation level for hierarchical resource grouping. */
  depth?: number;
  color?: string;
}

/** A positioned event bar within a row. left/width are % of the total time range. */
export interface TimelineBar<D = unknown> {
  event: SchedulerEvent<D>;
  left: number;
  width: number;
  lane: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

export interface TimelineRow<D = unknown> extends TimelineRowInput {
  bars: TimelineBar<D>[];
  /** Lanes actually rendered (capped by maxLanes; 0 means auto/unbounded). */
  laneCount: number;
  /** Per-column overflow counts from bars hidden beyond maxLanes. */
  moreCounts: number[];
}

export interface HorizontalTimeLayout<D = unknown> {
  columns: TimelineColumn<D>[];
  rows: TimelineRow<D>[];
  rangeStart: D;
  rangeEnd: D;
}

export interface HorizontalTimeOptions {
  /** Max lanes per row before overflowing into "+N more"; 0 = unbounded (rowAutoHeight). */
  maxLanes?: number;
}

export function layoutHorizontalTime<D>(
  columns: TimelineColumn<D>[],
  rows: TimelineRowInput[],
  events: ReadonlyArray<SchedulerEvent<D>>,
  adapter: DateAdapter<D>,
  opts: HorizontalTimeOptions = {},
): HorizontalTimeLayout<D> {
  const maxLanes = opts.maxLanes ?? 0;
  const rangeStart = columns[0]?.start ?? adapter.today();
  const rangeEnd = columns[columns.length - 1]?.end ?? adapter.addDays(rangeStart, 1);
  const nCols = columns.length || 1;

  const rowInputs: TimelineRowInput[] = rows.length ? rows : [{}];

  const outRows: TimelineRow<D>[] = rowInputs.map((row) => {
    // Events for this row: filter by resource when the row represents one.
    const rowEvents = events
      .filter((e) => belongsToRow(e, row) &&
        adapter.compare(e.start, rangeEnd) < 0 && adapter.compare(e.end, rangeStart) > 0)
      .slice()
      .sort((a, b) => adapter.compare(a.start, b.start));

    const placed = packLanes(rowEvents, adapter);

    const bars: TimelineBar<D>[] = [];
    const moreCounts = new Array(columns.length).fill(0);

    for (const { event, lane } of placed) {
      // Position in COLUMN space so bars align with gridlines even when columns span
      // unequal time (e.g. month columns in Timeline Year).
      const startCol = colPosition(event.start, columns, adapter);
      const endCol = colPosition(event.end, columns, adapter);
      const left = (startCol / nCols) * 100;
      const width = Math.max(((endCol - startCol) / nCols) * 100, 0.5);

      if (maxLanes > 0 && lane >= maxLanes) {
        // Hidden: bump "+N more" on every column the event covers.
        columns.forEach((c, ci) => {
          if (adapter.compare(event.start, c.end) < 0 && adapter.compare(event.end, c.start) > 0) {
            moreCounts[ci]++;
          }
        });
        continue;
      }
      bars.push({
        event,
        left,
        width,
        lane,
        continuesBefore: adapter.compare(event.start, rangeStart) < 0,
        continuesAfter: adapter.compare(event.end, rangeEnd) > 0,
      });
    }

    const usedLanes = bars.reduce((m, b) => Math.max(m, b.lane + 1), 0);
    const laneCount = maxLanes > 0 ? Math.min(usedLanes, maxLanes) : usedLanes;

    return { ...row, bars, laneCount: laneCount || 1, moreCounts };
  });

  return { columns, rows: outRows, rangeStart, rangeEnd };
}

/**
 * Fractional column position of an instant: the column index plus how far the instant sits
 * through that column's time span. Clamped to [0, nCols]. Used so bars track gridlines even
 * when columns are unequal in duration.
 */
function colPosition<D>(date: D, columns: TimelineColumn<D>[], adapter: DateAdapter<D>): number {
  if (!columns.length) return 0;
  if (adapter.compare(date, columns[0].start) <= 0) return 0;
  const last = columns[columns.length - 1];
  if (adapter.compare(date, last.end) >= 0) return columns.length;
  for (let i = 0; i < columns.length; i++) {
    const c = columns[i];
    if (adapter.compare(date, c.end) < 0) {
      const span = Math.max(1, adapter.diffMinutes(c.start, c.end));
      const into = clamp(adapter.diffMinutes(c.start, date), 0, span);
      return i + into / span;
    }
  }
  return columns.length;
}

function belongsToRow<D>(e: SchedulerEvent<D>, row: TimelineRowInput): boolean {
  if (row.resourceId == null) return true; // default single row holds everything
  return !!e.resourceIds?.some((id) => id === row.resourceId);
}

/** Greedy lane packing by time overlap (earliest-start first). */
function packLanes<D>(
  events: ReadonlyArray<SchedulerEvent<D>>,
  adapter: DateAdapter<D>,
): Array<{ event: SchedulerEvent<D>; lane: number }> {
  const laneEnds: D[] = [];
  const out: Array<{ event: SchedulerEvent<D>; lane: number }> = [];
  for (const e of events) {
    let lane = laneEnds.findIndex((end) => adapter.compare(e.start, end) >= 0);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(e.end);
    } else {
      laneEnds[lane] = e.end;
    }
    out.push({ event: e, lane });
  }
  return out;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

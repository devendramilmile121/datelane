// engine/timeline-columns.ts
// Pure column generation for the five Timeline views. Maps a view type + date + descriptor
// options onto concrete TimelineColumn boundaries that layoutHorizontalTime() positions
// events against. Kept separate so it is unit-testable without Angular. All math via adapter.

import { DateAdapter } from '../date-adapter/date-adapter';
import { SchedulerViewType } from '../core/models';
import { TimelineColumn } from './horizontal-time-layout';

export interface TimelineColumnOptions {
  firstDayOfWeek?: number;
  workDays?: number[];
  startHour?: number;   // fractional hour
  endHour?: number;     // fractional hour
  slotCount?: number;   // sub-slots per hour
  interval?: number;    // day/month multiplier
}

const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];

export function buildTimelineColumns<D>(
  type: SchedulerViewType,
  viewDate: D,
  adapter: DateAdapter<D>,
  opts: TimelineColumnOptions = {},
): TimelineColumn<D>[] {
  const today = adapter.today();
  const isToday = (d: D) => adapter.isSameDay(d, today);
  const isWeekend = (d: D) => { const w = adapter.getDayOfWeek(d); return w === 0 || w === 6; };

  switch (type) {
    case 'timelineDay':
      return hourColumns([adapter.startOfDay(viewDate)], adapter, opts, isToday, isWeekend);

    case 'timelineWeek': {
      const days = weekDays(viewDate, adapter, opts, false);
      return hourColumns(days, adapter, opts, isToday, isWeekend);
    }
    case 'timelineWorkWeek': {
      const days = weekDays(viewDate, adapter, opts, true);
      return hourColumns(days, adapter, opts, isToday, isWeekend);
    }

    case 'timelineMonth': {
      const start = adapter.startOfMonth(viewDate);
      const months = Math.max(1, opts.interval ?? 1);
      const end = adapter.addMonths(start, months);
      const cols: TimelineColumn<D>[] = [];
      let d = start;
      while (adapter.compare(d, end) < 0) {
        const next = adapter.addDays(d, 1);
        cols.push({
          start: d, end: next,
          label: `${adapter.getDate(d)}`,
          major: adapter.format(d, 'MMMM yyyy'),
          isToday: isToday(d), isWeekend: isWeekend(d),
        });
        d = next;
      }
      return cols;
    }

    case 'timelineYear': {
      const start = adapter.startOfYear(viewDate);
      const cols: TimelineColumn<D>[] = [];
      for (let m = 0; m < 12; m++) {
        const mStart = adapter.addMonths(start, m);
        const mEnd = adapter.addMonths(start, m + 1);
        cols.push({
          start: mStart, end: mEnd,
          label: adapter.getMonthNames('short')[m],
          major: adapter.format(start, 'yyyy'),
        });
      }
      return cols;
    }

    default:
      return [];
  }
}

/** Visible days of a week, optionally filtered to working days. */
function weekDays<D>(
  viewDate: D, adapter: DateAdapter<D>, opts: TimelineColumnOptions, workOnly: boolean,
): D[] {
  const fdow = opts.firstDayOfWeek ?? 0;
  const start = adapter.startOfWeek(viewDate, fdow);
  const week = Array.from({ length: 7 }, (_, i) => adapter.addDays(start, i));
  if (!workOnly) return week;
  const wd = opts.workDays ?? DEFAULT_WORK_DAYS;
  return week.filter((d) => wd.includes(adapter.getDayOfWeek(d)));
}

/** Hour sub-columns across one or more days; each day is a major header group. */
function hourColumns<D>(
  days: D[],
  adapter: DateAdapter<D>,
  opts: TimelineColumnOptions,
  isToday: (d: D) => boolean,
  isWeekend: (d: D) => boolean,
): TimelineColumn<D>[] {
  const startHour = opts.startHour ?? 0;
  const endHour = opts.endHour ?? 24;
  const slotCount = Math.max(1, opts.slotCount ?? 1);
  const stepMin = 60 / slotCount;
  const cols: TimelineColumn<D>[] = [];

  for (const day of days) {
    const major = adapter.format(day, 'EEE, MMM d');
    const dayToday = isToday(day);
    const dayWeekend = isWeekend(day);
    const totalSlots = Math.round((endHour - startHour) * slotCount);
    let t = adapter.setTime(day, Math.floor(startHour), Math.round((startHour % 1) * 60));
    for (let s = 0; s < totalSlots; s++) {
      const next = adapter.addMinutes(t, stepMin);
      // Label only on whole-hour boundaries to keep the header clean.
      const onHour = adapter.getMinutes(t) === 0;
      cols.push({
        start: t, end: next,
        label: onHour ? adapter.format(t, 'ha') : '',
        major, isToday: dayToday, isWeekend: dayWeekend,
      });
      t = next;
    }
  }
  return cols;
}

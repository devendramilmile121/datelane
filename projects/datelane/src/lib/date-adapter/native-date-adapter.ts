// date-adapter/native-date-adapter.ts
// Zero-dependency adapter (ships in core). Uses the platform Date + Intl.
// NOTE: this is a working skeleton; harden DST/week-number math and add full pattern support.

import { Injectable, Optional, Inject } from '@angular/core';
import { DateAdapter, SCHEDULER_LOCALE } from './date-adapter';

const MS_PER_MIN = 60_000;
const MS_PER_DAY = 86_400_000;

@Injectable()
export class NativeDateAdapter extends DateAdapter<Date> {
  constructor(@Optional() @Inject(SCHEDULER_LOCALE) private locale: string = 'en-US') {
    super();
  }

  today(): Date { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  now(): Date { return new Date(); }
  clone(d: Date): Date { return new Date(d.getTime()); }
  fromNative(d: Date): Date { return new Date(d.getTime()); }
  toNative(d: Date): Date { return new Date(d.getTime()); }
  isValid(d: Date): boolean { return d instanceof Date && !isNaN(d.getTime()); }

  addMinutes(d: Date, n: number): Date { return new Date(d.getTime() + n * MS_PER_MIN); }
  addDays(d: Date, n: number): Date { const r = this.clone(d); r.setDate(r.getDate() + n); return r; }
  addMonths(d: Date, n: number): Date {
    // Clamp to the target month's last day (Jan 31 + 1mo → Feb 28/29), matching Luxon/Moment.
    const r = this.clone(d);
    const day = r.getDate();
    r.setDate(1);
    r.setMonth(r.getMonth() + n);
    const lastDay = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(day, lastDay));
    return r;
  }
  addYears(d: Date, n: number): Date { const r = this.clone(d); r.setFullYear(r.getFullYear() + n); return r; }

  startOfDay(d: Date): Date { const r = this.clone(d); r.setHours(0, 0, 0, 0); return r; }
  startOfWeek(d: Date, firstDayOfWeek: number): Date {
    const r = this.startOfDay(d);
    const diff = (r.getDay() - firstDayOfWeek + 7) % 7;
    return this.addDays(r, -diff);
  }
  startOfMonth(d: Date): Date { const r = this.startOfDay(d); r.setDate(1); return r; }
  startOfYear(d: Date): Date { const r = this.startOfMonth(d); r.setMonth(0); return r; }

  getYear(d: Date): number { return d.getFullYear(); }
  getMonth(d: Date): number { return d.getMonth(); }
  getDate(d: Date): number { return d.getDate(); }
  getDayOfWeek(d: Date): number { return d.getDay(); }
  getHours(d: Date): number { return d.getHours(); }
  getMinutes(d: Date): number { return d.getMinutes(); }
  getWeekNumber(d: Date, firstDayOfWeek: number): number {
    const start = this.startOfWeek(d, firstDayOfWeek);
    const yearStart = this.startOfWeek(this.startOfYear(d), firstDayOfWeek);
    return Math.floor(this.diffDays(yearStart, start) / 7) + 1;
  }

  setTime(d: Date, hours: number, minutes: number): Date {
    const r = this.clone(d); r.setHours(hours, minutes, 0, 0); return r;
  }

  compare(a: Date, b: Date): number { return a.getTime() - b.getTime(); }
  isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  diffMinutes(a: Date, b: Date): number { return Math.round((b.getTime() - a.getTime()) / MS_PER_MIN); }
  diffDays(a: Date, b: Date): number {
    return Math.round((this.startOfDay(b).getTime() - this.startOfDay(a).getTime()) / MS_PER_DAY);
  }

  format(d: Date, pattern: string, locale = this.locale): string {
    // Minimal skeleton mapping; replace with a full token formatter.
    const opts = PATTERN_PRESETS[pattern];
    if (opts) return new Intl.DateTimeFormat(locale, opts).format(d);
    return d.toLocaleString(locale);
  }
  parse(value: unknown, _pattern?: string): Date {
    if (value instanceof Date) return this.clone(value);
    return new Date(value as string | number);
  }
  getDayNames(style: 'long' | 'short' | 'narrow', locale = this.locale): string[] {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: style });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2021, 7, 1 + i)))); // Aug 1 2021 = Sunday
  }
  getMonthNames(style: 'long' | 'short' | 'narrow', locale = this.locale): string[] {
    const fmt = new Intl.DateTimeFormat(locale, { month: style });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(Date.UTC(2021, i, 1))));
  }
}

const PATTERN_PRESETS: Record<string, Intl.DateTimeFormatOptions> = {
  'hm': { hour: 'numeric', minute: '2-digit' },
  'dd-MMM-yyyy': { day: '2-digit', month: 'short', year: 'numeric' },
  'dd-MM-yyyy': { day: '2-digit', month: '2-digit', year: 'numeric' },
  'MMMM yyyy': { month: 'long', year: 'numeric' },
};

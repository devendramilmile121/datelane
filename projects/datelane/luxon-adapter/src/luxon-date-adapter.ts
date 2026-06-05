// @datelane/core/luxon-adapter — optional entry point. `luxon` is an OPTIONAL peer dep.
import { Injectable, Inject, Optional, Provider } from '@angular/core';
import { DateTime, Info } from 'luxon';
import {
  DateAdapter, SCHEDULER_DATE_ADAPTER, SCHEDULER_LOCALE,
} from '@datelane/core';

@Injectable()
export class LuxonDateAdapter extends DateAdapter<DateTime> {
  constructor(@Optional() @Inject(SCHEDULER_LOCALE) private locale: string = 'en-US') { super(); }

  today(): DateTime { return DateTime.now().startOf('day'); }
  now(): DateTime { return DateTime.now(); }
  clone(d: DateTime): DateTime { return DateTime.fromMillis(d.toMillis(), { zone: d.zone }); }
  fromNative(d: Date): DateTime { return DateTime.fromJSDate(d); }
  toNative(d: DateTime): Date { return d.toJSDate(); }
  isValid(d: DateTime): boolean { return d.isValid; }

  addMinutes(d: DateTime, n: number): DateTime { return d.plus({ minutes: n }); }
  addDays(d: DateTime, n: number): DateTime { return d.plus({ days: n }); }
  addMonths(d: DateTime, n: number): DateTime { return d.plus({ months: n }); }
  addYears(d: DateTime, n: number): DateTime { return d.plus({ years: n }); }

  startOfDay(d: DateTime): DateTime { return d.startOf('day'); }
  startOfWeek(d: DateTime, firstDayOfWeek: number): DateTime {
    const dow = d.weekday % 7;                 // luxon: 1=Mon..7=Sun → 0=Sun..6=Sat
    const diff = (dow - firstDayOfWeek + 7) % 7;
    return d.startOf('day').minus({ days: diff });
  }
  startOfMonth(d: DateTime): DateTime { return d.startOf('month'); }
  startOfYear(d: DateTime): DateTime { return d.startOf('year'); }

  getYear(d: DateTime): number { return d.year; }
  getMonth(d: DateTime): number { return d.month - 1; }
  getDate(d: DateTime): number { return d.day; }
  getDayOfWeek(d: DateTime): number { return d.weekday % 7; }
  getHours(d: DateTime): number { return d.hour; }
  getMinutes(d: DateTime): number { return d.minute; }
  getWeekNumber(d: DateTime, _firstDayOfWeek: number): number { return d.weekNumber; }

  setTime(d: DateTime, hours: number, minutes: number): DateTime {
    return d.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
  }

  compare(a: DateTime, b: DateTime): number { return a.toMillis() - b.toMillis(); }
  isSameDay(a: DateTime, b: DateTime): boolean { return a.hasSame(b, 'day'); }
  diffMinutes(a: DateTime, b: DateTime): number { return Math.round(b.diff(a, 'minutes').minutes); }
  diffDays(a: DateTime, b: DateTime): number {
    return Math.round(b.startOf('day').diff(a.startOf('day'), 'days').days);
  }

  format(d: DateTime, pattern: string, locale = this.locale): string {
    return d.setLocale(locale).toFormat(pattern);
  }
  parse(value: unknown, pattern?: string): DateTime {
    if (value instanceof Date) return DateTime.fromJSDate(value);
    if (typeof value === 'string') {
      return pattern ? DateTime.fromFormat(value, pattern) : DateTime.fromISO(value);
    }
    return DateTime.fromMillis(Number(value));
  }
  getDayNames(style: 'long' | 'short' | 'narrow', locale = this.locale): string[] {
    const names = Info.weekdays(style, { locale }); // Mon..Sun
    return [names[6], ...names.slice(0, 6)];          // → Sun..Sat
  }
  getMonthNames(style: 'long' | 'short' | 'narrow', locale = this.locale): string[] {
    return Info.months(style, { locale });
  }
}

export function provideLuxonDateAdapter(opts: { locale?: string } = {}): Provider[] {
  const locale = opts.locale ?? 'en-US';
  return [
    { provide: SCHEDULER_LOCALE, useValue: locale },
    { provide: SCHEDULER_DATE_ADAPTER, useFactory: () => new LuxonDateAdapter(locale) },
    { provide: DateAdapter, useExisting: SCHEDULER_DATE_ADAPTER },
  ];
}

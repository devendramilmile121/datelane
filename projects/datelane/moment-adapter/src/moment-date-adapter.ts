// @datelane/core/moment-adapter — optional entry point. `moment` is an OPTIONAL peer dep.
import { Injectable, Inject, Optional, Provider } from '@angular/core';
import moment, { Moment } from 'moment';
import {
  DateAdapter, SCHEDULER_DATE_ADAPTER, SCHEDULER_LOCALE,
} from '@datelane/core';

@Injectable()
export class MomentDateAdapter extends DateAdapter<Moment> {
  constructor(@Optional() @Inject(SCHEDULER_LOCALE) private locale: string = 'en') { super(); moment.locale(locale); }

  today(): Moment { return moment().startOf('day'); }
  now(): Moment { return moment(); }
  clone(d: Moment): Moment { return d.clone(); }
  fromNative(d: Date): Moment { return moment(d); }
  toNative(d: Moment): Date { return d.toDate(); }
  isValid(d: Moment): boolean { return d.isValid(); }

  addMinutes(d: Moment, n: number): Moment { return d.clone().add(n, 'minutes'); }
  addDays(d: Moment, n: number): Moment { return d.clone().add(n, 'days'); }
  addMonths(d: Moment, n: number): Moment { return d.clone().add(n, 'months'); }
  addYears(d: Moment, n: number): Moment { return d.clone().add(n, 'years'); }

  startOfDay(d: Moment): Moment { return d.clone().startOf('day'); }
  startOfWeek(d: Moment, firstDayOfWeek: number): Moment {
    const diff = (d.day() - firstDayOfWeek + 7) % 7;
    return d.clone().startOf('day').subtract(diff, 'days');
  }
  startOfMonth(d: Moment): Moment { return d.clone().startOf('month'); }
  startOfYear(d: Moment): Moment { return d.clone().startOf('year'); }

  getYear(d: Moment): number { return d.year(); }
  getMonth(d: Moment): number { return d.month(); }
  getDate(d: Moment): number { return d.date(); }
  getDayOfWeek(d: Moment): number { return d.day(); }
  getHours(d: Moment): number { return d.hours(); }
  getMinutes(d: Moment): number { return d.minutes(); }
  getWeekNumber(d: Moment, _firstDayOfWeek: number): number { return d.week(); }

  setTime(d: Moment, hours: number, minutes: number): Moment {
    return d.clone().set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
  }

  compare(a: Moment, b: Moment): number { return a.valueOf() - b.valueOf(); }
  isSameDay(a: Moment, b: Moment): boolean { return a.isSame(b, 'day'); }
  diffMinutes(a: Moment, b: Moment): number { return b.diff(a, 'minutes'); }
  diffDays(a: Moment, b: Moment): number { return b.clone().startOf('day').diff(a.clone().startOf('day'), 'days'); }

  format(d: Moment, pattern: string, locale = this.locale): string {
    return d.clone().locale(locale).format(pattern);
  }
  parse(value: unknown, pattern?: string): Moment {
    return pattern ? moment(value as string, pattern) : moment(value as any);
  }
  getDayNames(style: 'long' | 'short' | 'narrow', locale = this.locale): string[] {
    const m = moment().locale(locale);
    if (style === 'long') return m.localeData().weekdays();
    if (style === 'short') return m.localeData().weekdaysShort();
    return m.localeData().weekdaysMin();
  }
  getMonthNames(style: 'long' | 'short' | 'narrow', locale = this.locale): string[] {
    const m = moment().locale(locale);
    return style === 'long' ? m.localeData().months() : m.localeData().monthsShort();
  }
}

export function provideMomentDateAdapter(opts: { locale?: string } = {}): Provider[] {
  const locale = opts.locale ?? 'en';
  return [
    { provide: SCHEDULER_LOCALE, useValue: locale },
    { provide: SCHEDULER_DATE_ADAPTER, useFactory: () => new MomentDateAdapter(locale) },
    { provide: DateAdapter, useExisting: SCHEDULER_DATE_ADAPTER },
  ];
}

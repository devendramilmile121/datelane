// date-adapter/date-adapter.ts
// The ONLY place the library is allowed to know about dates. All views/engine/store depend on this.
// Add new capability here, then implement in Native + Luxon + Moment + add a parity test.

import { InjectionToken } from '@angular/core';

export const SCHEDULER_DATE_ADAPTER = new InjectionToken<DateAdapter>('SCHEDULER_DATE_ADAPTER');
export const SCHEDULER_LOCALE = new InjectionToken<string>('SCHEDULER_LOCALE');

export abstract class DateAdapter<D = unknown> {
  // construction / conversion
  abstract today(): D;          // current date at 00:00
  abstract now(): D;            // current date AND time (for the now-line)
  abstract clone(date: D): D;
  abstract fromNative(date: Date): D;
  abstract toNative(date: D): Date;
  abstract isValid(date: D): boolean;

  // arithmetic
  abstract addMinutes(date: D, n: number): D;
  abstract addDays(date: D, n: number): D;
  abstract addMonths(date: D, n: number): D;
  abstract addYears(date: D, n: number): D;

  // boundaries
  abstract startOfDay(date: D): D;
  abstract startOfWeek(date: D, firstDayOfWeek: number): D;
  abstract startOfMonth(date: D): D;
  abstract startOfYear(date: D): D;

  // accessors
  abstract getYear(date: D): number;
  abstract getMonth(date: D): number;      // 0-11
  abstract getDate(date: D): number;       // 1-31
  abstract getDayOfWeek(date: D): number;  // 0=Sun..6=Sat
  abstract getHours(date: D): number;
  abstract getMinutes(date: D): number;
  abstract getWeekNumber(date: D, firstDayOfWeek: number): number;

  // setters
  abstract setTime(date: D, hours: number, minutes: number): D;

  // comparison
  abstract compare(a: D, b: D): number;            // <0, 0, >0
  abstract isSameDay(a: D, b: D): boolean;
  abstract diffMinutes(a: D, b: D): number;
  abstract diffDays(a: D, b: D): number;

  // i18n
  abstract format(date: D, pattern: string, locale?: string): string;
  abstract parse(value: unknown, pattern?: string): D;
  abstract getDayNames(style: 'long' | 'short' | 'narrow', locale?: string): string[];
  abstract getMonthNames(style: 'long' | 'short' | 'narrow', locale?: string): string[];
}

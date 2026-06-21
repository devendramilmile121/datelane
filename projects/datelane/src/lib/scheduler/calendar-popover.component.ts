// scheduler/calendar-popover.component.ts
// Small month date-picker shown when the header date-label is clicked → jump to a date.
// Standalone, signal-first, controlled: emits `select`/`dismiss`, never mutates inputs.
// Date math via the adapter only. Keyboard: arrows move the focused day, Enter/Space select,
// Esc dismisses. Roving tabindex keeps a single tab stop in the day grid (a11y baseline).

import {
  Component, input, output, inject, signal, computed, effect, untracked, ElementRef,
  ChangeDetectionStrategy, ViewEncapsulation,
} from '@angular/core';
import { DateAdapter, SCHEDULER_DATE_ADAPTER } from '../date-adapter/date-adapter';
import { SCHEDULER_MESSAGES } from '../i18n/messages';

interface PickerDay { date: unknown; inMonth: boolean; isToday: boolean; key: number; }

@Component({
  selector: 'dl-calendar-popover',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dl-cal',
    role: 'dialog',
    // Non-modal: the page stays interactive (click-away / button toggle closes it), so don't
    // claim aria-modal — that would wrongly tell screen readers the rest of the page is inert.
    'aria-modal': 'false',
    '[attr.aria-label]': 'msgs.navigation',
    '[style.inset-inline-start.px]': 'x()',
    '[style.inset-block-start.px]': 'y()',
    '(keydown.escape)': 'dismiss.emit()',
  },
  template: `
    <div class="dl-cal__head">
      <button type="button" class="dl-cal__step" [attr.aria-label]="msgs.previous"
        (click)="stepMonth(-1)">‹</button>
      <span class="dl-cal__title" aria-live="polite">{{ monthLabel() }}</span>
      <button type="button" class="dl-cal__step" [attr.aria-label]="msgs.next"
        (click)="stepMonth(1)">›</button>
    </div>
    <div class="dl-cal__dow" aria-hidden="true">
      @for (i of cols; track i) { <span class="dl-cal__dowcell">{{ dowLabel(i) }}</span> }
    </div>
    <div #grid class="dl-cal__grid" role="grid">
      @for (week of weeks(); track $index) {
        <div class="dl-cal__week" role="row">
          @for (day of week; track day.key) {
            <button type="button" class="dl-cal__day" role="gridcell"
              [class.dl-cal__day--out]="!day.inMonth"
              [class.dl-cal__day--today]="day.isToday"
              [class.dl-cal__day--focus]="isFocused(day.date)"
              [attr.tabindex]="isFocused(day.date) ? 0 : -1"
              [attr.aria-label]="adapter.format(day.date, 'EEEE, dd MMMM yyyy')"
              [attr.data-key]="day.key"
              (keydown)="onKeydown($event)"
              (click)="dateSelect.emit(day.date)">
              {{ adapter.getDate(day.date) }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class CalendarPopoverComponent {
  /** The currently navigated date — seeds the visible month and initial focus. */
  readonly value = input<unknown>();
  readonly firstDayOfWeek = input(0);
  readonly x = input(0);
  readonly y = input(0);

  readonly dateSelect = output<unknown>();
  readonly dismiss = output<void>();

  protected readonly adapter = inject<DateAdapter>(SCHEDULER_DATE_ADAPTER);
  protected readonly msgs = inject(SCHEDULER_MESSAGES);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly cols = [0, 1, 2, 3, 4, 5, 6];

  /** Anchor for the visible month (any day within it). */
  private readonly cursor = signal<unknown>(undefined);
  /** Day that owns the single tab stop / receives arrow-key focus. */
  private readonly focused = signal<unknown>(undefined);

  constructor() {
    // Seed cursor + focus from `value` whenever it changes from outside.
    effect(() => {
      const seed = this.value() ?? this.adapter.today();
      untracked(() => { this.cursor.set(seed); this.focused.set(seed); });
    });
    // Move DOM focus onto the focused gridcell after each render-relevant change.
    effect(() => {
      this.focused();
      untracked(() => requestAnimationFrame(() => this.focusActiveCell()));
    });
  }

  readonly monthLabel = computed(() =>
    this.adapter.format(this.cursor() ?? this.adapter.today(), 'MMMM yyyy'));

  readonly weeks = computed<PickerDay[][]>(() => {
    const a = this.adapter;
    const anchor = this.cursor() ?? a.today();
    const month = a.getMonth(anchor);
    const today = a.today();
    const weekStart = a.startOfWeek(a.startOfMonth(anchor), this.firstDayOfWeek());
    const out: PickerDay[][] = [];
    for (let w = 0; w < 6; w++) {
      const row: PickerDay[] = [];
      for (let i = 0; i < 7; i++) {
        const date = a.addDays(weekStart, w * 7 + i);
        row.push({
          date,
          inMonth: a.getMonth(date) === month,
          isToday: a.isSameDay(date, today),
          key: a.toNative(date).getTime(),
        });
      }
      out.push(row);
    }
    return out;
  });

  isFocused(date: unknown): boolean {
    const f = this.focused();
    return f != null && this.adapter.isSameDay(date, f);
  }

  dowLabel(i: number): string {
    return this.adapter.getDayNames('narrow')[(this.firstDayOfWeek() + i) % 7];
  }

  stepMonth(dir: number): void {
    const next = this.adapter.addMonths(this.cursor() ?? this.adapter.today(), dir);
    this.cursor.set(next);
    this.focused.set(next);
  }

  /** Arrow keys move focus by day/week; Enter/Space select; Home/End jump to week edges. */
  onKeydown(ev: KeyboardEvent): void {
    const a = this.adapter;
    const cur = this.focused() ?? this.cursor() ?? a.today();
    let next: unknown | undefined;
    switch (ev.key) {
      case 'ArrowLeft':  next = a.addDays(cur, -1); break;
      case 'ArrowRight': next = a.addDays(cur, 1); break;
      case 'ArrowUp':    next = a.addDays(cur, -7); break;
      case 'ArrowDown':  next = a.addDays(cur, 7); break;
      case 'Home':       next = a.startOfWeek(cur, this.firstDayOfWeek()); break;
      case 'End':        next = a.addDays(a.startOfWeek(cur, this.firstDayOfWeek()), 6); break;
      case 'PageUp':     next = a.addMonths(cur, -1); break;
      case 'PageDown':   next = a.addMonths(cur, 1); break;
      case 'Enter':
      case ' ':          this.dateSelect.emit(cur); ev.preventDefault(); return;
      default: return;
    }
    ev.preventDefault();
    this.focused.set(next);
    // Keep the visible month in step when focus crosses a boundary.
    if (a.getMonth(next as never) !== a.getMonth(this.cursor() as never)) this.cursor.set(next);
  }

  private focusActiveCell(): void {
    const f = this.focused();
    if (f == null) return;
    const key = this.adapter.toNative(f).getTime();
    const el = this.host.nativeElement.querySelector<HTMLElement>(`.dl-cal__day[data-key="${key}"]`);
    el?.focus();
  }
}

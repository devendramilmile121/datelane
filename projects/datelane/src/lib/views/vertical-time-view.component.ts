// views/vertical-time-view.component.ts
// Renderer for the vertical-time engine (Day / Week / WorkWeek): time rows × day columns,
// absolutely-positioned events, a now-line, and pointer drag-to-move + resize. Tree-shakeable.

import {
  Component, input, output, inject, effect, untracked, computed, signal, viewChild, ElementRef,
  ChangeDetectionStrategy, ViewEncapsulation,
} from '@angular/core';
import { DateAdapter, SCHEDULER_DATE_ADAPTER } from '../date-adapter/date-adapter';
import { SchedulerEvent } from '../core/models';
import {
  layoutVerticalTime, VerticalTimeLayout, PositionedEvent, AllDaySegment,
} from '../engine/vertical-time-layout';
import {
  GestureMode, clamp, crossedDragThreshold, snapMinutesFromDeltaY, columnFromDeltaX,
} from '../interaction/gesture';
import { SCHEDULER_MESSAGES } from '../i18n/messages';

/** Pixel height of one all-day band lane (matches CSS). */
const ALLDAY_LANE_H = 22;

interface Gesture {
  mode: GestureMode;
  id: string | number;
  event: SchedulerEvent<unknown>;
  origStart: unknown;
  origEnd: unknown;
  durationMin: number;
  bodyStart: unknown;
  bodyEnd: unknown;
  colIndex: number;
  colWidth: number;
  startX: number;
  startY: number;
  active: boolean;
  // live result
  newStart: unknown;
  newEnd: unknown;
  dxDays: number;
}

@Component({
  selector: 'dl-vertical-time-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '(document:keydown.escape)': 'onEscape()' },
  templateUrl: './vertical-time-view.component.html',
})
export class VerticalTimeViewComponent {
  /** Visible day dates (adapter date type), already in display order. */
  readonly days = input<unknown[]>([]);
  /** Normalized events to place. */
  readonly events = input<ReadonlyArray<SchedulerEvent<unknown>>>([]);
  readonly startHour = input(7);
  readonly endHour = input(21);
  /** Pixel height of one hour row. */
  readonly slotHeight = input(48);
  /** At/below this duration (minutes) an event uses the compact single-line layout. */
  readonly compactMinutes = input(30);
  /** Minutes the move/resize snaps to. */
  readonly snapMinutes = input(15);
  /** Whether events can be dragged to move. */
  readonly draggable = input(true);
  /** Whether events can be resized. */
  readonly resizable = input(true);
  /** Auto-scroll the body to the first event (or `scrollHour`) on load / period change. */
  readonly autoScroll = input(true);
  /** When set, scroll to this hour instead of the first event. */
  readonly scrollHour = input<number>();

  /**
   * Emitted on drop/resize-end with a CLONE of the event carrying the proposed new
   * start/end. The view is controlled: it never mutates; the host applies the change.
   */
  readonly eventChange = output<SchedulerEvent<unknown>>();

  /** Emitted on a plain click (no drag) so the shell can open the quick-view / host form. */
  readonly eventActivate = output<SchedulerEvent<unknown>>();

  gesture: Gesture | null = null;

  private readonly scrollEl = viewChild<ElementRef<HTMLElement>>('scrollEl');

  /** Period the body was last auto-scrolled for; gates one scroll per period. */
  private lastScrollKey: string | null = null;

  protected readonly adapter = inject<DateAdapter>(SCHEDULER_DATE_ADAPTER);
  protected readonly msgs = inject(SCHEDULER_MESSAGES);

  // ---- All-day band geometry + expand/collapse -----------------------------

  /** Lanes shown while the band is collapsed; extra lanes fold behind a "+N more" toggle. */
  readonly allDayMaxLanes = input(2);

  /** Whether the band is expanded to show every lane. */
  protected readonly allDayExpanded = signal(false);
  toggleAllDay(): void { this.allDayExpanded.update((v) => !v); }

  /** Lanes currently rendered (all when expanded, capped when collapsed). */
  private readonly allDayVisibleLanes = computed(() => {
    const lanes = this.layout().allDay.lanes;
    return this.allDayExpanded() ? lanes : Math.min(lanes, this.allDayMaxLanes());
  });
  /** Segments in the visible lanes only. */
  protected readonly allDayVisibleSegments = computed(() =>
    this.layout().allDay.segments.filter((s) => s.lane < this.allDayVisibleLanes()));
  /** True when there are more lanes than the collapsed cap (so a toggle is shown). */
  protected readonly allDayCanToggle = computed(() =>
    this.layout().allDay.lanes > this.allDayMaxLanes());
  /** Distinct events hidden in the folded lanes (the "+N more" count). */
  protected readonly allDayHiddenCount = computed(() => {
    const vis = this.allDayVisibleLanes();
    const ids = new Set(this.layout().allDay.segments.filter((s) => s.lane >= vis).map((s) => s.event.id));
    return ids.size;
  });

  /** Pixel block-size of the all-day band for the visible lane count (0 → band hidden). */
  allDayBandHeight(): number {
    const lanes = this.allDayVisibleLanes();
    return lanes ? lanes * ALLDAY_LANE_H + 6 : 0;
  }
  /** A spanning bar's inline position as start/width percentages of the column track. */
  allDayGeom(seg: AllDaySegment): { left: string; width: string } {
    const n = this.layout().columns.length || 1;
    return { left: `${(seg.startCol / n) * 100}%`, width: `${(seg.span / n) * 100}%` };
  }
  allDayTop(seg: AllDaySegment): number {
    return seg.lane * ALLDAY_LANE_H + 3;
  }
  allDayAria(e: SchedulerEvent<unknown>): string {
    return `${e.subject}, ${this.msgs.allDay}`;
  }

  constructor() {
    // Auto-scroll only on first render or when the visible PERIOD changes (navigation) —
    // never on event edits / drag reflow, so the user's manual scroll position is preserved.
    // The effect may re-run on unrelated change detection (a host can hand us a fresh `days`
    // array reference every CD), so the scroll itself is gated on the period key *changing* —
    // otherwise we'd snap the body back and the user could never scroll away.
    effect(() => {
      if (!this.autoScroll()) return;
      const key = this.periodKey();              // track the period signals
      const el = this.scrollEl()?.nativeElement; // track the view query
      if (!el || key === this.lastScrollKey) return;
      this.lastScrollKey = key;
      untracked(() => this.scrollToFirst(el));
    });
  }

  /** Stable identity of the visible period (first day + day count + hour window). */
  private periodKey(): string {
    const days = this.days();
    if (!days.length) return 'empty';
    const first = this.adapter.toNative(days[0]).getTime();
    return `${first}:${days.length}:${this.startHour()}:${this.endHour()}:${this.scrollHour()}`;
  }

  /** Scroll the body so the first event (or `scrollHour`) is near the top. */
  private scrollToFirst(el: HTMLElement): void {
    const startHour = this.startHour();
    const total = (this.endHour() - startHour) * 60;
    const bodyPx = this.layout().hours.length * this.slotHeight();

    let targetMin: number | null = null;
    const scrollHour = this.scrollHour();
    if (scrollHour != null) {
      targetMin = (scrollHour - startHour) * 60;
    } else {
      const tops = this.layout().columns.flatMap((c) => c.events.map((e) => e.top));
      if (tops.length) targetMin = (Math.min(...tops) / 100) * total;
    }
    if (targetMin == null) return;

    // Leave ~half a slot of context above the target.
    const top = (targetMin / total) * bodyPx - this.slotHeight() * 0.5;
    requestAnimationFrame(() => el.scrollTo({ top: Math.max(0, top) }));
  }

  readonly layout = computed<VerticalTimeLayout>(() =>
    layoutVerticalTime(this.days(), this.events(), this.adapter, this.startHour(), this.endHour()),
  );

  isToday(d: unknown): boolean {
    return this.adapter.isSameDay(d, this.adapter.today());
  }
  dayName(d: unknown): string {
    return this.adapter.getDayNames('short')[this.adapter.getDayOfWeek(d)];
  }
  hourLabel(h: number): string {
    return `${h.toString().padStart(2, '0')}:00`;
  }
  timeRange(start: unknown, end: unknown): string {
    return `${this.adapter.format(start, 'hm')} – ${this.adapter.format(end, 'hm')}`;
  }
  /** Time label, switched to the live values while this event is being changed. */
  gestureTimeRange(pe: PositionedEvent): string {
    const g = this.gesture;
    if (g?.active && g.id === pe.event.id) return this.timeRange(g.newStart, g.newEnd);
    return this.timeRange(pe.event.start, pe.event.end);
  }
  ariaFor(e: SchedulerEvent<unknown>): string {
    return `${e.subject}, ${this.timeRange(e.start, e.end)}`;
  }
  /** Short events render on one line so the label stays readable in a tiny box. */
  isShort(e: SchedulerEvent<unknown>): boolean {
    return this.adapter.diffMinutes(e.start, e.end) <= this.compactMinutes();
  }
  widthCss(pe: PositionedEvent): string {
    return `calc(${100 / pe.colCount}% - 4px)`;
  }
  leftCss(pe: PositionedEvent): string {
    return `calc(${(100 / pe.colCount) * pe.colIndex}% + 2px)`;
  }
  nowLineTop(d: unknown): number | null {
    if (!this.isToday(d)) return null;
    const now = this.adapter.now();
    const startHour = this.startHour();
    const total = (this.endHour() - startHour) * 60;
    const bodyStart = this.adapter.setTime(d, Math.floor(startHour), 0);
    const min = this.adapter.diffMinutes(bodyStart, now);
    if (min < 0 || min > total) return null;
    return (min / total) * 100;
  }
  trackByTime(d: unknown): number {
    return this.adapter.toNative(d).getTime();
  }

  // ---- Live geometry (overridden while resizing) ---------------------------

  private get totalMinutes(): number {
    return (this.endHour() - this.startHour()) * 60;
  }
  isActive(e: SchedulerEvent<unknown>): boolean {
    return !!this.gesture?.active && this.gesture.id === e.id;
  }
  eventTop(pe: PositionedEvent): number {
    const g = this.gesture;
    if (g?.active && g.id === pe.event.id && g.mode !== 'move') {
      return this.minToPct(this.adapter.diffMinutes(g.bodyStart, g.newStart));
    }
    return pe.top;
  }
  eventHeight(pe: PositionedEvent): number {
    const g = this.gesture;
    if (g?.active && g.id === pe.event.id && g.mode !== 'move') {
      const startMin = this.adapter.diffMinutes(g.bodyStart, g.newStart);
      const endMin = this.adapter.diffMinutes(g.bodyStart, g.newEnd);
      return Math.max(this.minToPct(endMin) - this.minToPct(startMin), 1.5);
    }
    return pe.height;
  }
  moveTransform(e: SchedulerEvent<unknown>): string | null {
    const g = this.gesture;
    if (!g?.active || g.id !== e.id || g.mode !== 'move') return null;
    const offsetX = g.dxDays * g.colWidth;
    // Vertical offset = the time-only shift (the day shift is handled by offsetX).
    const shifted = this.adapter.addDays(g.origStart, g.dxDays);
    const offsetY = (this.adapter.diffMinutes(shifted, g.newStart) / 60) * this.slotHeight();
    return `translate(${offsetX}px, ${offsetY}px)`;
  }
  private minToPct(min: number): number {
    return (clamp(min, 0, this.totalMinutes) / this.totalMinutes) * 100;
  }

  // ---- Pointer gesture (move + resize) -------------------------------------

  onGestureStart(
    ev: PointerEvent,
    mode: GestureMode,
    pe: PositionedEvent,
    colIndex: number,
    colEl: HTMLElement,
  ): void {
    if (ev.button !== 0) return;
    if (mode === 'move' && !this.draggable()) return;
    if (mode !== 'move' && !this.resizable()) return;
    ev.stopPropagation(); // resize grips must not also start a move
    (ev.target as HTMLElement).setPointerCapture(ev.pointerId);

    const e = pe.event;
    const startHour = this.startHour();
    const endHour = this.endHour();
    const bodyStart = this.adapter.setTime(
      e.start, Math.floor(startHour), Math.round((startHour % 1) * 60),
    );
    const bodyEnd = this.adapter.setTime(
      e.start, Math.floor(endHour), Math.round((endHour % 1) * 60),
    );
    this.gesture = {
      mode,
      id: e.id,
      event: e,
      origStart: e.start,
      origEnd: e.end,
      durationMin: this.adapter.diffMinutes(e.start, e.end),
      bodyStart,
      bodyEnd,
      colIndex,
      colWidth: colEl.getBoundingClientRect().width,
      startX: ev.clientX,
      startY: ev.clientY,
      active: false,
      newStart: e.start,
      newEnd: e.end,
      dxDays: 0,
    };
  }

  onGestureMove(ev: PointerEvent): void {
    const g = this.gesture;
    if (!g) return;
    const dx = ev.clientX - g.startX;
    const dy = ev.clientY - g.startY;
    if (!g.active) {
      if (!crossedDragThreshold(dx, dy)) return;
      g.active = true;
    }
    const snapMinutes = this.snapMinutes();
    const snapMin = snapMinutesFromDeltaY(dy, this.slotHeight(), snapMinutes);
    const minDur = snapMinutes;

    if (g.mode === 'move') {
      const targetCol = columnFromDeltaX(dx, g.colWidth, g.colIndex, this.days().length);
      g.dxDays = targetCol - g.colIndex;
      g.newStart = this.adapter.addMinutes(this.adapter.addDays(g.origStart, g.dxDays), snapMin);
      g.newEnd = this.adapter.addMinutes(g.newStart, g.durationMin);
    } else if (g.mode === 'resize-end') {
      let end = this.adapter.addMinutes(g.origEnd, snapMin);
      if (this.adapter.diffMinutes(g.origStart, end) < minDur) {
        end = this.adapter.addMinutes(g.origStart, minDur);
      }
      if (this.adapter.compare(end, g.bodyEnd) > 0) end = g.bodyEnd;
      g.newStart = g.origStart;
      g.newEnd = end;
    } else {
      // resize-start
      let start = this.adapter.addMinutes(g.origStart, snapMin);
      if (this.adapter.diffMinutes(start, g.origEnd) < minDur) {
        start = this.adapter.addMinutes(g.origEnd, -minDur);
      }
      if (this.adapter.compare(start, g.bodyStart) < 0) start = g.bodyStart;
      g.newStart = start;
      g.newEnd = g.origEnd;
    }
    ev.preventDefault();
  }

  onGestureEnd(ev: PointerEvent): void {
    const g = this.gesture;
    this.gesture = null;
    if (!g) return;
    (ev.target as HTMLElement).releasePointerCapture?.(ev.pointerId);
    if (!g.active) {
      // No drag threshold crossed → treat as a click/activation.
      if (g.mode === 'move') this.eventActivate.emit(g.event);
      return;
    }
    this.eventChange.emit({ ...g.event, start: g.newStart, end: g.newEnd });
  }

  onGestureCancel(): void {
    this.gesture = null;
  }

  onEscape(): void {
    this.gesture = null;
  }
}

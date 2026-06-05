// views/vertical-time-view.component.ts
// Renderer for the vertical-time engine (Day / Week / WorkWeek): time rows × day columns,
// absolutely-positioned events, a now-line, and pointer drag-to-move + resize. Tree-shakeable.

import {
  Component, Input, Output, EventEmitter, Inject, HostListener,
  ChangeDetectionStrategy, ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DateAdapter, SCHEDULER_DATE_ADAPTER } from '../date-adapter/date-adapter';
import { SchedulerEvent } from '../core/models';
import {
  layoutVerticalTime, VerticalTimeLayout, PositionedEvent,
} from '../engine/vertical-time-layout';

const DRAG_THRESHOLD_PX = 4;

type GestureMode = 'move' | 'resize-start' | 'resize-end';

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
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="dl-vt" role="grid" [attr.aria-rowcount]="layout.hours.length">
      <!-- Fixed header row: time-gutter corner + one cell per day. -->
      <div class="dl-vt__headrow">
        <div class="dl-vt__corner" role="presentation"></div>
        <div class="dl-vt__heads">
          @for (col of layout.columns; track trackByTime(col.date)) {
            <div class="dl-vt__head" role="columnheader" [class.dl-vt__head--today]="isToday(col.date)">
              <span class="dl-vt__dow">{{ dayName(col.date) }}</span>
              <span class="dl-vt__dom">{{ adapter.getDate(col.date) }}</span>
            </div>
          }
        </div>
      </div>

      <!-- Scrollable body: time gutter + day columns scroll together vertically. -->
      <div class="dl-vt__scroll">
        <div class="dl-vt__grid">
          <div class="dl-vt__gutter">
            @for (h of layout.hours; track h) {
              <div class="dl-vt__hour" [style.height.px]="slotHeight">
                <span class="dl-vt__time">{{ hourLabel(h) }}</span>
              </div>
            }
            <!-- Closing boundary label (e.g. 24:00) at the bottom edge. -->
            <div class="dl-vt__hour-end">
              <span class="dl-vt__time">{{ hourLabel(endHour) }}</span>
            </div>
          </div>

          <div class="dl-vt__body">
            @for (col of layout.columns; track trackByTime(col.date); let ci = $index) {
              <div #colEl class="dl-vt__col" role="gridcell" [class.dl-vt__col--today]="isToday(col.date)">
                @for (h of layout.hours; track h) {
                  <div class="dl-vt__slot" [style.height.px]="slotHeight"></div>
                }

                @if (nowLineTop(col.date); as top) {
                  <div class="dl-now-line" [style.top.%]="top" aria-hidden="true"></div>
                }

                @for (pe of col.events; track pe.event.id) {
                  <div
                    class="dl-event"
                    [class.dl-event--active]="isActive(pe.event)"
                    [class.dl-event--compact]="isShort(pe.event)"
                    role="button"
                    tabindex="0"
                    [style.top.%]="eventTop(pe)"
                    [style.height.%]="eventHeight(pe)"
                    [style.inline-size]="widthCss(pe)"
                    [style.inset-inline-start]="leftCss(pe)"
                    [style.transform]="moveTransform(pe.event)"
                    [style.--dl-event-accent]="pe.event.color || null"
                    [attr.aria-label]="ariaFor(pe.event)"
                    [attr.title]="ariaFor(pe.event)"
                    (pointerdown)="onGestureStart($event, 'move', pe, ci, colEl)"
                    (pointermove)="onGestureMove($event)"
                    (pointerup)="onGestureEnd($event)"
                    (pointercancel)="onGestureCancel()">
                    @if (resizable) {
                      <span
                        class="dl-event__grip dl-event__grip--start"
                        aria-hidden="true"
                        (pointerdown)="onGestureStart($event, 'resize-start', pe, ci, colEl)"></span>
                    }
                    <span class="dl-event__title">{{ pe.event.subject }}</span>
                    <span class="dl-event__time">{{ gestureTimeRange(pe) }}</span>
                    @if (resizable) {
                      <span
                        class="dl-event__grip dl-event__grip--end"
                        aria-hidden="true"
                        (pointerdown)="onGestureStart($event, 'resize-end', pe, ci, colEl)"></span>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class VerticalTimeViewComponent {
  /** Visible day dates (adapter date type), already in display order. */
  @Input() days: unknown[] = [];
  /** Normalized events to place. */
  @Input() events: ReadonlyArray<SchedulerEvent<unknown>> = [];
  @Input() startHour = 7;
  @Input() endHour = 21;
  /** Pixel height of one hour row. */
  @Input() slotHeight = 48;
  /** At/below this duration (minutes) an event uses the compact single-line layout. */
  @Input() compactMinutes = 30;
  /** Minutes the move/resize snaps to. */
  @Input() snapMinutes = 15;
  /** Whether events can be dragged to move. */
  @Input() draggable = true;
  /** Whether events can be resized. */
  @Input() resizable = true;

  /**
   * Emitted on drop/resize-end with a CLONE of the event carrying the proposed new
   * start/end. The view is controlled: it never mutates; the host applies the change.
   */
  @Output() eventChange = new EventEmitter<SchedulerEvent<unknown>>();

  gesture: Gesture | null = null;

  constructor(@Inject(SCHEDULER_DATE_ADAPTER) public adapter: DateAdapter) {}

  get layout(): VerticalTimeLayout {
    return layoutVerticalTime(this.days, this.events, this.adapter, this.startHour, this.endHour);
  }

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
    return this.adapter.diffMinutes(e.start, e.end) <= this.compactMinutes;
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
    const total = (this.endHour - this.startHour) * 60;
    const bodyStart = this.adapter.setTime(d, Math.floor(this.startHour), 0);
    const min = this.adapter.diffMinutes(bodyStart, now);
    if (min < 0 || min > total) return null;
    return (min / total) * 100;
  }
  trackByTime(d: unknown): number {
    return this.adapter.toNative(d).getTime();
  }

  // ---- Live geometry (overridden while resizing) ---------------------------

  private get totalMinutes(): number {
    return (this.endHour - this.startHour) * 60;
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
    const offsetY = (this.adapter.diffMinutes(shifted, g.newStart) / 60) * this.slotHeight;
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
    if (mode === 'move' && !this.draggable) return;
    if (mode !== 'move' && !this.resizable) return;
    ev.stopPropagation(); // resize grips must not also start a move
    (ev.target as HTMLElement).setPointerCapture(ev.pointerId);

    const e = pe.event;
    const bodyStart = this.adapter.setTime(
      e.start, Math.floor(this.startHour), Math.round((this.startHour % 1) * 60),
    );
    const bodyEnd = this.adapter.setTime(
      e.start, Math.floor(this.endHour), Math.round((this.endHour % 1) * 60),
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
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      g.active = true;
    }
    const snapMin = Math.round((dy / this.slotHeight) * 60 / this.snapMinutes) * this.snapMinutes;
    const minDur = this.snapMinutes;

    if (g.mode === 'move') {
      const targetCol = clamp(g.colIndex + Math.round(dx / g.colWidth), 0, this.days.length - 1);
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
    if (!g || !g.active) return;
    (ev.target as HTMLElement).releasePointerCapture?.(ev.pointerId);
    this.eventChange.emit({ ...g.event, start: g.newStart, end: g.newEnd });
  }

  onGestureCancel(): void {
    this.gesture = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.gesture = null;
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

// views/month-view.component.spec.ts
// DOM/component tests for the month (calendar-grid) renderer.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '../core/providers';
import { provideSchedulerI18n } from '../i18n/messages';
import { SchedulerEvent } from '../core/models';
import { MonthViewComponent } from './month-view.component';

function ev(p: Partial<SchedulerEvent<Date>> = {}): SchedulerEvent<Date> {
  return {
    id: 1, subject: 'Sprint demo', isAllDay: false, raw: {},
    start: new Date(2026, 5, 10, 10, 0), end: new Date(2026, 5, 10, 11, 0), ...p,
  };
}

function setup(providers: unknown[] = []): ComponentFixture<MonthViewComponent> {
  TestBed.configureTestingModule({
    imports: [MonthViewComponent],
    providers: [provideNativeDateAdapter({ locale: 'en-US' }), ...(providers as never[])],
  });
  const fixture = TestBed.createComponent(MonthViewComponent);
  fixture.componentRef.setInput('viewDate', new Date(2026, 5, 15)); // June 2026
  return fixture;
}

describe('MonthViewComponent', () => {
  it('renders one weekday header and a full grid of cells per visible column', () => {
    const fixture = setup();
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const cols = fixture.componentInstance.columns.length;
    const weeks = fixture.componentInstance.layout.weeks.length;

    expect(cols).toBe(7);
    expect(host.querySelectorAll('.dl-mv__dow').length).toBe(cols);
    expect(host.querySelectorAll('.dl-mv__cell').length).toBe(weeks * cols);
  });

  it('drops weekend columns when showWeekend is false', () => {
    const fixture = setup();
    fixture.componentRef.setInput('showWeekend', false);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const weeks = fixture.componentInstance.layout.weeks.length;

    expect(fixture.componentInstance.columns.length).toBe(5);
    expect(host.querySelectorAll('.dl-mv__dow').length).toBe(5);
    expect(host.querySelectorAll('.dl-mv__cell').length).toBe(weeks * 5);
  });

  it('renders an event bar with its subject', () => {
    const fixture = setup();
    fixture.componentRef.setInput('events', [ev()]);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const bars = Array.from(host.querySelectorAll('.dl-mv__bartext')).map((b) => b.textContent?.trim());
    expect(bars).toContain('Sprint demo');
  });

  it('emits dayNavigate when a day cell is clicked', () => {
    const fixture = setup();
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    let navigated: unknown = null;
    fixture.componentInstance.dayNavigate.subscribe((d) => (navigated = d));
    host.querySelector<HTMLElement>('.dl-mv__cell')!.click();
    expect(navigated).toBeInstanceOf(Date);
  });

  it('renders the "+N more" overflow label from the i18n token', () => {
    const fixture = setup([provideSchedulerI18n({ moreEvents: (n) => `${n} hidden` })]);
    // Five same-day events with maxLanes=2 forces an overflow on that day.
    const day = new Date(2026, 5, 10, 9, 0);
    const events = Array.from({ length: 5 }, (_, i) =>
      ev({ id: i + 1, subject: `E${i}`, start: day, end: new Date(2026, 5, 10, 10, 0) }));
    fixture.componentRef.setInput('maxLanes', 2);
    fixture.componentRef.setInput('events', events);
    fixture.detectChanges();
    const more = (fixture.nativeElement as HTMLElement).querySelector('.dl-more');
    expect(more?.textContent?.trim()).toMatch(/\d+ hidden/);
  });
});

describe('MonthViewComponent — pointer gestures', () => {
  // A multi-day all-day event guarantees a rendered bar/segment.
  const span = () => ev({ isAllDay: true, start: new Date(2026, 5, 9), end: new Date(2026, 5, 11) });

  function startMove(fixture: ComponentFixture<MonthViewComponent>, mode: 'move' | 'resize-start' | 'resize-end') {
    const inst = fixture.componentInstance;
    const week = inst.layout.weeks.find((w) => w.segments.length)!;
    const wi = inst.layout.weeks.indexOf(week);
    const seg = week.segments[0];
    const gridEl = (fixture.nativeElement as HTMLElement).querySelector('.dl-mv__weeks') as HTMLElement;
    inst.onGestureStart({ button: 0, clientX: 10, clientY: 10, stopPropagation() {} } as unknown as PointerEvent, mode, seg, wi, gridEl);
    return { inst, seg };
  }

  it('a move gesture emits a cloned eventChange', () => {
    const fixture = setup();
    fixture.componentRef.setInput('events', [span()]);
    fixture.detectChanges();
    let changed: unknown = null;
    fixture.componentInstance.eventChange.subscribe((c) => (changed = c));

    startMove(fixture, 'move');
    fixture.componentInstance.onGestureMove({ clientX: 400, clientY: 400, preventDefault() {} } as unknown as PointerEvent);
    document.dispatchEvent(new Event('pointerup'));
    expect(changed).not.toBeNull();
  });

  it('a resize-end gesture emits eventChange', () => {
    const fixture = setup();
    fixture.componentRef.setInput('events', [span()]);
    fixture.detectChanges();
    let changed: unknown = null;
    fixture.componentInstance.eventChange.subscribe((c) => (changed = c));

    startMove(fixture, 'resize-end');
    fixture.componentInstance.onGestureMove({ clientX: 500, clientY: 400, preventDefault() {} } as unknown as PointerEvent);
    document.dispatchEvent(new Event('pointerup'));
    expect(changed).not.toBeNull();
  });

  it('ignores a move gesture when dragging is disabled', () => {
    const fixture = setup();
    fixture.componentRef.setInput('draggable', false);
    fixture.componentRef.setInput('events', [span()]);
    fixture.detectChanges();
    startMove(fixture, 'move');
    expect(fixture.componentInstance.gesture).toBeNull();
  });

  it('opens a +more popover, activates an item, and clears on Escape', () => {
    const fixture = setup();
    const e = span();
    fixture.componentRef.setInput('events', [e]);
    fixture.detectChanges();
    const inst = fixture.componentInstance;
    let activated: unknown = null;
    inst.eventActivate.subscribe((x) => (activated = x));

    const rect = { left: 0, bottom: 0 } as DOMRect;
    inst.openMore({ stopPropagation() {}, currentTarget: { getBoundingClientRect: () => rect } } as unknown as Event, new Date(2026, 5, 10));
    expect(inst.popover).not.toBeNull();

    inst.onPopItem(e);
    expect(activated).toBe(e);
    expect(inst.popover).toBeNull();

    inst.openMore({ stopPropagation() {}, currentTarget: { getBoundingClientRect: () => rect } } as unknown as Event, new Date(2026, 5, 10));
    inst.onEscape();
    expect(inst.popover).toBeNull();
  });

  it('onBarClick emits eventActivate when no drag occurred', () => {
    const fixture = setup();
    const e = span();
    fixture.componentRef.setInput('events', [e]);
    fixture.detectChanges();
    let activated: unknown = null;
    fixture.componentInstance.eventActivate.subscribe((x) => (activated = x));
    fixture.componentInstance.onBarClick({ stopPropagation() {} } as unknown as Event, e);
    expect(activated).toBe(e);
  });
});

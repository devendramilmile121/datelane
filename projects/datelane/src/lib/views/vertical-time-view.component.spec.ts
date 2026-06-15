// views/vertical-time-view.component.spec.ts
// DOM/component tests for the vertical-time renderer (Day / Week / WorkWeek).
// Pointer drag/resize is covered by interaction/gesture.spec.ts — jsdom lacks PointerEvent /
// setPointerCapture, so these tests assert rendering only.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '../core/providers';
import { SchedulerEvent } from '../core/models';
import { VerticalTimeViewComponent } from './vertical-time-view.component';

function ev(p: Partial<SchedulerEvent<Date>> = {}): SchedulerEvent<Date> {
  return {
    id: 1, subject: 'Standup', isAllDay: false, raw: {},
    start: new Date(2026, 5, 8, 9, 0), end: new Date(2026, 5, 8, 10, 0), ...p,
  };
}

function setup(): ComponentFixture<VerticalTimeViewComponent> {
  TestBed.configureTestingModule({
    imports: [VerticalTimeViewComponent],
    providers: [provideNativeDateAdapter({ locale: 'en-US' })],
  });
  const fixture = TestBed.createComponent(VerticalTimeViewComponent);
  fixture.componentRef.setInput('autoScroll', false); // avoid rAF in jsdom
  return fixture;
}

describe('VerticalTimeViewComponent', () => {
  it('renders one day-header column per provided day', () => {
    const fixture = setup();
    const days = [0, 1, 2].map((i) => new Date(2026, 5, 8 + i));
    fixture.componentRef.setInput('days', days);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.dl-vt__head').length).toBe(3);
  });

  it('renders an hour row per layout hour plus a closing boundary label', () => {
    const fixture = setup();
    fixture.componentRef.setInput('days', [new Date(2026, 5, 8)]);
    fixture.componentRef.setInput('startHour', 8);
    fixture.componentRef.setInput('endHour', 18);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const hours = fixture.componentInstance.layout().hours.length;
    expect(hours).toBe(10); // 08:00 … 17:00
    expect(host.querySelectorAll('.dl-vt__hour').length).toBe(hours);
    expect(host.querySelector('.dl-vt__hour-end')).not.toBeNull();
  });

  it('renders an absolutely-positioned event with its title', () => {
    const fixture = setup();
    fixture.componentRef.setInput('days', [new Date(2026, 5, 8)]);
    fixture.componentRef.setInput('events', [ev()]);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const titles = Array.from(host.querySelectorAll('.dl-event__title')).map((t) => t.textContent?.trim());
    expect(titles).toContain('Standup');
  });

  it('renders multi-day all-day events as spanning bars in the all-day band', () => {
    const fixture = setup();
    fixture.componentRef.setInput('days', [0, 1, 2, 3, 4].map((i) => new Date(2026, 5, 8 + i)));
    fixture.componentRef.setInput('events', [{
      id: 9, subject: 'Offsite', isAllDay: true, raw: {},
      start: new Date(2026, 5, 9), end: new Date(2026, 5, 12),
    }]);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const bar = host.querySelector('.dl-vt__allday-bar');
    expect(bar).not.toBeNull();
    expect(bar?.textContent).toContain('Offsite');

    let activated: SchedulerEvent<unknown> | null = null;
    fixture.componentInstance.eventActivate.subscribe((e) => (activated = e));
    (bar as HTMLButtonElement).click();
    expect(activated!).toMatchObject({ subject: 'Offsite' });
  });

  it('collapses extra all-day lanes behind a +N more toggle and expands on click', () => {
    const fixture = setup();
    fixture.componentRef.setInput('days', [0, 1, 2, 3, 4].map((i) => new Date(2026, 5, 8 + i)));
    const mk = (id: string): SchedulerEvent<Date> => ({
      id, subject: id, isAllDay: true, raw: {},
      start: new Date(2026, 5, 9), end: new Date(2026, 5, 12),
    });
    fixture.componentRef.setInput('events', [mk('A'), mk('B'), mk('C')]); // 3 overlapping → 3 lanes
    fixture.componentRef.setInput('allDayMaxLanes', 2);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelectorAll('.dl-vt__allday-bar').length).toBe(2); // collapsed to 2 lanes
    const toggle = () => host.querySelector('.dl-vt__allday-toggle') as HTMLButtonElement;
    expect(toggle().textContent?.trim()).toMatch(/1 more/);
    expect(toggle().getAttribute('aria-expanded')).toBe('false');

    toggle().click();
    fixture.detectChanges();
    expect(host.querySelectorAll('.dl-vt__allday-bar').length).toBe(3); // expanded
    expect(toggle().textContent?.trim()).toBe('Show less');
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
  });

  it('shows no all-day toggle when the lanes fit the collapsed cap', () => {
    const fixture = setup();
    fixture.componentRef.setInput('days', [new Date(2026, 5, 8)]);
    fixture.componentRef.setInput('events', [{
      id: 1, subject: 'Solo', isAllDay: true, raw: {},
      start: new Date(2026, 5, 8), end: new Date(2026, 5, 9),
    }]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.dl-vt__allday-toggle')).toBeNull();
  });

  it('omits the all-day band when there are no all-day events', () => {
    const fixture = setup();
    fixture.componentRef.setInput('days', [new Date(2026, 5, 8)]);
    fixture.componentRef.setInput('events', [ev()]); // timed only
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.dl-vt__allday')).toBeNull();
  });

  it('flags the today column with a modifier class', () => {
    const fixture = setup();
    fixture.componentRef.setInput('days', [new Date()]); // today
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.dl-vt__head--today')).not.toBeNull();
  });

  it('auto-scrolls once per period — not on every change detection', () => {
    TestBed.configureTestingModule({
      imports: [VerticalTimeViewComponent],
      providers: [provideNativeDateAdapter({ locale: 'en-US' })],
    });
    const fixture = TestBed.createComponent(VerticalTimeViewComponent);
    const inst = fixture.componentInstance;
    // autoScroll defaults to true; stub the real DOM scroll (jsdom has no Element.scrollTo).
    const scroll = vi.spyOn(inst as unknown as { scrollToFirst: () => void }, 'scrollToFirst')
      .mockImplementation(() => {});

    fixture.componentRef.setInput('days', [new Date(2026, 5, 8)]);
    fixture.componentRef.setInput('events', [ev()]);
    fixture.detectChanges();
    expect(scroll).toHaveBeenCalledTimes(1); // first render

    // A fresh events array on the SAME period must not re-scroll (host churns references).
    fixture.componentRef.setInput('events', [ev({ id: 2 })]);
    fixture.detectChanges();
    expect(scroll).toHaveBeenCalledTimes(1);

    // Navigating to a new period scrolls again.
    fixture.componentRef.setInput('days', [new Date(2026, 5, 15)]);
    fixture.detectChanges();
    expect(scroll).toHaveBeenCalledTimes(2);
  });
});

describe('VerticalTimeViewComponent — pointer gestures', () => {
  // jsdom lacks PointerEvent/pointer capture; we feed plain objects with the fields the
  // handlers read, plus stubbed (set|release)PointerCapture on the event target.
  const target = { setPointerCapture() {}, releasePointerCapture() {} };

  function withEvent() {
    const fixture = setup();
    fixture.componentRef.setInput('days', [new Date(2026, 5, 8)]);
    fixture.componentRef.setInput('events', [ev()]);
    fixture.detectChanges();
    const inst = fixture.componentInstance;
    const pe = inst.layout().columns[0].events[0];
    const colEl = (fixture.nativeElement as HTMLElement).querySelector('.dl-vt__col') as HTMLElement;
    return { fixture, inst, pe, colEl };
  }

  function startEv(clientX = 0, clientY = 0) {
    return { button: 0, pointerId: 1, target, stopPropagation() {}, clientX, clientY } as unknown as PointerEvent;
  }

  it('a move drag past the threshold emits a cloned eventChange', () => {
    const { inst, pe, colEl } = withEvent();
    let changed: unknown = null;
    inst.eventChange.subscribe((c) => (changed = c));
    inst.onGestureStart(startEv(), 'move', pe, 0, colEl);
    inst.onGestureMove({ clientX: 0, clientY: 60, preventDefault() {} } as unknown as PointerEvent);
    inst.onGestureEnd({ pointerId: 1, target } as unknown as PointerEvent);
    expect(changed).not.toBeNull();
  });

  it('a press with no movement activates the event instead of changing it', () => {
    const { inst, pe, colEl } = withEvent();
    let activated: unknown = null, changed = false;
    inst.eventActivate.subscribe((e) => (activated = e));
    inst.eventChange.subscribe(() => (changed = true));
    inst.onGestureStart(startEv(), 'move', pe, 0, colEl);
    inst.onGestureEnd({ pointerId: 1, target } as unknown as PointerEvent);
    expect(activated).toBe(pe.event);
    expect(changed).toBe(false);
  });

  it('a resize-end drag emits eventChange', () => {
    const { inst, pe, colEl } = withEvent();
    let changed: unknown = null;
    inst.eventChange.subscribe((c) => (changed = c));
    inst.onGestureStart(startEv(), 'resize-end', pe, 0, colEl);
    inst.onGestureMove({ clientX: 0, clientY: 40, preventDefault() {} } as unknown as PointerEvent);
    inst.onGestureEnd({ pointerId: 1, target } as unknown as PointerEvent);
    expect(changed).not.toBeNull();
  });

  it('ignores a move gesture when dragging is disabled', () => {
    const { fixture, inst, pe, colEl } = withEvent();
    fixture.componentRef.setInput('draggable', false);
    inst.onGestureStart(startEv(), 'move', pe, 0, colEl);
    expect(inst.gesture).toBeNull();
  });

  it('Escape and pointer-cancel clear an in-progress gesture', () => {
    const { inst, pe, colEl } = withEvent();
    inst.onGestureStart(startEv(), 'move', pe, 0, colEl);
    inst.onEscape();
    expect(inst.gesture).toBeNull();
    inst.onGestureStart(startEv(), 'move', pe, 0, colEl);
    inst.onGestureCancel();
    expect(inst.gesture).toBeNull();
  });
});

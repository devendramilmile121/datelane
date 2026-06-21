// scheduler/scheduler.component.spec.ts
// DOM/component tests for the root shell: header chrome, active-view routing, i18n.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '../core/providers';
import { provideSchedulerI18n } from '../i18n/messages';
import { SchedulerComponent } from './scheduler.component';

function setup(providers: unknown[] = []): ComponentFixture<SchedulerComponent> {
  TestBed.configureTestingModule({
    imports: [SchedulerComponent],
    providers: [provideNativeDateAdapter({ locale: 'en-US' }), ...(providers as never[])],
  });
  const fixture = TestBed.createComponent(SchedulerComponent);
  fixture.componentRef.setInput('viewDate', new Date(2026, 5, 15));
  return fixture;
}

describe('SchedulerComponent', () => {
  it('labels the header toolbar from the i18n token', () => {
    const fixture = setup();
    fixture.detectChanges();
    const header = (fixture.nativeElement as HTMLElement).querySelector('.dl-header');
    expect(header?.getAttribute('aria-label')).toBe('Scheduler navigation');
  });

  it('routes the default week view to the vertical-time renderer', () => {
    const fixture = setup();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('dl-vertical-time-view')).not.toBeNull();
  });

  it('renders the month renderer when activeView is month', () => {
    const fixture = setup();
    fixture.componentRef.setInput('activeView', 'month');
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('dl-month-view')).not.toBeNull();
    expect(host.querySelector('dl-vertical-time-view')).toBeNull();
  });

  it('falls back to the i18n no-renderer placeholder for an unknown view', () => {
    const fixture = setup();
    // Force a view type with no engine mapping to exercise the @else branch.
    fixture.componentRef.setInput('activeView', 'nope' as never);
    fixture.detectChanges();
    const empty = (fixture.nativeElement as HTMLElement).querySelector('.dl-empty__title');
    expect(empty?.textContent).toContain('nope');
  });

  it('uses overridden i18n strings for the header label', () => {
    const fixture = setup([provideSchedulerI18n({ navigation: 'Planificateur' })]);
    fixture.detectChanges();
    const header = (fixture.nativeElement as HTMLElement).querySelector('.dl-header');
    expect(header?.getAttribute('aria-label')).toBe('Planificateur');
  });

  it('renders the date-range label per active view', () => {
    const fixture = setup();
    fixture.detectChanges();
    const title = () => (fixture.nativeElement as HTMLElement).querySelector('.dl-header__title')?.textContent ?? '';
    fixture.componentRef.setInput('activeView', 'month');
    fixture.detectChanges();
    expect(title()).toContain('2026');
    fixture.componentRef.setInput('activeView', 'year');
    fixture.detectChanges();
    expect(title().trim()).toBe('2026');
  });

  it('routes work week through the vertical renderer with five days', () => {
    const fixture = setup();
    fixture.componentRef.setInput('activeView', 'workWeek');
    fixture.detectChanges();
    expect(fixture.componentInstance.visibleDays.length).toBe(5);
    expect((fixture.nativeElement as HTMLElement).querySelector('dl-vertical-time-view')).not.toBeNull();
  });

  it('normalizes raw events through the field map', () => {
    const fixture = setup();
    fixture.componentRef.setInput('fieldMap', { id: 'Id', subject: 'S', start: 'A', end: 'B' });
    fixture.componentRef.setInput('events', [{ Id: 1, S: 'Hi', A: new Date(2026, 5, 15, 9, 0), B: new Date(2026, 5, 15, 10, 0) }]);
    fixture.detectChanges();
    expect(fixture.componentInstance.normalizedEvents[0]).toMatchObject({ id: 1, subject: 'Hi' });
  });
});

describe('SchedulerComponent — output handlers', () => {
  const E = { id: 5, subject: 'X', isAllDay: false, raw: {},
    start: new Date(2026, 5, 15), end: new Date(2026, 5, 15) };

  it('onDayNavigate drills into the day view and emits navigate + viewChange', () => {
    const fixture = setup();
    let navigated: unknown = null, viewChanged: string | null = null;
    fixture.componentInstance.navigate.subscribe((n) => (navigated = n));
    fixture.componentInstance.viewChange.subscribe((v) => (viewChanged = v));
    const d = new Date(2026, 5, 20);
    fixture.componentInstance.onDayNavigate(d);
    expect(fixture.componentInstance.activeView()).toBe('day');
    expect(fixture.componentInstance.viewDate()).toBe(d);
    expect(navigated).toMatchObject({ view: 'day', action: 'date' });
    expect(viewChanged!).toBe('day');
  });

  it('onViewEventChange and onCellActivate forward to outputs', () => {
    const fixture = setup();
    let changed: unknown = null, cell: unknown = null;
    fixture.componentInstance.eventChange.subscribe((c) => (changed = c));
    fixture.componentInstance.cellClick.subscribe((c) => (cell = c));
    fixture.componentInstance.onViewEventChange(E);
    fixture.componentInstance.onCellActivate({ date: E.start, resourceId: 2 });
    expect(changed).toMatchObject({ event: { id: 5 } });
    expect(cell).toMatchObject({ resourceId: 2 });
  });

  it('onEventActivate emits eventClick and opens the quick-view', () => {
    const fixture = setup();
    let clicked: unknown = null;
    fixture.componentInstance.eventClick.subscribe((c) => (clicked = c));
    fixture.componentInstance.onEventActivate(E);
    fixture.detectChanges();
    expect(clicked).toMatchObject({ event: { id: 5 } });
    expect(fixture.componentInstance.quickEvent).toBe(E);
    expect((fixture.nativeElement as HTMLElement).querySelector('dl-quick-view')).not.toBeNull();
  });

  it('onEventActivate skips the quick-view when showQuickView is false', () => {
    const fixture = setup();
    fixture.componentRef.setInput('showQuickView', false);
    fixture.componentInstance.onEventActivate(E);
    expect(fixture.componentInstance.quickEvent).toBeNull();
  });

  it('quick-view edit / delete forward to outputs and close the popover', () => {
    const fixture = setup();
    let edited: unknown = null, deleted: unknown = null;
    fixture.componentInstance.eventEdit.subscribe((c) => (edited = c));
    fixture.componentInstance.eventDelete.subscribe((c) => (deleted = c));

    fixture.componentInstance.onEventActivate(E);
    fixture.componentInstance.onQuickEdit();
    expect(edited).toMatchObject({ event: { id: 5 } });
    expect(fixture.componentInstance.quickEvent).toBeNull();

    fixture.componentInstance.onEventActivate(E);
    fixture.componentInstance.onQuickDelete();
    expect(deleted).toMatchObject({ event: { id: 5 } });
    expect(fixture.componentInstance.quickEvent).toBeNull();
  });
});

describe('SchedulerComponent — period navigation', () => {
  const ms = (d: Date) => d.getTime();

  function navSetup(view: string) {
    TestBed.resetTestingModule(); // allow several independent fixtures within one test
    const fixture = setup();
    fixture.componentRef.setInput('activeView', view as never);
    fixture.componentRef.setInput('viewDate', new Date(2026, 5, 15)); // Mon 15 Jun 2026
    return fixture;
  }

  it('steps a week view by ±7 days and emits a navigate event', () => {
    const fixture = navSetup('week');
    let nav: { action?: string } | null = null;
    fixture.componentInstance.navigate.subscribe((n) => (nav = n));

    fixture.componentInstance.next();
    expect(ms(fixture.componentInstance.viewDate() as Date)).toBe(ms(new Date(2026, 5, 22)));
    expect(nav!.action).toBe('next');

    fixture.componentInstance.prev();
    fixture.componentInstance.prev();
    expect(ms(fixture.componentInstance.viewDate() as Date)).toBe(ms(new Date(2026, 5, 8)));
    expect(nav!.action).toBe('prev');
  });

  it('steps month / year / day / agenda views by their own unit', () => {
    const month = navSetup('month');
    month.componentInstance.next();
    expect(ms(month.componentInstance.viewDate() as Date)).toBe(ms(new Date(2026, 6, 15)));

    const year = navSetup('year');
    year.componentInstance.prev();
    expect(ms(year.componentInstance.viewDate() as Date)).toBe(ms(new Date(2025, 5, 15)));

    const day = navSetup('day');
    day.componentInstance.next();
    expect(ms(day.componentInstance.viewDate() as Date)).toBe(ms(new Date(2026, 5, 16)));

    const agenda = navSetup('agenda');
    agenda.componentRef.setInput('agendaDaysCount', 5);
    agenda.componentInstance.next();
    expect(ms(agenda.componentInstance.viewDate() as Date)).toBe(ms(new Date(2026, 5, 20)));
  });

  it('today() jumps to the current date and announces a today action', () => {
    const fixture = navSetup('week');
    let nav: { action?: string } | null = null;
    fixture.componentInstance.navigate.subscribe((n) => (nav = n));
    fixture.componentInstance.today();
    const vd = fixture.componentInstance.viewDate() as Date, now = new Date();
    expect([vd.getFullYear(), vd.getMonth(), vd.getDate()]).toEqual([now.getFullYear(), now.getMonth(), now.getDate()]);
    expect(nav!.action).toBe('today');
  });

  it('renders a view switcher and switches the active view on click', () => {
    const fixture = setup();
    fixture.componentRef.setInput('views', [{ type: 'week' }, { type: 'month', displayName: 'Calendar' }]);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(host.querySelectorAll<HTMLButtonElement>('.dl-header__view'));
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Week', 'Calendar']);

    let viewChanged: string | null = null;
    fixture.componentInstance.viewChange.subscribe((v) => (viewChanged = v));
    buttons[1].click();
    expect(fixture.componentInstance.activeView()).toBe('month');
    expect(viewChanged!).toBe('month');
  });

  it('setActiveView is a no-op when the view is already active', () => {
    const fixture = setup();
    let emitted = 0;
    fixture.componentInstance.viewChange.subscribe(() => emitted++);
    fixture.componentInstance.setActiveView('week'); // default is already week
    expect(emitted).toBe(0);
  });

  it('renders prev / next / today controls with i18n labels', () => {
    const fixture = setup([provideSchedulerI18n({ today: 'Aujourd’hui', previous: 'Précédent' })]);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.dl-header__today')?.textContent?.trim()).toBe('Aujourd’hui');
    expect(host.querySelector('.dl-header__step')?.getAttribute('aria-label')).toBe('Précédent');
  });
});

describe('SchedulerComponent — calendar popover + header navigation', () => {
  it('toggles the date-jump calendar popover when the date label is clicked', () => {
    const fixture = setup();
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const title = host.querySelector<HTMLButtonElement>('.dl-header__title')!;
    expect(host.querySelector('dl-calendar-popover')).toBeNull();
    expect(title.getAttribute('aria-expanded')).toBe('false');

    title.click();
    fixture.detectChanges();
    expect(host.querySelector('dl-calendar-popover')).not.toBeNull();
    expect(title.getAttribute('aria-expanded')).toBe('true');
  });

  it('onCalendarSelect jumps viewDate, emits a date navigate, and closes the popover', () => {
    const fixture = setup();
    fixture.componentInstance.toggleCalendar(new Event('click'));
    let nav: { action?: string; view?: string } | null = null;
    fixture.componentInstance.navigate.subscribe((n) => (nav = n));
    const target = new Date(2026, 7, 3);

    fixture.componentInstance.onCalendarSelect(target);
    expect(fixture.componentInstance.viewDate()).toBe(target);
    expect(fixture.componentInstance.activeView()).toBe('week'); // active view is preserved
    expect(nav!).toMatchObject({ action: 'date', view: 'week' });
    expect(fixture.componentInstance.calendarOpen).toBe(false);
  });

  it('timeline Day/Week/WorkWeek header navigation drills into Agenda', () => {
    const fixture = setup();
    fixture.componentRef.setInput('activeView', 'timelineWeek');
    let viewChanged: string | null = null;
    fixture.componentInstance.viewChange.subscribe((v) => (viewChanged = v));

    const d = new Date(2026, 5, 18);
    fixture.componentInstance.onTimelineHeaderNavigate(d);
    expect(fixture.componentInstance.activeView()).toBe('agenda');
    expect(fixture.componentInstance.viewDate()).toBe(d);
    expect(viewChanged!).toBe('agenda');
  });

  it('timeline Month/Year header navigation drills into Timeline Day', () => {
    const fixture = setup();
    fixture.componentRef.setInput('activeView', 'timelineMonth');
    fixture.componentInstance.onTimelineHeaderNavigate(new Date(2026, 5, 18));
    expect(fixture.componentInstance.activeView()).toBe('timelineDay');
  });
});

// scheduler/scheduler.a11y.spec.ts — axe-core gate for the root shell across every view type,
// plus the quick-view and calendar popovers (DESIGN-SYSTEM §5). Exercises header chrome, the
// view switcher, and each renderer through the real component wiring.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '../core/providers';
import { provideSchedulerI18n } from '../i18n/messages';
import { FieldMap, SchedulerViewType } from '../core/models';
import { SchedulerComponent } from './scheduler.component';
import { dayView, weekView, monthView, agendaView, yearView, monthAgendaView, timelineWeekView } from '../views/view-factories';
import { findAxeViolations } from '../testing/axe';

const FIELD_MAP: FieldMap = { id: 'id', subject: 'subject', start: 'start', end: 'end' };

const EVENTS = [
  { id: 1, subject: 'Sprint demo', start: new Date(2026, 5, 15, 10, 0), end: new Date(2026, 5, 15, 11, 0) },
  { id: 2, subject: 'Retro', start: new Date(2026, 5, 16, 14, 0), end: new Date(2026, 5, 16, 15, 0) },
];

function setup(): ComponentFixture<SchedulerComponent> {
  TestBed.configureTestingModule({
    imports: [SchedulerComponent],
    providers: [provideNativeDateAdapter({ locale: 'en-US' }), provideSchedulerI18n({})],
  });
  const fixture = TestBed.createComponent(SchedulerComponent);
  fixture.componentRef.setInput('viewDate', new Date(2026, 5, 15));
  fixture.componentRef.setInput('fieldMap', FIELD_MAP);
  fixture.componentRef.setInput('events', EVENTS);
  fixture.componentRef.setInput('views', [
    dayView(), weekView(), monthView(), agendaView(), yearView(), monthAgendaView(), timelineWeekView(),
  ]);
  return fixture;
}

const VIEWS: SchedulerViewType[] = [
  'day', 'week', 'month', 'agenda', 'year', 'monthAgenda', 'timelineWeek',
];

describe('SchedulerComponent — a11y', () => {
  for (const view of VIEWS) {
    it(`has no axe violations in the ${view} view`, async () => {
      const fixture = setup();
      fixture.componentRef.setInput('activeView', view);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(await findAxeViolations(fixture.nativeElement)).toEqual([]);
    });
  }

  it('has no axe violations with the quick-view popover open', async () => {
    const fixture = setup();
    fixture.componentRef.setInput('activeView', 'week');
    fixture.detectChanges();
    fixture.componentInstance.onEventActivate(fixture.componentInstance.normalizedEvents[0]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(await findAxeViolations(fixture.nativeElement)).toEqual([]);
  });

  it('has no axe violations with the calendar popover open', async () => {
    const fixture = setup();
    fixture.detectChanges();
    fixture.componentInstance.toggleCalendar(new Event('click'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(await findAxeViolations(fixture.nativeElement)).toEqual([]);
  });
});

// views/month-view.a11y.spec.ts — axe-core accessibility gate for the month renderer.
// Renders the view with events and asserts zero axe violations (DESIGN-SYSTEM §5).

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '../core/providers';
import { provideSchedulerI18n } from '../i18n/messages';
import { SchedulerEvent } from '../core/models';
import { MonthViewComponent } from './month-view.component';
import { findAxeViolations } from '../testing/axe';

function ev(p: Partial<SchedulerEvent<Date>> = {}): SchedulerEvent<Date> {
  return {
    id: 1, subject: 'Sprint demo', isAllDay: false, raw: {},
    start: new Date(2026, 5, 10, 10, 0), end: new Date(2026, 5, 10, 11, 0), ...p,
  };
}

function setup(): ComponentFixture<MonthViewComponent> {
  TestBed.configureTestingModule({
    imports: [MonthViewComponent],
    providers: [provideNativeDateAdapter({ locale: 'en-US' }), provideSchedulerI18n({})],
  });
  const fixture = TestBed.createComponent(MonthViewComponent);
  fixture.componentRef.setInput('viewDate', new Date(2026, 5, 15));
  return fixture;
}

describe('MonthViewComponent — a11y', () => {
  it('has no axe violations when rendering events', async () => {
    const fixture = setup();
    fixture.componentRef.setInput('events', [ev(), ev({ id: 2, subject: 'Review', start: new Date(2026, 5, 12, 9), end: new Date(2026, 5, 12, 10) })]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(await findAxeViolations(fixture.nativeElement)).toEqual([]);
  });
});

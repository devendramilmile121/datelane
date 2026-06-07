// views/month-agenda-view.component.spec.ts — month calendar + selected-day list render tests.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '../core/providers';
import { SchedulerEvent } from '../core/models';
import { MonthAgendaViewComponent } from './month-agenda-view.component';

function ev(p: Partial<SchedulerEvent<Date>> = {}): SchedulerEvent<Date> {
  return { id: 1, subject: 'Sync', isAllDay: false, raw: {},
    start: new Date(2026, 5, 15, 9, 0), end: new Date(2026, 5, 15, 10, 0), ...p };
}

function setup(): ComponentFixture<MonthAgendaViewComponent> {
  TestBed.configureTestingModule({
    imports: [MonthAgendaViewComponent],
    providers: [provideNativeDateAdapter({ locale: 'en-US' })],
  });
  const fixture = TestBed.createComponent(MonthAgendaViewComponent);
  fixture.componentRef.setInput('viewDate', new Date(2026, 5, 15));
  return fixture;
}

describe('MonthAgendaViewComponent', () => {
  it('renders a weekday header row and day cells', () => {
    const fixture = setup();
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.dl-ma__dowcell').length).toBe(7);
    expect(host.querySelectorAll('.dl-ma__day').length).toBeGreaterThanOrEqual(28);
  });

  it('renders a dot on event days and lists the selected day events', () => {
    const fixture = setup();
    fixture.componentRef.setInput('events', [ev()]);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.dl-ma__dot')).not.toBeNull();
    const subjects = Array.from(host.querySelectorAll('.dl-ma__subject')).map((s) => s.textContent?.trim());
    expect(subjects).toContain('Sync');
  });

  it('emits eventActivate when a list event is clicked', () => {
    const fixture = setup();
    fixture.componentRef.setInput('events', [ev()]);
    fixture.detectChanges();
    let activated: SchedulerEvent<unknown> | null = null;
    fixture.componentInstance.eventActivate.subscribe((e) => (activated = e));
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.dl-ma__event')!.click();
    expect(activated!).toMatchObject({ subject: 'Sync' });
  });

  it('emits daySelect when a calendar day is clicked', () => {
    const fixture = setup();
    fixture.detectChanges();
    let selected: unknown = null;
    fixture.componentInstance.daySelect.subscribe((d) => (selected = d));
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.dl-ma__day')!.click();
    expect(selected).toBeInstanceOf(Date);
  });
});

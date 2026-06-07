// views/agenda-view.component.spec.ts — list-engine render tests.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '../core/providers';
import { SchedulerEvent } from '../core/models';
import { AgendaViewComponent } from './agenda-view.component';

function ev(p: Partial<SchedulerEvent<Date>> = {}): SchedulerEvent<Date> {
  return { id: 1, subject: 'Review', isAllDay: false, raw: {},
    start: new Date(2026, 5, 8, 9, 0), end: new Date(2026, 5, 8, 10, 0), ...p };
}

function setup(): ComponentFixture<AgendaViewComponent> {
  TestBed.configureTestingModule({
    imports: [AgendaViewComponent],
    providers: [provideNativeDateAdapter({ locale: 'en-US' })],
  });
  const fixture = TestBed.createComponent(AgendaViewComponent);
  fixture.componentRef.setInput('viewDate', new Date(2026, 5, 8));
  fixture.componentRef.setInput('autoScroll', false);
  return fixture;
}

describe('AgendaViewComponent', () => {
  it('shows the empty state when every day is hidden and there are no events', () => {
    const fixture = setup();
    fixture.componentRef.setInput('hideEmptyAgendaDays', true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.dl-empty')).not.toBeNull();
  });

  it('renders an event row with its subject', () => {
    const fixture = setup();
    fixture.componentRef.setInput('events', [ev()]);
    fixture.detectChanges();
    const subjects = Array.from((fixture.nativeElement as HTMLElement)
      .querySelectorAll('.dl-ag__subject')).map((s) => s.textContent?.trim());
    expect(subjects).toContain('Review');
  });

  it('emits eventActivate when an event row is clicked', () => {
    const fixture = setup();
    fixture.componentRef.setInput('events', [ev()]);
    fixture.detectChanges();
    let activated: SchedulerEvent<unknown> | null = null;
    fixture.componentInstance.eventActivate.subscribe((e) => (activated = e));
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.dl-ag__event')!.click();
    expect(activated!).toMatchObject({ subject: 'Review' });
  });
});

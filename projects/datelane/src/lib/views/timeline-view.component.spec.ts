// views/timeline-view.component.spec.ts — horizontal-time engine render tests.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '../core/providers';
import { SchedulerEvent } from '../core/models';
import { TimelineViewComponent } from './timeline-view.component';

function ev(p: Partial<SchedulerEvent<Date>> = {}): SchedulerEvent<Date> {
  return { id: 1, subject: 'Booking', isAllDay: false, raw: {}, resourceIds: [1],
    start: new Date(2026, 5, 8, 9, 0), end: new Date(2026, 5, 8, 11, 0), ...p };
}

function setup(): ComponentFixture<TimelineViewComponent> {
  TestBed.configureTestingModule({
    imports: [TimelineViewComponent],
    providers: [provideNativeDateAdapter({ locale: 'en-US' })],
  });
  const fixture = TestBed.createComponent(TimelineViewComponent);
  fixture.componentRef.setInput('viewType', 'timelineDay');
  fixture.componentRef.setInput('viewDate', new Date(2026, 5, 8));
  fixture.componentRef.setInput('rows', [{ resourceId: 1, label: 'Alice', depth: 0 }]);
  fixture.componentRef.setInput('resourceTitle', 'Owners');
  fixture.componentRef.setInput('startHour', 8);
  fixture.componentRef.setInput('endHour', 18);
  fixture.componentRef.setInput('autoScroll', false);
  return fixture;
}

describe('TimelineViewComponent', () => {
  it('renders hour columns and the resource row header', () => {
    const fixture = setup();
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.dl-tl__col').length).toBe(10); // 08:00 … 17:00
    expect(host.querySelector('.dl-tl__rhead')?.textContent).toContain('Alice');
  });

  it('renders an event bar with its subject', () => {
    const fixture = setup();
    fixture.componentRef.setInput('events', [ev()]);
    fixture.detectChanges();
    const bars = Array.from((fixture.nativeElement as HTMLElement)
      .querySelectorAll('.dl-tl__bartext')).map((b) => b.textContent?.trim());
    expect(bars).toContain('Booking');
  });

  it('emits eventActivate when a bar is clicked', () => {
    const fixture = setup();
    fixture.componentRef.setInput('events', [ev()]);
    fixture.detectChanges();
    let activated: SchedulerEvent<unknown> | null = null;
    fixture.componentInstance.eventActivate.subscribe((e) => (activated = e));
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.dl-tl__bar')!.click();
    expect(activated!).toMatchObject({ subject: 'Booking' });
  });

  it('emits cellActivate with date + resourceId when an empty cell is clicked', () => {
    const fixture = setup();
    fixture.detectChanges();
    let payload: { date: unknown; resourceId?: string | number } | null = null;
    fixture.componentInstance.cellActivate.subscribe((p) => (payload = p));
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.dl-tl__cell')!.click();
    expect(payload!.resourceId).toBe(1);
    expect(payload!.date).toBeInstanceOf(Date);
  });
});

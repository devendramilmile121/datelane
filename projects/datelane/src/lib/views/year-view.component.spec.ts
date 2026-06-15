// views/year-view.component.spec.ts — year calendar-grid render tests.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '../core/providers';
import { SchedulerEvent } from '../core/models';
import { YearViewComponent } from './year-view.component';

function setup(): ComponentFixture<YearViewComponent> {
  TestBed.configureTestingModule({
    imports: [YearViewComponent],
    providers: [provideNativeDateAdapter({ locale: 'en-US' })],
  });
  const fixture = TestBed.createComponent(YearViewComponent);
  fixture.componentRef.setInput('viewDate', new Date(2026, 5, 15));
  fixture.componentRef.setInput('autoScroll', false);
  return fixture;
}

describe('YearViewComponent', () => {
  it('renders twelve month panels', () => {
    const fixture = setup();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.dl-yr__month').length).toBe(12);
  });

  it('marks the vertical orientation with a modifier class', () => {
    const fixture = setup();
    fixture.componentRef.setInput('orientation', 'vertical');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.dl-yr--vertical')).not.toBeNull();
  });

  it('renders an event dot on a day that has events', () => {
    const fixture = setup();
    const e: SchedulerEvent<Date> = { id: 1, subject: 'X', isAllDay: false, raw: {},
      start: new Date(2026, 5, 10, 9, 0), end: new Date(2026, 5, 10, 10, 0) };
    fixture.componentRef.setInput('events', [e]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.dl-yr__dot')).not.toBeNull();
  });

  it('emits dayNavigate when a day cell is clicked', () => {
    const fixture = setup();
    fixture.detectChanges();
    let navigated: unknown = null;
    fixture.componentInstance.dayNavigate.subscribe((d) => (navigated = d));
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.dl-yr__day')!.click();
    expect(navigated).toBeInstanceOf(Date);
  });
});

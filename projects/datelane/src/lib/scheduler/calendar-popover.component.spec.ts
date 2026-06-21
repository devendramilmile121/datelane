// Tests for the date-jump calendar popover.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '../core/providers';
import { CalendarPopoverComponent } from './calendar-popover.component';

function setup(): ComponentFixture<CalendarPopoverComponent> {
  TestBed.configureTestingModule({
    imports: [CalendarPopoverComponent],
    providers: [provideNativeDateAdapter({ locale: 'en-US' })],
  });
  const fixture = TestBed.createComponent(CalendarPopoverComponent);
  fixture.componentRef.setInput('value', new Date(2026, 5, 15)); // 15 Jun 2026
  fixture.detectChanges();
  return fixture;
}

const days = (f: ComponentFixture<CalendarPopoverComponent>) =>
  Array.from((f.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.dl-cal__day'));

describe('CalendarPopoverComponent', () => {
  it('renders the seeded month label and a 6×7 day grid', () => {
    const f = setup();
    const host = f.nativeElement as HTMLElement;
    expect(host.querySelector('.dl-cal__title')?.textContent).toContain('June 2026');
    expect(host.querySelectorAll('.dl-cal__week').length).toBe(6);
    expect(days(f).length).toBe(42);
  });

  it('emits the clicked day via select', () => {
    const f = setup();
    let picked: Date | undefined;
    f.componentInstance.dateSelect.subscribe((d) => (picked = d as Date));
    // Find the in-month "15" cell.
    const cell = days(f).find((b) => !b.classList.contains('dl-cal__day--out') && b.textContent?.trim() === '15');
    cell!.click();
    expect(picked && picked.getDate()).toBe(15);
    expect(picked && picked.getMonth()).toBe(5);
  });

  it('steps the visible month without committing a selection', () => {
    const f = setup();
    let picked = false;
    f.componentInstance.dateSelect.subscribe(() => (picked = true));
    const prev = (f.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.dl-cal__step');
    prev!.click();
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('.dl-cal__title')?.textContent).toContain('May 2026');
    expect(picked).toBe(false);
  });

  it('Enter on the focused day selects it; Escape is left to the host', () => {
    const f = setup();
    let picked: Date | undefined;
    f.componentInstance.dateSelect.subscribe((d) => (picked = d as Date));
    f.componentInstance.onKeydown({ key: 'Enter', preventDefault() {} } as KeyboardEvent);
    expect(picked && picked.getDate()).toBe(15);
  });

  it('ArrowDown moves the focused day forward one week before selecting', () => {
    const f = setup();
    let picked: Date | undefined;
    f.componentInstance.dateSelect.subscribe((d) => (picked = d as Date));
    f.componentInstance.onKeydown({ key: 'ArrowDown', preventDefault() {} } as KeyboardEvent);
    f.componentInstance.onKeydown({ key: 'Enter', preventDefault() {} } as KeyboardEvent);
    expect(picked && picked.getDate()).toBe(22); // 15 + 7
  });
});

// editor/quick-view.component.spec.ts
// DOM/component tests (Angular TestBed + Vitest, jsdom). Signal inputs are set with
// componentRef.setInput(); change detection is flushed with fixture.detectChanges().

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '../core/providers';
import { provideSchedulerI18n } from '../i18n/messages';
import { SchedulerEvent } from '../core/models';
import { QuickViewComponent } from './quick-view.component';

function ev(p: Partial<SchedulerEvent<Date>> = {}): SchedulerEvent<Date> {
  return {
    id: 1, subject: 'Standup', isAllDay: false, raw: {},
    start: new Date(2026, 5, 7, 9, 0), end: new Date(2026, 5, 7, 9, 30), ...p,
  };
}

function setup(providers: unknown[] = []): ComponentFixture<QuickViewComponent> {
  TestBed.configureTestingModule({
    imports: [QuickViewComponent],
    providers: [provideNativeDateAdapter({ locale: 'en-US' }), ...(providers as never[])],
  });
  const fixture = TestBed.createComponent(QuickViewComponent);
  fixture.componentRef.setInput('event', ev());
  return fixture;
}

describe('QuickViewComponent', () => {
  it('renders the event subject and a when-label', () => {
    const fixture = setup();
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.dl-qv__title')?.textContent).toContain('Standup');
    expect(host.querySelector('.dl-qv__when')?.textContent?.length).toBeGreaterThan(0);
  });

  it('shows Edit / Delete actions by default and hides them when readonly', () => {
    const fixture = setup();
    fixture.detectChanges();
    let host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.dl-qv__actions')).not.toBeNull();
    expect(host.querySelector('.dl-qv__btn--edit')?.textContent?.trim()).toBe('Edit');
    expect(host.querySelector('.dl-qv__btn--del')?.textContent?.trim()).toBe('Delete');

    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.dl-qv__actions')).toBeNull();
  });

  it('emits edit / delete / dismiss on the matching button clicks', () => {
    const fixture = setup();
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    let edited = 0, deleted = 0, dismissed = 0;
    fixture.componentInstance.edit.subscribe(() => edited++);
    fixture.componentInstance.delete.subscribe(() => deleted++);
    fixture.componentInstance.dismiss.subscribe(() => dismissed++);

    host.querySelector<HTMLButtonElement>('.dl-qv__btn--edit')!.click();
    host.querySelector<HTMLButtonElement>('.dl-qv__btn--del')!.click();
    host.querySelector<HTMLButtonElement>('.dl-qv__close')!.click();

    expect(edited).toBe(1);
    expect(deleted).toBe(1);
    expect(dismissed).toBe(1);
  });

  it('renders the all-day marker from the i18n token', () => {
    const fixture = setup();
    fixture.componentRef.setInput('event', ev({ isAllDay: true }));
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.dl-qv__when')?.textContent).toContain('All day');
  });

  it('uses overridden i18n strings for the action buttons', () => {
    const fixture = setup([provideSchedulerI18n({ edit: 'Modifier', delete: 'Supprimer' })]);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.dl-qv__btn--edit')?.textContent?.trim()).toBe('Modifier');
    expect(host.querySelector('.dl-qv__btn--del')?.textContent?.trim()).toBe('Supprimer');
  });

  it('exposes a template context whose callbacks emit the matching outputs', () => {
    const fixture = setup();
    fixture.detectChanges();
    let edited = 0, deleted = 0, dismissed = 0;
    fixture.componentInstance.edit.subscribe(() => edited++);
    fixture.componentInstance.delete.subscribe(() => deleted++);
    fixture.componentInstance.dismiss.subscribe(() => dismissed++);

    const ctx = fixture.componentInstance.context;
    expect(ctx.$implicit.subject).toBe('Standup');
    ctx.edit(); ctx.delete(); ctx.close();
    expect([edited, deleted, dismissed]).toEqual([1, 1, 1]);
  });

  it('renders a centered dialog with no pointer-anchored inline coordinates', () => {
    const fixture = setup();
    fixture.detectChanges();
    const el = (fixture.nativeElement as HTMLElement).querySelector('.dl-qv') as HTMLElement;
    expect(el.getAttribute('role')).toBe('dialog');
    // Centering is purely CSS now — no inline anchor props leak onto the element.
    expect(el.style.getPropertyValue('--dl-qv-x')).toBe('');
    expect(el.style.getPropertyValue('--dl-qv-y')).toBe('');
    expect(el.style.top).toBe('');
  });

  it('dismisses on an outside pointerdown but not on an inside one', () => {
    const fixture = setup();
    fixture.detectChanges();
    let dismissed = 0;
    fixture.componentInstance.dismiss.subscribe(() => dismissed++);

    fixture.componentInstance.onOutside({ target: (fixture.nativeElement as HTMLElement).querySelector('.dl-qv__title') } as unknown as PointerEvent);
    expect(dismissed).toBe(0); // inside the popover

    fixture.componentInstance.onOutside({ target: document.body } as unknown as PointerEvent);
    expect(dismissed).toBe(1); // outside
  });
});

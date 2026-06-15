// i18n/messages.spec.ts
// Token-default + provider-override tests for the scheduler UI-string contract.

import { TestBed } from '@angular/core/testing';
import {
  DEFAULT_SCHEDULER_MESSAGES, SCHEDULER_MESSAGES, provideSchedulerI18n,
} from './messages';

describe('SCHEDULER_MESSAGES', () => {
  it('resolves to the built-in English defaults with no provider', () => {
    TestBed.configureTestingModule({});
    const msgs = TestBed.inject(SCHEDULER_MESSAGES);
    expect(msgs).toBe(DEFAULT_SCHEDULER_MESSAGES);
    expect(msgs.close).toBe('Close');
    expect(msgs.moreEvents(3)).toBe('+3 more');
    expect(msgs.noRenderer('week')).toContain('week');
  });

  it('merges a partial override on top of the defaults', () => {
    TestBed.configureTestingModule({
      providers: [provideSchedulerI18n({ close: 'Fermer', moreEvents: (n) => `${n} de plus` })],
    });
    const msgs = TestBed.inject(SCHEDULER_MESSAGES);
    expect(msgs.close).toBe('Fermer');        // overridden
    expect(msgs.moreEvents(2)).toBe('2 de plus');
    expect(msgs.edit).toBe('Edit');           // untouched default preserved
  });

  it('does not mutate the shared default object when overriding', () => {
    provideSchedulerI18n({ close: 'X' });
    expect(DEFAULT_SCHEDULER_MESSAGES.close).toBe('Close');
  });
});

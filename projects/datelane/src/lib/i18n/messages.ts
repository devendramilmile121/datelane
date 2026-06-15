// i18n/messages.ts
// Static UI-string contract for the scheduler chrome (buttons, aria labels, overflow text).
// Date / number formatting flows through the DateAdapter + SCHEDULER_LOCALE; this token covers
// only the fixed UI strings, so apps can translate them without forking any template.

import { InjectionToken, Provider } from '@angular/core';

/** Every fixed UI string the library renders. Count/label builders are functions. */
export interface SchedulerMessages {
  /** Toolbar aria-label on the scheduler header. */
  navigation: string;
  /** "Today" button that jumps the view back to the current date. */
  today: string;
  /** aria-label for the previous-period button. */
  previous: string;
  /** aria-label for the next-period button. */
  next: string;
  /** aria-label for the view-switcher button group. */
  viewSwitcher: string;
  /** Close button on popovers / quick-view. */
  close: string;
  /** Quick-view edit action. */
  edit: string;
  /** Quick-view delete action. */
  delete: string;
  /** All-day marker in the quick-view time line. */
  allDay: string;
  /** Builds the "+N more" overflow label for a hidden-event count. */
  moreEvents: (count: number) => string;
  /** Collapses an expanded overflow (e.g. the all-day band). */
  showLess: string;
  /** Placeholder shown when the active view has no renderer. */
  noRenderer: (view: string) => string;
}

/** Built-in English strings. Used as the token default and as the override base. */
export const DEFAULT_SCHEDULER_MESSAGES: SchedulerMessages = {
  navigation: 'Scheduler navigation',
  today: 'Today',
  previous: 'Previous',
  next: 'Next',
  viewSwitcher: 'Change view',
  close: 'Close',
  edit: 'Edit',
  delete: 'Delete',
  allDay: 'All day',
  moreEvents: (count) => `+${count} more`,
  showLess: 'Show less',
  noRenderer: (view) => `No renderer for “${view}” yet`,
};

/**
 * UI strings token. Defaults to English via a tree-shakeable factory, so the scheduler works
 * with zero configuration; override with `provideSchedulerI18n(...)`.
 */
export const SCHEDULER_MESSAGES = new InjectionToken<SchedulerMessages>('SCHEDULER_MESSAGES', {
  factory: () => DEFAULT_SCHEDULER_MESSAGES,
});

/** Override some or all scheduler UI strings (e.g. for localization). */
export function provideSchedulerI18n(messages: Partial<SchedulerMessages>): Provider {
  return {
    provide: SCHEDULER_MESSAGES,
    useValue: { ...DEFAULT_SCHEDULER_MESSAGES, ...messages },
  };
}

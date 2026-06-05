// views/view-factories.ts — tree-shakeable view factories. Replaces EJ2 `<e-view>` + service injection.
// Importing only `weekView` must NOT pull in other views' renderers.

import { ViewDescriptor, SchedulerViewType } from '../core/models';

type Opts = Partial<Omit<ViewDescriptor, 'type'>>;
const make = (type: SchedulerViewType) => (opts: Opts = {}): ViewDescriptor => ({ type, ...opts });

export const dayView = make('day');
export const weekView = make('week');
export const workWeekView = make('workWeek');
export const monthView = make('month');
export const yearView = make('year');
export const agendaView = make('agenda');
export const monthAgendaView = make('monthAgenda');
export const timelineDayView = make('timelineDay');
export const timelineWeekView = make('timelineWeek');
export const timelineWorkWeekView = make('timelineWorkWeek');
export const timelineMonthView = make('timelineMonth');
export const timelineYearView = make('timelineYear');

/** Which layout engine renders a given view (see plan §6.5). */
export function engineFor(type: SchedulerViewType): 'verticalTime' | 'horizontalTime' | 'calendar' {
  switch (type) {
    case 'day': case 'week': case 'workWeek':
      return 'verticalTime';
    case 'timelineDay': case 'timelineWeek': case 'timelineWorkWeek':
    case 'timelineMonth': case 'timelineYear':
      return 'horizontalTime';
    default:
      return 'calendar'; // month, year, agenda, monthAgenda
  }
}

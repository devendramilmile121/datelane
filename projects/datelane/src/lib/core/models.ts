// core/models.ts — public, framework-agnostic models. No date library, no `any` in public types.

/** The 12 supported view types. */
export type SchedulerViewType =
  | 'day' | 'week' | 'workWeek' | 'month' | 'year'
  | 'agenda' | 'monthAgenda'
  | 'timelineDay' | 'timelineWeek' | 'timelineWorkWeek'
  | 'timelineMonth' | 'timelineYear';

/** Layout strategy each view maps onto (all 12 views use one of these three). */
export type LayoutEngine = 'verticalTime' | 'horizontalTime' | 'calendar';

export interface TimeScaleConfig {
  enabled: boolean;
  /** Number of minor slots per major interval. */
  slotCount: number;
}

export type HeaderRowUnit = 'year' | 'month' | 'week' | 'date' | 'hour';
export interface HeaderRow { unit: HeaderRowUnit; format?: string; }

export interface GroupingConfig {
  resources: string[];           // resource `name`s, outer→inner = hierarchy
  byDate?: boolean;
  allowGroupEdit?: boolean;
}

/**
 * A typed view configuration. Replaces EJ2's `<e-view>` tags.
 * Only options applicable to the given `type` are honored (see plan §2.3).
 */
export interface ViewDescriptor {
  type: SchedulerViewType;
  displayName?: string;
  /** Marks this as the initial active view (equivalent of EJ2 isSelected). */
  isDefault?: boolean;
  interval?: number;
  dateFormat?: string;
  readonly?: boolean;
  showWeekend?: boolean;
  showWeekNumber?: boolean;
  workDays?: number[];           // 0=Sun … 6=Sat
  firstDayOfWeek?: number;
  startHour?: string;            // "HH:mm"
  endHour?: string;              // "HH:mm"
  timeScale?: TimeScaleConfig;
  orientation?: 'horizontal' | 'vertical';
  headerRows?: HeaderRow[];
  allowVirtualScrolling?: boolean;
  grouping?: GroupingConfig;
}

/** Maps the consumer's raw record fields to the canonical event shape. */
export interface FieldMap {
  id: string;
  subject: string;
  start: string;
  end: string;
  isAllDay?: string;
  recurrenceRule?: string;       // RFC 5545 RRULE
  recurrenceExceptions?: string; // EXDATE list
  resource?: string | string[];
  color?: string;
  location?: string;
  description?: string;
}

/** Canonical, normalized event used internally. `D` is the adapter's date type. */
export interface SchedulerEvent<D = unknown> {
  id: string | number;
  subject: string;
  start: D;
  end: D;
  isAllDay: boolean;
  recurrenceRule?: string;       // RFC 5545 RRULE
  recurrenceExceptions?: string; // EXDATE list (comma/newline separated)
  resourceIds?: Array<string | number>;
  color?: string;
  /** Set on expanded recurrence occurrences: the original series event id. */
  seriesId?: string | number;
  /** Set on expanded occurrences: start of the original (non-overridden) slot, for EXDATE/override matching. */
  recurrenceId?: D;
  raw: Record<string, unknown>;  // original record, for round-tripping
}

export interface ResourceDefinition {
  field: string;
  title: string;
  name: string;
  dataSource: ReadonlyArray<Record<string, unknown>>;
  allowMultiple?: boolean;
  textField: string;
  idField: string;
  colorField?: string;
}

/** CRUD + navigation event payloads emitted by the component. */
export interface SchedulerChange<D = unknown> {
  event: SchedulerEvent<D>;
  scope?: 'occurrence' | 'following' | 'series';
}
export interface NavigateEvent<D = unknown> {
  date: D;
  view: SchedulerViewType;
  action: 'prev' | 'next' | 'today' | 'date';
}

// engine/normalize-events.ts
// Pure: convert consumer raw records → canonical SchedulerEvent via a FieldMap.
// Dates are produced through the adapter (adapter.parse handles Date | string | number).

import { DateAdapter } from '../date-adapter/date-adapter';
import { FieldMap, SchedulerEvent } from '../core/models';

export function normalizeEvents<D>(
  raw: ReadonlyArray<Record<string, unknown>>,
  fieldMap: FieldMap,
  adapter: DateAdapter<D>,
): SchedulerEvent<D>[] {
  return raw.map((rec) => {
    const resourceIds = resolveResource(rec, fieldMap.resource);
    return {
      id: (rec[fieldMap.id] as string | number) ?? '',
      subject: String(rec[fieldMap.subject] ?? ''),
      start: adapter.parse(rec[fieldMap.start]),
      end: adapter.parse(rec[fieldMap.end]),
      isAllDay: fieldMap.isAllDay ? Boolean(rec[fieldMap.isAllDay]) : false,
      recurrenceRule: fieldMap.recurrenceRule ? (rec[fieldMap.recurrenceRule] as string) : undefined,
      resourceIds,
      color: fieldMap.color ? (rec[fieldMap.color] as string) : undefined,
      raw: rec,
    };
  });
}

function resolveResource(
  rec: Record<string, unknown>,
  field: string | string[] | undefined,
): Array<string | number> | undefined {
  if (!field) return undefined;
  const fields = Array.isArray(field) ? field : [field];
  const ids = fields
    .map((f) => rec[f])
    .filter((v) => v != null)
    .flatMap((v) => (Array.isArray(v) ? v : [v])) as Array<string | number>;
  return ids.length ? ids : undefined;
}

// engine/normalize-events.spec.ts — pure mapping tests.

import { NativeDateAdapter } from '../date-adapter/native-date-adapter';
import { FieldMap } from '../core/models';
import { normalizeEvents } from './normalize-events';

const adapter = new NativeDateAdapter('en-US');

const fullMap: FieldMap = {
  id: 'Id', subject: 'Subject', start: 'Start', end: 'End',
  isAllDay: 'AllDay', recurrenceRule: 'RRule', resource: 'OwnerId', color: 'Color',
};

describe('normalizeEvents', () => {
  it('maps raw records to canonical events via the field map', () => {
    const start = new Date(2026, 5, 7, 9, 0);
    const end = new Date(2026, 5, 7, 10, 0);
    const [e] = normalizeEvents(
      [{ Id: 7, Subject: 'Demo', Start: start, End: end, AllDay: true, RRule: 'FREQ=DAILY', OwnerId: 3, Color: '#f00' }],
      fullMap, adapter);

    expect(e.id).toBe(7);
    expect(e.subject).toBe('Demo');
    expect(adapter.isSameDay(e.start, start)).toBe(true);
    expect(adapter.isSameDay(e.end, end)).toBe(true);
    expect(e.isAllDay).toBe(true);
    expect(e.recurrenceRule).toBe('FREQ=DAILY');
    expect(e.resourceIds).toEqual([3]);
    expect(e.color).toBe('#f00');
    expect(e.raw['Subject']).toBe('Demo');
  });

  it('applies safe defaults when optional fields are absent', () => {
    const min: FieldMap = { id: 'Id', subject: 'Subject', start: 'Start', end: 'End' };
    const [e] = normalizeEvents([{ Start: new Date(2026, 0, 1), End: new Date(2026, 0, 1) }], min, adapter);

    expect(e.id).toBe('');
    expect(e.subject).toBe('');
    expect(e.isAllDay).toBe(false);
    expect(e.recurrenceRule).toBeUndefined();
    expect(e.resourceIds).toBeUndefined();
    expect(e.color).toBeUndefined();
  });

  it('collects multiple resource fields and flattens array values', () => {
    const map: FieldMap = { id: 'Id', subject: 'S', start: 'A', end: 'B', resource: ['R1', 'R2'] };
    const [e] = normalizeEvents(
      [{ Id: 1, A: new Date(2026, 0, 1), B: new Date(2026, 0, 1), R1: [10, 11], R2: 12 }], map, adapter);
    expect(e.resourceIds).toEqual([10, 11, 12]);
  });

  it('returns undefined resourceIds when the resource field holds no values', () => {
    const map: FieldMap = { id: 'Id', subject: 'S', start: 'A', end: 'B', resource: 'R' };
    const [e] = normalizeEvents([{ Id: 1, A: new Date(2026, 0, 1), B: new Date(2026, 0, 1), R: null }], map, adapter);
    expect(e.resourceIds).toBeUndefined();
  });

  it('maps an empty input array to an empty result', () => {
    expect(normalizeEvents([], fullMap, adapter)).toEqual([]);
  });
});

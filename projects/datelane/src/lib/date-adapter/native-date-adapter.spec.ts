// Shared adapter parity matrix. Run the SAME assertions against Native/Luxon/Moment.
// This file tests Native; luxon/moment specs import `runAdapterParitySuite` with their adapter.
import { NativeDateAdapter } from './native-date-adapter';
import { DateAdapter } from './date-adapter';

export function runAdapterParitySuite(makeAdapter: () => DateAdapter<any>, label: string) {
  describe(`DateAdapter parity — ${label}`, () => {
    let a: DateAdapter<any>;
    const d = (y: number, m: number, day: number, h = 0, min = 0) =>
      a.fromNative(new Date(y, m, day, h, min));

    beforeEach(() => (a = makeAdapter()));

    it('startOfWeek respects firstDayOfWeek=1 (Mon)', () => {
      const wed = d(2025, 4, 14);            // Wed 14 May 2025
      const mon = a.startOfWeek(wed, 1);
      expect(a.getDate(mon)).toBe(12);
      expect(a.getDayOfWeek(mon)).toBe(1);
    });

    it('diffDays handles a DST spring-forward boundary', () => {
      const before = d(2025, 2, 9);          // around US DST change
      const after = a.addDays(before, 1);
      expect(a.diffDays(before, after)).toBe(1);
    });

    it('addMonths clamps month-end correctly', () => {
      const jan31 = d(2025, 0, 31);
      const feb = a.addMonths(jan31, 1);
      expect(a.getMonth(feb)).toBe(1);
    });

    it('day names start on Sunday', () => {
      expect(a.getDayNames('short')[0].toLowerCase()).toContain('s'); // Sun
      expect(a.getDayNames('long').length).toBe(7);
    });
  });
}

runAdapterParitySuite(() => new NativeDateAdapter('en-US'), 'Native');

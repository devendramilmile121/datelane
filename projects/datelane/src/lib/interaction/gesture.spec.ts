// interaction/gesture.spec.ts
// Pure-function tests for the shared pointer-gesture math. No Angular, no DOM.

import {
  DRAG_THRESHOLD_PX, clamp, crossedDragThreshold,
  snapMinutesFromDeltaY, columnFromDeltaX, cellIndexFromOffset,
} from './gesture';

describe('clamp', () => {
  it('returns the value when inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamps to the bounds', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
  it('handles inclusive edges', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('crossedDragThreshold', () => {
  it('is false below the default threshold', () => {
    expect(crossedDragThreshold(2, 2)).toBe(false); // hypot ≈ 2.83 < 4
  });
  it('is true at/above the default threshold', () => {
    expect(crossedDragThreshold(DRAG_THRESHOLD_PX, 0)).toBe(true);
    expect(crossedDragThreshold(3, 3)).toBe(true); // hypot ≈ 4.24 ≥ 4
  });
  it('honours a custom threshold', () => {
    expect(crossedDragThreshold(5, 0, 8)).toBe(false);
    expect(crossedDragThreshold(8, 0, 8)).toBe(true);
  });
  it('measures distance in both axes', () => {
    expect(crossedDragThreshold(0, -5)).toBe(true);
  });
});

describe('snapMinutesFromDeltaY', () => {
  const SLOT = 48; // px per hour
  it('returns 0 for no movement', () => {
    expect(snapMinutesFromDeltaY(0, SLOT, 15)).toBe(0);
  });
  it('snaps a one-hour drag to 60 minutes', () => {
    expect(snapMinutesFromDeltaY(SLOT, SLOT, 15)).toBe(60);
  });
  it('rounds to the nearest snap increment', () => {
    // 10px of 48px/hr ≈ 12.5 min → snaps to 15.
    expect(snapMinutesFromDeltaY(10, SLOT, 15)).toBe(15);
    // 4px ≈ 5 min → snaps to 0.
    expect(snapMinutesFromDeltaY(4, SLOT, 15)).toBe(0);
  });
  it('snaps negative (upward) drags', () => {
    expect(snapMinutesFromDeltaY(-SLOT / 2, SLOT, 15)).toBe(-30);
  });
  it('respects a 30-minute granularity', () => {
    expect(snapMinutesFromDeltaY(SLOT * 0.6, SLOT, 30)).toBe(30);
  });
});

describe('columnFromDeltaX', () => {
  const COL = 100; // px per column
  it('keeps the column when not dragged past half a column', () => {
    expect(columnFromDeltaX(40, COL, 2, 7)).toBe(2);
  });
  it('advances one column past the halfway point', () => {
    expect(columnFromDeltaX(60, COL, 2, 7)).toBe(3);
  });
  it('moves backwards on negative drag', () => {
    expect(columnFromDeltaX(-160, COL, 3, 7)).toBe(1); // -1.6 cols → round to -2
  });
  it('clamps to the first and last column', () => {
    expect(columnFromDeltaX(-9999, COL, 3, 7)).toBe(0);
    expect(columnFromDeltaX(9999, COL, 3, 7)).toBe(6);
  });
});

describe('cellIndexFromOffset', () => {
  it('floors the offset into a cell index', () => {
    expect(cellIndexFromOffset(0, 50, 7)).toBe(0);
    expect(cellIndexFromOffset(49, 50, 7)).toBe(0);
    expect(cellIndexFromOffset(50, 50, 7)).toBe(1);
    expect(cellIndexFromOffset(120, 50, 7)).toBe(2);
  });
  it('clamps a negative offset to 0', () => {
    expect(cellIndexFromOffset(-10, 50, 7)).toBe(0);
  });
  it('clamps an overshoot to the last cell', () => {
    expect(cellIndexFromOffset(9999, 50, 7)).toBe(6);
  });
});

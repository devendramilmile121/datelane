// interaction/gesture.ts
// Framework-free pure helpers for pointer drag-to-move / resize gestures, shared by the
// time-grid and month-grid view renderers. No Angular, no DOM, no DateAdapter — callers
// translate these primitive results into adapter date math. Unit-testable in isolation.

/** The three drag gestures every draggable/resizable view supports. */
export type GestureMode = 'move' | 'resize-start' | 'resize-end';

/** Pixels the pointer must travel before a press becomes a drag (vs a click). */
export const DRAG_THRESHOLD_PX = 4;

/** Clamp `n` into the inclusive `[lo, hi]` range. */
export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

/** True once the pointer has moved far enough from its origin to count as a drag. */
export function crossedDragThreshold(dx: number, dy: number, threshold = DRAG_THRESHOLD_PX): boolean {
  return Math.hypot(dx, dy) >= threshold;
}

/**
 * Vertical drag distance → snapped minute offset.
 * `slotHeightPx` is the pixel height of one hour row; `snapMinutes` the grid granularity.
 */
export function snapMinutesFromDeltaY(dy: number, slotHeightPx: number, snapMinutes: number): number {
  return Math.round((dy / slotHeightPx) * 60 / snapMinutes) * snapMinutes;
}

/**
 * Horizontal drag distance → target column index, clamped to `[0, colCount - 1]`.
 * `currentCol` is the column the gesture began in; `colWidthPx` one column's width.
 */
export function columnFromDeltaX(dx: number, colWidthPx: number, currentCol: number, colCount: number): number {
  return clamp(currentCol + Math.round(dx / colWidthPx), 0, colCount - 1);
}

/**
 * Pointer offset inside a uniform grid → cell index, clamped to `[0, count - 1]`.
 * Used by the month grid to map a pointer position onto a rendered row / column.
 */
export function cellIndexFromOffset(offsetPx: number, cellSizePx: number, count: number): number {
  return clamp(Math.floor(offsetPx / cellSizePx), 0, count - 1);
}

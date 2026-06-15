---
description: UX, interaction, accessibility, and responsive rules for scheduler views/components.
globs:
  - projects/datelane/src/lib/views/**
  - projects/datelane/src/lib/scheduler/**
  - projects/datelane/src/lib/interaction/**
  - projects/datelane/src/lib/editor/**
alwaysApply: true
---

# UX & accessibility rules

The default look is **calm, dense, professional**. Refined minimalism, not decoration. Full design
contract: `DESIGN-SYSTEM.md`. These are the enforced behaviours.

## Accessibility (non-negotiable, from the first PR)

- Correct roles: grid/row/gridcell/columnheader for grids; `button` for activatable events;
  `dialog` for popovers/quick-view.
- Every interactive element is keyboard-operable. A `(click)` handler **must** be paired with a
  keyboard path (`(keydown.enter)`, `(keydown.space)`) and be focusable (`tabindex`).
- Visible focus via `--dl-focus-ring`; never remove outlines without a replacement.
- AA contrast (4.5:1) for all text/background token pairs.
- Non-color encoding: never rely on color alone (use dots/labels/icons too).
- Touch targets ≥ 44px (`--dl-slot-h`).
- Respect `prefers-reduced-motion` — gate all transitions.
- Live-region announcements for navigation / CRUD / selection where practical.

## Interaction spec

- **Empty cell/slot click** → emit `cellClick` (host opens its own create form). No built-in editor.
- **Event click** → always emit `eventClick`; open the built-in quick-view unless
  `[showQuickView]="false"` or a `ngsQuickViewTemplate` override is projected.
- **Quick-view** is read-only detail + Edit/Delete that forward to `eventEdit`/`eventDelete`.
  The library never ships a form — the host owns create/edit.
- **Drag-move / resize** (where supported): 4px threshold, snap to grid, live preview, `Esc` reverts,
  emit `eventChange` on drop (controlled — never mutate input data).
- **`+N more`** → focusable popover of hidden events.
- **Auto-scroll** to the first event on first render + on period change only — never on event/CD
  churn (gate by a period key). Configurable via `[autoScroll]`/`[scrollHour]`.

## Controlled-component contract

Views and the shell **never mutate** `[events]`. They emit a clone with the proposed change; the
host applies it and feeds it back via `[events]`.

## Responsive & RTL

- Container-query driven. Narrow viewports: collapse the view switcher to a menu; horizontal scroll
  for week/timeline; bottom-sheet editor on mobile.
- Built entirely with CSS logical properties so `dir="rtl"` mirrors with no extra code.

## States to style (every view)

default · hover · focus(keyboard) · selected · today · weekend/non-working · disabled/readonly ·
drag-active · resize-active · loading(skeleton) · empty. Don't ship a view until all are handled.

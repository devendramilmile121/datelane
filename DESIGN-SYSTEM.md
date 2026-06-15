# Design System & UX — `@datelane/core`

The default look is **calm, dense, and professional** — a productivity tool you stare at all day.
Refined minimalism, not decoration. Everything here is expressed as **tokens** so any consuming app
can re-skin the scheduler by overriding CSS custom properties — no fork, no `::ng-deep`.

> Implementation: tokens live in `src/lib/styles/_tokens.scss` as CSS custom properties on the
> component host (`.dl-scheduler`). `_theme.scss` maps tokens to light/dark. Components read tokens
> only — never literal values.

---

## 1. Theming model

```
_tokens.scss      → declares every --dl-* custom property (the contract)
_theme.scss       → light (default) + [data-dl-theme="dark"] overrides
scheduler.scss    → component styles that consume tokens only
```

Consumers customize by overriding properties anywhere up the cascade:

```css
.dl-scheduler {
  --dl-accent: #2563eb;
  --dl-radius-md: 10px;
  --dl-font-sans: "Söhne", system-ui, sans-serif;
}
```

No tokens are hard-coded in components, so this is the *entire* customization surface for color,
type, spacing, radius, elevation, and motion.

---

## 2. Token reference

### Color (semantic, not raw)
| Token | Purpose |
|-------|---------|
| `--dl-bg` / `--dl-bg-subtle` | surface / sunken surface (gridlines area, off-range cells) |
| `--dl-surface` / `--dl-surface-raised` | cards, popovers, editor |
| `--dl-text` / `--dl-text-muted` / `--dl-text-faint` | primary / secondary / disabled text |
| `--dl-border` / `--dl-border-strong` | gridlines / emphasized dividers |
| `--dl-accent` / `--dl-accent-contrast` | primary actions, selection, today marker |
| `--dl-accent-soft` | selection background, hover wash (accent at low alpha) |
| `--dl-today` | today highlight |
| `--dl-weekend` | weekend / non-working cell wash |
| `--dl-now-line` | current-time indicator |
| `--dl-focus-ring` | keyboard focus outline |
| `--dl-danger` / `--dl-success` / `--dl-warning` | delete, confirm, conflict states |
| `--dl-event-default-bg` / `--dl-event-default-text` | fallback event colors (resource color overrides) |

> Default palette is neutral slate + a single accent. Dark theme flips surfaces and lowers chroma.
> All text/background pairs must clear **WCAG AA (4.5:1)**; verify in CI with a contrast test.

### Typography
| Token | Default |
|-------|---------|
| `--dl-font-sans` | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` (no bundled font → lightweight) |
| `--dl-font-num` | tabular-figure stack for time labels (`"SF Mono", ui-monospace…` optional) |
| `--dl-fs-xs … --dl-fs-xl` | 11 / 12 / 13 / 15 / 18px scale |
| `--dl-fw-regular/medium/semibold` | 400 / 500 / 600 |
| `--dl-lh-tight/normal` | 1.2 / 1.45 |

> The library ships **no font files** (lightweight). Recommended distinctive pairings for docs/demo
> only: *Geist* or *Söhne* for UI, *IBM Plex Mono* for time labels. Apps set `--dl-font-sans`.

### Spacing — 4px base scale
`--dl-space-0:0` `1:2px` `2:4px` `3:8px` `4:12px` `5:16px` `6:20px` `7:24px` `8:32px` `9:48px`.
Every margin/padding/gap uses these. Time-slot height: `--dl-slot-h` (default 44px → AA touch).

### Radius / Elevation
`--dl-radius-sm/md/lg`: 4 / 6 / 10px. `--dl-radius-pill`: 999px.
Shadows are soft and few: `--dl-shadow-1` (cards), `--dl-shadow-2` (popover/editor),
`--dl-shadow-pop` (drag ghost). No neon glows.

### Motion
`--dl-dur-fast:120ms` `--dl-dur:180ms` `--dl-dur-slow:240ms`;
`--dl-ease:cubic-bezier(.2,.8,.2,1)`. All transitions gated by `prefers-reduced-motion`.

### Z-index scale
`--dl-z-grid:0` `--dl-z-event:10` `--dl-z-nowline:20` `--dl-z-allday:30`
`--dl-z-header:40` `--dl-z-popover:1000` `--dl-z-editor:1100` `--dl-z-drag:1200`.

### Breakpoints (for container queries / responsive)
`--dl-bp-sm:640px` `--dl-bp-md:960px` `--dl-bp-lg:1280px`.

---

## 3. Layout anatomy (what good looks like)

```
┌───────────────────────────────────────────────────────────┐
│ Header:  [‹ Today ›]   "12–18 May 2025" ▼     [Day|Week|…] │  ← view switcher, active highlighted
├───────────────────────────────────────────────────────────┤
│ all-day row (expand/collapse)            ▸ 2 more          │
├──────┬────────────────────────────────────────────────────┤
│ time │  Mon   Tue   Wed   Thu   Fri   Sat   Sun            │  ← date header (today emphasized)
│ 9 AM │       ┌─────┐                                       │
│      │       │event│  ← rounded, resource-colored, 2-line  │
│ 10   │       └─────┘                                       │
│ ─────┼ ─ ─ ─ ─ ─ ─ ─ ─ now-line ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
└──────┴────────────────────────────────────────────────────┘
```

Principles:
- **Today** always unmistakable (accent date chip + faint column wash). **Now-line** in time views.
- **Weekends / non-working** cells use `--dl-weekend` wash, not hidden (unless configured).
- **Events**: `--dl-radius-md`, 2px left accent bar in the resource color, subject (1 line, ellipsis)
  + time in `--dl-text-muted`; min height = one slot; `+ more` when overflowing.
- **Density**: comfortable default; expose `--dl-slot-h` and `--dl-density` for compact mode.
- **Gridlines** subtle (`--dl-border`); hour lines slightly stronger than half-hour.

---

## 4. Interaction spec (summary — full rules in `.claude/rules/ux-rules.md`)
- Click empty cell → quick-create popover at the pointer; Enter/`+` opens full editor.
- Click event → quick view popover; edit/delete actions; Enter opens editor.
- Drag move: 4px threshold, snap to grid, ghost with `--dl-shadow-pop`, Esc reverts.
- Resize: edge handles, snap to slot, live duration tooltip.
- `+ more` → focusable popover of hidden events.
- All transitions ≤ `--dl-dur-slow`; disabled under reduced motion.

## 5. Accessibility baseline (non-negotiable)
- `role="grid"` semantics, roving tabindex, full keyboard model, focus trap+restore, AA contrast,
  live-region announcements, non-color encoding, ≥44px touch targets, reduced-motion support.
- Locked in by `jest-axe`/`axe-core` tests and the `a11y-auditor` subagent.

## 6. Responsive & RTL
- Container-query driven. Narrow: view switcher → menu; horizontal scroll for week/timeline; swipe to
  navigate; bottom-sheet editor on mobile.
- Built entirely with CSS **logical properties**; `dir="rtl"` mirrors the layout with no extra code.

## 7. States to design for every view
Default · hover · focus(keyboard) · selected · today · weekend/non-working · disabled/readonly ·
drag-active · resize-active · loading(skeleton) · empty.
Don't ship a view until all 11 states are styled.

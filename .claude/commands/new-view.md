---
description: Scaffold a new scheduler view (factory + engine wiring + tests + docs + checklist).
argument-hint: <ViewName> [engine: verticalTime|horizontalTime|calendar]
allowed-tools: Read, Edit, Write, Grep, Glob, Bash(npm run *)
---

Scaffold a new view named **$1** for `@datelane/core`, mapping it onto an existing layout engine
(`$2` if given; otherwise pick the closest of vertical-time / horizontal-time / calendar and say why).

Follow the existing patterns exactly — read these first:
- `projects/datelane/src/lib/views/view-factories.ts` (factory + `engineFor`)
- a sibling view that uses the target engine (e.g. `agenda-view.component.ts`,
  `timeline-view.component.ts`, `year-view.component.ts`)
- the matching engine in `projects/datelane/src/lib/engine/`
- `.claude/rules/library-rules.md` and `.claude/rules/ux-rules.md`

Then:
1. Add the `SchedulerViewType` to `core/models.ts` if it's genuinely new, and a factory in
   `view-factories.ts` (+ `engineFor` mapping). Keep it tree-shakeable.
2. If a new engine is required, add a **pure, framework-free** function in `engine/` with a `.spec.ts`.
   Reuse an existing engine if at all possible.
3. Create `views/<name>-view.component.ts` (standalone, OnPush, `ViewEncapsulation.None`,
   adapter via `@Inject(SCHEDULER_DATE_ADAPTER)`). Emit `eventActivate`/`dayNavigate`/`cellActivate`
   as appropriate — controlled, never mutate inputs.
4. Wire it into `scheduler/scheduler.component.ts` (routing + bindings) and export from
   `public-api.ts`.
5. Add styles under `.dl-<abbr>` in `styles/scheduler.scss` — tokens only, logical properties.
6. Honor `ux-rules.md`: roles, keyboard, focus, auto-scroll if it scrolls.
7. Flip the matching checkbox in `scheduler-plan.md` §2.1.
8. Run the gate: `npm run lint && npm run typecheck && npm test && npm run build`. Report results.

Do not invent APIs — match the conventions already in the codebase.

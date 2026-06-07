# AGENTS.md — `@datelane/core`

Cross-tool instructions for AI coding agents (Cursor, Copilot, Codex, Claude Code, …).
**Claude Code** also auto-loads `CLAUDE.md`; this file is the tool-neutral entry point and points to
the same canonical rules so every agent works under the same constraints.

## Read these first (canonical, in order)

1. `CLAUDE.md` — project memory: what this is, non-negotiables, architecture, commands.
2. `.claude/rules/library-rules.md` — engineering rules for `projects/datelane/**`.
3. `.claude/rules/ux-rules.md` — UX / accessibility / interaction rules.
4. `scheduler-plan.md` — full feature spec, roadmap, and the §2 feature checklist (source of truth).
5. `DESIGN-SYSTEM.md` — design tokens and UX contract.

## The five rules you must never break

1. **No hard runtime deps in core** — `@angular/*` peers only; `luxon`/`moment` are optional peers
   used only from their secondary entry points. Never import them from `src/lib/**`.
2. **All dates through `DateAdapter`** — no `new Date()` / date math in `engine|views|scheduler|interaction`.
3. **Partial-Ivy, floor 17** — keep `compilationMode: "partial"`; no `@let`/`@defer`/signal-`input()`
   (they raise the Angular floor above 18). Verify with `scripts/verify-angular.sh`.
4. **Controlled** — never mutate `[events]`; emit a change and let the host apply it.
5. **Tokens + logical properties only** in CSS (no literal colors/sizes, no `left`/`top`).

## Workflow

- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm start` (demo).
- Gate before finishing: `npm run lint && npm run typecheck && npm test && npm run build`.
- Conventional Commits. One feature per PR. Flip the matching `scheduler-plan.md` §2 checkbox.
- Date changes need DST + first-day-of-week tests.

## Claude Code extras (ignored by other tools)

- Slash commands: `/new-view`, `/new-adapter`, `/feature-check`, `/release-check` (`.claude/commands/`).
- Subagent: `a11y-auditor` (`.claude/agents/`) — run it after any view/interaction change.
- MCP: Angular CLI server in `.mcp.json` for current-Angular guidance + `ng` tooling.

## Supported Angular

18–22 (verified by AOT build in CI). Peer range `>=18.0.0 <23.0.0`. Don't use APIs newer than the
floor without a version guard.

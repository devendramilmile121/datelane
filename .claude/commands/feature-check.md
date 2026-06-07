---
description: Audit scheduler-plan.md §2 against the codebase; report missing / partial features.
allowed-tools: Read, Grep, Glob, Bash
---

Audit the feature inventory in `scheduler-plan.md` §2 (§2.1 views, §2.2 component config,
§2.3 per-view options, §2.4 behavioural, §2.5 extras) against what is **actually implemented** in
`projects/datelane/src/lib/**`.

For each checklist row:
- Verify the claim by reading the relevant source (don't trust the checkbox — confirm in code).
- Classify as ✅ done / 🟡 partial / ⬜ missing, with a one-line `file:line` justification.

Output:
1. A compact table per sub-section (§2.1–§2.5): feature · status · evidence (`file:line`) · gap.
2. A short "checkbox drift" list — rows whose ☑/☐ in `scheduler-plan.md` disagrees with reality.
3. The top 5 highest-leverage missing items to tackle next, with the engine/view they belong to.

Read-only. Do not change code or flip checkboxes — just report. Be skeptical and precise.

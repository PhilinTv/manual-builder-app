---
name: implement-epic
description: Full epic delivery orchestrator. Drives the TDD workflow — writes tests, implements spec tasks, verifies all ACs pass, fixes gaps in a loop. Produces a final delivery report.
argument-hint: "<path to spec file, e.g. docs/epic-9_spec.md>"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent, AskUserQuestion
---

# Epic Implementation Orchestrator

You are a staff engineer delivering a complete epic. You follow a strict TDD workflow: write failing tests first, implement until tests pass, verify full coverage, fix gaps, and run final quality gates. You work methodically through spec tasks, checking in with the user at key decision points.

## Project Context

This is a **Turborepo + pnpm monorepo**:
```
apps/
  web/          # Next.js 14+ App Router (src/ directory)
packages/
  db/           # Prisma schema + client
```

- **Package manager:** pnpm
- **Unit/Integration:** Vitest (`apps/web/tests/unit/`, `apps/web/tests/integration/`)
- **E2E:** Playwright (`apps/web/tests/e2e/`)
- **DB:** PostgreSQL + Prisma ORM (`packages/db/prisma/schema.prisma`)
- **Auth:** NextAuth.js v5
- **UI:** shadcn/ui (Radix + Tailwind)

## Input

`$ARGUMENTS` is a path to a spec file (e.g., `docs/epic-9_spec.md`).

If empty, ask the user for the spec file path.

---

## Phase 0 — Understand the Spec

1. Read the entire spec file.
2. Extract and summarize:
   - **Goal** (Section 1)
   - **Dependencies** (Section 2) — verify they are met
   - **Implementation Tasks** (Section 4) — the ordered task list
   - **Acceptance Criteria** (Section 7) — the success definition
   - **Test Plan** (Section 8) — test file structure
3. Check dependencies: read referenced files/services to confirm prerequisite epics are implemented.
4. If dependencies are NOT met, report which are missing and ask the user how to proceed.

Present a brief implementation plan to the user:

```
## Implementation Plan — <Epic Name>

**Tasks:** N implementation tasks
**ACs:** N acceptance criteria (X e2e, Y unit, Z integration)
**Estimated test files:** <list>

### Execution Order:
1. Phase 1: Write failing tests (TDD red)
2. Phase 2: Implement tasks 4.1 through 4.N
3. Phase 3: Verify all ACs pass
4. Phase 4: Fix gaps (if any)
5. Phase 5: Quality gates (architecture + UX)

Proceed?
```

Wait for user confirmation before starting.

---

## Phase 1 — TDD Red Phase (Write Tests)

Generate all test files before writing any production code.

### Process:

1. Parse Section 7 (ACs) and Section 8 (Test Plan) from the spec.
2. Group ACs by test type and target test file.
3. Check which test files already exist and which ACs are already covered.
4. Use **parallel Agent subagents** to generate test files — one agent per test file:
   - Each agent reads the spec, existing test helpers, and relevant source stubs
   - Each agent writes tests with `AC-N:` prefixed test names
   - Each agent merges into existing files (never overwrites)

### Rules:
- Every AC MUST have a test tagged with its AC-ID in the test name
- Follow existing test patterns (read helpers, existing tests for conventions)
- E2E tests use `data-testid` selectors from the spec
- Integration tests use real Prisma client (no mocks)
- Unit tests are pure — no external dependencies

### Verify Red Phase:

Run all tests to confirm they fail on assertions (not syntax errors):

```bash
# Unit + Integration
cd apps/web && pnpm vitest run --reporter=verbose 2>&1 | tail -30

# E2E
cd apps/web && pnpm playwright test --reporter=list 2>&1 | tail -30
```

If tests error (not fail), fix the test code before proceeding.

Report to user:
```
## TDD Red Phase Complete

- Tests written: N new, M updated
- All new tests confirmed FAILING (red)
- Ready for implementation
```

---

## Phase 2 — Implementation

Work through Section 4 tasks **in order**. For each task:

### 2a. Read the task

Read the task description from the spec. Understand:
- What files to create or modify
- What the expected behavior is
- Which ACs this task addresses

### 2b. Explore current state

Before writing code, read relevant existing files:
- Source files that will be modified
- Related components/services for context
- The Prisma schema if DB changes are involved

### 2c. Implement

Write the production code for this task. Follow these principles:
- **Minimal changes** — only touch what the task requires
- **Match existing patterns** — read similar files for conventions
- **Use existing utilities** — don't reinvent (check `src/lib/`, `src/components/ui/`)
- **Add `data-testid` attributes** as specified in the spec ACs
- **Handle errors** at system boundaries (API routes, user input)

### 2d. Incremental test check

After implementing each task, run the subset of tests relevant to that task:

```bash
# Run specific test file
cd apps/web && pnpm vitest run tests/unit/<relevant>.test.ts --reporter=verbose 2>&1 | tail -20

# Or specific E2E test
cd apps/web && pnpm playwright test tests/e2e/<relevant>.spec.ts --reporter=list 2>&1 | tail -20
```

Report progress:
```
## Task 4.X Complete — <task title>

- Files changed: <list>
- Tests now passing: AC-1, AC-3, AC-5
- Tests still failing: AC-2 (expected — depends on Task 4.Y)
```

### 2e. Course correct

If a test fails unexpectedly after implementation:
1. Read the error message carefully
2. Check if the test or the implementation has the bug
3. Fix the root cause (prefer fixing implementation over adjusting tests)
4. If the spec's AC is ambiguous, ask the user for clarification

If implementation gets complex or deviates from the spec, **STOP and re-plan** — do not push through.

---

## Phase 3 — Full Verification

After all Section 4 tasks are implemented, run the complete test suite.

### Run all tests in parallel via Agent subagents:

**Agent 1: Vitest**
```bash
cd apps/web && pnpm vitest run --reporter=verbose 2>&1
```

**Agent 2: Playwright**
```bash
cd apps/web && pnpm playwright test --reporter=list 2>&1
```

### Build the AC verification matrix:

Map every test result to its AC. For each AC, determine:
- **PASS:** Test exists and passes
- **FAIL:** Test exists but fails
- **NO TEST:** No test covers this AC (should not happen after Phase 1)

Present the full matrix to the user.

---

## Phase 4 — Gap Fix Loop

If Phase 3 reveals gaps:

### For FAIL results:
1. Read the test error message
2. Identify root cause (implementation bug, missing feature, wrong selector)
3. Fix the implementation
4. Re-run the specific failing test
5. Repeat until it passes

### For NO TEST results (should be rare):
1. Write the missing test
2. Implement if needed
3. Verify it passes

### Loop limit:
- Maximum **3 iterations** of Phase 3 → Phase 4
- If ACs still fail after 3 iterations, report the remaining failures and ask the user for guidance

After each fix iteration, re-run the full suite to check for regressions.

---

## Phase 5 — Quality Gates

Once all ACs pass, run final quality checks via **parallel Agent subagents**:

**Agent 1: Architecture validation**
- Run the equivalent of `/validate-architecture` on the changed files
- Check for: correct file placement, proper server/client component usage, auth patterns, Prisma usage

**Agent 2: UX verification**
- Run the equivalent of `/verify-ux` on the affected pages
- Check for: responsive behavior, accessibility, consistent patterns, empty states

Report results. If either gate flags CRITICAL or HIGH issues, fix them before declaring the epic complete.

---

## Phase 6 — Delivery Report

Print the final delivery report:

```markdown
# Epic Delivery Report

**Spec:** <spec file path>
**Epic:** <epic title>
**Date:** <YYYY-MM-DD>

---

## Summary

| Metric | Value |
|--------|-------|
| Implementation tasks completed | N/N |
| Acceptance criteria passing | N/N |
| Test files created/modified | N |
| Production files created/modified | N |
| Architecture violations | N (severity) |
| UX issues | N (severity) |

**Status:** DELIVERED / DELIVERED WITH CAVEATS / BLOCKED

---

## AC Results

| AC | Criterion (short) | Type | Result |
|----|-------------------|------|--------|
| AC-1 | ... | e2e | PASS |
| AC-2 | ... | unit | PASS |

---

## Files Changed

### Production Code
- `src/components/pdf/export-button.tsx` (new)
- `src/services/pdf/generate.ts` (modified)

### Test Code
- `tests/e2e/pdf-export.spec.ts` (new)
- `tests/unit/pdf-filename.test.ts` (new)

---

## Known Limitations / Follow-ups

- <any caveats, deferred items, or known issues>
```

---

## Important Rules

- **Always write tests before implementation** (Phase 1 before Phase 2)
- **Never skip the verification phase** (Phase 3 is mandatory)
- **Stop and re-plan if stuck** — do not brute-force through failures
- **Ask the user at decision points** — dependency issues, ambiguous ACs, architectural choices
- **Use Agent subagents liberally** — parallel test generation, parallel test running, parallel quality gates
- **Match existing code patterns** — read before writing, always
- **One commit-worthy chunk per task** — keep changes reviewable
- **AC-ID tags in test names are non-negotiable** — this is how verification works

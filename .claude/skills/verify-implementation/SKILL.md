---
name: verify-implementation
description: Full implementation verification. Runs all test types (E2E, unit, integration), maps every result to spec acceptance criteria, identifies gaps (missing tests, failing ACs, untested ACs), and produces a unified pass/fail report.
argument-hint: "<path to spec file, e.g. docs/epic-9_spec.md>"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
---

# Implementation Verifier

You are a senior QA lead performing a comprehensive implementation verification. Your goal is to check that every acceptance criterion in a spec is (a) covered by a test and (b) passing. You run ALL test types, map results to ACs, and produce a gap report.

## Project Context

This is a **Turborepo + pnpm monorepo**:
```
apps/
  web/          # Next.js 14+ App Router (src/ directory)
packages/
  db/           # Prisma schema + client
```

- **Unit/Integration:** Vitest — `apps/web/vitest.config.ts`, tests in `apps/web/tests/unit/` and `apps/web/tests/integration/`
- **E2E:** Playwright — `apps/web/playwright.config.ts`, tests in `apps/web/tests/e2e/`
- **Dev server for E2E:** Auto-started by Playwright config (`pnpm next dev --port 3100`)
- **Package manager:** pnpm (always use `pnpm`, never npm/yarn)

## Input

`$ARGUMENTS` is a path to a spec file (e.g., `docs/epic-9_spec.md`).

If empty, ask the user for the spec file path.

---

## Phase 1 — Parse All ACs

Read the spec and extract every AC from Section 7:

| Field | Source |
|-------|--------|
| AC ID | `#` column |
| Criterion | `Criterion` column (the Given/When/Then) |
| Type | `Type` column (e2e, unit, integration) |
| Expected Test File | `Test` column |

Store as a structured list for cross-referencing.

---

## Phase 2 — Discover Tests

Search for test files that cover this epic's ACs. Use two strategies in parallel:

### Strategy A: Test file names from spec
Read the `Test` column from the AC table to get expected test file names (e.g., `pdf-export.spec.ts`). Search for these files:
```
apps/web/tests/e2e/<name>.spec.ts
apps/web/tests/unit/<name>.test.ts
apps/web/tests/integration/<name>.test.ts
```

### Strategy B: AC-ID pattern search
Search all test files for `AC-\d+` patterns to find tests tagged with AC IDs:
```
grep -r "AC-\d\+" apps/web/tests/ --include="*.ts" -l
```

For each discovered test file, read it and extract:
- Test names (from `test(...)` or `it(...)` calls)
- AC IDs referenced in test names (pattern: `AC-N:`)
- Which AC each test covers

Build the **coverage matrix**:

```
| AC   | Type        | Test File              | Test Name                    | Found |
|------|-------------|------------------------|------------------------------|-------|
| AC-1 | e2e         | tests/e2e/export.spec  | AC-1: button visible         | YES   |
| AC-2 | e2e         | tests/e2e/export.spec  | AC-2: PDF content            | YES   |
| AC-3 | unit        | —                      | —                            | NO    |
```

---

## Phase 3 — Run Tests

Run all test suites in parallel using Agent subagents:

### Agent 1: Unit + Integration (Vitest)

```bash
cd apps/web && pnpm vitest run --reporter=verbose 2>&1
```

Parse output for:
- Total tests, passed, failed, skipped
- Per-test status with test name (to match AC IDs)
- Error messages for failures

### Agent 2: E2E (Playwright)

```bash
cd apps/web && pnpm playwright test --reporter=list 2>&1
```

Parse output for:
- Total tests, passed, failed, skipped
- Per-test status with test name (to match AC IDs)
- Error messages for failures

If Playwright needs browsers installed:
```bash
cd apps/web && pnpm playwright install chromium
```

### Timeout handling
- Vitest: 120s timeout
- Playwright: 300s timeout (E2E tests are slower)
- If either times out, report partial results and note the timeout

---

## Phase 4 — Map Results to ACs

Cross-reference test results with the AC list:

For each AC, determine its status:

| Status | Meaning |
|--------|---------|
| **PASS** | Test exists, found by AC-ID in name, and passed |
| **FAIL** | Test exists, found by AC-ID in name, but failed |
| **NO TEST** | No test found for this AC |
| **SKIP** | Test exists but was skipped |
| **UNTAGGED** | Test likely covers this AC (by file/description match) but lacks `AC-N` tag in name |

Also detect **orphan tests**: tests with `AC-N` tags that don't match any AC in the spec (may indicate stale tests or wrong AC numbering).

---

## Phase 5 — Implementation Check

Beyond test coverage, verify that the implementation exists:

For each AC, check if the referenced code artifact exists:
- **e2e ACs mentioning routes:** Check if the route file exists in `apps/web/src/app/`
- **e2e ACs mentioning components:** Check if the component file exists in `apps/web/src/components/`
- **integration ACs mentioning services:** Check if the service file exists in `apps/web/src/lib/services/`
- **unit ACs mentioning utilities:** Check if the utility file exists in `apps/web/src/lib/`

Use **parallel Grep/Glob** for this — do not read every file.

---

## Phase 6 — Generate Report

Print and save the report to `docs/<epic-basename>_verification.md`.

```markdown
# Implementation Verification Report

**Spec:** <spec file path>
**Date:** <YYYY-MM-DD>
**Epic:** <epic title from spec>

---

## Summary

| Metric | Count |
|--------|-------|
| Total ACs | N |
| Covered by tests | N |
| Tests passing | N |
| Tests failing | N |
| No test (gap) | N |
| Untagged (likely covered) | N |

**Overall:** PASS / FAIL / PARTIAL
- **PASS:** All ACs have tagged tests, all passing
- **PARTIAL:** Some ACs passing, gaps or failures exist
- **FAIL:** Majority of ACs failing or missing tests

---

## Test Execution Results

### Vitest (Unit + Integration)
- **Ran:** N tests
- **Passed:** N | **Failed:** N | **Skipped:** N
- **Duration:** Ns

### Playwright (E2E)
- **Ran:** N tests
- **Passed:** N | **Failed:** N | **Skipped:** N
- **Duration:** Ns

---

## AC Coverage Matrix

| AC | Criterion (short) | Type | Test File | Test Name | Result | Notes |
|----|-------------------|------|-----------|-----------|--------|-------|
| AC-1 | Export button visible | e2e | tests/e2e/export.spec.ts | AC-1: button visible | PASS | |
| AC-2 | PDF contains sections | e2e | tests/e2e/export.spec.ts | AC-2: PDF content | FAIL | Custom warnings missing |
| AC-3 | Filename convention | unit | — | — | NO TEST | Gap: need test |
| AC-4 | Severity icons | e2e | tests/e2e/export.spec.ts | severity icons render | UNTAGGED | Rename to include AC-4 |

---

## Gaps

### Missing Tests (NO TEST)

| AC | Type | Criterion | Suggested Test File | Action Required |
|----|------|-----------|---------------------|-----------------|
| AC-3 | unit | Filename follows convention | tests/unit/pdf-filename.test.ts | Write test |

### Failing Tests (FAIL)

| AC | Test | Error | Suggested Fix |
|----|------|-------|---------------|
| AC-2 | AC-2: PDF content | Expected "Fragile parts" not found | Fix: include `warnings` JSON in Prisma query at `services/pdf/generate.ts:49` |

### Untagged Tests (UNTAGGED)

| AC | Test File | Test Name | Action |
|----|-----------|-----------|--------|
| AC-4 | tests/e2e/export.spec.ts | severity icons render | Rename test to "AC-4: severity icons render" |

### Orphan Tests

| Test | AC Tag | Issue |
|------|--------|-------|
| tests/e2e/old.spec.ts | AC-99 | No AC-99 in spec — stale test? |

---

## Implementation Artifacts Check

| AC | Required Artifact | Exists | Path |
|----|-------------------|--------|------|
| AC-1 | Export button component | YES | src/components/pdf/export-button.tsx |
| AC-3 | Filename utility | NO | src/lib/utils/pdf-filename.ts |

---

## Recommendations

1. **Priority fixes:** <ordered list of what to fix first>
2. **Test tagging:** <list of tests to rename with AC-N prefix>
3. **Missing implementations:** <list of code that needs to be written>

---

## Next Steps

- Fix failing tests and implementation gaps
- Re-run: `/verify-implementation <spec>` to confirm all green
- When all PASS: run `/validate-architecture <spec>` and `/verify-ux <spec>` as final gates
```

---

## Important Rules

- **Never modify production code or test code** — this skill only reads and reports
- **Run tests in parallel** via Agent subagents (Vitest and Playwright simultaneously)
- **AC-ID matching is case-insensitive** — `AC-1`, `ac-1`, `Ac-1` all match
- **Truncate criterion text** in the matrix table to ~60 chars for readability
- **Always save the report file** in addition to printing it
- **If no tests exist at all**, recommend running `/write-tests <spec>` first
- **Parse test output carefully** — Vitest and Playwright have different output formats. Handle both.

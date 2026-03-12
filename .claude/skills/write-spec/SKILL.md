---
name: write-spec
description: Writes a structured, implementation-ready spec from a completed brainstorming file or any feature/requirements document. Produces concise specs with automatable acceptance criteria verified by Playwright tests.
argument-hint: <path_to_brainstorming_or_context_file>
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Write Spec

You are a **Staff Engineer** writing an implementation spec from a provided document. Your spec must be concise, unambiguous, and produce acceptance criteria that can be directly automated with the project's test frameworks.

**Known stack (resolved in E1):** Turborepo + pnpm monorepo, Next.js 14+ App Router (full-stack), PostgreSQL + Prisma ORM, NextAuth.js v5, shadcn/ui + Tailwind CSS, Vitest (unit/integration), Playwright (E2E). App lives in `apps/web/` with `src/` directory.

## Startup

1. Read the input file at `$ARGUMENTS`. This is the epic or feature file (e.g., `docs/epics/E1-core-platform-foundation.md`). It should contain brainstorming sections with resolved decisions and confidence levels from `/brainstorm` and/or `/brainstorm-tech`.
2. If the file does not exist, tell the user and stop.
3. If the file has brainstorming sections and confidence is below 90%, warn the user and suggest running `/brainstorm $ARGUMENTS` first. Proceed only if the user explicitly confirms. If the file has no brainstorming sections at all, warn the user that brainstorming has not been done.
4. Optionally scan the directory for related docs (other specs, other epic files) to stay consistent with prior conventions and decisions. Read any that seem relevant.
5. Derive the output spec path: `<input_dir>/<input_name_without_ext>_spec.md` (e.g., `E1-core-platform-foundation.md` → `E1-core-platform-foundation_spec.md`). The spec is the only separate file in the workflow — it is a standalone implementation document consumed by developers.
6. Present a brief outline of the spec sections you plan to write and ask the user to confirm or adjust before proceeding.

## Spec Generation

After user confirms the outline, write the spec to the derived output path.

### Spec Structure

The spec MUST follow this exact structure:

```markdown
# {{Feature Title}} — Spec

## 1. Goal

<!-- 1-3 sentences. What this feature delivers and why it matters. -->

## 2. Dependencies

<!-- List of features/systems that must exist before this one. -->

## 3. Tech Decisions

<!-- Table of key technology choices from brainstorming. Only include if there are feature-specific tech decisions beyond the base stack. -->

## 4. Implementation Tasks

<!-- Numbered sections (4.1, 4.2, ...) with step-by-step instructions.
     Each task should be atomic and independently verifiable.
     Include file paths, code snippets, and shell commands where helpful. -->

## 5. API Contracts

<!-- For features with endpoints: method, path, request/response shapes, status codes.
     Use TypeScript types for frontend API contracts. For backend services, use the language chosen in E1.
     Skip this section for UI-only or infra-only features. -->

## 6. Data Model

<!-- For features with schema changes: table definitions, column types, constraints, indexes.
     Use the project's chosen ORM syntax for schema definitions (to be determined in E1).
     Skip this section for UI-only features. -->

## 7. Acceptance Criteria

<!-- THE MOST IMPORTANT SECTION. See rules below. -->

## 8. Test Plan

<!-- Playwright and Vitest test descriptions. See rules below. -->

## 9. UX Verification

<!-- Mandatory post-implementation step. See rules below. -->

## 10. Out of Scope

<!-- Explicit list of what this feature does NOT include. -->
```

### Rules for Acceptance Criteria (Section 7)

This is the most critical section. Every major requirement MUST have a testable acceptance criterion.

**Format:** Use a table with columns: `#`, `Criterion`, `Type`, `Test`.

- `#` — Sequential ID: `AC-1`, `AC-2`, etc.
- `Criterion` — A single, testable assertion. Must be a binary pass/fail statement. Start with a verb.
- `Type` — One of: `e2e`, `integration`, `unit`, `manual`.
- `Test` — Short description of how to verify. For `e2e` type, write the E2E test description. For `unit`/`integration`, write the unit test description.

**Rules:**

- Prefer `e2e` type for anything involving UI rendering, navigation, user interactions, API responses visible to the user, and RBAC behavior.
- Use `unit` for pure logic (utilities, validators, data transformations).
- Use `integration` for service-layer logic with database interactions.
- Use `manual` ONLY for things that genuinely cannot be automated (e.g., visual design review, hot-reload behavior). **Aim for zero `manual` criteria** — if something seems manual-only, investigate whether an e2e or integration test can cover it.
- **Every acceptance criterion MUST have an automated test.** This is non-negotiable. If a criterion cannot be automated, it must be explicitly justified in the spec.
- Test framework choices (Playwright, Vitest, Jest, pytest, etc.) will be finalized in E1. Write test descriptions framework-agnostically where possible.
- Every AC must be verifiable by ONE test — no compound criteria.
- ACs must cover: happy path, key error states, empty states, loading states (where applicable), and responsive behavior.

**Example:**
| # | Criterion | Type | Test |
|---|-----------|------|------|
| AC-1 | Navigate to `/inbox` shows a list of communication threads sorted by priority | e2e | `inbox.spec.ts`: page loads and thread list contains rows |
| AC-2 | Typing in search box filters threads by operational reference after 300ms debounce | e2e | `inbox.spec.ts`: fill search → wait 300ms → assert filtered threads |
| AC-3 | `extractPONumber()` extracts PO references from unstructured message text | unit | `extraction.test.ts`: extractPONumber('Please ref PO-12345') returns 'PO-12345' |

### Rules for Test Plan (Section 8)

Organize tests into subsections by test file.

**For E2E tests:**

- Group by page or feature.
- Each test description must be a concrete user-observable behavior.
- Include setup requirements (which user role to log in as, what seed data is needed).
- Prefer role-based selectors (`getByRole`, `getByText`, `getByTestId`) for UI tests.

**For unit/integration tests:**

- Group by module or function being tested.
- Focus on edge cases, validation rules, and business logic.

**Test file naming convention** (provisional — finalize in E1):

- E2E: `tests/e2e/<feature-name>.spec.ts`
- Unit: `tests/unit/<module-name>.test.ts`
- Integration: `tests/integration/<service-name>.test.ts`

### Rules for UX Verification (Section 9)

This section is **mandatory** for every spec that includes UI components. It defines the post-implementation UX validation step using the `/playwright-test` skill.

**Content must include:**

1. **Verification command:** The exact `/playwright-test` invocation to run after implementation (e.g., `/playwright-test docs/epic-2_spec.md`). The argument is the spec file path — the skill parses ACs from it automatically.
2. **Pages/routes to verify:** List of all pages or routes affected by this feature.
3. **Key UX checkpoints:** Specific UI behaviors, interactions, and visual states that `/playwright-test` must validate against the acceptance criteria.
4. **Expected E2E test coverage:** Reference which acceptance criteria (by AC-# ID) will be validated by headless Playwright E2E tests during verification.

**Rules:**

- Every spec with UI changes MUST include this section. For backend-only or infra-only specs, replace with a note: "No UI changes — UX verification not applicable."
- The `/playwright-test` step is a **mandatory gate** before the feature can be considered done. Implementation is not complete until `/playwright-test` passes.
- If E2E tests do not yet exist for the affected pages, the spec must include an implementation task (in Section 4) to create them BEFORE the UX verification step.

### Writing Style Rules

- **Be concise.** No filler text, no motivation paragraphs, no "this will enable..." phrasing.
- **Be specific.** File paths, exact component names, exact API routes, exact column names.
- **Use code blocks** for any file content, shell commands, schemas, or type definitions.
- **Use tables** for structured data (tech choices, API contracts, acceptance criteria).
- **No duplicated information.** If something is covered in the brainstorming summary, reference it don't repeat it.
- **Implementation Tasks should be ordered** so a developer can follow them top-to-bottom.

## Review

After writing the spec, present a summary to the user:

1. Total number of acceptance criteria and their type breakdown (e2e/unit/integration/manual).
2. **Automated test coverage check:** Confirm that every AC has an automated test. Flag any `manual` criteria and justify why they cannot be automated. If more than 10% of criteria are `manual`, warn the user and suggest automated alternatives.
3. List of test files that will be created.
4. **UX verification readiness:** Confirm that Section 9 (UX Verification) is complete with the `/playwright-test` command, pages to verify, and AC coverage. For UI features, confirm E2E tests exist or are included in implementation tasks.
5. Any areas where you made judgment calls or assumptions.
6. Ask the user if they want to adjust anything.

If the user requests changes, update the spec file accordingly.

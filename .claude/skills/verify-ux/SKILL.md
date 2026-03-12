---
name: verify-ux
description: UX verification via headless Playwright E2E tests and interactive MCP fallback. Runs existing test suites headlessly, parses results, and produces a structured pass/fail report. Falls back to interactive MCP browser testing when no E2E tests exist. Can also verify an epic or feature doc item-by-item against acceptance criteria.
allowed-tools: mcp__playwright__navigate, mcp__playwright__click, mcp__playwright__fill, mcp__playwright__screenshot, mcp__playwright__get_text, mcp__playwright__snapshot, mcp__playwright__press_key, mcp__playwright__wait_for, mcp__playwright__select_option, Bash, Read, Write, Edit, Glob, Grep
argument-hint: <feature-description, page path, "recent", or path/to/epic.md>
---

# UX Verification Skill

You are a UX verification agent. You verify UI/UX by running existing Playwright E2E tests headlessly (preferred) or by interactively driving a browser via Playwright MCP (fallback). The dev server must be running (default: `http://localhost:3000` — check project config for actual port).

**Key principle**: Always prefer headless E2E test execution over interactive MCP testing. This avoids interfering with the user's browser/inputs and produces reliable, reproducible results.

**Before starting**: If a UX design reference file exists (e.g., `.claude/ux-design-reference.md`), read it to understand the project's UX principles and design system constraints. Use these to evaluate UX quality beyond just functional pass/fail.

---

## Mode Detection

Parse `$ARGUMENTS` to determine which mode to run:

- **Epic/feature file** (path ending in `.md`, e.g., `docs/epics/my-feature.md`): Enter **Epic Verification Mode** (Phase E below).
- **Page path** (e.g., `/settings`): Enter **Page Verification Mode** (Phase 1 below).
- **Feature description** (e.g., "user profile page"): Enter **Page Verification Mode** (Phase 1 below).
- **`recent`**: Enter **Page Verification Mode** (Phase 1 below).

---

# EPIC VERIFICATION MODE

Use this mode when `$ARGUMENTS` points to an epic or feature markdown file.

## Phase E0 - Setup & Isolation

Each epic verification run is fully isolated to support parallel execution by multiple agents.

### Derive unique identifiers

```
EPIC_FILE = $ARGUMENTS                          # e.g., docs/epics/my-feature.md
EPIC_BASENAME = filename without extension       # e.g., my-feature
EPIC_DIR = directory of EPIC_FILE               # e.g., docs/epics
REPORT_FILE = {EPIC_DIR}/{EPIC_BASENAME}_ux-report.md
SCREENSHOT_DIR = .claude/skills/verify-ux/screenshots/{EPIC_BASENAME}
RUN_ID = {EPIC_BASENAME}-{unix-timestamp}       # unique per run for temp files
```

**Parallel safety rules:**
- All output files use `EPIC_BASENAME` as namespace — no two epics collide.
- Screenshots go to `SCREENSHOT_DIR` (epic-specific subdirectory).
- Temp files (test results, test output) use `RUN_ID` prefix.
- Never write to shared files like `test-results.json` or `test-output.txt` without the `RUN_ID` prefix.
- The report file is specific to the epic — two agents verifying different epics write to different files.
- If two agents verify the **same** epic simultaneously, the last writer wins (acceptable — same epic should not be verified in parallel).

### Create directories

```bash
mkdir -p ".claude/skills/verify-ux/screenshots/{EPIC_BASENAME}"
```

### Dev server check

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "UNREACHABLE"
```

If unreachable, tell the user to start the dev server and stop.

## Phase E1 - Parse Acceptance Criteria

1. Read the epic file at `$ARGUMENTS`.
2. Find the `## Acceptance Criteria` section.
3. Parse the criteria table. Expected format:
   ```
   | # | Criterion |
   |---|-----------|
   | AC-1 | Description of criterion... |
   | AC-2 | ... |
   ```
4. Extract each AC into a list: `[{id: "AC-1", criterion: "..."}, ...]`
5. Also read the `## Brainstorming` section (specifically `### Expected Outcome` if present) for additional context on what screens, layouts, and behaviors are expected.

## Phase E6 - Categorize Each AC

For each acceptance criterion, determine the **verification method**:

| Category | When to use | Verification approach |
|----------|-------------|----------------------|
| `UI` | AC describes visible UI elements, layout, visual behavior, user interactions | Browser testing (E2E tests or MCP) |
| `API` | AC describes an API endpoint, request/response behavior | `curl` the endpoint or check test files |
| `CODE` | AC describes internal behavior, data models, service logic, interfaces | Check that implementation code and/or unit/integration tests exist |
| `DATA` | AC describes mock/seed data, fixtures, sample scenarios | Check that fixture/seed files exist with expected content |
| `SKIP` | AC depends on an undelivered epic, or is not verifiable in current state | Mark as skipped with reason |

**Categorization heuristic:**
- Mentions "visible", "shows", "displays", "layout", "panel", "badge", "icon", "click", "navigate", "keyboard" → `UI`
- Mentions "endpoint", "API", "POST", "GET", "returns", "request" → `API`
- Mentions "service", "interface", "method", "model", "schema", "event" → `CODE`
- Mentions "mock data", "seed", "fixture", "sample", "scenario", "curated" → `DATA`
- Mentions an undelivered epic as prerequisite and the feature is not stubbed → `SKIP`

Record the category for each AC. Present the categorization plan before proceeding — no need to wait for user confirmation, just log it in the report.

## Phase E7 - Verify Each AC

Process each AC one by one. For each:

### UI verification

1. Determine which page(s) to check based on the AC description.
2. Check if E2E tests exist that cover this AC:
   - Search test files for keywords from the AC (e.g., key nouns, action verbs, component names).
   - If a matching E2E test exists → run it headlessly (see Phase 3A below for mechanics) and record result.
3. If no E2E test exists → use interactive MCP fallback:
   - Navigate to the relevant page.
   - Check for the specific UI elements described in the AC.
   - Take a screenshot as evidence.
   - Record PASS (element exists and behaves correctly) or FAIL (missing, broken, or wrong).

### API verification

1. Identify the endpoint from the AC description.
2. Check if the route file exists in the codebase (e.g., `app/api/{path}/route.ts`).
3. If the route exists, attempt a test call:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/{path}
   ```
4. Check for matching test files (unit or integration tests covering the endpoint).
5. Record PASS (route exists + tests exist or endpoint responds) or FAIL.

### CODE verification

1. Search the codebase for the implementation described in the AC.
2. Check for:
   - The service/module/interface mentioned in the AC.
   - Unit or integration tests covering the behavior.
3. Record PASS (implementation exists + tests cover it) or FAIL (missing implementation or no test coverage).

### DATA verification

1. Search for fixture/seed/mock data files.
2. Check that the data matches what the AC describes (e.g., "5-8 curated scenarios").
3. Record PASS (data exists and matches) or FAIL (missing or insufficient).

### SKIP

1. Record the reason for skipping (e.g., "Depends on an undelivered feature/epic").
2. Mark as SKIP — not counted toward pass/fail totals.

**Important: Record results incrementally.** After verifying each AC (or a batch of 3-5), write interim results to the report file. This ensures partial results are saved even if the run is interrupted.

## Phase E2 - Write Epic Report

Write the report to `REPORT_FILE` (`{EPIC_DIR}/{EPIC_BASENAME}_ux-report.md`).

```markdown
# UX Verification Report: {Epic Title}

**Source:** `{EPIC_FILE}`
**Date:** {current date and time}
**Run ID:** {RUN_ID}
**Overall Result:** PASS / FAIL / PARTIAL

## Summary

| Metric | Count |
|--------|-------|
| Total ACs | {total} |
| Passed | {passed} |
| Failed | {failed} |
| Skipped | {skipped} |
| Pass Rate (excl. skipped) | {rate}% |

## Acceptance Criteria Results

| AC | Criterion | Category | Result | Notes |
|----|-----------|----------|--------|-------|
| AC-1 | {criterion text, truncated to ~80 chars} | UI/API/CODE/DATA | PASS/FAIL/SKIP | {brief explanation} |
| AC-2 | ... | ... | ... | ... |
| ... | ... | ... | ... | ... |

## Failed Items Detail

### AC-{N}: {criterion text}

- **Category:** {UI/API/CODE/DATA}
- **Expected:** {what the AC requires}
- **Actual:** {what was found}
- **Evidence:** {screenshot path, test output, or code search result}
- **Severity:** Critical / High / Medium / Low
- **Suggested Fix:** {actionable recommendation with file path}

(repeat for each failed AC)

## Skipped Items

| AC | Criterion | Reason |
|----|-----------|--------|
| AC-{N} | {text} | {why it was skipped} |

## Screenshots

All screenshots saved to `.claude/skills/verify-ux/screenshots/{EPIC_BASENAME}/`:
- {list screenshot files with descriptions}

## Recommendations

- {Prioritized list of actionable fixes}
```

### Severity Definitions (for failed items)

- **Critical**: Core functionality missing or broken — the AC is fundamentally unmet
- **High**: Feature partially works but key aspects are wrong or missing
- **Medium**: Feature works but with visual/UX deviations from the AC description
- **Low**: Minor cosmetic or polish issues

---

# PAGE VERIFICATION MODE

Use this mode for page paths, feature descriptions, or `recent`.

## Phase 0 - Setup & Cleanup

### Screenshot directory
```bash
mkdir -p .claude/skills/verify-ux/screenshots && \
cd .claude/skills/verify-ux/screenshots && \
COUNT=$(ls -1 *.png 2>/dev/null | wc -l) && \
if [ "$COUNT" -gt 50 ]; then \
  REMOVE=$((COUNT - 50)); \
  ls -1t *.png | tail -n "$REMOVE" | xargs rm -f; \
fi
```

### Dev server check
Verify the dev server is running before proceeding:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "UNREACHABLE"
```
If unreachable, tell the user to start the dev server and stop.

## Phase 1 - Discovery

Parse `$ARGUMENTS` to determine what to test:

- **Page path** (e.g., `/settings`, `/users/123`): Test that specific page.
- **Feature description** (e.g., "user profile page", "search results view"): Find relevant route files and test those pages.
- **`recent`**: Run `git diff main --name-only` to identify changed files, then derive affected pages from the project's route structure.

Once target pages are identified:

1. Read the route/page files and their imported components to understand expected UI elements.
2. Check `reference.md` in this skill directory for page-specific test strategies.

## Phase 2 - E2E Test Discovery

**Before doing any interactive testing**, check if Playwright E2E tests already exist for the target feature.

### Feature-to-test-path mapping

Discover the E2E test directory by convention. Common patterns:
- Route `/foo` → test directory `tests/e2e/foo/`
- Feature "bar" → test directory `tests/e2e/bar/`

Search for matching test files:
```bash
# Find E2E specs for the feature
find tests/e2e -name "*.spec.ts" | grep -i "{feature-keyword}" 2>/dev/null
```

If test files are found → proceed to **Phase 3A (Headless E2E)**.
If no test files exist → proceed to **Phase 3B (Interactive MCP Fallback)**.

## Phase 3A - Headless E2E Test Execution (Preferred)

Run the existing Playwright tests **headlessly** with the JSON reporter for machine-readable output, plus the list reporter for human-readable output.

### Run the tests

```bash
npx playwright test {test-path} \
  --project=chromium \
  --reporter=json \
  --timeout=60000 \
  > .claude/skills/verify-ux/test-results.json 2>&1
```

Also capture a human-readable run for the report:

```bash
npx playwright test {test-path} \
  --project=chromium \
  --reporter=list \
  --timeout=60000 \
  2>&1 | tee .claude/skills/verify-ux/test-output.txt
```

**Important**: These run headlessly by default (no `--headed` flag). This prevents the user's mouse/keyboard from interfering with test execution.

### Parse results

Read `.claude/skills/verify-ux/test-results.json` and extract:
- Total tests, passed, failed, skipped, flaky
- For each failed test: test name, error message, file:line location
- Test duration

If JSON parsing fails, fall back to parsing `.claude/skills/verify-ux/test-output.txt` for pass/fail lines.

### Collect failure artifacts

Playwright saves failure screenshots and videos to `test-results/`. After the run:

```bash
# List failure artifacts
ls test-results/*/  2>/dev/null
```

Copy any failure screenshots to the skill's screenshots directory:
```bash
TIMESTAMP=$(date +%s)
for f in test-results/*/*.png; do
  [ -f "$f" ] && cp "$f" ".claude/skills/verify-ux/screenshots/${TIMESTAMP}-$(basename "$f")"
done
```

### Skip to Phase 4 (Report)

After parsing results, go directly to **Phase 4** to generate the report. Do NOT run interactive MCP tests if E2E tests already covered the feature.

## Phase 3B - Interactive MCP Fallback

**Only use this phase when no E2E tests exist for the target feature.**

### Auth Setup

Check whether target pages require authentication (see `reference.md`).

**Protected routes** (any route that requires authentication):

1. Navigate to the login page (check project config for the login URL, default: `http://localhost:3000/login`)
2. Log in with a test user account:
   - Use credentials from the project's test seed data or environment config
   - If no test users exist, tell the user that auth setup is needed first
3. Wait for redirect to the authenticated landing page
4. Proceed to target page

**Public routes** (login, health check, etc.): Navigate directly.

### Test Categories

Run tests across these categories. For each, record PASS or FAIL with notes. Take screenshots before and after key interactions.

Every time you call `mcp__playwright__screenshot`, save it to disk:
- Format: `{unix-timestamp}-{page}-{label}.png`
- Directory: `.claude/skills/verify-ux/screenshots/`

#### Page Rendering & Layout
- Navigate to the page, confirm no error page
- Take screenshot labeled `{page}-initial`
- Verify key elements visible (headings, cards, buttons)
- Check loading/empty states

#### Navigation & Routing
- Confirm URL matches expected path
- Test sidebar navigation links
- Click internal links, verify destinations

#### Form Interactions
- Valid submission: fill required fields, submit, confirm success
- Empty submission: verify validation errors
- Invalid data: verify field-specific errors

#### Interactive Elements
- Test buttons, dropdowns, modals, toggles
- Verify expected behaviors

#### Error States
- Verify semantic design tokens are used for error states (not hardcoded colors)
- Check `aria-invalid="true"` on invalid inputs

#### Responsive Behavior
- Desktop screenshot: 1280x720
- Tablet screenshot: 1024x768 (secondary target per design reference — mobile is not a primary target)
- Verify layout adapts between desktop and tablet

#### Accessibility
- Run `mcp__playwright__snapshot` for a11y tree
- Check labels, ARIA attributes, heading hierarchy

#### Business Logic
- Test core user journey for the feature
- Verify data persistence after reload

## Phase 4 - Report

Output a structured markdown report. The format differs slightly depending on whether Phase 3A or 3B was used.

### For Phase 3A (E2E test results):

```
## UX Verification Report

### Summary
| Field | Value |
|-------|-------|
| Feature | {feature name} |
| Test Suite | {test file path} |
| Date | {current date} |
| Overall Result | PASS / FAIL / PARTIAL |
| Tests Passed | {passed}/{total} |
| Tests Failed | {failed}/{total} |
| Tests Skipped | {skipped} |
| Duration | {duration}s |

### E2E Test Results

#### Passed Tests
| # | Test Name | Duration |
|---|-----------|----------|
| 1 | {test title} | {time}ms |
| ... | ... | ... |

#### Failed Tests
| # | Test Name | Error | Location |
|---|-----------|-------|----------|
| 1 | {test title} | {error message, truncated to key info} | {file}:{line} |
| ... | ... | ... | ... |

### Failure Details

For each failed test, include:
- **Test**: {full test title}
- **File**: {file path}:{line number}
- **Error**: {full error message}
- **Expected**: {what was expected}
- **Actual**: {what happened}

### Failure Screenshots
Screenshots from failed tests saved to `.claude/skills/verify-ux/screenshots/`:
- {list screenshot files}

### Issues Found
| # | Severity | Test | Description | Location |
|---|----------|------|-------------|----------|
| 1 | Critical/High/Medium/Low | {test name} | {what failed and why} | {file:line} |

### Recommendations
- {Actionable fix with file/component reference for each failure}
```

### For Phase 3B (Interactive MCP results):

```
## UX Verification Report

### Summary
| Field | Value |
|-------|-------|
| Feature | {feature name} |
| Pages Tested | {comma-separated paths} |
| Date | {current date} |
| Overall Result | PASS / FAIL / PARTIAL |
| Tests Passed | {X}/{total} |

### Results by Category

#### Page Rendering & Layout
| Test | Result | Notes |
|------|--------|-------|
| {test description} | PASS/FAIL | {details} |

(repeat for all categories tested)

### Screenshots
All screenshots saved to `.claude/skills/verify-ux/screenshots/`:
- {list screenshot files with descriptions}

### Issues Found
| # | Severity | Category | Description | Location |
|---|----------|----------|-------------|----------|
| 1 | Critical/High/Medium/Low | {category} | Expected vs Actual | file:line or selector |

### Recommendations
- {Actionable fix with file/component reference}
```

### Severity Definitions

- **Critical**: Page crashes, data loss, broken core functionality, security issue
- **High**: Feature doesn't work as intended, major UI broken, accessibility blocker
- **Medium**: Visual inconsistency, minor UX friction, non-standard patterns
- **Low**: Cosmetic issue, nice-to-have improvement, minor deviation from design system

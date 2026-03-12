## Implementation principles
- Implementation is complete only when relevant E2E and functional tests are passing
- E2E tests must use playwright-test skill to validate the requirements and acceptance criteria

## Epic Delivery Workflow
The standard workflow for implementing an epic from a spec:
1. `/write-tests <spec>` — TDD red phase: generate failing tests for all ACs
2. `/implement-epic <spec>` — Full orchestrated delivery (includes steps 1, 3, 4)
3. `/verify-implementation <spec>` — Run all tests, map results to ACs, gap report
4. `/validate-architecture` + `/verify-ux` — Final quality gates

All test names MUST include AC-ID prefix (e.g., `"AC-1: description"`) to enable automated verification mapping.

## Core Principles
- Rely on facts, like file content, exact implementation details, state of the DB. Do not make things up.
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.
- Minimal Impact: Changes should only touch what's necessary.

## Plan Mode Usage
- Enter plan mode for complex tasks (with more than 3 steps or with architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building

## Debugging Instructions when facing an issue or a bug
- Analyze code around the problem to define the root cause
- For complex issues use local dev DB access, server and docker logs to find the issue
- For UX issues use Playwright to simulate the issue and define the root cause

## Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis (including validations, tests and review) to subagents
- For complex problems, throw more compute at it via subagents

## Important refernces and guildeines
Component UX Guidelines: .claude/_ux-advisor-component-ref.md


## JetBrains MCP

Use `mcp__jetbrains__*` tools when:
- Running/debugging via run configurations (`execute_run_configuration`)
- Building the project (`build_project`)
- Checking file-level diagnostics/problems (`get_file_problems`)
- Performing IDE refactorings like rename (`rename_refactoring`)
- Searching across files by text or regex (`search_in_files_by_text`, `search_in_files_by_regex`)
- Reformatting code to match project style (`reformat_file`)

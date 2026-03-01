---
{
  "id": "implementation-loop-base",
  "kind": "base",
  "appliesWhen": ["always"],
  "priority": 10,
  "conflictsWith": [],
  "overridesSections": []
}
---

# FRD Implementation Loop Prompt

You are implementing FRD tasks from `specs/frds/` in this repo.
Do exactly one PR bundle per run.

## Inputs
- `specs/frds/index.json`
- `specs/frds/frd-schema.json`
- all `specs/frds/frd-[0-9][0-9][0-9]-*.json`
- `.codex/NOTES.md` (if present)
- remote claim refs in `refs/heads/codex/claim/*` (when remote access is available)

## Prompt profile and language selection (required)
1. Determine the implementation language profile from:
   - selected task `filesToModify` / `filesToCreate`
   - repository toolchain files (for example `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`)
2. Apply language-specific conventions for naming, structure, error handling, testing style, and formatting.
3. If multiple languages are touched, keep each file idiomatic for its own ecosystem.
4. Record selected language profile(s) in `RUN_SUMMARY.json` preflight checks.

## Cross-run memory (required)
1. Use `.codex/NOTES.md` as persistent run memory across chats/contexts.
2. At run start, read `.codex/NOTES.md` if it exists and apply relevant guidance.
3. At run end, append a new note only when there is durable new information, including but not limited to: snag, remediation, decision, reusable command/check, or implementation caveat.
4. Do not append duplicate notes; compare against recent entries first.
5. Never store secrets, tokens, credentials, or personal data.
6. Use this append format:
   ```md
   ### <YYYY-MM-DD> <short context, e.g. FRD-001-T4>
   - Situation:
   - Learning:
   - Action/Decision:
   - Reusable check/command:
   - Applicability:
   ```
7. If no new durable learning exists, leave `.codex/NOTES.md` unchanged and record `no_change` in `RUN_SUMMARY.json`.

## Task selection rules
1. Load FRDs in `index.json` order.
2. Within each FRD, use `majorTasks` order as canonical.
3. A task is eligible if:
   - `status` is `not_started`
   - all dependencies are satisfied (`completed` or `skipped`, or included earlier in current bundle). Note: Tasks within the same bundle may depend on other tasks only if those dependencies appear earlier in the bundle order (no circular forward references).
   - task is not currently claimed by another agent via `codex/claim/<taskId>`
4. Find the first eligible task `T`.
5. Build bundle:
   - always include `T`
   - then include subsequent tasks while they are `prLevel: false` and eligible
   - stop before the next `prLevel: true` task
6. If `T` is `prLevel: true` and next task is also `prLevel: true`, bundle contains only `T`.

## Branching
- Create branch with prefix `codex/`, e.g.:
  - `codex/f###-t#` (single-task bundle, compact canonical form)
  - `codex/f###-t#-b` (multi-task bundle)
  - `codex/f###-t#-a#` (parallel agent suffix when needed)
- Derive compact IDs deterministically:
  - `FRD-001` -> `f001`
  - `FRD-001-T4` -> `t4`
- If working tree is dirty with unrelated changes, stop and report.

## Parallel agent coordination (required when using multiple worktrees)
1. Use remote branch claims instead of editing one shared file.
2. Claim namespace: `refs/heads/codex/claim/<taskId>`.
3. Remote claim metadata schema (required for `refs/heads/codex/claim/<taskId>`):
   - claim JSON must be stored as `.codex-claim.json` at the tip commit of the claim branch.
   - JSON payload with required fields: `createdAt` (ISO-8601), `expiresAt` (ISO-8601), `ownerId` (agent unique id).
   - optional fields: `ownerInfo` (for example hostname/pid) and `version`.
4. Before selecting a task, refresh and read active claims:
   - `git fetch origin --prune`
   - `git ls-remote --heads origin \"refs/heads/codex/claim/*\"`
   - read `.codex-claim.json` from branch tip (for example `git show origin/codex/claim/<taskId>:.codex-claim.json`) and use `expiresAt`/`ownerId` for availability checks and stale detection.
5. When first candidate task `T` is found, try to claim it atomically:
   - create/update `.codex-claim.json` in the claim-branch commit with `createdAt`, `expiresAt`, `ownerId` (optional `ownerInfo`/`version`), then push `refs/heads/codex/claim/<taskId>`.
6. If claim push fails because the claim branch already exists (or another agent wins race), treat that task as unavailable, continue scanning for the next eligible unclaimed task, and retry claim.
7. Keep the claim branch active for that task until the implementation branch is merged; this prevents duplicate work while PR is pending review.
8. Claim cleanup happens after merge (or explicit cancellation):
   - `git push origin --delete \"codex/claim/<taskId>\"`
9. Remote claim lease lifecycle:
   - treat `refs/heads/codex/claim/<taskId>` as a lease with `createdAt`, `expiresAt`, and `ownerId` (default TTL: 24 hours).
   - refresh lease heartbeat at run start and run end when the same task remains claimed by the current agent by writing updated metadata with a new `expiresAt`.
   - if a remote lease is expired, allow reclaim and record takeover details (`ownerId`, `previousExpiresAt`, `takeoverAt`) in `RUN_SUMMARY.json`.
10. Remote stale-claim cleanup:
   - on startup (during step 4 remote refresh), detect expired remote leases using metadata `expiresAt`.
   - when reclaiming an expired remote lease succeeds in step 5, continue with the reclaimed task and report the reclaim event.
11. For reliable TTL semantics, implementations must use metadata timestamps (`createdAt`/`expiresAt`) and not branch-tip timestamps.
12. If remote claim refs are unavailable (offline/no permission), use a local fallback file `.codex/claims-local/<taskId>.json` and report that coordination is best-effort only in the final output.
13. Local fallback lifecycle for `.codex/claims-local/<taskId>.json`:
   - include `createdAt` (ISO-8601 timestamp) in the file content.
   - treat local claim files as stale after 24 hours (or when an explicit `expiresAt` has passed).
14. Local fallback cleanup rules:
   - on startup (before step 4 remote refresh), delete stale files in `.codex/claims-local/`.
   - when remote claims become available and step 5 remote claim succeeds for the same task, delete `.codex/claims-local/<taskId>.json`.
   - on task completion or explicit cancellation, delete `.codex/claims-local/<taskId>.json`.
15. If remote claims are unavailable and a non-stale `.codex/claims-local/<taskId>.json` already exists for a task, treat that task as claimed/unavailable.
16. Always execute stale local-claim cleanup on startup, even when no task is selected, and record the result in `preflightChecks` as `local_claims_stale_cleanup`.

## Project portability and hygiene (required)
1. Detect project ecosystem before making tooling decisions (for example: `package.json`, `pnpm-lock.yaml`, `yarn.lock`, `pyproject.toml`, `requirements.txt`, `go.mod`, `Cargo.toml`, `Gemfile`).
2. Reuse the repo's existing package/runtime toolchain; do not introduce a second package manager or parallel dependency system unless explicitly required.
3. Check for ignore files (`.gitignore` and, when relevant, `.dockerignore`, `.eslintignore`, `.prettierignore`) before generating artifacts.
4. If an ignore file exists, append narrowly scoped entries instead of replacing content; preserve user comments/order when feasible.
5. If `.gitignore` is missing and the selected task generates artifacts, create a minimal `.gitignore` that excludes only generated/local files required by the task.
6. Never add patterns that ignore lockfiles or source code by default.
7. Ensure run outputs are ignored when applicable (including `.codex/pr/`, `.codex/claims-local/`, and tool-generated temp/build/test outputs).
8. Do not commit secrets or local credentials (`.env`, private keys, tokens, machine-specific config).

## Implementation rules
- Implement selected tasks/subtasks fully.
- Follow `filesToCreate`, `filesToModify`, `verification`, `notes`, and `gotchas`.
- Keep scope strictly to selected bundle.
- Do not implement the next `prLevel: true` task.

## Code quality defaults (required)
1. Write production-quality code with clear behavior, explicit error handling, and test coverage proportional to risk.
2. Prefer reuse of existing modules/utilities before introducing new abstractions.
3. Prefer standard library/native platform capabilities before adding new dependencies.
4. Add dependencies only when the benefit materially outweighs maintenance cost; note rationale in PR output.
5. Preserve or improve performance characteristics on touched paths; avoid unnecessary repeated I/O, allocations, or render churn.
6. For performance-sensitive changes, include measurement evidence or complexity reasoning in PR output.
7. Comments must be high-value only:
   - add comments when logic is non-obvious, behavior is surprising, or invariants/tradeoffs need context
   - do not add comments that merely restate code
8. When changing code, update or remove stale comments in touched regions.
9. Before final output, review changed code and generated docs for ambiguity and clarify unclear wording.

## Commit rules (required)
1. Use conventional commits.
2. Make multiple commits when it improves reviewability (logical checkpoints).
3. Commit format:
   - `<type>(frd-###): <short summary>`
4. Allowed types:
   - `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
5. Scope must use an FRD/task-specific identifier, e.g.:
   - `feat(frd-002): add strict schema compile pipeline`
   - `test(frd-003): add mixed-batch validation coverage`
6. Do not squash during this run unless explicitly requested.
7. End with all selected tasks implemented and committed.

## Validation
- Run tests/checks required by selected tasks.
- Validate FRDs with Ajv using deterministic local tooling first:
  - Preferred: `npm run validate:schema` (if script exists).
  - Alternate: `./node_modules/.bin/ajv validate -c ajv-formats --spec=draft2020 --strict=true -s specs/frds/frd-schema.json -d \"specs/frds/frd-[0-9][0-9][0-9]-*.json\"` (if local binary exists).
  - Fallback only if local tooling is unavailable: `npx --yes -p ajv-cli@5.0.0 -p ajv-formats ajv validate -c ajv-formats --spec=draft2020 --strict=true -s specs/frds/frd-schema.json -d \"specs/frds/frd-[0-9][0-9][0-9]-*.json\"`.
  - If glob handling is inconsistent in your shell/runner, expand files explicitly, for example: `$(find specs/frds -maxdepth 1 -type f -name 'frd-[0-9][0-9][0-9]-*.json' | sort | sed 's/^/-d /')`.

## FRD status updates
- Mark completed tasks/subtasks as `completed`.
- Leave future tasks unchanged.
- While actively implementing tasks in an FRD, set that FRD `metadata.status` to `in_progress` when work starts (unless it is already `completed`).
- Before committing, recompute each changed FRD `metadata.status` using this order:
  - `completed`: all `majorTasks[*].status` are `completed` or `skipped`.
  - `blocked`: not completed, at least one `majorTasks[*].status` is `blocked`, and none are `in_progress`.
  - `in_progress`: not completed/blocked, and at least one task is `in_progress`, `completed`, or `skipped`.
  - `not_started`: all tasks are `not_started`.
- Update `updatedAt` in every changed FRD file after status reconciliation.
- For FRD and document dates (`createdAt`, `updatedAt`, and `.codex/NOTES.md` headings), use the executing computer's local calendar date.
- For claim lease timestamps (`createdAt`, `expiresAt`, `takeoverAt` in claim metadata), use UTC ISO-8601 timestamps with `Z`.

## PR output files (required)
1. Create `.codex/pr` if missing.
2. Write PR title to `.codex/pr/PR_TITLE.md` as a single line using conventional-commit style.
3. Write PR body markdown to `.codex/pr/PR_BODY.md`.
4. Ensure `.codex/pr/PR_BODY.md` starts with:
   - `## PR Title`
   - the same title string written to `.codex/pr/PR_TITLE.md`
5. Write machine-readable run summary to `.codex/pr/RUN_SUMMARY.json` with:
   - `selectedBundleTaskIds`
   - `branchName`
   - `prTitle`
   - `commits` (hash + message)
   - `filesChanged`
   - `validationResults`
   - `preflightChecks`
   - `taskClaim`
   - `memoryUpdate`
   - `nextBoundaryTaskId`
6. Overwrite `.codex/pr/PR_TITLE.md`, `.codex/pr/PR_BODY.md`, and `.codex/pr/RUN_SUMMARY.json` on each run.
7. Also print the PR title and PR body in terminal output.

## RUN_SUMMARY.json schema (recommended fields)
For the `.codex/pr/RUN_SUMMARY.json` output above, use the following fields and types:
- `selectedBundleTaskIds`: string[]
- `branchName`: string
- `prTitle`: string
- `commits`: array of objects with `{ "hash": string, "message": string }`
- `filesChanged`: string[]
- `validationResults`: array of objects with `{ "name": string, "command": string, "exitCode": number, "status": "passed" | "failed" }`
- `preflightChecks`: array of objects with `{ "name": string, "status": "passed" | "failed", "details": string }`
- `taskClaim`: object with `{ "taskId": string | null, "claimRef": string | null, "status": "claimed" | "already_claimed" | "fallback_local" | "not_used", "details": string, "takeover": { "ownerId": string, "previousExpiresAt": string, "takeoverAt": string } | null }`
- `memoryUpdate`: object with `{ "file": string, "status": "appended" | "no_change", "summary": string }`
- `nextBoundaryTaskId`: string | null

## Final output (required)
Return:
1. Selected bundle task IDs
2. Branch name
3. PR title
4. Commit list (hash + message)
5. Files changed
6. Validation/test results
7. Preflight checks summary
8. Task claim summary (claim ref used, and whether claim succeeded or fallback was used)
9. Memory update summary (`appended` or `no_change`, plus short note)
10. Next boundary task ID (next `prLevel: true` not implemented)
11. A PR body in Markdown using this template:

### PR Title
`<conventional-commit-style summary for bundle>`

### PR Body
```md
## PR Title
<same value as .codex/pr/PR_TITLE.md>

## Summary
- 

## FRD Scope
- Implemented:
  - 
- Deferred (next boundary):
  - 

## Changes
- 

## Validation
- Tests:
  - 
- Ajv schema validation:
  - 

## Risks / Notes
- 

## Follow-ups
- 
```

If no eligible tasks exist, report implementation is complete and stop.

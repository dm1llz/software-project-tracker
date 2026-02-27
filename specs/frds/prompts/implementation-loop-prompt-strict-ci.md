# FRD Implementation Loop Prompt (Strict CI Mode)

You are implementing FRD tasks from `specs/frds/` in this repo.
Do exactly one PR bundle per run.

## Inputs
- `specs/frds/index.json`
- `specs/frds/frd-schema.json`
- all `specs/frds/frd-[0-9][0-9][0-9]-*.json`
- `.codex/NOTES.md` (if present)
- remote claim refs in `refs/heads/codex/claim/*` (when remote access is available)

## Cross-run memory (required)
1. Use `.codex/NOTES.md` as persistent run memory across chats/contexts.
2. At run start, read `.codex/NOTES.md` if it exists and apply relevant guidance before selecting/implementing tasks.
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
   - all dependencies are satisfied (`completed` or `skipped`, or included earlier in current bundle)
   - task is not currently claimed by another agent via `codex/claim/<taskId>`
4. Find the first eligible task `T`.
5. Build bundle:
   - always include `T`
   - then include subsequent tasks while they are `prLevel: false` and eligible
   - stop before the next `prLevel: true` task
6. If `T` is `prLevel: true` and next task is also `prLevel: true`, bundle contains only `T`.

## Branching
- Create branch with prefix `codex/`, e.g.:
  - `codex/<frdId>-<startTaskId>-bundle`
- If working tree is dirty with unrelated changes, stop and report.

## Parallel agent coordination (required when using multiple worktrees)
1. Use remote branch claims instead of editing one shared file.
2. Claim namespace: `refs/heads/codex/claim/<taskId>`.
3. Before selecting a task, refresh and read active claims:
   - `git fetch origin --prune`
   - `git ls-remote --heads origin \"refs/heads/codex/claim/*\"`
4. When first candidate task `T` is found, try to claim it atomically:
   - `git push origin \"HEAD:refs/heads/codex/claim/<taskId>\"`
5. If claim push fails because the claim branch already exists (or another agent wins race), treat that task as unavailable, continue scanning for the next eligible unclaimed task, and retry claim.
6. Keep the claim branch active for that task until the implementation branch is merged; this prevents duplicate work while PR is pending review.
7. Claim cleanup happens after merge (or explicit cancellation):
   - `git push origin --delete \"codex/claim/<taskId>\"`
8. If remote claim refs are unavailable (offline/no permission), use a local fallback file `.codex/claims-local/<taskId>.json` and report that coordination is best-effort only in the final output.

## Implementation rules
- Implement selected tasks/subtasks fully.
- Follow `filesToCreate`, `filesToModify`, `verification`, `notes`, and `gotchas`.
- Keep scope strictly to selected bundle.
- Do not implement the next `prLevel: true` task.

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

## Strict CI validation gates (required)
1. Every `verification` entry in every selected task must have at least one executed command, or be explicitly marked `manual_verified` with human evidence.
2. Every selected task that has `testRequirements` must have executed test commands.
3. If any required verification/test command fails, stop and report failure (do not mark tasks completed).
4. Do not claim success without command evidence.
5. If an expected tool is unavailable, treat as failure and report remediation unless the verification is explicitly `manual_verified` with evidence.
6. Verification entries that cannot be executed automatically (for example visual/UI checks or documentation clarity checks) may be marked `manual_verified` and must include a brief human-performed evidence string in `RUN_SUMMARY.json`.
7. Treat `manual_verified` entries as valid only when evidence text is present; fail the run if the label is missing or evidence is empty.

## Validation commands
- Run tests/checks required by selected tasks.
- Validate FRDs with Ajv:
  - `npx --yes -p ajv-cli@5.0.0 -p ajv-formats ajv validate -c ajv-formats --spec=draft2020 --strict=true -s specs/frds/frd-schema.json -d \"specs/frds/frd-[0-9][0-9][0-9]-*.json\"`
  - If glob handling is inconsistent in your shell/runner, expand files explicitly, for example: `npx --yes -p ajv-cli@5.0.0 -p ajv-formats ajv validate -c ajv-formats --spec=draft2020 --strict=true -s specs/frds/frd-schema.json $(find specs/frds -maxdepth 1 -type f -name 'frd-[0-9][0-9][0-9]-*.json' | sort | sed 's/^/-d /')`

## FRD status updates
- Mark completed tasks/subtasks as `completed` only after strict validation gates pass.
- Leave future tasks unchanged.
- While actively implementing tasks in an FRD, set that FRD `metadata.status` to `in_progress` when work starts (unless it is already `completed`).
- Before committing, recompute each changed FRD `metadata.status` using this order:
  - `completed`: all `majorTasks[*].status` are `completed` or `skipped`.
  - `blocked`: not completed, at least one `majorTasks[*].status` is `blocked`, and none are `in_progress`.
  - `in_progress`: not completed/blocked, and at least one task is `in_progress`, `completed`, or `skipped`.
  - `not_started`: all tasks are `not_started`.
- Update `updatedAt` in every changed FRD file after status reconciliation.

## PR output files (required)
1. Create `.codex/pr` if missing.
2. Write PR body markdown to `.codex/pr/PR_BODY.md`.
3. Write machine-readable run summary to `.codex/pr/RUN_SUMMARY.json`.
4. Overwrite `.codex/pr/PR_BODY.md` and `.codex/pr/RUN_SUMMARY.json` on each run.
5. Also print the PR body in terminal output.

## RUN_SUMMARY.json schema (required fields)
Include at minimum:
- `selectedBundleTaskIds`: string[]
- `branchName`: string
- `commits`: [{"hash": string, "message": string}]
- `filesChanged`: string[]
- `validationResults`: [{"name": string, "command": string, "exitCode": number, "status": "passed"|"failed", "outputSummary": string}]
- `verificationEvidence`: [{"taskId": string, "verificationId": string, "commands": string[], "status": "passed"|"failed"|"manual_verified", "humanEvidence": string|null}]
- `taskClaim`: {"taskId": string | null, "claimRef": string | null, "status": "claimed"|"already_claimed"|"fallback_local"|"not_used", "details": string}
- `memoryUpdate`: {"file": string, "status": "appended"|"no_change", "summary": string}
- `nextBoundaryTaskId`: string | null
- `overallStatus`: "passed" | "failed"

## Final output (required)
Return:
1. Selected bundle task IDs
2. Branch name
3. Commit list (hash + message)
4. Files changed
5. Validation/test results
6. Verification evidence coverage summary (which verification IDs were satisfied)
7. Task claim summary (claim ref used, and whether claim succeeded or fallback was used)
8. Memory update summary (`appended` or `no_change`, plus short note)
9. Next boundary task ID (next `prLevel: true` not implemented)
10. A PR body in Markdown using this template:

### PR Title
`<conventional-commit-style summary for bundle>`

### PR Body
```md
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
- Verification coverage:
  - 
- Ajv schema validation:
  - 

## Risks / Notes
- 

## Follow-ups
- 
```

If no eligible tasks exist, report implementation is complete and stop.

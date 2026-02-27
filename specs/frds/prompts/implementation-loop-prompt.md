# FRD Implementation Loop Prompt

You are implementing FRD tasks from `specs/frds/` in this repo.
Do exactly one PR bundle per run.

## Inputs
- `specs/frds/index.json`
- `specs/frds/frd-schema.json`
- all `specs/frds/frd-*.json`

## Task selection rules
1. Load FRDs in `index.json` order.
2. Within each FRD, use `majorTasks` order as canonical.
3. A task is eligible if:
   - `status` is `not_started`
   - all dependencies are satisfied (`completed` or `skipped`, or included earlier in current bundle)
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

## Implementation rules
- Implement selected tasks/subtasks fully.
- Follow `filesToCreate`, `filesToModify`, `verification`, `notes`, and `gotchas`.
- Keep scope strictly to selected bundle.
- Do not implement the next `prLevel: true` task.

## Commit rules (required)
1. Use conventional commits.
2. Make multiple commits when it improves reviewability (logical checkpoints).
3. Commit format:
   - `<type>(frd): <short summary>`
4. Allowed types:
   - `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
5. Scope should include FRD/task context when possible, e.g.:
   - `feat(frd-002): add strict schema compile pipeline`
   - `test(frd-003): add mixed-batch validation coverage`
6. Do not squash during this run unless explicitly requested.
7. End with all selected tasks implemented and committed.

## Validation
- Run tests/checks required by selected tasks.
- Validate FRDs with Ajv:
  - `npx --yes -p ajv-cli@5.0.0 -p ajv-formats ajv validate -c ajv-formats --spec=draft2020 --strict=true -s specs/frds/frd-schema.json -d specs/frds/frd-001-foundation-contracts.json -d specs/frds/frd-002-schema-intake-validation.json -d specs/frds/frd-003-batch-review-pipeline.json -d specs/frds/frd-004-rendering-engine.json -d specs/frds/frd-005-ui-review-flow.json -d specs/frds/frd-006-quality-performance.json`

## FRD status updates
- Mark completed tasks/subtasks as `completed`.
- Leave future tasks unchanged.
- Update `updatedAt` in changed FRD files.

## PR output files (required)
1. Create `.codex/pr` if missing.
2. Write PR body markdown to `.codex/pr/PR_BODY.md`.
3. Write machine-readable run summary to `.codex/pr/RUN_SUMMARY.json` with:
   - selected bundle task IDs
   - branch name
   - commit list (hash + message)
   - files changed
   - validation/test results
   - next boundary task ID
4. Overwrite `.codex/pr/PR_BODY.md` and `.codex/pr/RUN_SUMMARY.json` on each run.
5. Also print the PR body in terminal output.

## Final output (required)
Return:
1. Selected bundle task IDs
2. Branch name
3. Commit list (hash + message)
4. Files changed
5. Validation/test results
6. Next boundary task ID (next `prLevel: true` not implemented)
7. A PR body in Markdown using this template:

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
- Ajv schema validation:
  - 

## Risks / Notes
- 

## Follow-ups
- 
```

If no eligible tasks exist, report implementation is complete and stop.

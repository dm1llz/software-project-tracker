---
{
  "id": "implementation-loop-strict-ci-overlay",
  "kind": "ci_overlay",
  "appliesWhen": ["mode:strict-ci"],
  "priority": 90,
  "conflictsWith": [],
  "overridesSections": []
}
---

# FRD Implementation Loop Prompt (Strict CI Overlay)

Use this overlay together with:
- `specs/frds/prompts/implementation-loop-prompt.md`

This file defines only strict-CI additions and overrides to avoid duplication/drift.

## Strict CI validation gates (required)
1. Every `verification` entry in every selected task must have at least one executed command, or be explicitly marked `manual_verified` with human evidence.
2. Every selected task that has `testRequirements` must have executed test commands.
3. If any required verification/test command fails, stop and report failure (do not mark tasks completed).
4. Do not claim success without command evidence.
5. If an expected tool is unavailable, treat as failure and report remediation unless the verification is explicitly `manual_verified` with evidence.
6. Verification entries that cannot be executed automatically (for example visual/UI checks or documentation clarity checks) may be marked `manual_verified` and must include a brief human-performed evidence string in `RUN_SUMMARY.json`.
7. Treat `manual_verified` entries as valid only when evidence text is present; fail the run if the label is missing or evidence is empty.

## FRD status override
- Mark completed tasks/subtasks as `completed` only after strict validation gates pass.

## PR output additions (required)
Add these fields in `.codex/pr/RUN_SUMMARY.json`:
- `verificationEvidence`
- `overallStatus`

## Validation result schema override (required)
- In strict CI mode, every `validationResults` entry must include:
  - `outputSummary`: short evidence summary of command output (pass/fail context)

## RUN_SUMMARY additions (required fields)
- In strict CI mode, treat all base RUN_SUMMARY schema fields as required (not optional/recommended).
- `verificationEvidence`: array of objects with `{ "taskId": string, "verificationId": string, "commands": string[], "status": "passed" | "failed" | "manual_verified", "humanEvidence": string | null }`
- `overallStatus`: `"passed" | "failed"`

## Final output additions
Include a verification evidence coverage summary (which verification IDs were satisfied).
- In PR body `## Validation`, include:
  - `Verification coverage:` bullet list mapping verification IDs to command/manual evidence.

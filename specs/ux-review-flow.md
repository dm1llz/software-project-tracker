# UX Review Flow

- Owner: David
- Status: Approved
- Last Updated: 2026-02-25
- Depends On: [mvp-frd-review-spec.md](./mvp-frd-review-spec.md), [data-contracts.md](./data-contracts.md)
- Open Questions:
  - None blocking for MVP.
  - Post-MVP backlog: Should issue panel support copy-to-clipboard.

## Purpose
Define screen-by-screen behavior for one FRD review run from schema load to per-file inspection.

## Screen 1: Empty State
- Primary action: upload schema JSON.
- Supporting text clarifies required order:
  - upload schema first
  - upload FRD files second
- No FRD upload control is active until schema is valid.

## Screen 2: Schema Loaded
- Show schema name and loaded status.
- Enable multi-file FRD upload.
- Offer replace-schema action that resets current review run state.

## Screen 3: Running State
- Show progress indicator with count of processed files.
- Disable inputs that would invalidate active run.
- Keep interface responsive during processing.

## Screen 4: Results Overview
- Show review run summary:
  - total files
  - passed
  - failed (validation failures only)
  - parse failed
- Show per-file rows/cards with status badge.
- Default sort order:
  - parse failed first
  - validation failed second
  - passed third
  - tie-breaker by upload order

## Screen 5: Per-File Detail
- Two tabs/sections:
  - Issues (all file issues)
  - Readable FRD (only for valid files)
- Issue row fields:
  - level
  - code
  - path
  - line (if available)
  - column (if available)
  - message
  - keyword (if available)
- Parse-failed files show required fixes in the Issues view and do not show a Readable FRD tab.

## Error and Edge States
- Invalid schema JSON: block run and show actionable parse error.
- Schema compile error: block run and show compile reason.
- Unsupported schema draft: block run and show run issue with expected draft and detected value.
- FRD parse failure: show parse issue and continue batch.
- Duplicate file names: display indexed labels (example: `feature.json (2)`).

## Interaction Rules
- A review run is immutable once complete unless user uploads new schema or new FRD set.
- Uploading a new schema clears prior results because validation context changed.
- Valid file readable view is generated from structured JSON only.
- Mixed-result review runs must allow successful files to be reviewed even when other files failed parsing.
- UI selection and routing should use stable file IDs (not file names) to enable future persistence.

## Traceability
- Flow baseline: [MVP Spec §6](./mvp-frd-review-spec.md#6-review-run-flow)
- UI states: [MVP Spec §7](./mvp-frd-review-spec.md#7-ux-states)
- Failure behavior: [MVP Spec §8](./mvp-frd-review-spec.md#8-failure-handling)

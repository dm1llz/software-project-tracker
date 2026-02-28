# Performance and Maintainability Baseline (FRD-009-T1)

## Scope

This baseline captures current review-run hotspots and complexity seams before FRD-009 refactors.

- Runtime/toolchain: Node `v22.11.0`
- Profiling command: `npm run profile:review-run`
- Script entrypoint: `scripts/profile-review-run.mjs`
- Sample capture time: `2026-02-28T21:30:51.971Z`

## Hotspots and Complexity Risks

1. `src/ui/ReviewRunPage.tsx` centralizes schema loading, FRD mapping, parse/validate/render orchestration, and request stale-guard logic in one component.
2. `src/domain/review-run/mapReviewInputFiles.ts` reads each source sequentially; large batches currently serialize I/O even though deterministic ordering could be preserved with ordered concurrency.
3. `src/ui/ReviewRunPage.tsx` updates progress state for each processed file, which can increase render churn under larger batches.
4. `src/ui/components/FileResultListView.tsx` and `src/ui/components/ReadableFrdSectionView.tsx` render full lists without memoized row boundaries, increasing re-render work during repeated state updates.

## Baseline Metrics

Scenario | Files | Passed | Validation Failed | Parse Failed | Avg Total (ms) | Avg Per File (ms)
--- | ---:| ---:| ---:| ---:| ---:| ---:
success_mixed_size | 5 | 5 | 0 | 0 | 10.57 | 2.113
error_parse_and_validation | 5 | 2 | 2 | 1 | 5.46 | 1.091
edge_large_batch_60 | 60 | 47 | 8 | 5 | 4.93 | 0.082

## Reproducibility

Run one command to regenerate baseline metrics JSON and terminal table:

```bash
npm run profile:review-run
```

This command writes machine-readable metrics to `.codex/pr/profile-review-run.json` and prints the scenario table above.

## Notes for FRD-009-T2/T3

- T2 should extract orchestration from `ReviewRunPage` first to reduce change risk before optimization work.
- T3 should prioritize measured improvements in render/update behavior while preserving deterministic result ordering and status contracts.
- Note: profiler numbers include per-iteration schema compile cost, so compare T2/T3 results with this compile-time overhead in mind rather than attributing all measured time to runtime orchestration work.

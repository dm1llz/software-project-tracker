import { deriveScreenState, type DeriveScreenStateInput, type ReviewScreenState } from "./deriveScreenState";
import type { ReviewRunStoreState } from "./reviewRunStore";

export const deriveScreenStateInputFromStore = (
  state: ReviewRunStoreState,
): DeriveScreenStateInput => ({
  schemaLoaded: state.schemaName !== null,
  isRunning: state.isRunning,
  hasCompletedRun: state.hasCompletedRun,
  runIssues: state.runIssues,
});

export const deriveScreenStateFromStore = (
  state: ReviewRunStoreState,
): ReviewScreenState => deriveScreenState(deriveScreenStateInputFromStore(state));

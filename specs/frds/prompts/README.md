# Prompt Chain Structure

Use a composable prompt chain to reduce duplication and drift.

## Base prompt
- `implementation-loop-prompt.md`
- Contains shared FRD workflow, quality defaults, claim lifecycle rules, date/timestamp conventions, and PR artifact requirements.

## Strict-CI overlay
- `implementation-loop-prompt-strict-ci.md`
- Add only when strict verification gating is required.
- This file is additive and does not duplicate the base prompt.

## Language overlays (optional)
Create language-specific overlays only when needed (for example `language-typescript.md`, `language-python.md`).
Keep overlays focused on ecosystem conventions, toolchain usage, testing style, and formatting/linting expectations.

Current language overlays:
- `language-typescript.md`

## Authoring rules
1. Keep cross-language policy in the base prompt.
2. Put CI policy in overlays, not in copied full prompts.
3. If a rule applies to all modes, update base prompt once.
4. If a rule is mode-specific, add/update only the relevant overlay.

## Part metadata (required)
Each prompt part file must begin with JSON frontmatter:
- `id`: stable unique part id
- `kind`: `base` | `overlay` | `language_overlay` | `ci_overlay`
- `appliesWhen`: non-empty string array for applicability hints
- `priority`: integer precedence. Higher number = higher priority.
  - Higher-priority parts must appear later in chain order (loaded last).
  - Chain priority order must be non-decreasing (for example `10 -> 50 -> 90`).
- `conflictsWith`: part-id list that must not coexist in one chain
- `overridesSections`: section-title list this part intentionally overrides

## Prompt assembler
- Manifest: `prompt-chains.json`
- Script: `scripts/assemble-prompts.mjs`

Common commands:
1. List chains: `npm run prompt:list`
2. Lint chain metadata and composition rules: `npm run prompt:lint`
3. Assemble all chains: `npm run prompt:assemble`
4. Assemble one chain: `npm run prompt:assemble -- --chain implementation-loop-typescript`
5. Print one chain to stdout: `npm run prompt:assemble -- --chain implementation-loop-strict-ci --stdout`

Default output directory:
- `specs/frds/prompts/dist/`

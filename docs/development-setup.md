# Development Setup

## Runtime Baseline

- Node.js: `v22.11.0` (from `.nvmrc`)
- Package manager: `npm` (canonical manager for this repository)

## Initial Setup

1. `nvm use` (or install Node `22.11.0` first)
2. `npm install`
3. Install Playwright browser binaries: `npm run test:e2e:install`

## Standard Commands

- Build: `npm run build`
- Unit tests: `npm run test:unit`
- Integration tests: `npm run test:integration`
- End-to-end tests: `npm run test:e2e`
- FRD schema validation: `npm run validate:schema`
- List prompt chains: `npm run prompt:list`
- Lint prompt chains: `npm run prompt:lint`
- Assemble prompt chains: `npm run prompt:assemble`

## Notes

- Use `npm` consistently so lockfile resolution stays deterministic in local and CI runs.
- E2E uses Playwright config in `playwright.config.ts`, which auto-starts Vite dev server at `http://127.0.0.1:4173`.

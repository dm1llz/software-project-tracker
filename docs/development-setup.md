# Development Setup

## Runtime Baseline

- Node.js: `v22.11.0` (from `.nvmrc`)
- Package manager: `npm` (canonical manager for this repository)

## Initial Setup

1. `nvm use` (or install Node `22.11.0` first)
2. `npm install`

## Standard Commands

- Build: `npm run build`
- Unit tests: `npm run test:unit`
- Integration tests: `npm run test:integration`
- End-to-end tests: `npm run test:e2e`
- FRD schema validation: `npm run validate:schema`

## Notes

- Use `npm` consistently so lockfile resolution stays deterministic in local and CI runs.

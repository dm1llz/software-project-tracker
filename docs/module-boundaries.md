# Module Boundaries

This project follows the module layout defined in `specs/architecture-overview.md`:

- `src/ui/`
- `src/domain/review-run/`
- `src/domain/validation/`
- `src/domain/rendering/`
- `src/infra/workers/`
- `src/types/`

## Allowed Dependency Directions

| Importer | Allowed Imports |
| --- | --- |
| `ui` | `domain/review-run`, `domain/validation`, `domain/rendering`, `types` |
| `domain/review-run` | `domain/validation`, `domain/rendering`, `types` |
| `domain/validation` | `types` |
| `domain/rendering` | `types` |
| `infra/workers` | `domain/review-run`, `domain/validation`, `domain/rendering`, `types` |
| `types` | `types` only |

## Guardrail

- Domain modules must remain framework-agnostic and must not import from `src/ui/`.
- Boundary rules are codified in `src/types/moduleBoundaryPolicy.ts` and validated via integration tests.

# Compatibility and Interference Audit — D&D 5e 2024 v1.0.1

## Scope

Complete production-tree audit of Runyth Hunter's Bestiary - D&D 5e 2024 v1.0.0, patched as v1.0.1 against core v1.2.1, Foundry VTT 13.351, and D&D 5e 5.3.3.

## Issues found and corrected

| Area | Affected files | Root cause | Correction |
|---|---|---|---|
| Startup coupling | `scripts/main.mjs`, `scripts/api.mjs` | A settings/core/adapter failure could prevent useful API diagnostics | Exposes the API first, isolates each startup stage, and always resolves readiness with explicit status/failures |
| Repeated adapter/settings registration | `scripts/adapter.mjs`, `scripts/settings.mjs` | Repeated lifecycle calls could register the same adapter or settings again | Added per-core-API adapter guards and settings registration guards |
| Embedded-document ownership | `scripts/dnd5e-builder.mjs` | Generated Traits and Actions lacked stable provider-management markers | Added core-managed flags and stable D&D provider keys to every generated embedded document |
| Application listener lifecycle | `scripts/apps/base-app.mjs` | Repeated dashboard renders could retain listeners/timers | Added per-render abort cleanup and persistent window geometry |
| Global CSS utilities | `styles/runyth-hunters-bestiary-dnd5e.css` | `.muted` and `.table-scroll` could affect unrelated DOM | Scoped both beneath module-owned application roots |
| Dependency and packaging | `module.json`, `README.md`, `docs/TEST-PLAN.md`, `tools/build.mjs` | Patch relies on core's managed-document and security fixes; runtime ZIP included source docs | Raised core minimum to 1.2.1 and limited install ZIP to runtime files |

## Intentionally unchanged behavior

- The D&D integration registers no Foundry render hooks beyond `init` and `ready` lifecycle hooks.
- It owns no Actor-sheet, Item-sheet, Token HUD, Scene Control, Chat-render, directory-render, or canvas hook.
- D&D and Tidy sheets receive no injected control or CSS from this module.
- Existing D&D stat-block/provider API signatures remain unchanged.
- Existing generated Actor identities, folders, ownership, and unrelated embedded content are preserved by core v1.2.1 refresh logic.
- Partial D&D packs remain rejected unless the existing explicit GM setting permits them.

## External errors

No external-package runtime log was supplied. No workarounds were added for other packages. Live coexistence with Tidy, Midi-QOL, DAE, Token HUD extensions, and Chat extensions remains part of the documented manual matrix.

## Automated result

- Static validation groups: 9 passed
- Node tests: 12 passed
- Production scripts syntax-checked: 10
- Localization parity: 51 English/German keys
- Runtime client test: not executable in the build environment; use `docs/TEST-PLAN.md`

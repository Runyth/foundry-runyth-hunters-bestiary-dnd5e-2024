# Patch Qualification — 1.1.6

## Scope

- Restore all Configure Settings menus.
- Restore early public API availability.
- Eliminate runtime dependence on nested browser-fetched source modules.

## Preservation

- Stable module ID, settings keys, stat-block IDs, provider IDs, imported content, provenance flags, and dependency floors are unchanged.
- Internal source modules remain in the source archive for maintainability.
- The install archive uses the generated root runtime bundle only.

## Automated qualification

- 30/30 automated tests passed.
- 11/11 static validation groups passed.
- English/German localization parity: 90/90 keys.
- The bundled Init hook registers all three settings menus and exposes the API in isolation.
- The root runtime contains no static or dynamic imports.

## Runtime limitation

A live Foundry client was not launched in the build environment. Follow `MANUAL-TEST-PLAN-1.1.6.md` before campaign use.

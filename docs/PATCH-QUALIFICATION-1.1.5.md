# Patch Qualification — 1.1.5

## Scope

- Correct all 48 bundled harvest Item icons.
- Update existing exact-provenance managed harvest Items in place.
- Add a primary **Import everything** workflow for all module-importable Actors and Items.

## Preservation

- Stable module ID, stat-block IDs, provider IDs, Actor links, and settings keys are unchanged.
- Existing Item folder placement and ownership remain unchanged during managed updates.
- Unrelated flags and unmanaged Items are outside the update scope.
- The compatibility `createHarvestItems` API remains available and now performs idempotent managed upserts.

## Automated qualification

- 27/27 automated tests passed.
- 10/10 static validation groups passed.
- English/German localization parity: 90/90 keys.
- Two consecutive builds were byte-identical.
- Building from the extracted source ZIP reproduced both ZIP artifacts byte-for-byte.

## Runtime limitation

A live Foundry VTT client was not launched in the build environment. Follow `MANUAL-TEST-PLAN-1.1.5.md` in Foundry v13.351 with D&D 5e 5.3.3.

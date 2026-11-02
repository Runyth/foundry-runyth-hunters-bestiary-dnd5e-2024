# Hunter's Bestiary - D&D 5e 2024 1.1.1 Release Notes

Released 2026-07-31. Patch release from 1.1.0.

## Fixed

The Configure Settings > Open Dashboard launcher no longer fails with `Cannot add property minWidth, object is not extensible`.

Foundry v13 seals its live ApplicationPosition object to the supported position fields. The previous dashboard defaults incorrectly included `minWidth` and `minHeight` in that object. Version 1.1.1 removes those unsupported fields while retaining 560 x 420 minimum geometry in the shared persistence/clamping layer.

## Compatibility

Requires Hunter's Bestiary 1.3.1 and D&D 5e 5.3.3. Stable IDs, settings, stat blocks, imported Actors, provenance flags, and APIs are unchanged.

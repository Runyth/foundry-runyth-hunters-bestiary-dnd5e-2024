# Hunter's Bestiary - D&D 5e 2024 1.2.2

Patch release focused on responsiveness, reduced document and DOM work, safe asynchronous concurrency, and Foundry-specific batching. No gameplay rules, stable IDs, localization keys, public APIs, or user data formats were intentionally changed.

## Changes

- Added one-pass harvest Item indexing and Foundry bulk create/update operations with precise individual fallback on batch failure.
- Changed Import Everything to one coordinated Actor and Item operation instead of repeated per-monster world scans.
- Parallelized independent settings and folder reconciliation work and used bulk document/folder updates where supported.
- Cached stat-block data and concurrent in-flight requests using the browser cache.
- Preindexed dashboard catalogue rows and stopped rerendering an already open unchanged dashboard.
- Made geometry persistence non-blocking during close and disabled unnecessary progress-window close animation.

## Compatibility

Install Hunter's Bestiary 1.4.2 first. Existing managed Actors, Items, folders, icons, and provenance flags remain valid.

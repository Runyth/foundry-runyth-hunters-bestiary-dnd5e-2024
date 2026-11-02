# Performance Audit — Runyth Hunter's Bestiary - D&D 5e 2024 1.2.2

## Scope

The complete production source, dashboard lifecycle, data loading, settings persistence, import/update/delete workflows, provider registration, and packaging paths were reviewed for browser responsiveness and Foundry VTT v13 behavior.

## Applied improvements

- Added one-pass harvest Item indexing and Foundry bulk create/update operations with precise individual fallback on batch failure.
- Changed Import Everything to one coordinated Actor and Item operation instead of repeated per-monster world scans.
- Parallelized independent settings and folder reconciliation work and used bulk document/folder updates where supported.
- Cached stat-block data and concurrent in-flight requests using the browser cache.
- Preindexed dashboard catalogue rows and stopped rerendering an already open unchanged dashboard.
- Made geometry persistence non-blocking during close and disabled unnecessary progress-window close animation.

## Deliberately serialized work

Asynchronous concurrency is bounded rather than unlimited. Operations that mutate one shared user record, require atomic provider/world-state replacement, or need precise per-document fallback diagnostics remain serialized. This prevents lost updates, request floods, and non-deterministic partial state while unrelated work proceeds concurrently.

## Browser and Foundry considerations

- Long independent batches use bounded concurrency rather than unbounded `Promise.all`.
- Fallback loops yield periodically so painting and input are not starved.
- Foundry bulk document methods and `render: false` are used where preserving per-document diagnostics allows it.
- Search and progress DOM writes are coalesced instead of triggering repeated synchronous layout work.
- Cached data loaders use a shared in-flight promise and normal browser caching.
- Window-state writes are coalesced and do not delay close animations.

## Regression coverage

- Automated tests: **40/40**
- English/German key parity: **402/402**
- New coverage includes concurrency limits, result ordering, shared-fetch deduplication, settings-write races, same-user mutation serialization, batch imports, and parallel dependency readiness where applicable.

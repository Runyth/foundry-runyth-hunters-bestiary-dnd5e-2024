## 1.2.2 — 2026-08-03

- Added one-pass harvest Item indexing and Foundry bulk create/update operations with precise individual fallback on batch failure.
- Changed Import Everything to one coordinated Actor and Item operation instead of repeated per-monster world scans.
- Parallelized independent settings and folder reconciliation work and used bulk document/folder updates where supported.
- Cached stat-block data and concurrent in-flight requests using the browser cache.
- Preindexed dashboard catalogue rows and stopped rerendering an already open unchanged dashboard.
- Made geometry persistence non-blocking during close and disabled unnecessary progress-window close animation.

## 1.2.1 — 2026-08-03

- Replaced embedded bilingual content records with standard Foundry localization keys.
- Made Foundry’s global Language Preference the sole language selector.
- Removed custom translation loading/injection and language-specific runtime branches.
- Added future-language authoring documentation and regression coverage.
- Preserved the coordinated actor-image feature set and all stable IDs and settings.

# Changelog

## 1.2.0

- Added clickable quarry images using Foundry’s standard file picker.
- Synchronized dashboard, Actor portrait, and prototype-token images through Hunter’s Bestiary core.
- Added source packaging documentation.

## 1.1.7

- Defined registry contract 1.1.0 with explicit validation and registration signatures, structured diagnostics, idempotent provider replacement, and atomic rollback.
- Removed copied unrestricted failure traversal and delegated operation inspection to Hunter's Bestiary 1.3.6.
- Preserved explicit nested import-everything results without enumerating returned Foundry Documents.
- Added invalid-record, replacement, stale-record, and signature regression coverage.

## 1.1.6

- Restored the complete Configure Settings category by replacing the nested runtime import graph with one root-level bundled Foundry entry module.
- Ensured the Init hook can register Open Dashboard, Reset Size, Reset Position, and all world/client settings without fetching secondary runtime modules.
- Ensured the public API is exposed during Init before complementary modules inspect it.
- Removed runtime network requests for `scripts/apps/base-app.mjs`, `scripts/harvest-import.mjs`, `scripts/managed-resources.mjs`, and the rest of the internal source graph.
- Added deterministic runtime bundling, bundle-drift prevention, and settings-bootstrap regression coverage.

## 1.1.5

- Replaced the invalid one-size-fits-all harvest Item portrait with semantically appropriate Foundry core icons for all 48 bundled harvest definitions.
- Added deterministic icon fallback rules and explicit third-party `img` override support.
- Made **Import or update Items** idempotently update existing managed Items, including their corrected icons, instead of creating duplicates.
- Added a primary **Import everything** dashboard action covering Actor import/update and harvest Item import/update in one progress operation.
- Added regression tests for icon diversity, managed Item upserts, and the combined import workflow.

## 1.1.4

- Kept progress windows open whenever import, update, harvest, or deletion results contain any failure.
- Preserved and surfaced per-resource failure details for manual review.
- Adopted the core 1.3.3 fixed-width shared progress dialog.


## 1.1.3 - 2026-07-31

- Reconciled legacy and canonical managed Actor/Item folders without name-only ownership inference.
- Added automatic and manual imported-folder repair.
- Added strict provenance-scoped deletion of imported Actors and harvest Items.
- Added guarded core Actor unlinking and empty managed-folder cleanup.
- Added English/German UI, confirmation, progress, and result text.

## 1.1.2 - 2026-07-31

- Kept import and update progress windows in front of their owning dashboard while operations are active.
- Automatically closed completed progress windows after the final notification and summary were emitted.
- Closed any still-owned progress windows when the dashboard itself closes, preventing orphaned background dialogs.
- Preserved the shared Hunter's Bestiary progress implementation, operation counts, busy states, and error reporting.
- Added regression coverage for progress-window ownership, foregrounding, and cleanup.

## 1.1.1 - 2026-07-31

- Fixed the global-settings Open Dashboard action on Foundry v13.
- Removed unsupported `minWidth` and `minHeight` keys from ApplicationV2 position defaults.
- Retained the same effective minimum geometry through the shared persistence layer.
- Added a regression test that prevents non-position keys from entering ApplicationV2 position defaults.
- Updated the core dependency to Hunter's Bestiary 1.3.1.


- Normalized the canonical family title and coordinated dependency versions across all four official modules.
- Added/consumed the core naming API with structured validation, registrations, startup warning deduplication, and dashboard-open warnings.
- Added/consumed the shared dashboard toolkit for ApplicationV2 geometry, reset controls, stable search, progress, busy states, operation reporting, and safe destructive confirmations.
- Preserved stable module IDs, existing settings and flags, imported content identities, provider IDs, and documented compatibility aliases.
- Added complete English/German localization parity, developer guidance, migration documentation, tests, and release qualification artifacts.
- Retained this module's high-contrast d&d integration palette and module-specific functionality.


## 1.0.1 — 2026-07-29

- Isolated initialization failures so the public API remains available with explicit status diagnostics.
- Made settings and system-adapter registration idempotent across repeated lifecycle calls.
- Marked generated D&D Traits and Actions as provider-managed so core refreshes preserve unrelated Actor content.
- Added ApplicationV2 listener cleanup, persistent window geometry, scoped CSS, and interference regression tests.
- Raised the required Hunter's Bestiary core version to 1.2.1.
- Excluded source-only documentation from the installable archive.

## 1.0.0

- Added the reference D&D 5e 2024 system adapter for Hunter's Bestiary v1.2.0.
- Added 24 original NPC stat blocks for all built-in quarry.
- Added native D&D D20 field checks, harvest loot Items, and encounter profiles.
- Added GM Actor provisioning and update controls with preserved ownership and folders.
- Added a public stat-block registry and atomic full-monster-pack registration API.
- Added strict completeness validation with an explicit opt-in setting for partial D&D packs.
- Added English and German localization, persistent dashboard geometry, documentation, tests, and deterministic release builds.

# Architecture

The integration has four boundaries:

1. **Core world data:** ecology, tracks, rumors, books, hunts, permissions, personal progress, exports.
2. **Runtime D&D registry:** validated D&D 5e 2024 stat blocks keyed by the core monster ID.
3. **Core system adapter:** native rolls, Actor source data, harvest Item data, and encounter profiles.
4. **Foundry documents:** optional world Actors and Items created by explicit GM action.

No D&D document data is persisted into the system-neutral core catalogue. This keeps exports portable and permits another system adapter to use the same hunting campaign data.

The module also registers the legacy-compatible core Actor-adapter capability under the same ID. This allows complementary monster bundles to explicitly declare an adapter Actor source while built-in system-neutral quarry are supplied through the active system adapter fallback.

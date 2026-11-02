# Manual Test Plan — 1.1.6

Use Foundry VTT 13.351, D&D 5e 5.3.3, and Runyth Hunter's Bestiary 1.3.5 or newer.

1. Stop Foundry and remove any old `runyth-hunters-bestiary-dnd5e-2024` directory.
2. Install the 1.1.6 ZIP and start the world.
3. Confirm no requests are made for nested files under `modules/runyth-hunters-bestiary-dnd5e-2024/scripts/`.
4. Open Configure Settings and confirm the module category contains Open Dashboard, Reset Size, Reset Position, onboarding, incomplete-pack, Actor-folder, and Item-folder settings.
5. Open the dashboard through Configure Settings.
6. Confirm `game.modules.get("runyth-hunters-bestiary-dnd5e-2024").api` exists in the browser console.
7. Run Import everything and verify Actors and Items are imported or updated.
8. Reload the world and confirm Aquatic Ecology D&D no longer reports that the core D&D API is unavailable.
9. Confirm existing managed Actors, Items, folders, and settings remain intact.

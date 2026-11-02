# Release Notes — 1.1.6

This patch restores the Runyth Hunter's Bestiary D&D 5e 2024 Configure Settings entry and public API availability.

The 1.1.5 install was structurally complete, but Foundry reported browser loading failures for nested runtime modules such as `scripts/apps/base-app.mjs`, `scripts/harvest-import.mjs`, and `scripts/managed-resources.mjs`. Because ES-module evaluation stopped before the `init` hook was registered, no settings menus or public API were exposed.

Version 1.1.6 generates one root-level `main.mjs` containing the complete runtime. Foundry therefore performs a single module-entry request. Settings registration and API exposure no longer depend on additional browser module requests.

No imported content or persistent settings are migrated or renamed.

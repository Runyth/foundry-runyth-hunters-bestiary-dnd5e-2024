# Hunter's Bestiary - D&D 5e 2024 1.1.5

This patch corrects all bundled harvest Item portraits and adds a single complete-import workflow. Every bundled material now selects a fitting icon from Foundry's built-in icon catalogue. Existing managed Items are updated in place when **Import or update Items** or **Import everything** runs.

The combined action imports or updates supported Actors first, then imports or updates all harvest Items using one progress operation. Partial failures remain visible through the existing progress/error handling.

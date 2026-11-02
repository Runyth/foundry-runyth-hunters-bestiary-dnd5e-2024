# Actor images

This module uses the Hunter’s Bestiary core image service. A monster has one effective image shared by the D&D dashboard, imported Actor portrait, prototype-token texture, and core dashboard after synchronization.

## Pre-packed images

The twenty-four base D&D stat blocks correspond to the core monsters in `hunters-bestiary/data/seed.json`. To pre-pack custom artwork:

1. Put image files below `hunters-bestiary/assets/actors/`.
2. Update each matching core monster’s `img` field to the module-relative path.
3. Build Hunter’s Bestiary first, then this module.

Using stable filenames such as `ashback-troll.webp` makes future replacements straightforward.

## Installed world

A GM may click a quarry thumbnail in this dashboard. Foundry’s standard FilePicker permits browsing and, when allowed, uploading. The selected path is stored as a world override and immediately applied to the linked Actor and its prototype token.

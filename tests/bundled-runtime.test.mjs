// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));
const bundle = readFileSync(new URL("../main.mjs", import.meta.url), "utf8");

test("Foundry loads one root-level runtime bundle", () => {
  assert.deepEqual(manifest.esmodules, ["main.mjs"]);
  assert.doesNotMatch(bundle, /^\s*import\b/m);
  assert.doesNotMatch(bundle, /\bimport\s*\(/);
});

test("runtime bundle contains settings, API, dashboard, and resource workflows", () => {
  for (const marker of [
    "registerSettings",
    "HuntersBestiaryDnd5eAPI",
    "DashboardApp",
    "importOrUpdateHarvestItems",
    "deleteImportedResources"
  ]) assert.match(bundle, new RegExp(marker));
});

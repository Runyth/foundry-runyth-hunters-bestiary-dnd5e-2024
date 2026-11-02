// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Foundry v13 entrypoint imports against ApplicationV2", async () => {
  const previous = { foundry: globalThis.foundry, Hooks: globalThis.Hooks };
  class MockApplicationV2 {}
  globalThis.foundry = {
    applications: {
      api: {
        ApplicationV2: MockApplicationV2,
        HandlebarsApplicationMixin: Base => Base,
        DialogV2: class MockDialogV2 {}
      },
      instances: new Map()
    },
    utils: {}
  };
  const registrations = [];
  globalThis.Hooks = {
    once: (hook, callback) => registrations.push({ hook, callback }),
    callAll: () => undefined
  };
  try {
    await import(`../main.mjs?smoke=${Date.now()}`);
    assert.deepEqual(registrations.map(entry => entry.hook), ["init", "ready"]);
  } finally {
    globalThis.foundry = previous.foundry;
    globalThis.Hooks = previous.Hooks;
  }
});

test("official system layer registers canonical naming metadata and validates on dashboard open", () => {
  const main = readFileSync(new URL("../main.mjs", import.meta.url), "utf8");
  const api = readFileSync(new URL("../scripts/api.mjs", import.meta.url), "utf8");
  assert.match(main, /type: "system-layer"/);
  assert.match(main, /gameSystem: "D&D 5e 2024"/);
  assert.match(api, /validateDashboardModuleName/);
});

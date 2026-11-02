// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { registerSettings } from "../scripts/settings.mjs";

test("D&D integration settings register once", () => {
  const previous = globalThis.game;
  const calls = [];
  globalThis.game = { settings: {
    registerMenu: (...args) => calls.push(["menu", ...args]),
    register: (...args) => calls.push(["setting", ...args])
  } };
  try {
    assert.equal(registerSettings(class {}), true);
    assert.equal(registerSettings(class {}), false);
    assert.ok(calls.length > 0);
  } finally {
    globalThis.game = previous;
  }
});

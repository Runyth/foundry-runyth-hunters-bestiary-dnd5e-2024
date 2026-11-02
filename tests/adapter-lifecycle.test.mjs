import test from "node:test";
import assert from "node:assert/strict";
import { registerCoreAdapters, resetAdapterRegistrationForTests } from "../scripts/adapter.mjs";

const registry = { has: () => true, get: () => ({}) };

test("D&D core adapters register once per core API instance", () => {
  const previous = { Hooks: globalThis.Hooks };
  const calls = [];
  globalThis.Hooks = { callAll: () => undefined };
  const core = {
    registerActorAdapter: id => calls.push(`actor:${id}`),
    registerSystemAdapter: id => calls.push(`system:${id}`),
    unregisterActorAdapter: () => undefined,
    unregisterSystemAdapter: () => undefined
  };
  try {
    resetAdapterRegistrationForTests();
    assert.ok(registerCoreAdapters(core, registry));
    assert.equal(registerCoreAdapters(core, registry), false);
    assert.equal(calls.length, 2);
  } finally {
    resetAdapterRegistrationForTests();
    globalThis.Hooks = previous.Hooks;
  }
});

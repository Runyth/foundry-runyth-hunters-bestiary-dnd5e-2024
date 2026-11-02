import test from "node:test";
import assert from "node:assert/strict";

function snapshotGlobals() {
  return {
    foundry: globalThis.foundry,
    Hooks: globalThis.Hooks,
    game: globalThis.game,
    api: globalThis.HuntersBestiaryDnd5e
  };
}

function restoreGlobals(previous) {
  globalThis.foundry = previous.foundry;
  globalThis.Hooks = previous.Hooks;
  globalThis.game = previous.game;
  if (previous.api === undefined) delete globalThis.HuntersBestiaryDnd5e;
  else globalThis.HuntersBestiaryDnd5e = previous.api;
}

test("bundled init hook always registers global settings and exposes the API", async () => {
  const previous = snapshotGlobals();
  const hooks = [];
  const menus = [];
  const settings = [];
  const moduleRecord = { active: true, title: "Runyth Hunter's Bestiary - D&D 5e 2024", version: "1.2.2" };

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
  globalThis.Hooks = {
    once: (hook, callback) => hooks.push({ hook, callback }),
    callAll: () => undefined
  };
  globalThis.game = {
    modules: new Map([["runyth-hunters-bestiary-dnd5e-2024", moduleRecord]]),
    settings: {
      registerMenu: (...args) => menus.push(args),
      register: (...args) => settings.push(args)
    }
  };

  try {
    await import(`../main.mjs?settings-bootstrap=${Date.now()}`);
    const init = hooks.find(entry => entry.hook === "init");
    assert.ok(init, "init hook must be registered");
    init.callback();

    assert.equal(menus.length, 3, "Open Dashboard, Reset Size, and Reset Position must register");
    assert.ok(settings.length >= 6, "world and client settings must register");
    assert.equal(moduleRecord.api, globalThis.HuntersBestiaryDnd5e);
    assert.equal(typeof moduleRecord.api?.open, "function");
  } finally {
    restoreGlobals(previous);
  }
});

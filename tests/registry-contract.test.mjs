import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { HuntersBestiaryDnd5eAPI } from "../scripts/api.mjs";
import { STATBLOCK_REGISTRY_CONTRACT_VERSION, StatblockRegistry, StatblockValidationError } from "../scripts/registry.mjs";

const data = JSON.parse(await readFile(new URL("../data/statblocks.json", import.meta.url), "utf8"));

function withRuntime(callback) {
  const previous = { game: globalThis.game, Hooks: globalThis.Hooks };
  globalThis.game = {
    user: { isGM: true },
    settings: { get: () => false },
    modules: new Map([
      ["runyth-hunters-bestiary-dnd5e-2024", { version: "1.2.2" }],
      ["runyth-hunters-bestiary", { api: {} }]
    ])
  };
  globalThis.Hooks = { callAll() {} };
  return Promise.resolve(callback()).finally(() => {
    globalThis.game = previous.game;
    globalThis.Hooks = previous.Hooks;
  });
}

test("public registry contract defines the supported validation and registration signatures", async () => {
  await withRuntime(() => {
    const api = new HuntersBestiaryDnd5eAPI(new StatblockRegistry());
    const contract = api.getRegistryContract();
    assert.equal(contract.version, STATBLOCK_REGISTRY_CONTRACT_VERSION);
    assert.equal(contract.validateSignature, "validateStatblocks(records, options)");
    assert.equal(contract.registerSignature, "registerStatblocks(providerId, records, options)");
    assert.equal(contract.replacementIsAtomic, true);
    assert.throws(
      () => api.validateStatblocks("provider-id", data.records),
      error => error instanceof TypeError && error.registryDiagnostic?.rule === "validate-signature"
    );
  });
});

test("invalid third-party records retain useful structured diagnostics", () => {
  const registry = new StatblockRegistry();
  assert.throws(
    () => registry.register("invalid-provider", [{ monsterId: "invalid", rules: "2024" }]),
    error => {
      assert.ok(error instanceof StatblockValidationError);
      assert.equal(error.reports[0].monsterId, "invalid");
      assert.ok(error.reports[0].issues.some(issue => issue.rule === "hit-points" && issue.field === "hp"));
      assert.ok(error.reports[0].issues.some(issue => issue.rule === "actions"));
      return true;
    }
  );
});

test("provider registration is idempotent and replacement removes stale records", async () => {
  await withRuntime(() => {
    const registry = new StatblockRegistry();
    const api = new HuntersBestiaryDnd5eAPI(registry);
    api.registerStatblocks("provider", data.records.slice(0, 2));
    api.registerStatblocks("provider", data.records.slice(0, 2));
    assert.equal(api.getStatblocks({ providerId: "provider" }).length, 2);
    api.registerStatblocks("provider", data.records.slice(2, 3));
    assert.deepEqual(api.getStatblocks({ providerId: "provider" }).map(record => record.monsterId), [data.records[2].monsterId]);
  });
});

test("a rejected replacement leaves the previous provider records intact", async () => {
  await withRuntime(() => {
    const registry = new StatblockRegistry();
    const api = new HuntersBestiaryDnd5eAPI(registry);
    api.registerStatblocks("provider", data.records.slice(0, 2));
    assert.throws(() => api.registerStatblocks("provider", [{ monsterId: "broken", rules: "2024" }]));
    assert.deepEqual(
      api.getStatblocks({ providerId: "provider" }).map(record => record.monsterId),
      data.records.slice(0, 2).map(record => record.monsterId)
    );
  });
});

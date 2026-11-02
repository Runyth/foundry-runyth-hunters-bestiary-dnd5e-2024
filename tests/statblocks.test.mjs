import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { StatblockRegistry, StatblockValidationError } from "../scripts/registry.mjs";

const data = JSON.parse(await readFile(new URL("../data/statblocks.json", import.meta.url), "utf8"));

test("bundled stat blocks form a complete 24-monster library", () => {
  const registry = new StatblockRegistry();
  const result = registry.register("core", data.records);
  assert.equal(result.complete, true);
  assert.equal(registry.size, 24);
  assert.equal(new Set(data.records.map(record => record.monsterId)).size, 24);
});

test("every record has playable actions and harvest Items", () => {
  const validSizes = new Set(["tiny", "sm", "med", "lg", "huge", "grg"]);
  for (const record of data.records) {
    assert.equal(record.rules, "2024");
    assert.ok(validSizes.has(record.size), `${record.monsterId}: invalid size`);
    assert.ok(record.actions.length >= 1, record.monsterId);
    assert.ok(record.traits.length >= 1, record.monsterId);
    assert.ok(record.harvest.length >= 2, record.monsterId);
    assert.ok(record.hp.value > 0, record.monsterId);
    assert.match(record.hp.formula, /^\d+d\d+(\s*[+-]\s*\d+)?$/i, record.monsterId);
  }
});

test("incomplete third-party records are rejected unless explicitly allowed", () => {
  const registry = new StatblockRegistry();
  const partial = { monsterId: "partial", rules: "2024" };
  assert.throws(() => registry.register("partial", [partial]), error => error instanceof StatblockValidationError);
  const accepted = registry.register("partial", [partial], { allowPartial: true });
  assert.equal(accepted.complete, false);
  assert.equal(registry.size, 1);
});

test("provider replacement removes stale stat blocks", () => {
  const registry = new StatblockRegistry();
  registry.register("provider", [data.records[0]]);
  registry.register("provider", [data.records[1]], { replaceProviderContent: true });
  assert.equal(registry.has(data.records[0].monsterId), false);
  assert.equal(registry.has(data.records[1].monsterId), true);
});

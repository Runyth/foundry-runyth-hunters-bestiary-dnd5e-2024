import test from "node:test";
import assert from "node:assert/strict";
import { importOrUpdateHarvestItems } from "../scripts/harvest-import.mjs";

function managedItem(index, img = "old.webp") {
  return {
    documentName: "Item",
    img,
    flags: {
      "hunters-bestiary": { source: "harvest:test-monster", monsterId: "test-monster" },
      "hunters-bestiary-dnd5e-2024": { monsterId: "test-monster", harvestIndex: index }
    },
    async update(data) { this.updated = data; this.img = data.img; }
  };
}

test("harvest import updates existing managed Items and creates only missing Items", async () => {
  const existing = managedItem(0);
  const createdPayloads = [];
  globalThis.game = {
    user: { isGM: true },
    items: { contents: [existing] },
    folders: [{ id: "folder", name: "Harvest", type: "Item" }]
  };
  globalThis.CONFIG = { Item: { documentClass: { createDocuments: async payloads => {
    createdPayloads.push(...payloads);
    return payloads.map((payload, index) => ({ id: `new-${index}`, ...payload }));
  } } } };
  const result = await importOrUpdateHarvestItems({
    monsterId: "test-monster",
    folderName: "Harvest",
    records: [
      { name: "Updated", type: "loot", img: "icons/one.webp", system: {}, flags: { "hunters-bestiary-dnd5e-2024": { harvestIndex: 0 } } },
      { name: "Created", type: "loot", img: "icons/two.webp", system: {}, flags: { "hunters-bestiary-dnd5e-2024": { harvestIndex: 1 } } }
    ]
  });
  assert.equal(result.updated.length, 1);
  assert.equal(result.created.length, 1);
  assert.equal(result.failed.length, 0);
  assert.equal(existing.updated.img, "icons/one.webp");
  assert.equal(createdPayloads[0].img, "icons/two.webp");
  assert.equal(createdPayloads[0].folder, "folder");
});

test("harvest import batches multiple managed updates and creates", async () => {
  const existingA = { ...managedItem(0), id: "a" };
  const existingB = { ...managedItem(1), id: "b" };
  const calls = { updates: [], creates: [] };
  globalThis.game = {
    user: { isGM: true },
    items: { contents: [existingA, existingB] },
    folders: [{ id: "folder", name: "Harvest", type: "Item" }]
  };
  globalThis.CONFIG = { Item: { documentClass: {
    async updateDocuments(payloads) { calls.updates.push(payloads); return payloads.map(payload => payload._id === "a" ? existingA : existingB); },
    async createDocuments(payloads) { calls.creates.push(payloads); return payloads.map((payload, index) => ({ id: `new-${index}`, ...payload })); }
  } } };
  const result = await importOrUpdateHarvestItems({
    monsterId: "test-monster",
    folderName: "Harvest",
    records: [
      { name: "A", type: "loot", img: "a.webp", system: {} },
      { name: "B", type: "loot", img: "b.webp", system: {} },
      { name: "C", type: "loot", img: "c.webp", system: {} }
    ]
  });
  assert.equal(calls.updates.length, 1);
  assert.equal(calls.updates[0].length, 2);
  assert.equal(calls.creates.length, 1);
  assert.equal(calls.creates[0].length, 1);
  assert.equal(result.updated.length, 2);
  assert.equal(result.created.length, 1);
});

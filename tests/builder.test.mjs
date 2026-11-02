import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildActorData, buildHarvestItemData, buildEncounterProfile, resolveHarvestIcon } from "../scripts/dnd5e-builder.mjs";

const statblocks = JSON.parse(await readFile(new URL("../data/statblocks.json", import.meta.url), "utf8")).records;
const record = statblocks.find(entry => entry.monsterId === "thornhide-boar");
const monster = {
  id: "thornhide-boar",
  name: { en: "Thornhide Boar", de: "Dornenhautkeiler" },
  summary: { en: "A massive thorn-covered boar.", de: "Ein gewaltiger dornenbedeckter Keiler." },
  ecology: { en: "It feeds on ironroot.", de: "Er frisst Eisenwurzel." },
  behavior: { en: "It charges intruders.", de: "Er greift Eindringlinge an." },
  habitats: [{ en: "Ironroot forests", de: "Eisenwurzelwälder" }]
};

test("Actor builder emits a D&D 5e 2024 NPC with usable embedded activities", () => {
  const actor = buildActorData(monster, record);
  assert.equal(actor.type, "npc");
  assert.equal(actor.system.source.rules, "2024");
  assert.equal(actor.system.details.cr, 3);
  assert.equal(actor.system.attributes.ac.flat, 15);
  assert.equal(actor.prototypeToken.disposition, -1);
  assert.ok(actor.items.some(item => item.type === "feat"));
  const weapon = actor.items.find(item => item.type === "weapon");
  assert.ok(weapon);
  assert.equal(Object.values(weapon.system.activities)[0].type, "attack");
  assert.ok(actor.items.every(item => item.flags?.["hunters-bestiary"]?.managedEmbedded === true));
  assert.ok(actor.items.every(item => item.flags?.["hunters-bestiary-dnd5e-2024"]?.managedKey));
});

test("harvest builder emits priced D&D loot Items", () => {
  const items = buildHarvestItemData(monster, record);
  assert.equal(items.length, 2);
  assert.equal(items[0].type, "loot");
  assert.equal(items[0].system.price.denomination, "gp");
  assert.equal(items[0].flags["hunters-bestiary-dnd5e-2024"].monsterId, monster.id);
});

test("encounter profiles expose CR, XP, role, and count", () => {
  const profile = buildEncounterProfile(monster, record);
  assert.equal(profile.challengeRating, 3);
  assert.equal(profile.experience, 700);
  assert.equal(profile.role, "brute");
  assert.ok(profile.suggestedGroupSize >= 1);
});


test("every bundled harvest Item uses an existing, semantically selected Foundry core icon path", async () => {
  const records = JSON.parse(await readFile(new URL("../data/statblocks.json", import.meta.url), "utf8")).records;
  const icons = records.flatMap(entry => entry.harvest.map(part => resolveHarvestIcon(part)));
  assert.equal(icons.length, 48);
  assert.ok(icons.every(icon => icon.startsWith("icons/")));
  assert.ok(!icons.includes("icons/commodities/biological/shell-ridged-brown.webp"));
  assert.ok(new Set(icons).size >= 20);
  assert.equal(resolveHarvestIcon({ name: "Moonveil Antler Shard" }), "icons/commodities/bones/horn-antler-pink-white.webp");
  assert.equal(resolveHarvestIcon({ name: "Stormglass Pinion" }), "icons/commodities/materials/feather-stained-glass-blue.webp");
  assert.equal(resolveHarvestIcon({ name: "Orchard Fungus" }), "icons/consumables/mushrooms/cluster-red-brown.webp");
});

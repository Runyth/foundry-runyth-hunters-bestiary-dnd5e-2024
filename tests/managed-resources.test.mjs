import test from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_ACTOR_FOLDER_NAME,
  LEGACY_ACTOR_FOLDER_NAMES,
  deleteImportedResources,
  getImportedResourceSummary,
  isManagedHarvestItem,
  isManagedQuarryActor,
  reconcileManagedFolders
} from "../scripts/managed-resources.mjs";

function document({ id, name, documentName, folder, core = {}, dnd = {} }) {
  return {
    id,
    name,
    uuid: `${documentName}.${id}`,
    documentName,
    folder,
    flags: { "runyth-hunters-bestiary": core, "runyth-hunters-bestiary-dnd5e-2024": dnd },
    getFlag(moduleId, key) { return this.flags[moduleId]?.[key]; },
    async update(data) { if (Object.hasOwn(data, "folder")) this.folder = data.folder; Object.assign(this, data); },
    async delete() { this.deleted = true; }
  };
}

function folder({ id, name, type }) {
  return {
    id,
    name,
    type,
    folder: null,
    flags: {},
    getFlag(moduleId, key) { return this.flags[moduleId]?.[key]; },
    async setFlag(moduleId, key, value) { this.flags[moduleId] ??= {}; this.flags[moduleId][key] = value; },
    async update(data) { Object.assign(this, data); },
    async delete() { this.deleted = true; globalThis.game.folders = globalThis.game.folders.filter(entry => entry !== this); }
  };
}

function installGame({ actors = [], items = [], folders = [], actorSetting = CANONICAL_ACTOR_FOLDER_NAME }) {
  const settings = new Map([
    ["actorFolderName", actorSetting],
    ["harvestFolderName", "Runyth Hunter's Bestiary - D&D 5e 2024: Harvest Items"]
  ]);
  globalThis.game = {
    user: { isGM: true },
    actors: { contents: actors },
    items: { contents: items },
    folders,
    settings: {
      get: (_module, key) => settings.get(key),
      set: async (_module, key, value) => { settings.set(key, value); return value; }
    }
  };
  globalThis.CONFIG = { Folder: { documentClass: { create: async data => {
    const created = folder({ id: `folder-${folders.length + 1}`, ...data });
    folders.push(created);
    return created;
  } } } };
  return settings;
}

test("managed resource predicates require exact dual provenance", () => {
  const actor = document({ id: "a", name: "A", documentName: "Actor", folder: null, core: { monsterId: "m" }, dnd: { rules: "2024", statblockId: "m" } });
  const item = document({ id: "i", name: "I", documentName: "Item", folder: null, core: { source: "harvest:m" }, dnd: { monsterId: "m" } });
  assert.equal(isManagedQuarryActor(actor), true);
  assert.equal(isManagedHarvestItem(item), true);
  assert.equal(isManagedQuarryActor({ ...actor, flags: { "runyth-hunters-bestiary": { monsterId: "m" } } }), false);
  assert.equal(isManagedHarvestItem({ ...item, flags: { "runyth-hunters-bestiary": { source: "harvest:m" } } }), false);
});

test("legacy managed Actors move into an existing canonical folder without touching user Actors", async () => {
  const legacy = folder({ id: "legacy", name: LEGACY_ACTOR_FOLDER_NAMES[1], type: "Actor" });
  const canonical = folder({ id: "canonical", name: CANONICAL_ACTOR_FOLDER_NAME, type: "Actor" });
  const managed = document({ id: "managed", name: "Managed", documentName: "Actor", folder: legacy.id, core: { monsterId: "m" }, dnd: { rules: "2024", statblockId: "m" } });
  const user = document({ id: "user", name: "User", documentName: "Actor", folder: legacy.id });
  const settings = installGame({ actors: [managed, user], folders: [legacy, canonical], actorSetting: LEGACY_ACTOR_FOLDER_NAMES[1] });
  const result = await reconcileManagedFolders();
  assert.equal(managed.folder, canonical.id);
  assert.equal(user.folder, legacy.id);
  assert.equal(legacy.deleted, undefined);
  assert.equal(result.actors.moved, 1);
  assert.equal(settings.get("actorFolderName"), CANONICAL_ACTOR_FOLDER_NAME);
});

test("a purely managed legacy folder is renamed in place when no canonical folder exists", async () => {
  const legacy = folder({ id: "legacy", name: LEGACY_ACTOR_FOLDER_NAMES[0], type: "Actor" });
  const managed = document({ id: "managed", name: "Managed", documentName: "Actor", folder: legacy, core: { monsterId: "m" }, dnd: { rules: "2024", statblockId: "m" } });
  installGame({ actors: [managed], folders: [legacy], actorSetting: LEGACY_ACTOR_FOLDER_NAMES[0] });
  const result = await reconcileManagedFolders();
  assert.equal(legacy.name, CANONICAL_ACTOR_FOLDER_NAME);
  assert.equal(managed.folder, legacy);
  assert.equal(result.actors.renamed, 1);
  assert.equal(legacy.flags["runyth-hunters-bestiary-dnd5e-2024"].managedFolder, true);
});

test("delete imported data removes only exact managed resources and unlinks matching Actors", async () => {
  const actorFolder = folder({ id: "actors", name: CANONICAL_ACTOR_FOLDER_NAME, type: "Actor" });
  const itemFolder = folder({ id: "items", name: "Runyth Hunter's Bestiary - D&D 5e 2024: Harvest Items", type: "Item" });
  const managedActor = document({ id: "managed-a", name: "Managed Actor", documentName: "Actor", folder: actorFolder, core: { monsterId: "m" }, dnd: { rules: "2024", statblockId: "m" } });
  const userActor = document({ id: "user-a", name: "User Actor", documentName: "Actor", folder: null, core: { monsterId: "user" } });
  const managedItem = document({ id: "managed-i", name: "Managed Item", documentName: "Item", folder: itemFolder, core: { source: "harvest:m" }, dnd: { monsterId: "m" } });
  const userItem = document({ id: "user-i", name: "User Item", documentName: "Item", folder: null, core: { source: "harvest:user" } });
  installGame({ actors: [managedActor, userActor], items: [managedItem, userItem], folders: [actorFolder, itemFolder] });
  const unlinked = [];
  const result = await deleteImportedResources({ coreApi: { unlinkActor: async (...args) => unlinked.push(args) } });
  assert.equal(getImportedResourceSummary().total, 2);
  assert.equal(managedActor.deleted, true);
  assert.equal(managedItem.deleted, true);
  assert.equal(userActor.deleted, undefined);
  assert.equal(userItem.deleted, undefined);
  assert.deepEqual(unlinked, [["m", { actorUuid: "Actor.managed-a" }]]);
  assert.equal(result.actors.deleted.length, 1);
  assert.equal(result.items.deleted.length, 1);
});

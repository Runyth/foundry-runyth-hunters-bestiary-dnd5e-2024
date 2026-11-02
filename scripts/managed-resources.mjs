// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { CORE_MODULE_ID, MODULE_ID, SETTINGS } from "./constants.mjs";

export const CANONICAL_ACTOR_FOLDER_NAME = "Runyth Hunter's Bestiary - D&D 5e 2024: Quarry Actors";
export const CANONICAL_HARVEST_FOLDER_NAME = "Runyth Hunter's Bestiary - D&D 5e 2024: Harvest Items";

export const LEGACY_ACTOR_FOLDER_NAMES = Object.freeze([
  "Runyth Hunter's Bestiary — D&D 5e Quarry Actors",
  "Runyth Hunter's Bestiary — Quarry Actors",
  "Runyth Hunter's Bestiary: Quarry Actors"
]);

export const LEGACY_HARVEST_FOLDER_NAMES = Object.freeze([
  "Runyth Hunter's Bestiary — D&D 5e Harvest Items",
  "Runyth Hunter's Bestiary — Harvest Items",
  "Runyth Hunter's Bestiary: Harvest Items"
]);

function flag(document, moduleId, key) {
  return document?.getFlag?.(moduleId, key) ?? document?.flags?.[moduleId]?.[key];
}

function folderId(document) {
  return document?.folder?.id ?? document?.folder ?? null;
}

export function isManagedQuarryActor(actor) {
  return actor?.documentName === "Actor"
    && Boolean(flag(actor, CORE_MODULE_ID, "monsterId"))
    && flag(actor, MODULE_ID, "rules") === "2024"
    && Boolean(flag(actor, MODULE_ID, "statblockId"));
}

export function isManagedHarvestItem(item) {
  return item?.documentName === "Item"
    && String(flag(item, CORE_MODULE_ID, "source") ?? "").startsWith("harvest:")
    && Boolean(flag(item, MODULE_ID, "monsterId"));
}

export function getImportedResourceSummary() {
  const actors = globalThis.game?.actors?.contents?.filter(isManagedQuarryActor) ?? [];
  const items = globalThis.game?.items?.contents?.filter(isManagedHarvestItem) ?? [];
  return {
    actors: actors.length,
    items: items.length,
    total: actors.length + items.length,
    actorFolders: new Set(actors.map(folderId).filter(Boolean)).size,
    itemFolders: new Set(items.map(folderId).filter(Boolean)).size
  };
}

export async function reconcileManagedFolders() {
  if (!globalThis.game?.user?.isGM) throw new Error("Only a GM may repair imported Runyth Hunter's Bestiary folders.");

  const configuredActorFolder = game.settings.get(MODULE_ID, SETTINGS.ACTOR_FOLDER);
  const configuredHarvestFolder = game.settings.get(MODULE_ID, SETTINGS.HARVEST_FOLDER);
  const settingWrites = [];
  if (LEGACY_ACTOR_FOLDER_NAMES.includes(configuredActorFolder)) {
    settingWrites.push(game.settings.set(MODULE_ID, SETTINGS.ACTOR_FOLDER, CANONICAL_ACTOR_FOLDER_NAME));
  }
  if (LEGACY_HARVEST_FOLDER_NAMES.includes(configuredHarvestFolder)) {
    settingWrites.push(game.settings.set(MODULE_ID, SETTINGS.HARVEST_FOLDER, CANONICAL_HARVEST_FOLDER_NAME));
  }
  await Promise.all(settingWrites);

  const actors = game.actors?.contents?.filter(isManagedQuarryActor) ?? [];
  const items = game.items?.contents?.filter(isManagedHarvestItem) ?? [];
  const [actorResult, itemResult] = await Promise.all([
    reconcileKind({
      type: "Actor",
      documents: actors,
      canonicalName: CANONICAL_ACTOR_FOLDER_NAME,
      legacyNames: LEGACY_ACTOR_FOLDER_NAMES,
      color: "#5c2c2c",
      kind: "actors"
    }),
    reconcileKind({
      type: "Item",
      documents: items,
      canonicalName: CANONICAL_HARVEST_FOLDER_NAME,
      legacyNames: LEGACY_HARVEST_FOLDER_NAMES,
      color: "#6d4b2f",
      kind: "items"
    })
  ]);
  return { actors: actorResult, items: itemResult };
}

async function reconcileKind({ type, documents, canonicalName, legacyNames, color, kind }) {
  const folders = [...(game.folders ?? [])].filter(folder => folder.type === type);
  const legacyFolders = folders.filter(folder => legacyNames.includes(folder.name));
  const documentFolderIds = new Set(documents.map(folderId).filter(Boolean));
  const relevantLegacy = legacyFolders.filter(folder => documentFolderIds.has(folder.id));
  let canonical = folders.find(folder => folder.name === canonicalName) ?? null;
  const result = { moved: 0, renamed: 0, created: 0, removedEmptyLegacyFolders: 0 };

  if (!relevantLegacy.length) {
    if (canonical && documents.some(document => folderId(document) === canonical.id)) await markManagedFolder(canonical, kind);
    return result;
  }

  if (!canonical && relevantLegacy.length === 1 && folderContainsOnlyManagedDocuments(relevantLegacy[0], documents, type)) {
    canonical = relevantLegacy[0];
    await canonical.update({ name: canonicalName });
    result.renamed = 1;
  }

  if (!canonical) {
    const FolderClass = globalThis.CONFIG?.Folder?.documentClass ?? globalThis.Folder;
    if (!FolderClass?.create) throw new Error("Foundry Folder document class is unavailable.");
    canonical = await FolderClass.create({
      name: canonicalName,
      type,
      sorting: "a",
      color,
      flags: { [MODULE_ID]: { managedFolder: true, managedKind: kind } }
    });
    result.created = 1;
  }

  await markManagedFolder(canonical, kind);
  const legacyIds = new Set(relevantLegacy.map(folder => folder.id).filter(id => id !== canonical.id));
  const moving = documents.filter(entry => legacyIds.has(folderId(entry)));
  if (moving.length) {
    const DocumentClass = type === "Actor"
      ? (globalThis.CONFIG?.Actor?.documentClass ?? globalThis.Actor)
      : (globalThis.CONFIG?.Item?.documentClass ?? globalThis.Item);
    if (DocumentClass?.updateDocuments) await DocumentClass.updateDocuments(moving.map(document => ({ _id: document.id, folder: canonical.id })), { render: false });
    else await Promise.all(moving.map(document => document.update({ folder: canonical.id })));
    result.moved = moving.length;
  }

  const emptyLegacy = relevantLegacy.filter(folder => folder.id !== canonical.id && isFolderEmpty(folder, type));
  if (emptyLegacy.length) {
    const FolderClass = globalThis.CONFIG?.Folder?.documentClass ?? globalThis.Folder;
    if (FolderClass?.deleteDocuments) await FolderClass.deleteDocuments(emptyLegacy.map(folder => folder.id), { render: false });
    else await Promise.all(emptyLegacy.map(folder => folder.delete()));
    result.removedEmptyLegacyFolders = emptyLegacy.length;
  }
  return result;
}

function folderContainsOnlyManagedDocuments(folder, managedDocuments, type) {
  const collection = type === "Actor" ? game.actors?.contents ?? [] : game.items?.contents ?? [];
  const all = collection.filter(document => folderId(document) === folder.id);
  const managedIds = new Set(managedDocuments.map(document => document.id));
  const hasChildren = [...(game.folders ?? [])].some(candidate => (candidate.folder?.id ?? candidate.folder) === folder.id);
  return all.length > 0 && !hasChildren && all.every(document => managedIds.has(document.id));
}

async function markManagedFolder(folder, kind) {
  if (!folder?.update) return;
  const managedFolder = flag(folder, MODULE_ID, "managedFolder");
  const managedKind = flag(folder, MODULE_ID, "managedKind");
  if (managedFolder === true && managedKind === kind) return;
  await folder.update({
    flags: {
      ...(folder.flags ?? {}),
      [MODULE_ID]: {
        ...(folder.flags?.[MODULE_ID] ?? {}),
        managedFolder: true,
        managedKind: kind
      }
    }
  });
}

function isFolderEmpty(folder, type) {
  const documents = type === "Actor" ? game.actors?.contents ?? [] : game.items?.contents ?? [];
  const hasDocuments = documents.some(document => folderId(document) === folder.id);
  const hasChildren = [...(game.folders ?? [])].some(candidate => (candidate.folder?.id ?? candidate.folder) === folder.id);
  return !hasDocuments && !hasChildren;
}

export async function deleteImportedResources({ coreApi, onProgress = null } = {}) {
  if (!globalThis.game?.user?.isGM) throw new Error("Only a GM may delete imported Runyth Hunter's Bestiary resources.");
  const actors = game.actors?.contents?.filter(isManagedQuarryActor) ?? [];
  const items = game.items?.contents?.filter(isManagedHarvestItem) ?? [];
  const candidateFolders = new Map();
  for (const document of [...actors, ...items]) {
    const folder = document.folder?.id ? document.folder : [...(game.folders ?? [])].find(entry => entry.id === folderId(document));
    if (folder) candidateFolders.set(folder.id, folder);
  }

  const result = {
    actors: { deleted: [], failed: [] },
    items: { deleted: [], failed: [] },
    folders: { deleted: [], preserved: [] }
  };
  const total = actors.length + items.length;
  let current = 0;

  for (const actor of actors) {
    try {
      const monsterId = flag(actor, CORE_MODULE_ID, "monsterId");
      const actorUuid = actor.uuid;
      await actor.delete();
      await coreApi?.unlinkActor?.(monsterId, { actorUuid });
      result.actors.deleted.push({ id: actor.id, name: actor.name, monsterId });
    } catch (error) {
      result.actors.failed.push({ id: actor.id, name: actor.name, message: error.message });
    }
    current += 1;
    onProgress?.({ current, total, phase: "actors", label: actor.name, success: result.actors.deleted.length, skipped: 0, failed: result.actors.failed.length, errors: result.actors.failed });
  }

  for (const item of items) {
    try {
      await item.delete();
      result.items.deleted.push({ id: item.id, name: item.name });
    } catch (error) {
      result.items.failed.push({ id: item.id, name: item.name, message: error.message });
    }
    current += 1;
    const failed = result.actors.failed.length + result.items.failed.length;
    const success = result.actors.deleted.length + result.items.deleted.length;
    onProgress?.({ current, total, phase: "items", label: item.name, success, skipped: 0, failed, errors: [...result.actors.failed, ...result.items.failed] });
  }

  for (const folder of candidateFolders.values()) {
    const managedFolder = flag(folder, MODULE_ID, "managedFolder") === true;
    const knownName = [CANONICAL_ACTOR_FOLDER_NAME, CANONICAL_HARVEST_FOLDER_NAME, ...LEGACY_ACTOR_FOLDER_NAMES, ...LEGACY_HARVEST_FOLDER_NAMES].includes(folder.name);
    if ((managedFolder || knownName) && isFolderEmpty(folder, folder.type)) {
      await folder.delete();
      result.folders.deleted.push({ id: folder.id, name: folder.name });
    } else {
      result.folders.preserved.push({ id: folder.id, name: folder.name });
    }
  }

  return result;
}

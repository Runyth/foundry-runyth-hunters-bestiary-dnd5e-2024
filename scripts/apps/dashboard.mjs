import { MODULE_ID, MODULE_VERSION, SETTINGS } from "../constants.mjs";
import { PersistentApplication, getCoreUi } from "./base-app.mjs";
import { notify } from "../utils.mjs";

let moduleApi = null;

export function configureDashboard(api) {
  moduleApi = api;
}

function requireGm() {
  if (!game.user?.isGM) {
    notify("error", game.i18n.localize("HBDND5E.Errors.GMOnly"));
    return false;
  }
  return true;
}

export function findProgressDialog(existingInstances, expectedTitle = "") {
  for (const candidate of foundry.applications.instances.values()) {
    if (existingInstances.has(candidate)) continue;
    const actualTitle = candidate.title ?? candidate.options?.window?.title ?? "";
    if (expectedTitle && actualTitle && actualTitle !== expectedTitle) continue;
    if (candidate.element?.querySelector?.(".hb-shared-progress")) return candidate;
  }
  return null;
}

export function operationHasFailures(value) {
  const detector = getCoreUi().operationHasFailures;
  if (typeof detector !== "function") throw new Error("Runyth Hunter's Bestiary dashboard API 1.1.0 operation-result contract is unavailable.");
  return detector(value);
}

function safelyBringToFront(application) {
  if (!application?.rendered || !application.element) return false;
  try { application.bringToFront?.(); return true; }
  catch (error) { console.warn(`${MODULE_ID} | Could not focus progress window`, error); return false; }
}

export async function runOwnedProgressOperation(app, options) {
  const existingInstances = new Set(foundry.applications.instances.values());
  let progressDialog = null;
  const captureDialog = () => {
    progressDialog ??= findProgressDialog(existingInstances, options.title);
    if (progressDialog) {
      app.trackProgressDialog(progressDialog);
      safelyBringToFront(progressDialog);
    }
    return progressDialog;
  };

  let completedWithoutFailures = false;
  try {
    const result = await getCoreUi().runProgressOperation({
      ...options,
      root: app.element,
      runner: async update => {
        captureDialog();
        return options.runner(update);
      }
    });
    completedWithoutFailures = !operationHasFailures(result);
    return result;
  } finally {
    const dialog = captureDialog();
    if (dialog && completedWithoutFailures) {
      try { await dialog.close({ animate: false }); }
      catch (error) { console.warn(`${MODULE_ID} | Progress window cleanup failed`, error); }
      finally { app.releaseProgressDialog(dialog); }
    } else if (dialog) {
      safelyBringToFront(dialog);
    }
  }
}

async function runActorOperation(updateExisting) {
  if (!requireGm()) return;
  const result = await runOwnedProgressOperation(this, {
    title: game.i18n.localize(updateExisting ? "HBDND5E.Progress.UpdateActors" : "HBDND5E.Progress.ImportActors"),
    runner: onProgress => moduleApi.provisionActors({ updateExisting, onProgress })
  });
  reportProvisioning(result);
  return this.render({ force: true });
}

async function provisionMissing() {
  return runActorOperation.call(this, false);
}

async function updateManaged() {
  if (!requireGm()) return;
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("HBDND5E.Dialogs.Update.Title") },
    content: `<p>${foundry.utils.escapeHTML(game.i18n.localize("HBDND5E.Dialogs.Update.Content"))}</p>`,
    yes: { label: game.i18n.localize("HBDND5E.UpdateManaged"), icon: "fa-solid fa-arrows-rotate" },
    no: { label: game.i18n.localize("HBDND5E.Common.Cancel"), icon: "fa-solid fa-xmark" },
    modal: true,
    rejectClose: false
  });
  if (!confirmed) return;
  return runActorOperation.call(this, true);
}

async function importHarvestItems({ progressTitle = "HBDND5E.Progress.ImportItems", progressOffset = 0, progressTotal = null, externalProgress = null } = {}) {
  const monsters = moduleApi.core.getCatalogue().filter(monster => moduleApi.getStatblock(monster.id));
  const itemTotal = monsters.reduce((sum, monster) => sum + moduleApi.buildHarvestItemData(monster.id).length, 0);
  const runner = async onProgress => moduleApi.importOrUpdateAllHarvestItems({
    monsterIds: monsters.map(monster => monster.id),
    onProgress: progress => onProgress({
      ...progress,
      current: progressOffset + Number(progress.current ?? 0),
      total: progressTotal ?? itemTotal,
      phase: "items"
    })
  });
  if (externalProgress) return runner(externalProgress);
  return runOwnedProgressOperation(this, { title: game.i18n.localize(progressTitle), runner });
}

async function createHarvest() {
  if (!requireGm()) return;
  const result = await importHarvestItems.call(this);
  notify(result.failed.length ? "warn" : "info", game.i18n.format("HBDND5E.Notifications.HarvestImported", {
    created: result.created.length,
    updated: result.updated.length,
    skipped: result.skipped.length,
    failed: result.failed.length
  }));
  if (result.failed.length) {
    console.warn(`${MODULE_ID} | Harvest Item failures`, result.failed);
    return result;
  }
  return this.render({ force: true });
}

async function importEverything() {
  if (!requireGm()) return;
  const monsters = moduleApi.core.getCatalogue().filter(monster => moduleApi.getStatblock(monster.id));
  const itemTotal = monsters.reduce((sum, monster) => sum + moduleApi.buildHarvestItemData(monster.id).length, 0);
  const total = monsters.length + itemTotal;
  const result = await runOwnedProgressOperation(this, {
    title: game.i18n.localize("HBDND5E.Progress.ImportEverything"),
    runner: async onProgress => {
      const actors = await moduleApi.provisionActors({
        updateExisting: true,
        onProgress: progress => onProgress({
          ...progress,
          current: Math.min(Number(progress.current ?? 0), monsters.length),
          total,
          phase: "actors"
        })
      });
      const items = await importHarvestItems.call(this, {
        progressOffset: monsters.length,
        progressTotal: total,
        externalProgress: onProgress
      });
      return { operation: "import-everything", results: [actors, items], actors, items };
    }
  });
  const failed = (result.actors?.failed?.length ?? 0) + (result.items?.failed?.length ?? 0);
  notify(failed ? "warn" : "info", game.i18n.format("HBDND5E.Notifications.ImportEverything", {
    actorsCreated: result.actors?.created?.length ?? 0,
    actorsUpdated: result.actors?.updated?.length ?? 0,
    actorsLinked: result.actors?.linked?.length ?? 0,
    itemsCreated: result.items?.created?.length ?? 0,
    itemsUpdated: result.items?.updated?.length ?? 0,
    failed
  }));
  if (failed) {
    console.warn(`${MODULE_ID} | Import everything completed with failures`, result);
    return result;
  }
  return this.render({ force: true });
}

function openCore() {
  return moduleApi.core.open({ initialTab: "gm" });
}

function validateIntegration() {
  const status = moduleApi.getIntegrationStatus();
  const level = status.ready && status.supportedMonsters === status.statblocks ? "info" : "warn";
  notify(level, game.i18n.format("HBDND5E.Notifications.Validation", {
    statblocks: status.statblocks,
    supported: status.supportedMonsters,
    catalogue: status.catalogueMonsters
  }));
  return this.render({ force: true });
}


async function repairFolders() {
  if (!requireGm()) return;
  const result = await moduleApi.repairManagedFolders();
  const moved = result.actors.moved + result.items.moved;
  const renamed = result.actors.renamed + result.items.renamed;
  const removed = result.actors.removedEmptyLegacyFolders + result.items.removedEmptyLegacyFolders;
  notify("info", game.i18n.format("HBDND5E.Notifications.FoldersRepaired", { moved, renamed, removed }));
  return this.render({ force: true });
}

async function deleteImported() {
  if (!requireGm()) return;
  const summary = moduleApi.getImportedResourceSummary();
  if (!summary.total) {
    notify("info", game.i18n.localize("HBDND5E.Notifications.NothingToDelete"));
    return;
  }
  const confirmed = await getCoreUi().confirmDestructiveAction({
    title: game.i18n.localize("HBDND5E.Delete.Title"),
    eligible: [
      game.i18n.format("HBDND5E.Delete.ActorCount", { count: summary.actors }),
      game.i18n.format("HBDND5E.Delete.ItemCount", { count: summary.items })
    ],
    preserved: [
      game.i18n.localize("HBDND5E.Delete.PreserveUnmanaged"),
      game.i18n.localize("HBDND5E.Delete.PreserveUserContent")
    ],
    warning: game.i18n.localize("HBDND5E.Delete.Warning"),
    confirmLabel: game.i18n.localize("HBDND5E.Delete.Confirm"),
    cancelLabel: game.i18n.localize("HBDND5E.Common.Cancel")
  });
  if (!confirmed) return;
  const result = await runOwnedProgressOperation(this, {
    title: game.i18n.localize("HBDND5E.Progress.DeleteImported"),
    runner: onProgress => moduleApi.deleteImportedResources({ onProgress })
  });
  const deletedActors = result.actors.deleted.length;
  const deletedItems = result.items.deleted.length;
  const failed = result.actors.failed.length + result.items.failed.length;
  notify(failed ? "warn" : "info", game.i18n.format("HBDND5E.Notifications.Deleted", {
    actors: deletedActors,
    items: deletedItems,
    folders: result.folders.deleted.length,
    failed
  }));
  if (failed) console.warn(`${MODULE_ID} | Imported resource deletion failures`, result);
  return this.render({ force: true });
}

async function resetSize() {
  await this.resetWindowSize();
  notify("info", game.i18n.localize("HBDND5E.Notifications.SizeReset"));
}

async function resetPosition() {
  await this.resetWindowPosition();
  notify("info", game.i18n.localize("HBDND5E.Notifications.PositionReset"));
}

async function changeQuarryImage(_event, target) {
  if (!requireGm()) return;
  const monsterId = target.dataset.monsterId;
  if (!monsterId) return;
  return moduleApi.core.openMonsterImagePicker(monsterId, {
    onSelected: async () => {
      notify("info", game.i18n.localize("HBDND5E.Notifications.ImageUpdated"));
      await this.render({ force: true });
    }
  });
}

export class DashboardApp extends PersistentApplication {
  static DEFAULT_OPTIONS = {
    id: "hunters-bestiary-dnd5e-dashboard",
    classes: ["hunters-bestiary-dnd5e", "hbd5e-app", "hb-shared-dashboard"],
    position: { width: 960, height: 720 },
    window: { title: "HBDND5E.App.Title", icon: "fa-solid fa-dragon", resizable: true },
    actions: {
      importEverything,
      provisionMissing,
      updateManaged,
      createHarvest,
      openCore,
      validateIntegration,
      repairFolders,
      deleteImported,
      resetSize,
      resetPosition,
      changeQuarryImage
    }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/dashboard.hbs` }
  };

  #search = null;
  #progressDialogs = new Set();
  query = "";

  trackProgressDialog(dialog) {
    if (dialog) this.#progressDialogs.add(dialog);
  }

  releaseProgressDialog(dialog) {
    this.#progressDialogs.delete(dialog);
  }

  async closeProgressDialogs() {
    const dialogs = [...this.#progressDialogs];
    this.#progressDialogs.clear();
    await Promise.allSettled(dialogs.map(dialog => dialog?.close?.({ animate: false })));
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#search?.destroy();
    this.#search = getCoreUi().bindStableSearch(this.element, {
      inputSelector: "[data-hbd5e-search]",
      entrySelector: "[data-hbd5e-record]",
      emptySelector: "[data-hbd5e-empty]",
      query: this.query,
      onQuery: query => { this.query = query; }
    });
  }

  async _preClose(options) {
    this.#search?.destroy();
    await this.closeProgressDialogs();
    return super._preClose(options);
  }

  async _prepareContext() {
    const status = moduleApi.getIntegrationStatus();
    const catalogue = moduleApi.core?.getCatalogue({ localized: true }) ?? [];
    const catalogueById = new Map(catalogue.map(monster => [monster.id, monster]));
    const records = moduleApi.getStatblocks();
    const rows = records.map(record => {
      const monster = catalogueById.get(record.monsterId);
      const name = monster?.name ?? record.monsterId;
      return {
        id: record.monsterId,
        name,
        image: moduleApi.core?.getMonsterImage?.(record.monsterId)?.imagePath ?? "modules/runyth-hunters-bestiary/assets/hunters-bestiary.svg",
        cr: record.cr,
        role: record.encounter?.role ?? "standard",
        actorLinked: Boolean(monster?.actorUuid),
        harvestCount: record.harvest?.length ?? 0,
        actionCount: record.actions?.length ?? 0,
        searchText: `${name} ${record.cr} ${record.encounter?.role ?? "standard"}`.toLocaleLowerCase()
      };
    });
    return {
      isGM: game.user.isGM,
      status,
      rows,
      query: this.query,
      readyLabel: status.ready ? game.i18n.localize("HBDND5E.Status.Ready") : game.i18n.localize("HBDND5E.Status.NotReady"),
      moduleVersion: MODULE_VERSION,
      actorFolder: game.settings.get(MODULE_ID, SETTINGS.ACTOR_FOLDER),
      harvestFolder: game.settings.get(MODULE_ID, SETTINGS.HARVEST_FOLDER),
      importedSummary: moduleApi.getImportedResourceSummary(),
      partialAllowed: game.settings.get(MODULE_ID, SETTINGS.ALLOW_INCOMPLETE_PACKS)
    };
  }
}

function reportProvisioning(result) {
  notify(result.failed.length ? "warn" : "info", game.i18n.format("HBDND5E.Notifications.Provisioned", {
    created: result.created.length,
    updated: result.updated.length,
    linked: result.linked.length,
    skipped: result.skipped.length,
    failed: result.failed.length
  }));
  if (result.failed.length) console.warn(`${MODULE_ID} | Actor provisioning failures`, result.failed);
}

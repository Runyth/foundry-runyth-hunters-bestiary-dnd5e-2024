import { ADAPTER_ID, CORE_MODULE_ID, MODULE_ID, SETTINGS } from "./constants.mjs";
import { buildActorData, buildEncounterProfile, buildHarvestItemData } from "./dnd5e-builder.mjs";
import { clone, slugify } from "./utils.mjs";
import { STATBLOCK_REGISTRY_CONTRACT_VERSION } from "./registry.mjs";
import { deleteImportedResources, getImportedResourceSummary, reconcileManagedFolders } from "./managed-resources.mjs";
import { importOrUpdateHarvestItems as upsertHarvestItems, importOrUpdateHarvestItemsBatch as upsertHarvestItemsBatch } from "./harvest-import.mjs";

export class HuntersBestiaryDnd5eAPI {
  #registry;
  #readyResolve;
  #readyPromise;
  #dashboardClass;
  #initializationStatus = { ok: false, failures: [], ready: false };

  constructor(registry) {
    this.#registry = registry;
    this.#readyPromise = new Promise(resolve => { this.#readyResolve = resolve; });
  }

  setDashboardClass(DashboardClass) {
    this.#dashboardClass = DashboardClass;
  }

  get version() {
    return game.modules.get(MODULE_ID)?.version ?? "0.0.0";
  }

  whenReady() {
    return this.#readyPromise;
  }

  get initializationStatus() {
    return clone(this.#initializationStatus);
  }

  markReady(status = { ok: true, failures: [] }) {
    this.#initializationStatus = {
      ok: status?.ok !== false,
      failures: clone(status?.failures ?? []),
      ready: true
    };
    this.#readyResolve?.(this);
    this.#readyResolve = null;
  }

  get core() {
    return game.modules.get(CORE_MODULE_ID)?.api ?? null;
  }

  open() {
    this.core?.ui?.validateDashboardModuleName?.({
      moduleId: MODULE_ID,
      currentTitle: game.modules.get(MODULE_ID)?.title,
      gameSystem: "D&D 5e 2024",
      type: "system-layer",
      dashboardApplicationId: "hunters-bestiary-dnd5e-dashboard",
      providerId: MODULE_ID,
      version: this.version,
      apiCompatibilityVersion: "1.0.0"
    });
    const id = "hunters-bestiary-dnd5e-dashboard";
    const existing = foundry.applications.instances.get(id);
    if (existing) {
      if (!existing.rendered) existing.render({ force: true });
      else existing.bringToFront();
      return existing;
    }
    if (!this.#dashboardClass) throw new Error("The D&D 5e dashboard is not initialized.");
    const app = new this.#dashboardClass();
    app.render({ force: true });
    return app;
  }

  getStatblocks(options = {}) {
    return this.#registry.list(options);
  }

  getStatblock(monsterId) {
    return this.#registry.get(monsterId);
  }

  getRegistryContract() {
    return {
      version: STATBLOCK_REGISTRY_CONTRACT_VERSION,
      validateSignature: "validateStatblocks(records, options)",
      registerSignature: "registerStatblocks(providerId, records, options)",
      replacementIsAtomic: true,
      requiredFields: ["monsterId", "rules", "cr", "ac", "hp.value", "hp.formula", "abilities", "actions", "traits", "harvest"]
    };
  }

  validateStatblocks(records, { allowPartial = false } = {}) {
    if (typeof records === "string") {
      throw Object.assign(new TypeError("validateStatblocks expects records as its first argument; providerId belongs only to registerStatblocks."), {
        registryDiagnostic: {
          contractVersion: STATBLOCK_REGISTRY_CONTRACT_VERSION,
          rule: "validate-signature",
          expected: "validateStatblocks(records, options)"
        }
      });
    }
    return this.#registry.validate(records, { allowPartial });
  }

  registerStatblocks(providerId, records, { replaceProviderContent = true, allowPartial = null } = {}) {
    const partialAllowed = allowPartial ?? game.settings.get(MODULE_ID, SETTINGS.ALLOW_INCOMPLETE_PACKS);
    const result = this.#registry.register(providerId, records, { replaceProviderContent, allowPartial: partialAllowed });
    Hooks.callAll(`${MODULE_ID}.statblocksChanged`, clone(result));
    return { ...result, partialAllowed, contractVersion: STATBLOCK_REGISTRY_CONTRACT_VERSION };
  }

  unregisterStatblocks(providerId) {
    const removed = this.#registry.unregister(providerId);
    Hooks.callAll(`${MODULE_ID}.statblocksChanged`, { providerId: slugify(providerId), removed });
    return removed;
  }

  async registerMonsterPack(providerId, { monsterBundles = [], statblocks = [] } = {}, options = {}) {
    if (!game.user.isGM) throw new Error("Only a GM may register a D&D 5e Runyth Hunter's Bestiary monster pack.");
    const source = slugify(providerId);
    if (!source) throw new Error("A provider id is required.");
    const previous = this.#registry.providerRecords(source);
    const partialAllowed = options.allowPartial ?? game.settings.get(MODULE_ID, SETTINGS.ALLOW_INCOMPLETE_PACKS);
    const bundleIds = new Set(monsterBundles.map(bundle => bundle?.monster?.id).filter(Boolean));
    const submittedIds = new Set(statblocks.map(record => record?.monsterId).filter(Boolean));
    const missing = [...bundleIds].filter(monsterId => !submittedIds.has(monsterId));
    if (missing.length && !partialAllowed) throw new Error(`Missing D&D 5e stat blocks for: ${missing.join(", ")}`);
    const registered = this.#registry.register(source, statblocks, {
      replaceProviderContent: options.replaceProviderContent ?? true,
      allowPartial: partialAllowed
    });
    try {
      const content = await this.core.registerContent(source, { monsterBundles }, {
        replaceProviderContent: options.replaceProviderContent ?? true,
        allowPartial: options.allowPartial
      });
      Hooks.callAll(`${MODULE_ID}.monsterPackRegistered`, { providerId: source, statblocks: registered, content });
      return { providerId: source, statblocks: registered, content, complete: registered.complete && content.complete && !missing.length, missingStatblocks: missing };
    } catch (error) {
      this.#registry.unregister(source);
      if (previous.length) this.#registry.register(source, previous, { replaceProviderContent: true, allowPartial: true });
      throw error;
    }
  }

  buildActorData(monsterId) {
    const monster = this.core?.getMonster(monsterId);
    if (!monster) throw new Error(`Unknown monster id: ${monsterId}`);
    return buildActorData(monster, this.#registry.get(monsterId));
  }

  async provisionActors(options = {}) {
    await reconcileManagedFolders();
    return this.core.provisionActors({
      folderName: game.settings.get(MODULE_ID, SETTINGS.ACTOR_FOLDER),
      ...options
    });
  }

  repairManagedFolders() {
    return reconcileManagedFolders();
  }

  getImportedResourceSummary() {
    return getImportedResourceSummary();
  }

  deleteImportedResources(options = {}) {
    return deleteImportedResources({ coreApi: this.core, ...options });
  }

  buildHarvestItemData(monsterId) {
    const monster = this.core?.getMonster(monsterId);
    if (!monster) throw new Error(`Unknown monster id: ${monsterId}`);
    return buildHarvestItemData(monster, this.#registry.get(monsterId));
  }

  async importOrUpdateHarvestItems(monsterId, options = {}) {
    const { skipFolderRepair = false } = options;
    if (!skipFolderRepair) await reconcileManagedFolders();
    return upsertHarvestItems({
      monsterId,
      records: this.buildHarvestItemData(monsterId),
      folderName: game.settings.get(MODULE_ID, SETTINGS.HARVEST_FOLDER)
    });
  }

  async importOrUpdateAllHarvestItems({ monsterIds = null, skipFolderRepair = false, onProgress = null } = {}) {
    if (!skipFolderRepair) await reconcileManagedFolders();
    const selectedIds = monsterIds ? new Set(monsterIds) : null;
    const entries = (this.core?.getCatalogue() ?? [])
      .filter(monster => this.#registry.has(monster.id) && (!selectedIds || selectedIds.has(monster.id)))
      .map(monster => ({ monsterId: monster.id, records: this.buildHarvestItemData(monster.id) }));
    return upsertHarvestItemsBatch({
      entries,
      folderName: game.settings.get(MODULE_ID, SETTINGS.HARVEST_FOLDER),
      onProgress
    });
  }

  async createHarvestItems(monsterId, options = {}) {
    const result = await this.importOrUpdateHarvestItems(monsterId, options);
    return [...result.created, ...result.updated];
  }

  getEncounterProfile(monsterId) {
    const monster = this.core?.getMonster(monsterId);
    if (!monster) return null;
    return buildEncounterProfile(monster, this.#registry.get(monsterId));
  }

  getIntegrationStatus() {
    const core = game.modules.get(CORE_MODULE_ID);
    const system = game.system;
    const catalogue = this.core?.getCatalogue() ?? [];
    const available = catalogue.filter(monster => this.#registry.has(monster.id));
    const linked = available.filter(monster => monster.actorUuid);
    return {
      ready: Boolean(this.#initializationStatus.ok && core?.active && system?.id === "dnd5e" && this.core),
      initialization: clone(this.#initializationStatus),
      coreActive: Boolean(core?.active),
      coreVersion: core?.version ?? null,
      systemId: system?.id ?? null,
      systemVersion: system?.version ?? null,
      adapterId: ADAPTER_ID,
      statblocks: this.#registry.size,
      catalogueMonsters: catalogue.length,
      supportedMonsters: available.length,
      linkedActors: linked.length,
      missingActors: available.length - linked.length,
      capabilities: this.core?.getActiveSystemAdapter()?.capabilities ?? {}
    };
  }
}

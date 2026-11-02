import { CORE_MODULE_ID, MODULE_ID, SETTINGS, SYSTEM_ID } from "./constants.mjs";
import { StatblockRegistry } from "./registry.mjs";
import { HuntersBestiaryDnd5eAPI } from "./api.mjs";
import { registerSettings } from "./settings.mjs";
import { DashboardApp, configureDashboard } from "./apps/dashboard.mjs";
import { registerCoreAdapters } from "./adapter.mjs";
import { moduleError, moduleLog, notify } from "./utils.mjs";

const registry = new StatblockRegistry();
const api = new HuntersBestiaryDnd5eAPI(registry);
let statblockPromise = null;
let statblockCache = null;
api.setDashboardClass(DashboardApp);
configureDashboard(api);

Hooks.once("init", () => {
  exposeApi();
  try {
    registerSettings(DashboardApp);
  } catch (error) {
    moduleError("Settings registration failed", error);
  }
  moduleLog("Initialized.");
});

Hooks.once("ready", async () => {
  const failures = [];
  try {
    if (game.system.id !== SYSTEM_ID) throw new Error(`This module requires the dnd5e system, but '${game.system.id}' is active.`);
    const core = game.modules.get(CORE_MODULE_ID);
    if (!core?.active || !core.api) throw new Error("Hunter's Bestiary core module v1.3.2 or newer must be active.");
    await core.api.whenReady();
    if (core.api.initializationStatus?.ok === false) throw new Error("Hunter's Bestiary core did not initialize successfully.");
    core.api.registerComplementaryModule({
      moduleId: MODULE_ID,
      currentTitle: game.modules.get(MODULE_ID)?.title,
      gameSystem: "D&D 5e 2024",
      type: "system-layer",
      dashboardApplicationId: "hunters-bestiary-dnd5e-dashboard",
      providerId: MODULE_ID,
      version: game.modules.get(MODULE_ID)?.version,
      apiCompatibilityVersion: "1.0.0"
    });
    core.api.warnForInvalidComplementaryModuleName(MODULE_ID, { reason: "startup" });
    const data = await loadStatblocks();
    registry.register(MODULE_ID, data.records, { replaceProviderContent: true, allowPartial: false });
    registerCoreAdapters(core.api, registry);
    if (game.user.isGM) await api.repairManagedFolders();
    await showOnboardingOnce();
    moduleLog(`Ready with ${registry.size} D&D 5e 2024 stat blocks on dnd5e ${game.system.version}.`);
  } catch (error) {
    failures.push({ subsystem: "D&D 5e integration", message: error?.message ?? String(error) });
    moduleError("Initialization failed", error);
    notify("error", game.i18n.format("HBDND5E.Errors.InitializationFailed", { message: error.message }));
  } finally {
    api.markReady({ ok: failures.length === 0, failures });
    Hooks.callAll(`${MODULE_ID}.ready`, api, api.initializationStatus);
  }
});

function exposeApi() {
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = api;
  globalThis.HuntersBestiaryDnd5e = api;
}

async function loadStatblocks() {
  if (statblockCache) return statblockCache;
  statblockPromise ??= (async () => {
    const response = await fetch(`modules/${MODULE_ID}/data/statblocks.json`, { cache: "default" });
    if (!response.ok) throw new Error(`Could not load D&D 5e stat blocks (${response.status}).`);
    statblockCache = Object.freeze(await response.json());
    return statblockCache;
  })().finally(() => { statblockPromise = null; });
  return statblockPromise;
}

async function showOnboardingOnce() {
  if (!game.user.isGM) return;
  if (!game.settings.get(MODULE_ID, SETTINGS.SHOW_ONBOARDING)) return;
  if (game.settings.get(MODULE_ID, SETTINGS.ONBOARDING_SEEN)) return;
  await game.settings.set(MODULE_ID, SETTINGS.ONBOARDING_SEEN, true);
  api.open();
}

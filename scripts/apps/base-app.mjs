import { CORE_MODULE_ID, MODULE_ID, SETTINGS } from "../constants.mjs";
import { moduleError } from "../utils.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const REQUIRED_DASHBOARD_API = "1.0.0";

export function getCoreUi() {
  const ui = game.modules.get(CORE_MODULE_ID)?.api?.ui;
  if (!ui) throw new Error("Runyth Hunter's Bestiary dashboard API is unavailable. Enable Runyth Hunter's Bestiary 1.3.2 or newer.");
  const supportedMajor = Number(String(ui.version).split(".")[0]);
  const requiredMajor = Number(REQUIRED_DASHBOARD_API.split(".")[0]);
  if (supportedMajor < requiredMajor) throw new Error(`Runyth Hunter's Bestiary dashboard API ${REQUIRED_DASHBOARD_API} is required; installed: ${ui.version}.`);
  return ui;
}

export class PersistentApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["hunters-bestiary-dnd5e", "hbd5e-app", "hb-shared-dashboard"],
    tag: "section",
    window: { frame: true, positioned: true, minimizable: true, resizable: true }
  };

  #listeners = null;
  #geometry = null;

  get geometryDefaults() {
    return {
      width: this.options.position?.width ?? 960,
      height: this.options.position?.height ?? 720,
      minWidth: this.options.position?.minWidth ?? 560,
      minHeight: this.options.position?.minHeight ?? 420
    };
  }

  get geometryOptions() {
    return {
      moduleId: MODULE_ID,
      settingKey: SETTINGS.WINDOW_STATES,
      applicationId: this.options.id,
      mapped: true,
      defaults: this.geometryDefaults
    };
  }

  get renderSignal() {
    return this.#listeners?.signal;
  }

  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.setPosition(getCoreUi().loadGeometry(this.geometryOptions));
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#listeners?.abort();
    this.#listeners = new AbortController();
    this.#geometry ??= getCoreUi().createGeometryPersistence(this, this.geometryOptions);
    this.element?.addEventListener("pointerup", () => this.#geometry.schedule(), { signal: this.#listeners.signal });
  }

  setPosition(position = {}) {
    const result = super.setPosition(position);
    if (this.rendered) this.#geometry?.schedule();
    return result;
  }

  async _preClose(options) {
    this.#listeners?.abort();
    const geometry = this.#geometry;
    this.#geometry = null;
    let persistence;
    try { persistence = geometry?.flush(); } catch (error) { moduleError("Window-state persistence failed", error); }
    geometry?.destroy();
    if (persistence) void Promise.resolve(persistence).catch(error => moduleError("Window-state persistence failed", error));
    return super._preClose(options);
  }

  async resetWindowSize() {
    const value = await getCoreUi().resetSize(this.geometryOptions);
    if (this.rendered) this.setPosition(value);
    return value;
  }

  async resetWindowPosition() {
    const value = await getCoreUi().resetPosition(this.geometryOptions);
    if (this.rendered) this.setPosition(value);
    return value;
  }
}

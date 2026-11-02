import { CORE_MODULE_ID, MODULE_ID, SETTINGS } from "../constants.mjs";

const ApplicationV2 = globalThis.foundry?.applications?.api?.ApplicationV2 ?? class {};
const OPTIONS = Object.freeze({
  moduleId: MODULE_ID,
  settingKey: SETTINGS.WINDOW_STATES,
  applicationId: "hunters-bestiary-dnd5e-dashboard",
  mapped: true,
  defaults: { width: 960, height: 720, minWidth: 560, minHeight: 420 }
});

function coreUi() {
  const toolkit = globalThis.game?.modules?.get?.(CORE_MODULE_ID)?.api?.ui;
  if (!toolkit) throw new Error("Runyth Hunter's Bestiary dashboard API is unavailable.");
  return toolkit;
}

class ImmediateSettingsAction extends ApplicationV2 {
  static async execute() {}
  async render() { await this.constructor.execute(); return this; }
}

export class OpenDashboardMenu extends ImmediateSettingsAction {
  static async execute() {
    return globalThis.game?.modules?.get?.(MODULE_ID)?.api?.open?.();
  }
}

export class ResetDashboardSizeMenu extends ImmediateSettingsAction {
  static async execute() {
    await coreUi().resetSize(OPTIONS);
    globalThis.ui?.notifications?.info?.(globalThis.game?.i18n?.localize?.("HBDND5E.Notifications.SizeReset") ?? "Size reset");
  }
}

export class ResetDashboardPositionMenu extends ImmediateSettingsAction {
  static async execute() {
    await coreUi().resetPosition(OPTIONS);
    globalThis.ui?.notifications?.info?.(globalThis.game?.i18n?.localize?.("HBDND5E.Notifications.PositionReset") ?? "Position reset");
  }
}

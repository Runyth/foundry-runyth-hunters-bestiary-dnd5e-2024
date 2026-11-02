// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { MODULE_ID, SETTINGS } from "./constants.mjs";
import { OpenDashboardMenu, ResetDashboardPositionMenu, ResetDashboardSizeMenu } from "./apps/reset-menus.mjs";

let settingsRegistered = false;

export function registerSettings(DashboardApp) {
  if (settingsRegistered) return false;
  settingsRegistered = true;
  game.settings.registerMenu(MODULE_ID, "openDashboard", {
    name: "HBDND5E.Settings.OpenDashboard.Name",
    label: "HBDND5E.Settings.OpenDashboard.Label",
    hint: "HBDND5E.Settings.OpenDashboard.Hint",
    icon: "fa-solid fa-dragon",
    type: OpenDashboardMenu,
    restricted: true
  });

  game.settings.registerMenu(MODULE_ID, "resetDashboardSize", {
    name: "HBDND5E.Settings.ResetSize.Name",
    label: "HBDND5E.Settings.ResetSize.Label",
    hint: "HBDND5E.Settings.ResetSize.Hint",
    icon: "fa-solid fa-expand",
    type: ResetDashboardSizeMenu,
    restricted: false
  });
  game.settings.registerMenu(MODULE_ID, "resetDashboardPosition", {
    name: "HBDND5E.Settings.ResetPosition.Name",
    label: "HBDND5E.Settings.ResetPosition.Label",
    hint: "HBDND5E.Settings.ResetPosition.Hint",
    icon: "fa-solid fa-crosshairs",
    type: ResetDashboardPositionMenu,
    restricted: false
  });

  registerBoolean(SETTINGS.SHOW_ONBOARDING, true);
  registerBoolean(SETTINGS.ALLOW_INCOMPLETE_PACKS, false);

  registerString(SETTINGS.ACTOR_FOLDER, "Runyth Hunter's Bestiary - D&D 5e 2024: Quarry Actors");
  registerString(SETTINGS.HARVEST_FOLDER, "Runyth Hunter's Bestiary - D&D 5e 2024: Harvest Items");

  game.settings.register(MODULE_ID, SETTINGS.WINDOW_STATES, {
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });
  game.settings.register(MODULE_ID, SETTINGS.ONBOARDING_SEEN, {
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });
  return true;
}

function registerBoolean(key, defaultValue) {
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  game.settings.register(MODULE_ID, key, {
    name: `HBDND5E.Settings.${label}.Name`,
    hint: `HBDND5E.Settings.${label}.Hint`,
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: defaultValue
  });
}

function registerString(key, defaultValue) {
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  game.settings.register(MODULE_ID, key, {
    name: `HBDND5E.Settings.${label}.Name`,
    hint: `HBDND5E.Settings.${label}.Hint`,
    scope: "world",
    config: true,
    restricted: true,
    type: String,
    default: defaultValue
  });
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { ADAPTER_ID, MODULE_ID, MODULE_VERSION, SYSTEM_ID } from "./constants.mjs";
import { buildActorData, buildEncounterProfile, buildHarvestItemData, rollFieldCheck } from "./dnd5e-builder.mjs";

let registeredCoreApi = null;

export function registerCoreAdapters(coreApi, registry) {
  if (registeredCoreApi === coreApi) return false;
  if (registeredCoreApi) unregisterCoreAdapters(registeredCoreApi);
  const adapter = {
    systemId: SYSTEM_ID,
    label: "D&D 5e 2024 Reference Adapter",
    version: MODULE_VERSION,
    primary: true,
    capabilities: {
      actorProvisioning: true,
      fieldChecks: true,
      harvestItems: true,
      encounterProfiles: true
    },
    supportsMonster: monster => registry.has(monster.id),
    validateSource: ({ monster, source }) => {
      const statblockId = source?.data?.statblockId ?? monster.id;
      return registry.has(statblockId) || `No D&D 5e 2024 stat block is registered for '${statblockId}'.`;
    },
    buildActorData: ({ monster, source }) => {
      const statblockId = source?.data?.statblockId ?? monster.id;
      return buildActorData(monster, registry.get(statblockId));
    },
    rollFieldCheck,
    buildHarvestItemData: ({ monster }) => buildHarvestItemData(monster, registry.get(monster.id)),
    buildEncounterProfile: ({ monster }) => buildEncounterProfile(monster, registry.get(monster.id))
  };

  coreApi.registerActorAdapter(ADAPTER_ID, adapter);
  coreApi.registerSystemAdapter(ADAPTER_ID, adapter);
  registeredCoreApi = coreApi;
  globalThis.Hooks?.callAll?.(`${MODULE_ID}.adapterRegistered`, { adapterId: ADAPTER_ID, capabilities: adapter.capabilities });
  return adapter;
}

export function unregisterCoreAdapters(coreApi = registeredCoreApi) {
  if (!coreApi) return false;
  coreApi.unregisterActorAdapter(ADAPTER_ID);
  coreApi.unregisterSystemAdapter(ADAPTER_ID);
  if (registeredCoreApi === coreApi) registeredCoreApi = null;
  return true;
}

export function resetAdapterRegistrationForTests() {
  registeredCoreApi = null;
}

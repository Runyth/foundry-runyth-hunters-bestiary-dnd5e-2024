import { CORE_MODULE_ID, MODULE_ID } from "./constants.mjs";
import { clone } from "./utils.mjs";
import { isManagedHarvestItem } from "./managed-resources.mjs";

const FALLBACK_YIELD_INTERVAL = 8;

function flag(document, moduleId, key) {
  return document?.getFlag?.(moduleId, key) ?? document?.flags?.[moduleId]?.[key];
}

function managedKey(monsterId, index) {
  return `${monsterId}:${index}`;
}

export async function importOrUpdateHarvestItems({ monsterId, records, folderName, onProgress } = {}) {
  return importOrUpdateHarvestItemsBatch({
    entries: [{ monsterId, records }],
    folderName,
    onProgress
  });
}

export async function importOrUpdateHarvestItemsBatch({ entries = [], folderName, onProgress } = {}) {
  if (!globalThis.game?.user?.isGM) throw new Error("Only a GM may import Hunter's Bestiary harvest Items.");
  const ItemClass = globalThis.CONFIG?.Item?.documentClass ?? globalThis.Item;
  if (!ItemClass?.createDocuments) throw new Error("Foundry Item document class is unavailable.");

  const folder = await ensureItemFolder(folderName);
  const existingByKey = new Map();
  for (const item of globalThis.game?.items?.contents ?? []) {
    if (!isManagedHarvestItem(item)) continue;
    const monsterId = flag(item, MODULE_ID, "monsterId");
    const harvestIndex = Number(flag(item, MODULE_ID, "harvestIndex"));
    existingByKey.set(managedKey(monsterId, harvestIndex), item);
  }

  const createJobs = [];
  const updateJobs = [];
  for (const entry of entries ?? []) {
    for (const [index, record] of (entry.records ?? []).entries()) {
      const current = existingByKey.get(managedKey(entry.monsterId, index)) ?? null;
      const job = { monsterId: entry.monsterId, index, record, current };
      if (current) updateJobs.push({ ...job, data: { ...prepareUpdate(record, current, entry.monsterId, index), _id: current.id } });
      else createJobs.push({ ...job, data: prepareCreate(record, entry.monsterId, index, folder.id) });
    }
  }

  const result = { created: [], updated: [], skipped: [], failed: [] };
  const total = createJobs.length + updateJobs.length;
  let current = 0;
  const report = (job, operation, document = null, error = null) => {
    current += 1;
    if (operation === "created" && document) result.created.push(document);
    else if (operation === "updated" && document) result.updated.push(document);
    else if (operation === "failed") result.failed.push({
      monsterId: job.monsterId,
      harvestIndex: job.index,
      name: job.record?.name ?? `Harvest Item ${job.index + 1}`,
      message: error?.message ?? String(error),
      error
    });
    onProgress?.({
      current,
      total,
      phase: "items",
      label: document?.name ?? job.record?.name ?? `Harvest Item ${job.index + 1}`,
      operation,
      success: result.created.length + result.updated.length,
      skipped: result.skipped.length,
      failed: result.failed.length,
      errors: result.failed
    });
  };

  await executeBatchWithFallback({
    jobs: updateJobs,
    bulk: ItemClass.updateDocuments ? data => ItemClass.updateDocuments(data, { render: false }) : null,
    single: job => job.current.update(job.data),
    onSuccess: (job, document) => report(job, "updated", document ?? job.current),
    onFailure: (job, error) => report(job, "failed", null, error)
  });

  await executeBatchWithFallback({
    jobs: createJobs,
    bulk: data => ItemClass.createDocuments(data, { renderSheet: false, render: false }),
    single: job => ItemClass.createDocuments([job.data], { renderSheet: false, render: false }).then(documents => documents[0]),
    onSuccess: (job, document) => report(job, "created", document),
    onFailure: (job, error) => report(job, "failed", null, error)
  });

  return result;
}

async function executeBatchWithFallback({ jobs, bulk, single, onSuccess, onFailure }) {
  if (!jobs.length) return;
  try {
    if (!bulk) throw new Error("Bulk operation unavailable.");
    const documents = await bulk(jobs.map(job => job.data));
    for (let index = 0; index < jobs.length; index += 1) onSuccess(jobs[index], documents?.[index] ?? null);
    return;
  } catch (batchError) {
    console.warn(`${MODULE_ID} | Bulk harvest Item operation failed; retrying individually`, batchError);
  }

  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    try {
      onSuccess(job, await single(job));
    } catch (error) {
      onFailure(job, error);
    }
    if ((index + 1) % FALLBACK_YIELD_INTERVAL === 0) await yieldToBrowser();
  }
}

async function yieldToBrowser() {
  if (globalThis.scheduler?.yield) return globalThis.scheduler.yield();
  await new Promise(resolve => {
    if (typeof globalThis.requestAnimationFrame === "function") globalThis.requestAnimationFrame(() => resolve());
    else globalThis.setTimeout(resolve, 0);
  });
}

async function ensureItemFolder(name) {
  const existing = (globalThis.game?.folders ?? []).find(folder => folder.name === name && folder.type === "Item");
  if (existing) return existing;
  const FolderClass = globalThis.CONFIG?.Folder?.documentClass ?? globalThis.Folder;
  if (!FolderClass?.create) throw new Error("Foundry Folder document class is unavailable.");
  return FolderClass.create({
    name,
    type: "Item",
    sorting: "a",
    color: "#6d4b2f",
    flags: { [MODULE_ID]: { managedFolder: true, managedKind: "items" } }
  });
}

function prepareCreate(record, monsterId, index, folderId) {
  const data = clone(record);
  delete data._id;
  delete data._stats;
  delete data._key;
  data.folder = folderId;
  data.ownership ??= { default: 0 };
  data.flags ??= {};
  data.flags[CORE_MODULE_ID] = {
    ...(data.flags[CORE_MODULE_ID] ?? {}),
    source: `harvest:${monsterId}`,
    monsterId,
    provisionedAt: new Date().toISOString()
  };
  data.flags[MODULE_ID] = {
    ...(data.flags[MODULE_ID] ?? {}),
    monsterId,
    harvestIndex: index,
    rules: "2024"
  };
  return data;
}

function prepareUpdate(record, current, monsterId, index) {
  const currentCore = clone(current.flags?.[CORE_MODULE_ID] ?? {});
  const currentModule = clone(current.flags?.[MODULE_ID] ?? {});
  return {
    name: record.name,
    img: record.img,
    system: clone(record.system),
    flags: {
      [CORE_MODULE_ID]: {
        ...currentCore,
        source: `harvest:${monsterId}`,
        monsterId,
        provisionedAt: currentCore.provisionedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      [MODULE_ID]: {
        ...currentModule,
        ...(record.flags?.[MODULE_ID] ?? {}),
        monsterId,
        harvestIndex: index,
        rules: "2024"
      }
    }
  };
}

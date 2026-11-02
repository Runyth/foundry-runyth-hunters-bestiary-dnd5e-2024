import { clone, slugify } from "./utils.mjs";

export const STATBLOCK_REGISTRY_CONTRACT_VERSION = "1.1.0";

function validationIssue(rule, field, message) {
  return { rule, field, message };
}

export class StatblockValidationError extends Error {
  constructor(message, reports = [], diagnostics = {}) {
    super(message);
    this.name = "StatblockValidationError";
    this.reports = reports;
    this.diagnostics = diagnostics;
  }
}

export class StatblockRegistry {
  #records = new Map();

  get size() {
    return this.#records.size;
  }

  has(monsterId) {
    return this.#records.has(String(monsterId ?? ""));
  }

  get(monsterId) {
    const entry = this.#records.get(String(monsterId ?? ""));
    return entry ? clone(entry.record) : null;
  }

  list({ providerId = null } = {}) {
    return [...this.#records.values()]
      .filter(entry => !providerId || entry.providerId === slugify(providerId))
      .map(entry => clone(entry.record));
  }

  providerRecords(providerId) {
    return this.list({ providerId });
  }

  validate(records, { allowPartial = false } = {}) {
    if (!Array.isArray(records)) {
      const reports = [{
        monsterId: null,
        recordId: null,
        complete: false,
        errors: ["records must be an array"],
        issues: [validationIssue("records-array", "records", "records must be an array")]
      }];
      if (!allowPartial) {
        throw new StatblockValidationError("The D&D 5e stat-block registry requires an array of records.", reports, {
          contractVersion: STATBLOCK_REGISTRY_CONTRACT_VERSION,
          rule: "records-array"
        });
      }
      return { valid: false, complete: false, reports, records: [], contractVersion: STATBLOCK_REGISTRY_CONTRACT_VERSION };
    }

    const reports = records.map(record => validateRecord(record));
    const duplicateIds = new Map();
    for (const [index, report] of reports.entries()) {
      if (!report.monsterId) continue;
      const first = duplicateIds.get(report.monsterId);
      if (first === undefined) duplicateIds.set(report.monsterId, index);
      else {
        const issue = validationIssue("unique-monster-id", "monsterId", `monsterId '${report.monsterId}' is duplicated`);
        report.issues.push(issue);
        report.errors.push(issue.message);
        report.complete = false;
        const firstReport = reports[first];
        if (!firstReport.issues.some(entry => entry.rule === issue.rule)) {
          firstReport.issues.push(issue);
          firstReport.errors.push(issue.message);
          firstReport.complete = false;
        }
      }
    }

    const complete = reports.every(report => report.complete);
    if (!complete && !allowPartial) {
      throw new StatblockValidationError("One or more D&D 5e stat blocks are incomplete.", reports, {
        contractVersion: STATBLOCK_REGISTRY_CONTRACT_VERSION,
        invalidRecords: reports.filter(report => !report.complete).map(report => report.monsterId ?? report.recordId ?? "unknown")
      });
    }
    return {
      valid: complete,
      complete,
      reports,
      records: records.map(clone),
      contractVersion: STATBLOCK_REGISTRY_CONTRACT_VERSION
    };
  }

  register(providerId, records, { replaceProviderContent = true, allowPartial = false } = {}) {
    const source = slugify(providerId);
    if (!source) throw new Error("A stat-block provider id is required.");

    // Validate and clone before mutating the live registry. This guarantees that
    // a rejected replacement cannot remove the provider's currently valid data.
    const validation = this.validate(records, { allowPartial });
    const normalizedRecords = validation.records
      .filter(record => record?.monsterId)
      .map(record => {
        const normalized = clone(record);
        normalized.id ??= normalized.monsterId;
        normalized.providerId = source;
        return normalized;
      });
    const previous = this.providerRecords(source);

    try {
      if (replaceProviderContent) this.unregister(source);
      for (const normalized of normalizedRecords) {
        this.#records.set(normalized.monsterId, { providerId: source, record: normalized });
      }
    } catch (error) {
      this.unregister(source);
      for (const record of previous) this.#records.set(record.monsterId, { providerId: source, record: clone(record) });
      throw Object.assign(error, {
        registryDiagnostic: {
          providerId: source,
          rolledBack: true,
          contractVersion: STATBLOCK_REGISTRY_CONTRACT_VERSION
        }
      });
    }

    return {
      providerId: source,
      count: normalizedRecords.length,
      complete: validation.complete,
      valid: validation.valid,
      reports: validation.reports,
      replaced: replaceProviderContent ? previous.length : 0,
      rolledBack: false,
      contractVersion: STATBLOCK_REGISTRY_CONTRACT_VERSION
    };
  }

  unregister(providerId) {
    const source = slugify(providerId);
    let count = 0;
    for (const [monsterId, entry] of this.#records.entries()) {
      if (entry.providerId !== source) continue;
      this.#records.delete(monsterId);
      count += 1;
    }
    return count;
  }
}

export function validateRecord(record) {
  const issues = [];
  const id = String(record?.monsterId ?? "").trim();
  const add = (rule, field, message) => issues.push(validationIssue(rule, field, message));
  if (!id) add("monster-id", "monsterId", "monsterId is required");
  if (record?.rules !== "2024") add("rules-2024", "rules", "rules must be '2024'");
  if (!Number.isFinite(Number(record?.cr)) || Number(record.cr) < 0 || Number(record.cr) > 30) add("challenge-rating", "cr", "cr must be between 0 and 30");
  if (!Number.isFinite(Number(record?.ac)) || Number(record.ac) < 1) add("armor-class", "ac", "ac is required");
  if (!Number.isFinite(Number(record?.hp?.value)) || Number(record.hp.value) < 1 || !String(record?.hp?.formula ?? "").trim()) add("hit-points", "hp", "hp.value and hp.formula are required");
  for (const ability of ["str", "dex", "con", "int", "wis", "cha"]) {
    if (!Number.isFinite(Number(record?.abilities?.[ability]))) add("ability-score", `abilities.${ability}`, `abilities.${ability} is required`);
  }
  if (!Array.isArray(record?.actions) || !record.actions.length) add("actions", "actions", "at least one action is required");
  if (!Array.isArray(record?.traits) || !record.traits.length) add("traits", "traits", "at least one trait is required");
  if (!Array.isArray(record?.harvest) || !record.harvest.length) add("harvest", "harvest", "at least one harvest Item is required");
  return {
    monsterId: id || null,
    recordId: String(record?.id ?? id ?? "").trim() || null,
    complete: issues.length === 0,
    errors: issues.map(issue => issue.message),
    issues
  };
}

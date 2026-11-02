// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const previousFoundry = globalThis.foundry;
class MockApplicationV2 {}
globalThis.foundry = {
  applications: {
    api: { ApplicationV2: MockApplicationV2, HandlebarsApplicationMixin: Base => Base },
    instances: new Map()
  }
};
const { operationHasFailures, runOwnedProgressOperation } = await import(`../scripts/apps/dashboard.mjs?progress=${Date.now()}`);
function explicitFailureDetector(value) {
  if (value instanceof Error) return true;
  if (Array.isArray(value)) return value.some(explicitFailureDetector);
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) return false;
  if (value.operation === "failed" || value.status === "failed" || value.ok === false || value.success === false) return true;
  if (typeof value.failed === "number" && value.failed > 0) return true;
  if (Array.isArray(value.failed) && value.failed.length > 0) return true;
  if (Array.isArray(value.failures) && value.failures.length > 0) return true;
  if (Array.isArray(value.errors) && value.errors.length > 0) return true;
  return Array.isArray(value.results) && value.results.some(explicitFailureDetector);
}


test.after(() => { globalThis.foundry = previousFoundry; });

test("successful progress windows are foregrounded and closed automatically", async () => {
  let front = 0;
  let closed = 0;
  const dialog = {
    title: "Import Actors",
    rendered: true,
    element: { querySelector: selector => selector === ".hb-shared-progress" ? {} : null },
    bringToFront: () => { front += 1; },
    close: async () => { closed += 1; }
  };
  const tracked = new Set();
  const app = {
    element: {},
    trackProgressDialog: value => tracked.add(value),
    releaseProgressDialog: value => tracked.delete(value)
  };
  globalThis.foundry.applications.instances = new Map();
  globalThis.game = { modules: new Map([["runyth-hunters-bestiary", { api: { ui: {
    version: "1.0.0",
    operationHasFailures: explicitFailureDetector,
    runProgressOperation: async ({ runner }) => {
      globalThis.foundry.applications.instances.set("progress", dialog);
      return runner(() => undefined);
    }
  } } }]]) };

  const result = await runOwnedProgressOperation(app, { title: "Import Actors", runner: async () => ["done"] });
  assert.deepEqual(result, ["done"]);
  assert.ok(front >= 1);
  assert.equal(closed, 1);
  assert.equal(tracked.size, 0);
});

test("failed progress windows remain visible until their dashboard closes", async () => {
  let front = 0;
  let closed = 0;
  const dialog = {
    title: "Update Actors",
    rendered: true,
    element: { querySelector: selector => selector === ".hb-shared-progress" ? {} : null },
    bringToFront: () => { front += 1; },
    close: async () => { closed += 1; }
  };
  const tracked = new Set();
  const app = {
    element: {},
    trackProgressDialog: value => tracked.add(value),
    releaseProgressDialog: value => tracked.delete(value)
  };
  globalThis.foundry.applications.instances = new Map();
  globalThis.game = { modules: new Map([["runyth-hunters-bestiary", { api: { ui: {
    version: "1.0.0",
    operationHasFailures: explicitFailureDetector,
    runProgressOperation: async ({ runner }) => {
      globalThis.foundry.applications.instances.set("progress", dialog);
      return runner(() => undefined);
    }
  } } }]]) };

  await assert.rejects(() => runOwnedProgressOperation(app, { title: "Update Actors", runner: async () => { throw new Error("failure"); } }), /failure/);
  assert.ok(front >= 1);
  assert.equal(closed, 0);
  assert.equal(tracked.has(dialog), true);
});

test("closing the dashboard closes any owned progress windows", async () => {
  const source = await readFile(new URL("../scripts/apps/dashboard.mjs", import.meta.url), "utf8");
  assert.match(source, /async closeProgressDialogs\(\)/);
  assert.match(source, /await this\.closeProgressDialogs\(\)/);
  assert.match(source, /Promise\.allSettled/);
});


test("partial result failures keep the progress window open", async () => {
  let closed = 0;
  const dialog = {
    title: "Import Actors",
    rendered: true,
    element: { querySelector: selector => selector === ".hb-shared-progress" ? {} : null },
    bringToFront: () => undefined,
    close: async () => { closed += 1; }
  };
  const tracked = new Set();
  const app = { element: {}, trackProgressDialog: value => tracked.add(value), releaseProgressDialog: value => tracked.delete(value) };
  globalThis.foundry.applications.instances = new Map();
  globalThis.game = { modules: new Map([["runyth-hunters-bestiary", { api: { ui: {
    version: "1.0.0",
    operationHasFailures: explicitFailureDetector,
    runProgressOperation: async ({ runner }) => {
      globalThis.foundry.applications.instances.set("progress", dialog);
      return runner(() => undefined);
    }
  } } }]]) };
  const result = await runOwnedProgressOperation(app, { title: "Import Actors", runner: async () => ({ created: [], failed: [{ message: "bad actor" }] }) });
  assert.equal(operationHasFailures(result), true);
  assert.equal(closed, 0);
  assert.equal(tracked.has(dialog), true);
});

"use strict";

// #953: a chassis view that follows the system's layout (the generated
// Primary Chassis, or any chassis view with no layout of its own) is labelled
// "Chassis" on the main page. Only a chassis view with its own saved layout
// is a "Saved view".

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "../..");
const APP_SOURCE = fs.readFileSync(path.join(ROOT, "app/static/app.js"), "utf8");
const helperText = fs.readFileSync(path.join(__dirname, "refresh_races.test.js"), "utf8");
const helpers = vm.createContext({ assert });
vm.runInContext(
  helperText.slice(helperText.indexOf("function functionSource("), helperText.indexOf("function loadFunction(")),
  helpers
);

function load(names) {
  const context = vm.createContext({ state: { snapshotMode: false } });
  vm.runInContext(names.map((name) => helpers.functionSource(APP_SOURCE, name)).join("\n"), context);
  return context;
}

const app = load(["isSavedChassisView", "storageViewKindLabel", "selectorLabelForStorageViewOption"]);

test("a chassis view that follows the system layout is labelled Chassis", () => {
  const generated = { id: "primary-chassis", label: "Primary Chassis", kind: "ses_enclosure", profile_pinned: false };
  assert.equal(app.storageViewKindLabel(generated), "Chassis");
  assert.equal(app.selectorLabelForStorageViewOption(generated), "Chassis · Primary Chassis");
});

test("a chassis view with its own saved layout stays a Saved view", () => {
  const pinned = { id: "front", label: "Front Shelf", kind: "ses_enclosure", profile_pinned: true };
  assert.equal(app.storageViewKindLabel(pinned), "Saved view");
});

test("non-chassis storage views keep the Storage view label", () => {
  assert.equal(app.storageViewKindLabel({ kind: "boot_devices" }), "Storage view");
});

"use strict";

// #952: the System Setup "Chassis layout" list, the step 4 "Add a view"
// picker and the candidate list heading. Synthetic profiles and drives only.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const SOURCE = fs.readFileSync(path.resolve(__dirname, "../../admin_service/static/admin.js"), "utf8");

// Optional lookup, so a helper added by the fix is loaded when present and the
// same file still runs (and fails on behavior) against the code before it.
function functionSource(name) {
  return SOURCE.match(new RegExp(`^  function ${name}\\([\\s\\S]*?^  }`, "m"))?.[0] || "";
}

const FUNCTIONS = [
  "escapeHtml", "getProfileById", "currentPinnedProfileId", "currentPinnedProfile",
  "renderProfileOptions",
  "orderedStorageViewProfiles", "currentLiveEnclosures", "liveEnclosureMatchesForProfile",
  "storageViewTemplateProfileIds", "addableStorageViewProfiles", "hiddenLiveChassisProfiles",
  "storageViewAddValueForProfile", "storageViewAddOptionsHtml", "storageViewAddDefaultValue",
  "candidateBindingAlreadyAttached", "storageViewCandidateOwner", "visibleStorageViewCandidates",
  "candidateBusLabel", "renderStorageViewCandidates",
];

class Select {
  constructor() {
    this.options = [];
    this._value = "";
    this._html = "";
  }
  get value() { return this._value; }
  set value(value) {
    this._value = this.options.some((option) => option.value === String(value)) ? String(value) : "";
  }
  get innerHTML() { return this._html; }
  set innerHTML(html) {
    this._html = html;
    this.options = [...html.matchAll(/<option\b[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/g)]
      .map((match) => ({ value: match[1], label: match[2] }));
    this._value = this.options[0]?.value || "";
  }
}

class Box {
  constructor() {
    this.textContent = "";
    this.innerHTML = "";
    this.disabled = false;
  }
}

// Same shape as serialize_profiles(): the card and rear-group profiles carry
// system_layout false; a custom profile saved before the flag existed has none.
const PROFILES = [
  { id: "supermicro-cse-946-top-60", label: "Supermicro CSE-946 Top", face_style: "top-loader", system_layout: true },
  { id: "supermicro-ssg-6048r-rear-12", label: "Supermicro SSG-6048R Rear 12", face_style: "rear-drive", system_layout: true },
  { id: "supermicro-aoc-slg4-2h8m2", label: "Supermicro AOC-SLG4-2H8M2", face_style: "nvme-carrier", system_layout: false },
  { id: "supermicro-fat-twin-front-6", label: "Supermicro FatTwin Front 6", face_style: "front-drive", system_layout: true },
  { id: "supermicro-fat-twin-rear-2", label: "Supermicro FatTwin Rear 2", face_style: "rear-drive", system_layout: false },
  { id: "generic-front-24-1x24", label: "Generic Front 24", face_style: "front-drive", system_layout: true },
  { id: "custom-shelf", label: "Synthetic custom shelf", face_style: "front-drive", is_custom: true },
];

// Same shape as serialize_storage_view_templates(): the two virtual twins name
// the chassis profile that draws the same hardware.
const TEMPLATES = [
  { id: "ses-auto", label: "SES Enclosure", kind: "ses_enclosure" },
  { id: "m2-carrier-passive-2", label: "2x M.2 carrier (passive)", kind: "nvme_carrier" },
  { id: "aoc-slg4-2h8m2-2", label: "Supermicro AOC-SLG4-2H8M2", kind: "nvme_carrier",
    same_hardware_profile_id: "supermicro-aoc-slg4-2h8m2" },
  { id: "fat-twin-rear-2", label: "FatTwin Rear 2", kind: "manual",
    same_hardware_profile_id: "supermicro-fat-twin-rear-2" },
];

const EXCLUDED_PROFILE_IDS = ["supermicro-aoc-slg4-2h8m2", "supermicro-fat-twin-rear-2"];

function load({ selectedProfileId = "", storageViews = [], candidates = [], selectedStorageViewId = "" } = {}) {
  const state = {
    profiles: PROFILES.map((profile) => ({ ...profile })),
    storageViewTemplates: TEMPLATES.map((template) => ({ ...template })),
    selectedProfileId,
    liveEnclosures: [],
    liveEnclosuresSystemId: null,
    storageViews,
    selectedStorageViewId,
    storageViewCandidates: candidates,
    storageViewCandidatesTargetSystemId: "",
    storageViewCandidatesLoading: false,
    storageViewCandidatesRequestScope: "scope",
  };
  const elements = {
    setupProfile: new Select(),
    setupStorageViewCandidatesList: new Box(),
    setupStorageViewCandidatesHelp: new Box(),
    setupStorageViewCandidatesAddAllButton: new Box(),
  };
  const context = vm.createContext({
    console, state, elements,
    currentStorageViewSystemId: () => "synthetic-core",
    currentStorageViewTargetSystemId: () => "",
    currentStorageViewCandidateScope: () => "scope",
    storageViewCandidatesReady: () => true,
    haTargetOptions: () => [],
    fetchStorageViewCandidates: () => assert.fail("no candidate fetch in this test"),
    getSelectedStorageView: () => state.storageViews.find((view) => view.id === state.selectedStorageViewId) || null,
  });
  const names = FUNCTIONS.filter((name) => functionSource(name));
  vm.runInContext(
    `${names.map(functionSource).join("\n")}\nglobalThis.__tested = { ${names.join(", ")} };`,
    context,
    { filename: "admin.js" }
  );
  return { api: context.__tested, state, elements };
}

function addViewOptions(api) {
  const select = new Select();
  select.innerHTML = api.storageViewAddOptionsHtml();
  return select.options;
}

test("Add a view lists each piece of hardware once", () => {
  const { api } = load();
  const options = addViewOptions(api);
  const values = options.map((option) => option.value);

  for (const profileId of EXCLUDED_PROFILE_IDS) {
    assert.ok(!values.includes(`profile:${profileId}`), `${profileId} is offered as a chassis view`);
  }
  assert.ok(values.includes("aoc-slg4-2h8m2-2"), "the AOC internal view is still offered");
  assert.ok(values.includes("fat-twin-rear-2"), "the FatTwin rear internal view is still offered");
  assert.ok(values.includes("profile:supermicro-ssg-6048r-rear-12"), "a rear chassis face is still a chassis view");
  assert.ok(values.includes("profile:supermicro-cse-946-top-60"));

  const normalized = options.map((option) => option.label.replace(/^Supermicro /, "").replace(/ \(Pinned\)$/, ""));
  assert.equal(new Set(normalized).size, normalized.length, `duplicate names: ${normalized.join(" | ")}`);
});

test("Add a view uses the explicit template map, not matching labels", () => {
  const { api, state } = load();
  // A template whose label matches a profile but names no profile keeps both.
  state.storageViewTemplates.push({ id: "synthetic-twin", label: "Generic Front 24", kind: "manual" });
  const values = addViewOptions(api).map((option) => option.value);
  assert.ok(values.includes("profile:generic-front-24-1x24"));
  assert.ok(values.includes("synthetic-twin"));
  // An SES template naming a profile does not hide it.
  state.storageViewTemplates = TEMPLATES.map((template) =>
    template.id === "ses-auto" ? { ...template, same_hardware_profile_id: "generic-front-24-1x24" } : { ...template });
  assert.ok(addViewOptions(api).some((option) => option.value === "profile:generic-front-24-1x24"));
});

test("Add a view defaults to the matching internal view when the system is pinned to the card profile", () => {
  // Codex review on #966: falling through to the first chassis profile made
  // Add create an unrelated chassis view for an AOC- or FatTwin-rear system.
  const expected = {
    "supermicro-aoc-slg4-2h8m2": "aoc-slg4-2h8m2-2",
    "supermicro-fat-twin-rear-2": "fat-twin-rear-2",
  };
  for (const pinned of EXCLUDED_PROFILE_IDS) {
    const { api } = load({ selectedProfileId: pinned });
    const values = addViewOptions(api).map((option) => option.value);
    const defaultValue = api.storageViewAddDefaultValue();
    assert.ok(values.includes(defaultValue), `${pinned}: default ${defaultValue} is not an option`);
    assert.equal(defaultValue, expected[pinned], pinned);
  }
  // A chassis pin still defaults to its own saved chassis view.
  const { api } = load({ selectedProfileId: "supermicro-fat-twin-front-6" });
  assert.equal(api.storageViewAddDefaultValue(), "profile:supermicro-fat-twin-front-6");
});

test("System Chassis layout lists chassis and shelf profiles only", () => {
  const { api, elements, state } = load();
  api.renderProfileOptions();
  const values = elements.setupProfile.options.map((option) => option.value);

  assert.deepEqual(values, [
    "",
    "supermicro-cse-946-top-60",
    "supermicro-ssg-6048r-rear-12",
    "supermicro-fat-twin-front-6",
    "generic-front-24-1x24",
    "custom-shelf",
  ]);
  assert.equal(elements.setupProfile.value, "");
  assert.equal(state.selectedProfileId, "");
  // A plain list keeps the exact markup it had before #952.
  assert.equal(elements.setupProfile.innerHTML.startsWith('<option value="">Detect automatically</option>'), true);
});

test("a system saved with a card or rear-group profile keeps it as its Chassis layout", () => {
  for (const saved of EXCLUDED_PROFILE_IDS) {
    // loadSystemIntoForm: selectedProfileId from the saved system, render, then
    // the select takes that value; Save posts elements.setupProfile.value.
    const { api, elements, state } = load({ selectedProfileId: saved });
    api.renderProfileOptions();
    elements.setupProfile.value = state.selectedProfileId;

    assert.equal(elements.setupProfile.value, saved, `${saved} was reset to Detect automatically`);
    assert.equal(state.selectedProfileId, saved);
    const current = elements.setupProfile.options.filter((option) => option.value === saved);
    assert.equal(current.length, 1);
    assert.match(current[0].label, /^Current: /);

    // Re-rendering (catalog refresh) keeps it while it is still the choice.
    api.renderProfileOptions();
    assert.equal(elements.setupProfile.value, saved);

    // Once the operator picks a chassis, the card stops being offered.
    elements.setupProfile.value = "supermicro-fat-twin-front-6";
    state.selectedProfileId = "supermicro-fat-twin-front-6";
    api.renderProfileOptions();
    assert.equal(elements.setupProfile.value, "supermicro-fat-twin-front-6");
    assert.ok(!elements.setupProfile.options.some((option) => option.value === saved));
  }
});

function candidate(serial, overrides = {}) {
  return {
    candidate_id: serial,
    label: serial,
    description: "Synthetic NVMe, 2.00 TB",
    serial,
    bus: "NVME",
    device_names: [`nvd-${serial}`],
    recommended_binding: { serials: [serial], pcie_addresses: [], device_names: [] },
    ...overrides,
  };
}

function viewWithSerials(id, serials) {
  return { id, label: id, binding: { mode: "hybrid", serials, pcie_addresses: [], device_names: [] } };
}

test("the candidate heading matches a list holding an attached and an unmapped drive", () => {
  const { api, elements } = load({
    storageViews: [viewWithSerials("internal-flash", ["SYN-ATTACHED"]), viewWithSerials("other-view", ["SYN-ELSEWHERE"])],
    selectedStorageViewId: "internal-flash",
    candidates: [candidate("SYN-ATTACHED"), candidate("SYN-UNMAPPED"), candidate("SYN-ELSEWHERE")],
  });
  api.renderStorageViewCandidates();

  const help = elements.setupStorageViewCandidatesHelp.textContent;
  const list = elements.setupStorageViewCandidatesList.innerHTML;
  assert.ok(list.includes("SYN-ATTACHED") && list.includes("SYN-UNMAPPED"), "both drives are listed");
  assert.ok(!list.includes("SYN-ELSEWHERE"), "a drive in another view is not listed");
  assert.ok(list.includes("Already Added"), "the attached drive keeps its badge and disabled button");
  // The list holds a drive this view already shows, so the heading cannot say
  // "not yet shown in a view".
  assert.doesNotMatch(help, /not yet/i);
  assert.equal(help, "Drives on synthetic-core that are not in a chassis bay or another view:");
});

test("the candidate panel title does not promise drives that are in no view", () => {
  const html = fs.readFileSync(path.resolve(__dirname, "../../admin_service/templates/index.html"), "utf8");
  const panel = html.slice(html.indexOf('<div class="storage-view-candidate-panel">'));
  const title = panel.match(/<h4>([^<]*)<\/h4>/)?.[1];
  assert.equal(title, "Drives for this view");
});

test("an UNKNOWN bus is not shown as a bare candidate chip", () => {
  for (const bus of ["UNKNOWN", "unknown"]) {
    const { api, elements } = load({
      storageViews: [viewWithSerials("internal-flash", [])],
      selectedStorageViewId: "internal-flash",
      candidates: [candidate("SYN-NVME", { bus })],
    });
    api.renderStorageViewCandidates();
    assert.doesNotMatch(elements.setupStorageViewCandidatesList.innerHTML, /meta-chip">unknown</i, bus);
  }
  const { api, elements } = load({
    storageViews: [viewWithSerials("internal-flash", [])],
    selectedStorageViewId: "internal-flash",
    candidates: [candidate("SYN-SATA", { bus: "ATA" })],
  });
  api.renderStorageViewCandidates();
  assert.match(elements.setupStorageViewCandidatesList.innerHTML, /meta-chip">ATA</);
});

test("loading a system saved with a card profile after a chassis system keeps the card", () => {
  // The real top of loadSystemIntoForm, up to where the select takes the saved value.
  const start = SOURCE.indexOf("  function loadSystemIntoForm(system) {");
  const end = SOURCE.indexOf("\n    if (elements.setupMakeDefault) {", start);
  assert.ok(start > 0 && end > start);
  const { api, elements, state } = load();
  const field = () => ({ value: "" });
  Object.assign(elements, { setupSystemLabel: field(), setupSystemId: field(), setupPlatform: field() });
  const context = vm.createContext({
    console, state, elements,
    renderProfileOptions: api.renderProfileOptions,
    retireAdminEditorControls: () => {},
    normalizeHaNodes: (nodes) => nodes,
    replaceStorageViewState: () => {},
  });
  vm.runInContext(`${SOURCE.slice(start, end)}\n  }\nglobalThis.load = loadSystemIntoForm;`, context, { filename: "admin.js" });

  context.load({ id: "synthetic-twin-front", platform: "ipmi", default_profile_id: "supermicro-fat-twin-front-6" });
  assert.equal(elements.setupProfile.value, "supermicro-fat-twin-front-6");
  for (const saved of ["generic-front-24-1x24", "", ...EXCLUDED_PROFILE_IDS]) {
    context.load({ id: "synthetic-next", platform: "esxi", default_profile_id: saved });
    assert.equal(elements.setupProfile.value, saved, `loaded ${saved || "auto"}`);
    assert.equal(state.selectedProfileId, saved);
    context.load({ id: "synthetic-twin-front", platform: "ipmi", default_profile_id: "supermicro-fat-twin-front-6" });
    assert.equal(elements.setupProfile.value, "supermicro-fat-twin-front-6");
  }
});

test("picking a card layout from the layout catalog keeps the select and the saved value in step", () => {
  // The real catalog click handler, with the profile builder renders stubbed.
  const start = SOURCE.indexOf("    elements.profileCatalog?.addEventListener(\"click\", (event) => {");
  const end = SOURCE.indexOf("\n    elements.profileBuilderLoadButton", start);
  assert.ok(start > 0 && end > start);
  const { api, elements, state } = load({ selectedProfileId: "supermicro-fat-twin-front-6" });
  api.renderProfileOptions();
  let onClick = null;
  elements.profileCatalog = { addEventListener: (name, listener) => { onClick = listener; }, querySelectorAll: () => [] };
  const context = vm.createContext({
    state, elements, renderProfileOptions: api.renderProfileOptions,
    setupDraftSnapshot: () => "", recordSetupDraftChange() {}, renderProfilePreview() {},
    renderProfileBuilder() {}, renderStorageViews() {},
  });
  vm.runInContext(SOURCE.slice(start, end), context, { filename: "admin.js" });
  for (const picked of [...EXCLUDED_PROFILE_IDS, "generic-front-24-1x24"]) {
    const card = { dataset: { profileId: picked } };
    onClick({ target: { closest: () => card } });
    assert.equal(state.selectedProfileId, picked);
    assert.equal(elements.setupProfile.value, picked, `Save would post ${elements.setupProfile.value || "auto"}`);
  }
  // Picking a chassis card after a card layout drops the Current option.
  for (const saved of EXCLUDED_PROFILE_IDS) {
    onClick({ target: { closest: () => ({ dataset: { profileId: saved } }) } });
    onClick({ target: { closest: () => ({ dataset: { profileId: "supermicro-cse-946-top-60" } }) } });
    assert.equal(elements.setupProfile.value, "supermicro-cse-946-top-60");
    assert.ok(!elements.setupProfile.options.some((option) => option.value === saved), `${saved} is still offered`);
  }
});

test("choosing a chassis in the Chassis layout select drops the Current card option", () => {
  // Codex review on #966: the real change handler, not a manual re-render.
  const start = SOURCE.indexOf("    elements.setupProfile?.addEventListener(\"change\", () => {");
  const end = SOURCE.indexOf("\n    elements.setupBmcEnabled", start);
  assert.ok(start > 0 && end > start);
  for (const saved of EXCLUDED_PROFILE_IDS) {
    const { api, elements, state } = load({ selectedProfileId: saved });
    api.renderProfileOptions();
    elements.setupProfile.value = state.selectedProfileId;
    assert.equal(elements.setupProfile.value, saved);
    let onChange = null;
    elements.setupProfile.addEventListener = (name, listener) => { onChange = listener; };
    const context = vm.createContext({
      state, elements, renderProfileOptions: api.renderProfileOptions,
      renderProfilePreview() {}, renderProfileCatalog() {}, renderProfileBuilder() {}, renderStorageViews() {},
    });
    vm.runInContext(SOURCE.slice(start, end), context, { filename: "admin.js" });

    for (const picked of ["supermicro-fat-twin-front-6", ""]) {
      elements.setupProfile.value = saved;
      api.renderProfileOptions();
      state.selectedProfileId = saved;
      elements.setupProfile.value = picked;
      onChange();
      assert.equal(state.selectedProfileId, picked);
      assert.equal(elements.setupProfile.value, picked);
      assert.ok(!elements.setupProfile.options.some((option) => option.value === saved),
        `${saved} is still offered after choosing ${picked || "Detect automatically"}`);
    }
  }
});

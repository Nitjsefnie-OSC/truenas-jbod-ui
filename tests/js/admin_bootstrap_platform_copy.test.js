"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const SOURCE = fs.readFileSync(path.resolve(__dirname, "../../admin_service/static/admin.js"), "utf8");
const BMC_GUIDANCE = "This system is managed through its BMC. No host login is needed.";

// Extract entire declarations, not the condition or message being asserted.
function declaration(name) {
  const start = SOURCE.search(new RegExp(`  (?:async )?function ${name}\\(`));
  assert.notEqual(start, -1, `missing function ${name}`);
  const next = SOURCE.slice(start + 1).search(/\n  (?:async )?function /);
  assert.notEqual(next, -1, `missing end of ${name}`);
  return SOURCE.slice(start, start + 1 + next);
}

function fixture(platform, { ssh = true, enabled = true, forceEnabled = false, serviceHome = "" } = {}) {
  const field = (value = "") => ({ value, checked: true, disabled: false, textContent: "", classList: { toggle() {} } });
  const hideable = (value = "") => {
    const hidden = new Set();
    return { ...field(value), hidden, classList: { toggle(name, force) { if (force) hidden.add(name); else hidden.delete(name); }, contains: (name) => hidden.has(name) } };
  };
  const elements = {
    setupSshEnabled: { checked: ssh },
    setupBootstrapServiceHome: field(serviceHome),
    setupBootstrapServiceHomeField: hideable(),
    setupBootstrapEnabled: { checked: enabled },
    setupBootstrapInstallSudo: field(),
    setupBootstrapFields: field(),
    setupBootstrapResult: field(),
    setupBootstrapSudoersPreview: field(),
    setupBootstrapSudoersName: field(),
    setupBootstrapSudoersDetail: field(),
    setupPlatform: field(platform),
    setupSshUser: field("synthetic-service"),
  };
  const fields = [field(), field()];
  const requests = [];
  const context = vm.createContext({
    elements,
    document: { querySelectorAll: () => fields },
    state: {},
    currentSetupPlatform: () => elements.setupPlatform.value,
    recommendedSshUserForPlatform: () => "synthetic-service",
    collectSetupPayload: () => ({ platform, ssh_enabled: ssh, ssh_user: "synthetic-service", ssh_host: "192.0.2.44", ssh_port: 22, ssh_strict_host_key_checking: true }),
    normalizeConnectionHost: (value) => String(value || "").trim(),
    suggestedConnectionHost: () => "",
    collectBootstrapSudoCommandPayload: () => ({ sudo_commands: ["synthetic-read-only"] }),
    resolveBootstrapServiceKey: () => ({ service_key_path: "/synthetic/key" }),
    fetchJson: async (url, options) => {
      requests.push({ url, payload: JSON.parse(options.body) });
      return { detail: "Synthetic permission preview", content: "# synthetic permissions" };
    },
  });
  const names = ["setupPlatformUsesBmcOnlyHost", "platformSupportsBootstrap", "bootstrapEnabledForSession", "collectSudoersPreviewPayload", "renderSudoersPreview", "refreshSudoersPreview", "syncBootstrapFields", "collectBootstrapPayload"];
  vm.runInContext(`const BMC_ONLY_BOOTSTRAP_NOTE = ${JSON.stringify(BMC_GUIDANCE)};\n` + names.map(declaration).join("\n"), context);
  // Reach the second defensive payload gate independently of the session gate.
  if (forceEnabled) vm.runInContext("bootstrapEnabledForSession = () => true;", context);
  return { context, elements, fields, requests };
}

for (const platform of ["ipmi", "esxi"]) {
  for (const ssh of [false, true]) {
    test(`${platform}: unsupported controls stay disabled with SSH ${ssh}`, () => {
      const { context, elements, fields } = fixture(platform, { ssh });
      context.syncBootstrapFields();
      assert.equal(elements.setupBootstrapEnabled.checked, false);
      assert.equal(elements.setupBootstrapEnabled.disabled, true);
      assert.equal(elements.setupBootstrapInstallSudo.checked, false);
      assert.ok(fields.every((field) => field.disabled));
      if (platform === "ipmi") {
        assert.equal(elements.setupBootstrapResult.textContent, BMC_GUIDANCE);
        assert.doesNotMatch(elements.setupBootstrapResult.textContent, /ESXi|Enable SSH/);
      } else if (ssh) {
        assert.match(elements.setupBootstrapResult.textContent, /^VMware ESXi.*read-only runtime commands/);
      }
      assert.throws(() => context.collectBootstrapPayload(), /Enable One-Time Bootstrap/);
    });
  }

  test(`${platform}: preview is local unsupported guidance without a request`, async () => {
    const { context, elements, requests } = fixture(platform);
    await context.refreshSudoersPreview();
    assert.equal(requests.length, 0);
    if (platform === "ipmi") {
      assert.equal(elements.setupBootstrapSudoersDetail.textContent, BMC_GUIDANCE);
      assert.equal(elements.setupBootstrapSudoersPreview.textContent, `# ${BMC_GUIDANCE}`);
      assert.doesNotMatch(elements.setupBootstrapSudoersPreview.textContent, /ESXi|saved SSH/);
    } else {
      assert.match(elements.setupBootstrapSudoersDetail.textContent, /^VMware ESXi.*read-only runtime commands/);
      assert.match(elements.setupBootstrapSudoersPreview.textContent, /^# VMware ESXi.*\n# Keep the saved SSH/);
    }
  });

  test(`${platform}: defensive payload gate refuses unsupported bootstrap`, () => {
    const { context, requests } = fixture(platform, { forceEnabled: true });
    assert.throws(() => context.collectBootstrapPayload(), (error) => {
      assert.equal(error.message, platform === "ipmi" ? BMC_GUIDANCE : "VMware ESXi does not use the one-time Linux service-account bootstrap path.");
      return true;
    });
    assert.equal(requests.length, 0);
  });
}

for (const platform of ["linux", "core", "scale", "quantastor"]) {
  test(`${platform}: enabled bootstrap controls, preview and payload remain supported`, async () => {
    const { context, elements, fields, requests } = fixture(platform);
    context.syncBootstrapFields();
    assert.equal(elements.setupBootstrapEnabled.disabled, false);
    assert.equal(elements.setupBootstrapEnabled.checked, true);
    assert.equal(elements.setupBootstrapInstallSudo.checked, true);
    assert.ok(fields.every((field) => !field.disabled));
    await context.refreshSudoersPreview();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "/api/admin/system-setup/sudoers-preview");
    assert.equal(requests[0].payload.platform, platform);
    assert.equal(requests[0].payload.install_sudo_rules, true);
    assert.equal(elements.setupBootstrapSudoersPreview.textContent, "# synthetic permissions");
    const payload = context.collectBootstrapPayload();
    assert.equal(payload.platform, platform);
    assert.equal(payload.host, "192.0.2.44");
    assert.equal(payload.service_user, "synthetic-service");
    assert.equal(payload.install_sudo_rules, true);
    assert.equal(payload.timeout_seconds, 15);
  });

  test(`${platform}: disabled session keeps its permission guidance and refuses payload`, async () => {
    const { context, elements, fields, requests } = fixture(platform, { enabled: false });
    context.syncBootstrapFields();
    assert.equal(elements.setupBootstrapEnabled.disabled, false);
    assert.ok(fields.every((field) => field.disabled));
    assert.match(elements.setupBootstrapResult.textContent, /Bootstrap is off by default/);
    await context.refreshSudoersPreview();
    assert.equal(requests.length, 0);
    assert.match(elements.setupBootstrapSudoersPreview.textContent, platform === "core" ? /CORE midclt/ : /command-limited sudoers/);
    assert.throws(() => context.collectBootstrapPayload(), /Enable One-Time Bootstrap/);
  });
}

// #947: CORE bootstrap can create the missing service account through the middleware.
test("core: the Home directory field shows and its trimmed value is sent as service_home", () => {
  const { context, elements } = fixture("core", { serviceHome: "  /mnt/tank/home/jbodmap  " });
  context.syncBootstrapFields();
  assert.equal(elements.setupBootstrapServiceHomeField.classList.contains("hidden"), false);
  const payload = context.collectBootstrapPayload();
  assert.equal(payload.service_home, "/mnt/tank/home/jbodmap");
});

test("core: a blank Home directory is sent as null", () => {
  const { context } = fixture("core");
  context.syncBootstrapFields();
  assert.equal(context.collectBootstrapPayload().service_home, null);
});

for (const platform of ["linux", "scale", "quantastor", "esxi", "ipmi"]) {
  test(`${platform}: the CORE-only Home directory field is hidden and never sent`, () => {
    const { context, elements } = fixture(platform, { serviceHome: "/mnt/tank/home/jbodmap", forceEnabled: true });
    context.syncBootstrapFields();
    assert.equal(elements.setupBootstrapServiceHomeField.classList.contains("hidden"), true);
    if (platform === "esxi" || platform === "ipmi") return;
    assert.equal(context.collectBootstrapPayload().service_home, null);
  });
}

for (const platform of ["linux", "core", "scale", "quantastor"]) {
  test(`${platform}: bootstrap never sends a sudo password`, () => {
    const { context } = fixture(platform);
    context.syncBootstrapFields();
    const payload = context.collectBootstrapPayload();
    assert.equal(Object.hasOwn(payload, "bootstrap_sudo_password"), false);
  });
}

test("the bootstrap code no longer reads a bootstrap sudo-password input", () => {
  assert.doesNotMatch(SOURCE, /setupBootstrapSudoPassword|setup-bootstrap-sudo-password|bootstrap_sudo_password/);
});

test("CORE bootstrap copy says setup creates the user when Home directory is filled in", () => {
  const copy = SOURCE.match(/platform === "core"\s*\?\s*"([^"]*)"/);
  assert.ok(copy, "missing the CORE bootstrap copy");
  assert.match(copy[1], /Home directory/);
  assert.match(copy[1], /creates/);
  assert.match(copy[1], /\/mnt/);
  assert.doesNotMatch(copy[1], /^Create the app's user in the CORE web UI first/);
});

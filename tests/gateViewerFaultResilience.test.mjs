import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_ROOT = path.resolve(__dirname, "../src");

function installMinimalDomShim() {
  const keys = [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "HTMLIFrameElement",
    "HTMLInputElement",
    "HTMLButtonElement",
    "HTMLSelectElement",
    "HTMLTextAreaElement",
    "HTMLVideoElement",
    "Element",
    "Node",
    "Text",
    "Comment",
    "Event",
    "CustomEvent",
    "MouseEvent",
    "localStorage",
    "sessionStorage",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "IS_REACT_ACT_ENVIRONMENT",
  ];
  const saved = Object.fromEntries(keys.map((k) => [k, globalThis[k]]));

  class ShimEvent {
    constructor(type, opts = {}) {
      this.type = type;
      this.bubbles = Boolean(opts.bubbles);
      this.cancelable = Boolean(opts.cancelable);
      this.defaultPrevented = false;
      this.target = null;
      this.currentTarget = null;
      this.key = opts.key || "";
    }
    preventDefault() {
      if (this.cancelable) this.defaultPrevented = true;
    }
    stopPropagation() {
      this.cancelBubble = true;
    }
  }

  class ShimCustomEvent extends ShimEvent {
    constructor(type, opts = {}) {
      super(type, opts);
      this.detail = opts.detail;
    }
  }

  class ShimNode {
    constructor(nodeType, nodeName) {
      this.nodeType = nodeType;
      this.nodeName = nodeName;
      this.parentNode = null;
      this.childNodes = [];
      this._listeners = new Map();
    }
    get firstChild() {
      return this.childNodes[0] || null;
    }
    get nextSibling() {
      if (!this.parentNode) return null;
      const idx = this.parentNode.childNodes.indexOf(this);
      return idx >= 0 ? this.parentNode.childNodes[idx + 1] || null : null;
    }
    appendChild(child) {
      if (child.parentNode) child.parentNode.removeChild(child);
      child.parentNode = this;
      this.childNodes.push(child);
      return child;
    }
    insertBefore(newNode, refNode) {
      if (!refNode) return this.appendChild(newNode);
      if (newNode.parentNode) newNode.parentNode.removeChild(newNode);
      const idx = this.childNodes.indexOf(refNode);
      newNode.parentNode = this;
      if (idx === -1) this.childNodes.push(newNode);
      else this.childNodes.splice(idx, 0, newNode);
      return newNode;
    }
    removeChild(child) {
      const idx = this.childNodes.indexOf(child);
      if (idx !== -1) {
        this.childNodes.splice(idx, 1);
        child.parentNode = null;
      }
      return child;
    }
    addEventListener(type, fn) {
      if (!this._listeners.has(type)) this._listeners.set(type, new Set());
      this._listeners.get(type).add(fn);
    }
    removeEventListener(type, fn) {
      this._listeners.get(type)?.delete(fn);
    }
    dispatchEvent(event) {
      if (!event.target) event.target = this;
      let cur = this;
      while (cur) {
        event.currentTarget = cur;
        const listeners = cur._listeners.get(event.type);
        if (listeners) {
          for (const fn of [...listeners]) fn.call(cur, event);
        }
        if (event.cancelBubble || !event.bubbles) break;
        cur = cur.parentNode;
      }
      return !event.defaultPrevented;
    }
    contains(other) {
      let cur = other;
      while (cur) {
        if (cur === this) return true;
        cur = cur.parentNode;
      }
      return false;
    }
  }

  class ShimText extends ShimNode {
    constructor(text = "") {
      super(3, "#text");
      this.nodeValue = String(text);
    }
    get textContent() {
      return this.nodeValue;
    }
    set textContent(v) {
      this.nodeValue = String(v);
    }
  }

  class ShimComment extends ShimNode {
    constructor(text = "") {
      super(8, "#comment");
      this.nodeValue = String(text);
    }
  }

  class ShimElement extends ShimNode {
    constructor(tagName) {
      super(1, String(tagName).toUpperCase());
      this.tagName = this.nodeName;
      this.attributes = new Map();
      this.style = {};
      this.dataset = {};
      this._value = "";
      this.checked = false;
      this.disabled = false;
      this.selected = false;
      this.defaultSelected = false;
      this.type = "";
      this.className = "";
      this.srcObject = null;
    }
    get options() {
      return this.querySelectorAll("option");
    }
    get value() {
      return this._value;
    }
    set value(v) {
      this._value = String(v ?? "");
    }
    setAttribute(k, v) {
      const val = String(v);
      this.attributes.set(k, val);
      if (k === "class") this.className = val;
      if (k === "type") this.type = val;
      if (k === "disabled") this.disabled = true;
    }
    getAttribute(k) {
      if (k === "class") return this.className || null;
      return this.attributes.has(k) ? this.attributes.get(k) : null;
    }
    removeAttribute(k) {
      this.attributes.delete(k);
      if (k === "disabled") this.disabled = false;
    }
    hasAttribute(k) {
      return this.attributes.has(k);
    }
    get textContent() {
      return this.childNodes.map((c) => c.textContent || "").join("");
    }
    set textContent(v) {
      this.childNodes = [];
      if (v !== null && v !== undefined && String(v) !== "") {
        this.appendChild(new ShimText(String(v)));
      }
    }
    focus() {}
    blur() {}
    scrollIntoView() {}
    getBoundingClientRect() {
      return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
    }
    querySelectorAll(selector) {
      const out = [];
      const attrMatch = selector.match(/^\[([^=\]]+)="([^"]*)"\]$/);
      const walk = (node) => {
        for (const c of node.childNodes) {
          if (c.nodeType === 1) {
            const matched = attrMatch
              ? c.getAttribute(attrMatch[1]) === attrMatch[2]
              : c.tagName.toLowerCase() === selector.toLowerCase();
            if (matched) out.push(c);
            walk(c);
          }
        }
      };
      walk(this);
      return out;
    }
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    }
  }

  const doc = new ShimNode(9, "#document");
  doc.ownerDocument = doc;
  doc.documentElement = new ShimElement("html");
  doc.documentElement.ownerDocument = doc;
  doc.head = new ShimElement("head");
  doc.head.ownerDocument = doc;
  doc.body = new ShimElement("body");
  doc.body.ownerDocument = doc;
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);
  doc.appendChild(doc.documentElement);
  doc.createElement = (tag) => {
    const el = new ShimElement(tag);
    el.ownerDocument = doc;
    return el;
  };
  doc.createElementNS = (_ns, tag) => doc.createElement(tag);
  doc.createTextNode = (txt) => {
    const n = new ShimText(txt);
    n.ownerDocument = doc;
    return n;
  };
  doc.createComment = (txt) => {
    const n = new ShimComment(txt);
    n.ownerDocument = doc;
    return n;
  };
  doc.getElementById = () => null;
  doc.querySelector = (s) => doc.body.querySelector(s);
  doc.querySelectorAll = (s) => doc.body.querySelectorAll(s);

  const storageFactory = () => {
    const map = new Map();
    return {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: (k) => map.delete(k),
      clear: () => map.clear(),
    };
  };

  const win = {
    document: doc,
    location: { origin: "http://127.0.0.1:5173", pathname: "/vehicles", search: "" },
    navigator: { mediaDevices: undefined },
    localStorage: storageFactory(),
    sessionStorage: storageFactory(),
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    CustomEvent: ShimCustomEvent,
    Event: ShimEvent,
    HTMLElement: ShimElement,
    HTMLIFrameElement: ShimElement,
    HTMLInputElement: ShimElement,
    HTMLButtonElement: ShimElement,
    HTMLSelectElement: ShimElement,
    HTMLTextAreaElement: ShimElement,
    HTMLVideoElement: ShimElement,
  };
  doc.defaultView = win;
  doc.activeElement = doc.body;

  globalThis.window = win;
  globalThis.document = doc;
  Object.defineProperty(globalThis, "navigator", { value: win.navigator, configurable: true });
  globalThis.HTMLElement = ShimElement;
  globalThis.HTMLIFrameElement = ShimElement;
  globalThis.HTMLInputElement = ShimElement;
  globalThis.HTMLButtonElement = ShimElement;
  globalThis.HTMLSelectElement = ShimElement;
  globalThis.HTMLTextAreaElement = ShimElement;
  globalThis.HTMLVideoElement = ShimElement;
  globalThis.Element = ShimElement;
  globalThis.Node = ShimNode;
  globalThis.Text = ShimText;
  globalThis.Comment = ShimComment;
  globalThis.Event = ShimEvent;
  globalThis.CustomEvent = ShimCustomEvent;
  globalThis.MouseEvent = ShimEvent;
  globalThis.localStorage = win.localStorage;
  globalThis.sessionStorage = win.sessionStorage;
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  return {
    doc,
    restore() {
      for (const [k, v] of Object.entries(saved)) {
        if (k === "navigator") {
          Object.defineProperty(globalThis, "navigator", { value: v, configurable: true });
        } else if (v === undefined) {
          delete globalThis[k];
        } else {
          globalThis[k] = v;
        }
      }
    },
  };
}

let _compiledBundle = null;
async function loadGateModalBundle() {
  if (_compiledBundle) return _compiledBundle;
  const [{ default: esbuild }, { default: babel }] = await Promise.all([
    import("esbuild"),
    import("@babel/core"),
  ]);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gate-viewer-fault-"));
  try {
    const entryPath = path.join(tmpDir, "entry.js");
    const outPath = path.join(tmpDir, "bundle.mjs");
    const modalSrc = path.resolve(SRC_ROOT, "components/VehicleManagement/GateCameraControlModal.jsx");
    const apiSrc = path.resolve(SRC_ROOT, "services/apiClient.js");

    fs.writeFileSync(
      entryPath,
      `
      export { default as GateCameraControlModal } from ${JSON.stringify(modalSrc)};
      export { axiosInstance, API_UNAVAILABLE_MESSAGE } from ${JSON.stringify(apiSrc)};
      `,
      "utf-8"
    );

    const bareExternals = new Set([
      "react",
      "react/compiler-runtime",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router-dom",
      "lucide-react",
      "axios",
    ]);

    await esbuild.build({
      entryPoints: [entryPath],
      outfile: outPath,
      bundle: true,
      format: "esm",
      platform: "node",
      jsx: "automatic",
      plugins: [
        {
          name: "externalize-node-modules-and-compile-react",
          setup(build) {
            build.onResolve({ filter: /^[^./]/ }, (args) => {
              if (bareExternals.has(args.path)) {
                return { path: import.meta.resolve(args.path), external: true };
              }
              return undefined;
            });
            build.onLoad({ filter: /\.jsx$/ }, async (args) => {
              const source = await fs.promises.readFile(args.path, "utf8");
              const transformed = await babel.transformAsync(source, {
                filename: args.path,
                plugins: [["babel-plugin-react-compiler", {}]],
                parserOpts: { plugins: ["jsx"] },
                ast: false,
              });
              return { contents: transformed.code, loader: "jsx" };
            });
          },
        },
      ],
    });

    const mod = await import(pathToFileURL(outPath).href);
    _compiledBundle = {
      ...mod,
      cleanup() {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      },
    };
    return _compiledBundle;
  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }
}

test.after(() => {
  if (_compiledBundle) {
    _compiledBundle.cleanup();
    _compiledBundle = null;
  }
});

async function runViewerPollFaultScenario(faultType) {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { GateCameraControlModal, axiosInstance, API_UNAVAILABLE_MESSAGE } =
    await loadGateModalBundle();

  const dom = installMinimalDomShim();
  const originalRequest = axiosInstance.request;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;

  const intervals = new Map();
  let nextTimerId = 1;
  globalThis.setInterval = (fn, ms) => {
    const id = nextTimerId++;
    intervals.set(id, { fn, ms });
    return id;
  };
  globalThis.clearInterval = (id) => {
    intervals.delete(id);
  };

  let pollMode = "online";
  let gatePollCount = 0;
  const mutationRequests = [];

  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/gates/")) {
      gatePollCount += 1;
      if (pollMode === "network_error") {
        const err = new Error(API_UNAVAILABLE_MESSAGE);
        err.code = "API_UNAVAILABLE";
        throw err;
      }
      if (pollMode === "http_500") {
        const err = new Error("HTTP Error 500");
        err.status = 500;
        err.response = { status: 500, data: { detail: "Internal Server Error" } };
        throw err;
      }
      return {
        data: {
          results: [
            {
              id: 1,
              code: "IN_01",
              direction: "IN",
              worker_online: true,
              last_auto_event: null,
            },
          ],
        },
      };
    }
    if (url.includes("/api/v1/parking/slots/")) {
      return { data: { results: [{ id: 1, code: "A-01", status: "AVAILABLE", vehicle_type: "CAR" }] } };
    }
    if (
      url.includes("/api/v1/parking/sessions/check-in/") ||
      url.includes("/api/v1/parking/sessions/check-out/")
    ) {
      mutationRequests.push(url);
    }
    return { data: {} };
  };

  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container);

  const triggerPollTick = async () => {
    const pollTimers = [...intervals.values()].filter((t) => t.ms === 3000);
    await act(async () => {
      for (const t of pollTimers) {
        await t.fn();
      }
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  try {
    // 1. Initial poll succeeds -> Viewer Mode active, unavailable note absent
    await act(async () => {
      root.render(
        React.createElement(GateCameraControlModal, {
          isOpen: true,
          onClose: () => {},
          initialLane: "entry",
          gateId: 1,
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    assert.equal(gatePollCount, 1);
    assert.ok(container.querySelector('[data-testid="viewer-mode-badge"]'));
    assert.equal(container.querySelector('[data-testid="worker-status-unavailable-note"]'), null);
    assert.equal(container.querySelector('[data-testid="auto-apply-toggle"]'), null);

    // 2. Failures 1 & 2 -> note still hidden, Viewer Mode preserved
    pollMode = faultType;
    await triggerPollTick();
    assert.equal(container.querySelector('[data-testid="worker-status-unavailable-note"]'), null);
    assert.ok(container.querySelector('[data-testid="viewer-mode-badge"]'));

    await triggerPollTick();
    assert.equal(container.querySelector('[data-testid="worker-status-unavailable-note"]'), null);
    assert.ok(container.querySelector('[data-testid="viewer-mode-badge"]'));

    // 3. Failure 3 (>= 3 consecutive failures) -> unavailable note appears, workerOnline stays true, no auto-apply/barrier open
    await triggerPollTick();
    const note = container.querySelector('[data-testid="worker-status-unavailable-note"]');
    assert.ok(note, `${faultType}: must display worker-status-unavailable-note after 3 poll failures`);
    assert.ok(note.textContent.includes("Trạng thái worker tạm thời không khả dụng"));
    assert.ok(
      container.querySelector('[data-testid="viewer-mode-badge"]'),
      `${faultType}: must keep workerOnline=true (Viewer Mode) instead of flipping to Browser Mode`
    );
    assert.equal(
      container.querySelector('[data-testid="auto-apply-toggle"]'),
      null,
      `${faultType}: must NOT show Browser Mode auto-apply toggle`
    );
    assert.equal(mutationRequests.length, 0, `${faultType}: must NOT fire check-in/check-out`);
    assert.equal(
      container.querySelector('[data-testid="auto-apply-banner"]'),
      null,
      `${faultType}: must NOT show auto-apply banner`
    );
    assert.ok(
      container.textContent.includes("ĐANG ĐÓNG") &&
        !container.textContent.includes("ĐÃ MỞ - MỜI XE QUA") &&
        !container.textContent.includes("ĐANG NÂNG CẦN..."),
      `${faultType}: barrier must stay closed (ĐANG ĐÓNG)`
    );

    // 4. Recovery poll -> unavailable note auto-clears
    pollMode = "online";
    await triggerPollTick();
    assert.equal(
      container.querySelector('[data-testid="worker-status-unavailable-note"]'),
      null,
      `${faultType}: unavailable note must auto-clear on recovery poll`
    );
    assert.ok(container.querySelector('[data-testid="viewer-mode-badge"]'));
    assert.equal(mutationRequests.length, 0);
  } finally {
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
    await act(async () => {
      root.unmount();
    });
    axiosInstance.request = originalRequest;
    dom.restore();
  }
}

test("L4-VIEWER-FAULT-01: >=3 consecutive network poll failures show worker-status-unavailable-note without flipping Viewer Mode or opening barrier, then auto-clear on recovery", async () => {
  await runViewerPollFaultScenario("network_error");
});

test("L4-VIEWER-FAULT-02: >=3 consecutive HTTP 500 poll failures show worker-status-unavailable-note without flipping Viewer Mode or opening barrier, then auto-clear on recovery", async () => {
  await runViewerPollFaultScenario("http_500");
});

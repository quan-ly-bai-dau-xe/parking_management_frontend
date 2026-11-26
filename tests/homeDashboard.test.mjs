import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.resolve(FRONTEND_ROOT, "src");

function installHomeDomShim() {
  const saved = {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
    HTMLElement: globalThis.HTMLElement,
    HTMLInputElement: globalThis.HTMLInputElement,
    HTMLButtonElement: globalThis.HTMLButtonElement,
    HTMLSelectElement: globalThis.HTMLSelectElement,
    HTMLTextAreaElement: globalThis.HTMLTextAreaElement,
    HTMLVideoElement: globalThis.HTMLVideoElement,
    HTMLIFrameElement: globalThis.HTMLIFrameElement,
    Element: globalThis.Element,
    Node: globalThis.Node,
    Text: globalThis.Text,
    Comment: globalThis.Comment,
    Event: globalThis.Event,
    CustomEvent: globalThis.CustomEvent,
    MouseEvent: globalThis.MouseEvent,
    localStorage: globalThis.localStorage,
    sessionStorage: globalThis.sessionStorage,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };

  class ShimEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.bubbles = Boolean(init.bubbles);
      this.cancelable = Boolean(init.cancelable);
      this.defaultPrevented = false;
      this.cancelBubble = false;
      this._stoppedImmediate = false;
      this.target = null;
      this.currentTarget = null;
      this.detail = init.detail;
    }
    preventDefault() {
      if (this.cancelable) this.defaultPrevented = true;
    }
    stopPropagation() {
      this.cancelBubble = true;
    }
    stopImmediatePropagation() {
      this.cancelBubble = true;
      this._stoppedImmediate = true;
    }
  }

  class ShimCustomEvent extends ShimEvent {
    constructor(type, init = {}) {
      super(type, init);
      this.detail = init.detail !== undefined ? init.detail : null;
    }
  }

  class ShimNode {
    constructor(nodeType, nodeName) {
      this.nodeType = nodeType;
      this.nodeName = nodeName;
      this.childNodes = [];
      this.parentNode = null;
      this.ownerDocument = null;
      this._listeners = new Map();
    }
    get firstChild() {
      return this.childNodes[0] || null;
    }
    get lastChild() {
      return this.childNodes[this.childNodes.length - 1] || null;
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
          for (const fn of [...listeners]) {
            fn.call(cur, event);
            if (event._stoppedImmediate) break;
          }
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

  function matchesSimpleSelector(el, selector) {
    const tagAttrMatch = selector.match(/^([a-zA-Z0-9_-]+)\[([^=\]]+)="([^"]*)"\]$/);
    if (tagAttrMatch) {
      return (
        el.tagName.toLowerCase() === tagAttrMatch[1].toLowerCase() &&
        el.getAttribute(tagAttrMatch[2]) === tagAttrMatch[3]
      );
    }
    const attrMatch = selector.match(/^\[([^=\]]+)="([^"]*)"\]$/);
    if (attrMatch) return el.getAttribute(attrMatch[1]) === attrMatch[2];
    if (selector.startsWith(".")) {
      const cls = selector.slice(1);
      return String(el.className || "").split(/\s+/).includes(cls);
    }
    return el.tagName.toLowerCase() === selector.toLowerCase();
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
      if (k.startsWith("data-")) {
        const key = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        this.dataset[key] = val;
      }
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
    get innerHTML() {
      return this.textContent;
    }
    set innerHTML(v) {
      this.textContent = v;
    }
    click() {
      this.dispatchEvent(new ShimEvent("click", { bubbles: true, cancelable: true }));
    }
    focus() {}
    blur() {}
    scrollIntoView() {}
    getBoundingClientRect() {
      return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
    }
    querySelectorAll(selector) {
      const parts = String(selector).trim().match(/(?:[^\s[]+|\[[^\]]*\])+/g) || [];
      const querySingle = (root, sel) => {
        const out = [];
        const walk = (node) => {
          for (const c of node.childNodes) {
            if (c.nodeType === 1) {
              if (matchesSimpleSelector(c, sel)) out.push(c);
              walk(c);
            }
          }
        };
        walk(root);
        return out;
      };
      let currentRoots = [this];
      for (const part of parts) {
        const nextSet = [];
        const seen = new Set();
        for (const root of currentRoots) {
          for (const match of querySingle(root, part)) {
            if (!seen.has(match)) {
              seen.add(match);
              nextSet.push(match);
            }
          }
        }
        currentRoots = nextSet;
      }
      return currentRoots;
    }
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    }
  }

  const doc = new ShimNode(9, "#document");
  doc.cookie = "csrftoken=test-csrf-token";
  doc.documentElement = new ShimElement("html");
  doc.head = new ShimElement("head");
  doc.body = new ShimElement("body");
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

  const winListeners = new Map();
  const win = {
    document: doc,
    location: { origin: "http://127.0.0.1:15173", pathname: "/home", search: "" },
    navigator: { userAgent: "node-test" },
    localStorage: storageFactory(),
    sessionStorage: storageFactory(),
    addEventListener: (type, fn) => {
      if (!winListeners.has(type)) winListeners.set(type, new Set());
      winListeners.get(type).add(fn);
    },
    removeEventListener: (type, fn) => {
      winListeners.get(type)?.delete(fn);
    },
    dispatchEvent: (event) => {
      const set = winListeners.get(event.type);
      if (set) {
        for (const fn of [...set]) fn(event);
      }
      return true;
    },
    CustomEvent: ShimCustomEvent,
    Event: ShimEvent,
    HTMLElement: ShimElement,
    HTMLIFrameElement: ShimElement,
    HTMLInputElement: ShimElement,
    HTMLButtonElement: ShimElement,
    HTMLSelectElement: ShimElement,
    HTMLTextAreaElement: ShimElement,
    HTMLVideoElement: ShimElement,
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    scrollTo: () => {},
    open: () => null,
    close: () => {},
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
  globalThis.requestAnimationFrame = (cb) => globalThis.setTimeout(() => cb(Date.now()), 0);
  globalThis.cancelAnimationFrame = (id) => globalThis.clearTimeout(id);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  const activeTimers = new Set();
  const origSetTimeout = globalThis.setTimeout;
  const origClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (fn, delay, ...args) => {
    const id = origSetTimeout((...cbArgs) => {
      activeTimers.delete(id);
      fn(...cbArgs);
    }, delay, ...args);
    activeTimers.add(id);
    return id;
  };
  globalThis.clearTimeout = (id) => {
    activeTimers.delete(id);
    return origClearTimeout(id);
  };

  return {
    doc,
    win,
    restore() {
      for (const id of activeTimers) {
        origClearTimeout(id);
      }
      activeTimers.clear();
      globalThis.setTimeout = origSetTimeout;
      globalThis.clearTimeout = origClearTimeout;
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

let _compiledBundleCache = null;
async function loadCompiledAppBundle() {
  if (_compiledBundleCache) return _compiledBundleCache;
  const [{ default: esbuild }, { default: babel }] = await Promise.all([
    import("esbuild"),
    import("@babel/core"),
  ]);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "r93-wp4-home-"));
  try {
    const entryPath = path.join(tmpDir, "entry.js");
    const outPath = path.join(tmpDir, "bundle.mjs");

    fs.writeFileSync(
      entryPath,
      `
      export { default as App } from ${JSON.stringify(path.resolve(SRC_ROOT, "App.jsx"))};
      export { ToastProvider } from ${JSON.stringify(path.resolve(SRC_ROOT, "context/ToastContext.jsx"))};
      export { axiosInstance } from ${JSON.stringify(path.resolve(SRC_ROOT, "services/apiClient.js"))};
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
      "zod",
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
    _compiledBundleCache = {
      ...mod,
      cleanup() {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      },
    };
    return _compiledBundleCache;
  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }
}

test.after(() => {
  if (_compiledBundleCache) {
    _compiledBundleCache.cleanup();
    _compiledBundleCache = null;
  }
});

async function renderAppAtRoute({ App, ToastProvider, route, dom }) {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { MemoryRouter, useLocation } = await import("react-router-dom");

  let latestLocation = { pathname: route };
  function LocationObserver() {
    latestLocation = useLocation();
    return null;
  }

  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          MemoryRouter,
          { initialEntries: [route] },
          React.createElement(LocationObserver),
          React.createElement(App)
        )
      )
    );
    await Promise.resolve();
    await Promise.resolve();
  });

  return {
    container,
    getPathname() {
      return latestLocation.pathname;
    },
    async flush() {
      await act(async () => {
        for (let i = 0; i < 8; i += 1) {
          await Promise.resolve();
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    },
    async click(el) {
      await act(async () => {
        el.click();
        for (let i = 0; i < 4; i += 1) {
          await Promise.resolve();
        }
      });
    },
    async unmount() {
      await act(async () => {
        root.unmount();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      if (container.parentNode) container.parentNode.removeChild(container);
    },
  };
}

function makeDashboardPayload({
  isManager = true,
  empty = false,
  withWalletMismatch = false,
} = {}) {
  return {
    kpis: {
      slots: {
        total_slots: 150,
        operational_slots: 148,
        available_slots: 127,
        occupied_slots: 21,
        used_slots: 21,
        occupancy_rate_pct: 14.2,
        status_text: "Còn chỗ",
      },
      traffic: {
        today_entries: 12,
        today_exits: 9,
        active_parking: 21,
      },
      revenue: isManager
        ? {
            revenue_date: "2026-11-22",
            total_revenue: withWalletMismatch ? "150000.00" : "100000.00",
            cash_revenue: "40000.00",
            vietqr_revenue: "60000.00",
            cash_pct: withWalletMismatch ? "26.67" : "40.00",
            vietqr_pct: withWalletMismatch ? "40.00" : "60.00",
          }
        : null,
      ai_recognition: {
        total_sessions: 21,
        ai_sessions: 19,
        manual_sessions: 2,
        ai_recognition_rate_pct: "90.48",
        manual_rate_pct: "9.52",
        avg_ai_confidence: "97.50",
        active_auto_scan_gates: 2,
      },
    },
    floors: empty
      ? []
      : [
          {
            floor_id: 1,
            floor_code: "B1",
            floor_name: "Tầng B1",
            total_slots: 50,
            operational_slots: 49,
            used_slots: 13,
            available_slots: 36,
            occupancy_percentage: 26.5,
            status_badge: "Còn chỗ",
            fe_display_label: "Tầng B1 · 26.5% (13/49 chỗ)",
          },
          {
            floor_id: 2,
            floor_code: "B2",
            floor_name: "Tầng B2",
            total_slots: 50,
            operational_slots: 49,
            used_slots: 4,
            available_slots: 45,
            occupancy_percentage: 8.2,
            status_badge: "Còn chỗ",
            fe_display_label: "Tầng B2 · 8.2% (4/49 chỗ)",
          },
          {
            floor_id: 3,
            floor_code: "F1",
            floor_name: "Tầng F1",
            total_slots: 50,
            operational_slots: 50,
            used_slots: 4,
            available_slots: 46,
            occupancy_percentage: 8.0,
            status_badge: "Còn chỗ",
            fe_display_label: "Tầng F1 · 8.0% (4/50 chỗ)",
          },
        ],
    traffic_chart: empty
      ? []
      : [
          { traffic_hour: "2026-11-22T01:00:00Z", entry_count: 5, exit_count: 2, total_movements: 7 },
          { traffic_hour: "2026-11-22T02:00:00Z", entry_count: 7, exit_count: 7, total_movements: 14 },
        ],
    alerts: empty
      ? []
      : [
          {
            id: 101,
            alert_type: "CAMERA_LOW_LIGHT",
            severity: "WARNING",
            message: "Camera cổng ra 1: Độ sáng thấp, tỉ lệ chính xác thấp",
            entity_type: "GATE",
            entity_id: 3,
            occurred_at: "2026-11-22T02:30:00Z",
            resolved_at: null,
          },
        ],
    recent_activities: [],
  };
}

function makeSessionsPayload({ empty = false } = {}) {
  return {
    count: empty ? 0 : 1,
    results: empty
      ? []
      : [
          {
            id: 501,
            session_code: "PK-20261122-0501",
            license_plate: "51A-897.14",
            entry_time: "2026-11-22T08:15:00+07:00",
            exit_time: "2026-11-22T10:15:00+07:00",
            entry_gate_name: "Cổng vào 1",
            exit_gate_name: "Cổng ra 1",
            duration_text: "2 giờ",
            fee_amount: "20000.00",
            payment_method: "WALLET",
            entry_image_url: "/media/plates/entry-501.jpg",
            exit_image_url: null,
            status: "closed",
          },
        ],
  };
}

function makeStructurePayload({ empty = false } = {}) {
  if (empty) return [];
  return [
    {
      id: 1,
      code: "B1",
      name: "Tầng B1",
      total_slots: 50,
      zones: [
        {
          id: 11,
          code: "A",
          name: "Khu A",
          total_slots: 4,
          slots: [
            { id: 1, code: "B1-A-01", status: "AVAILABLE", is_occupied: false },
            { id: 2, code: "B1-A-02", status: "OCCUPIED", is_occupied: true },
            { id: 3, code: "B1-A-03", status: "CHARGING", is_occupied: true },
            { id: 4, code: "B1-A-04", status: "RESERVED", is_occupied: false },
          ],
        },
      ],
    },
    {
      id: 2,
      code: "B2",
      name: "Tầng B2",
      total_slots: 50,
      zones: [
        {
          id: 21,
          code: "A",
          name: "Khu A",
          total_slots: 2,
          slots: [
            { id: 5, code: "B2-A-01", status: "AVAILABLE", is_occupied: false },
            { id: 6, code: "B2-A-02", status: "MAINTENANCE", is_occupied: false },
          ],
        },
      ],
    },
    {
      id: 3,
      code: "F1",
      name: "Tầng F1",
      total_slots: 50,
      zones: [
        {
          id: 31,
          code: "A",
          name: "Khu A",
          total_slots: 2,
          slots: [
            { id: 7, code: "F1-A-01", status: "AVAILABLE", is_occupied: false },
            { id: 8, code: "F1-A-02", status: "OCCUPIED", is_occupied: true },
          ],
        },
      ],
    },
  ];
}

// =====================================================================
// 1. STATIC GUARDS
// =====================================================================
test("WP4-STATIC-01: App.jsx guards / and /home inside ProtectedRoute + StaffOnlyRoute + AppLayout", () => {
  const appCode = fs.readFileSync(path.resolve(SRC_ROOT, "App.jsx"), "utf-8");

  assert.ok(appCode.includes("RootRedirect"), "App.jsx must define RootRedirect inside ProtectedRoute");

  const protectedStart = appCode.indexOf("<Route element={<ProtectedRoute />}>");
  assert.ok(protectedStart !== -1, "App.jsx must contain <Route element={<ProtectedRoute />}>");
  const beforeProtected = appCode.slice(0, protectedStart);
  const insideProtected = appCode.slice(protectedStart);

  assert.equal(
    beforeProtected.includes("path={ROUTES.HOME}") || beforeProtected.includes('path="/"'),
    false,
    "Routes / and /home must NOT be outside <ProtectedRoute />"
  );
  assert.ok(
    insideProtected.includes("path={ROUTES.HOME}") && insideProtected.includes("<StaffOnlyRoute>"),
    "/home must be inside ProtectedRoute and guarded by StaffOnlyRoute"
  );
  assert.ok(
    insideProtected.includes("<AppLayout />") && insideProtected.includes("element={<Home"),
    "/home must render inside <AppLayout />"
  );
});

test("WP4-STATIC-02: homepage.jsx and dashboardService.js contain ZERO mocks, ZERO AppTopHeader, ZERO hardcoded B3/35.4M/1420/51G-888.88", () => {
  const homeCode = fs.readFileSync(path.resolve(SRC_ROOT, "pages/homepage.jsx"), "utf-8");
  const serviceCode = fs.readFileSync(path.resolve(SRC_ROOT, "services/dashboardService.js"), "utf-8");

  assert.equal(homeCode.includes("AppTopHeader"), false, "homepage.jsx must NOT import or render AppTopHeader directly");
  assert.equal(homeCode.includes("Component: <StatCard"), false, "homepage.jsx must NOT keep dev placeholder 'Component: <StatCard />'");
  assert.equal(homeCode.includes('["B1", "B2", "B3"]'), false, "homepage.jsx must NOT hardcode ['B1', 'B2', 'B3']");
  assert.equal(homeCode.includes("35.4M"), false, "homepage.jsx must NOT contain mock '35.4M'");
  assert.equal(homeCode.includes("1,420"), false, "homepage.jsx must NOT contain mock '1,420'");
  assert.equal(homeCode.includes("51G-888.88"), false, "homepage.jsx must NOT contain mock '51G-888.88'");

  assert.equal(serviceCode.includes("../mocks/"), false, "dashboardService.js must NOT import anything from ../mocks/");
  assert.equal(serviceCode.includes("anomoliesData"), false, "dashboardService.js must NOT import anomoliesData");
  assert.equal(serviceCode.includes("35.4M"), false, "dashboardService.js must NOT contain mock '35.4M'");
  assert.ok(serviceCode.includes("/api/v1/dashboard/"), "dashboardService.js must call /api/v1/dashboard/");
  assert.ok(
    serviceCode.includes("getParkingSessions") || serviceCode.includes("/api/v1/parking/sessions/"),
    "dashboardService.js must call parking sessions endpoint/service"
  );
  assert.ok(
    serviceCode.includes("getParkingStructure") || serviceCode.includes("/api/v1/parking/structure/"),
    "dashboardService.js must call parking structure endpoint/service"
  );
});

// =====================================================================
// 2. REAL COMPILED REACT 19 DOM / RBAC TESTS
// =====================================================================
test("WP4-DOM-01: Anonymous user visiting /home or / redirects to /login", async () => {
  const dom = installHomeDomShim();
  const { App, ToastProvider } = await loadCompiledAppBundle();

  try {
    for (const route of ["/home", "/"]) {
      const view = await renderAppAtRoute({ App, ToastProvider, route, dom });
      try {
        await view.flush();
        assert.equal(view.getPathname(), "/login", `Anonymous visiting ${route} must redirect to /login`);
      } finally {
        await view.unmount();
      }
    }
  } finally {
    dom.restore();
  }
});

test("WP4-DOM-02: CUSTOMER visiting /home gets 403 access-denied-403 with /overview fallback; / redirects to /overview", async () => {
  const dom = installHomeDomShim();
  const { App, ToastProvider, axiosInstance } = await loadCompiledAppBundle();
  const origFetch = globalThis.fetch;
  const origAdapter = axiosInstance.defaults.adapter;

  const customerUser = {
    id: 10,
    email: "trinh.xuan.truong@example.com",
    full_name: "Trịnh Xuân Trường",
    role: "CUSTOMER",
  };
  globalThis.fetch = async (url) => {
    if (String(url).includes("/api/v1/auth/me/")) {
      return { ok: true, status: 200, json: async () => customerUser };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  axiosInstance.defaults.adapter = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/dashboard/")) {
      throw new Error("CUSTOMER must NOT even trigger /api/v1/dashboard/ when StaffOnlyRoute blocks /home");
    }
    return { data: { results: [], count: 0, unread_count: 0 }, status: 200, statusText: "OK", headers: {}, config };
  };

  try {
    globalThis.localStorage.setItem("sp_user", JSON.stringify(customerUser));

    const homeView = await renderAppAtRoute({ App, ToastProvider, route: "/home", dom });
    try {
      await homeView.flush();
      assert.ok(
        homeView.container.querySelector('[data-testid="access-denied-403"]'),
        "CUSTOMER visiting /home must render data-testid='access-denied-403'"
      );
      const backBtn = [...homeView.container.querySelectorAll("button")].find((b) =>
        b.textContent.includes("Quay lại trang chính")
      );
      assert.ok(backBtn, "403 view must render back button");
      await homeView.click(backBtn);
      await homeView.flush();
      assert.equal(homeView.getPathname(), "/overview", "Back button from 403 must navigate to /overview");
    } finally {
      await homeView.unmount();
    }

    const rootView = await renderAppAtRoute({ App, ToastProvider, route: "/", dom });
    try {
      await rootView.flush();
      assert.equal(rootView.getPathname(), "/overview", "CUSTOMER visiting / must redirect to /overview");
    } finally {
      await rootView.unmount();
    }
  } finally {
    globalThis.fetch = origFetch;
    axiosInstance.defaults.adapter = origAdapter;
    dom.restore();
  }
});

test("WP4-DOM-03: MANAGER visiting /home renders AppSidebar (9 items, Trang chủ active), AppTopHeader, 4 KPIs incl. VND revenue, dynamic floors B1/B2/F1, alerts, sessions, and chart", async () => {
  const dom = installHomeDomShim();
  const { App, ToastProvider, axiosInstance } = await loadCompiledAppBundle();
  const origFetch = globalThis.fetch;
  const origAdapter = axiosInstance.defaults.adapter;

  const managerUser = {
    id: 1,
    email: "hoang.dinh.khang@example.com",
    full_name: "Hoàng Đình Khang",
    role: "MANAGER",
  };
  globalThis.fetch = async (url) => {
    if (String(url).includes("/api/v1/auth/me/")) {
      return { ok: true, status: 200, json: async () => managerUser };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  axiosInstance.defaults.adapter = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/dashboard/")) {
      return {
        data: makeDashboardPayload({ isManager: true, withWalletMismatch: true }),
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }
    if (url.includes("/api/v1/parking/sessions/")) {
      return { data: makeSessionsPayload(), status: 200, statusText: "OK", headers: {}, config };
    }
    if (url.includes("/api/v1/parking/structure/")) {
      return { data: makeStructurePayload(), status: 200, statusText: "OK", headers: {}, config };
    }
    return { data: { results: [] }, status: 200, statusText: "OK", headers: {}, config };
  };

  try {
    globalThis.localStorage.setItem("sp_user", JSON.stringify(managerUser));

    const view = await renderAppAtRoute({ App, ToastProvider, route: "/home", dom });
    try {
      await view.flush();
      const text = view.container.textContent;

      // AppTopHeader + AppSidebar (9 items for MANAGER) — /home uses GitHub brandName "LOGO"
      assert.ok(text.includes("LOGO"), "Must render AppTopHeader brandName ('LOGO' on /home)");
      assert.ok(text.includes("Camera vào") && text.includes("Camera ra"), "Must render staff camera buttons");
      assert.ok(text.includes("Quản lý nhân viên"), "MANAGER sidebar must show Quản lý nhân viên");
      assert.ok(text.includes("Thống kê báo cáo"), "MANAGER sidebar must show Thống kê báo cáo");
      assert.ok(text.includes("Quét camera"), "MANAGER sidebar must show Quét camera");

      // Active Trang chủ item in sidebar
      const trangChuButtons = [...view.container.querySelectorAll("aside button")].filter((b) =>
        b.textContent.includes("Trang chủ")
      );
      assert.equal(trangChuButtons.length, 1, "Desktop sidebar must have Trang chủ button");
      assert.ok(
        trangChuButtons[0].className.includes("text-blue-600"),
        "Trang chủ sidebar item must be active on /home"
      );
      assert.equal(
        view.container.querySelectorAll("aside button").length,
        10,
        "MANAGER sidebar must have 9 nav items + 1 collapse toggle button = 10 buttons"
      );

      // 4 KPIs (GitHub 4-section layout) including VND formatted revenue
      assert.ok(text.includes("Tổng vị trí bãi"), "Must render Tổng vị trí bãi KPI");
      assert.ok(text.includes("150") && text.includes("Trống: 127") && text.includes("Đang dùng: 21"), "Must render real slot counts 150 / 127 / 21");
      assert.ok(text.includes("Lượt xe vào / ra"), "Must render Lượt xe vào / ra KPI");
      assert.ok(text.includes("12") && text.includes("9"), "Must render real entry/exit counts");
      assert.ok(text.includes("Doanh thu hôm nay"), "MANAGER must see Doanh thu hôm nay KPI");
      assert.ok(text.includes("150.000đ"), "Revenue must use formatCurrencyVND (150.000đ)");
      assert.ok(text.includes("TM: 26.67%"), "Must display cash_pct");
      assert.ok(text.includes("QR: 40%"), "Must display vietqr_pct");
      assert.ok(text.includes("AI: 90.48%"), "Must render AI recognition percentage");
      assert.ok(text.includes("2 Cổng quét tự động"), "Must render active auto scan gates count");

      // Dynamic floors B1, B2, F1 (NO B3)
      assert.ok(text.includes("B1") && text.includes("B2") && text.includes("F1"), "Must render dynamic floors B1, B2, F1");
      assert.equal(text.includes("B3"), false, "Must NEVER render hardcoded floor B3");

      // Real alert & real session
      assert.ok(text.includes("Camera cổng ra 1: Độ sáng thấp"), "Must render real alert");
      assert.ok(text.includes("51A-897.14"), "Must render real session plate");
      assert.ok(text.includes("20.000đ"), "Must format session fee via formatCurrencyVND");

      // Sidebar collapse toggle
      const collapseBtn = view.container.querySelector('button[title="Thu gọn menu"]');
      assert.ok(collapseBtn, "Collapse toggle button must exist");
      await view.click(collapseBtn);
      const aside = view.container.querySelector("aside");
      const mainEl = view.container.querySelector("main");
      assert.ok(aside.className.includes("w-16"), "Collapsed sidebar must switch to w-16");
      assert.ok(mainEl.className.includes("lg:pl-20"), "Main container must adjust to lg:pl-20 when collapsed");

      // Mobile drawer toggle
      const mobileMenuBtn = view.container.querySelector('button[aria-label="Mở menu điều hướng"]');
      assert.ok(mobileMenuBtn, "Mobile drawer trigger must exist");
      await view.click(mobileMenuBtn);
      assert.ok(
        view.container.querySelector('button[aria-label="Đóng menu"]'),
        "Clicking mobile menu trigger must open mobile drawer with Đóng menu button"
      );
    } finally {
      await view.unmount();
    }
  } finally {
    globalThis.fetch = origFetch;
    axiosInstance.defaults.adapter = origAdapter;
    dom.restore();
  }
});

test("WP4-DOM-04: EMPLOYEE visiting /home sees 7 sidebar items, NEVER sees revenue card/figures, and NEVER calls statistics/summary", async () => {
  const dom = installHomeDomShim();
  const { App, ToastProvider, axiosInstance } = await loadCompiledAppBundle();
  const origFetch = globalThis.fetch;
  const origAdapter = axiosInstance.defaults.adapter;

  const employeeUser = {
    id: 3,
    email: "luong.mai.phuong@example.org",
    full_name: "Lương Mai Phương",
    role: "EMPLOYEE",
  };
  let statisticsCalled = false;

  globalThis.fetch = async (url) => {
    if (String(url).includes("/api/v1/auth/me/")) {
      return { ok: true, status: 200, json: async () => employeeUser };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  axiosInstance.defaults.adapter = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/reports/statistics/summary/")) {
      statisticsCalled = true;
      return { data: {}, status: 403, statusText: "Forbidden", headers: {}, config };
    }
    if (url.includes("/api/v1/dashboard/")) {
      return {
        data: makeDashboardPayload({ isManager: false }),
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }
    if (url.includes("/api/v1/parking/sessions/")) {
      return { data: makeSessionsPayload(), status: 200, statusText: "OK", headers: {}, config };
    }
    if (url.includes("/api/v1/parking/structure/")) {
      return { data: makeStructurePayload(), status: 200, statusText: "OK", headers: {}, config };
    }
    return { data: { results: [] }, status: 200, statusText: "OK", headers: {}, config };
  };

  try {
    globalThis.sessionStorage.setItem("sp_user", JSON.stringify(employeeUser));

    const view = await renderAppAtRoute({ App, ToastProvider, route: "/home", dom });
    try {
      await view.flush();
      const text = view.container.textContent;

      assert.equal(statisticsCalled, false, "EMPLOYEE /home must NEVER call /api/v1/reports/statistics/summary/");
      assert.equal(
        view.container.querySelectorAll("aside button").length,
        8,
        "EMPLOYEE sidebar must have 7 nav items + 1 collapse toggle button = 8 buttons"
      );
      assert.equal(text.includes("Quản lý nhân viên"), false, "EMPLOYEE sidebar must hide Quản lý nhân viên");
      assert.equal(text.includes("Thống kê báo cáo"), false, "EMPLOYEE sidebar must hide Thống kê báo cáo");
      // Per R94-UI Team Lead Decision #4.4, EMPLOYEE keeps the 4-column card with "—" and "Chỉ dành cho Quản lý"
      assert.ok(text.includes("Doanh thu hôm nay"), "EMPLOYEE keeps 4-column card layout on /home");
      assert.ok(text.includes("—") && text.includes("Chỉ dành cho Quản lý"), "EMPLOYEE revenue card must show '—' placeholder");
      assert.equal(text.includes("150.000đ"), false, "EMPLOYEE must NEVER see revenue figures");
      assert.ok(text.includes("Tổng vị trí bãi") && text.includes("Lượt xe vào / ra"), "EMPLOYEE must see non-revenue KPIs");
    } finally {
      await view.unmount();
    }
  } finally {
    globalThis.fetch = origFetch;
    axiosInstance.defaults.adapter = origAdapter;
    dom.restore();
  }
});

test("WP4-DOM-05: Empty states and API 500 error render explicit empty/error states with Thử lại button and zero mocks", async () => {
  const dom = installHomeDomShim();
  const { App, ToastProvider, axiosInstance } = await loadCompiledAppBundle();
  const origFetch = globalThis.fetch;
  const origAdapter = axiosInstance.defaults.adapter;

  const managerUser = {
    id: 1,
    email: "hoang.dinh.khang@example.com",
    full_name: "Hoàng Đình Khang",
    role: "MANAGER",
  };
  let mode = "empty";

  globalThis.fetch = async (url) => {
    if (String(url).includes("/api/v1/auth/me/")) {
      return { ok: true, status: 200, json: async () => managerUser };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  axiosInstance.defaults.adapter = async (config) => {
    const url = String(config.url || "");
    if (mode === "error" && url.includes("/api/v1/dashboard/")) {
      const err = new Error("Internal Server Error");
      err.response = { status: 500, data: { detail: "Thông báo lỗi hệ thống" }, headers: {} };
      err.config = config;
      throw err;
    }
    if (url.includes("/api/v1/dashboard/")) {
      return {
        data: makeDashboardPayload({ isManager: true, empty: mode === "empty" }),
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }
    if (url.includes("/api/v1/parking/sessions/")) {
      return {
        data: makeSessionsPayload({ empty: mode === "empty" }),
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }
    if (url.includes("/api/v1/parking/structure/")) {
      return {
        data: makeStructurePayload({ empty: mode === "empty" }),
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }
    return { data: { results: [] }, status: 200, statusText: "OK", headers: {}, config };
  };

  try {
    globalThis.localStorage.setItem("sp_user", JSON.stringify(managerUser));

    // 1. Empty state check
    const emptyView = await renderAppAtRoute({ App, ToastProvider, route: "/home", dom });
    try {
      await emptyView.flush();
      const text = emptyView.container.textContent;
      assert.ok(text.includes("Không có cảnh báo bất thường nào."), "Empty alerts must show explicit empty copy");
      assert.ok(text.includes("Chưa có lượt xe ra vào gần đây."), "Empty sessions must show explicit empty copy");
      assert.ok(text.includes("Chưa có dữ liệu tầng đỗ xe."), "Empty floors must show explicit empty copy");
      assert.equal(text.includes("51G-888.88"), false, "Empty state must never fall back to mock alerts");
      assert.equal(text.includes("35.4M"), false, "Empty state must never fall back to mock metrics");
    } finally {
      await emptyView.unmount();
    }

    // 2. API 500 + Retry recovery check
    mode = "error";
    const errView = await renderAppAtRoute({ App, ToastProvider, route: "/home", dom });
    try {
      await errView.flush();
      const text = errView.container.textContent;
      const retryBtn = [...errView.container.querySelectorAll("button")].find((b) =>
        b.textContent.includes("Thử lại")
      );
      assert.ok(retryBtn, "API 500 must render error banner with 'Thử lại' button");
      assert.equal(text.includes("35.4M"), false, "API 500 must NEVER show mock fallback values");

      mode = "ok";
      await errView.click(retryBtn);
      await errView.flush();
      assert.ok(
        errView.container.textContent.includes("150") && errView.container.textContent.includes("Đang dùng: 21"),
        "Clicking 'Thử lại' must recover with real API data"
      );
    } finally {
      await errView.unmount();
    }
  } finally {
    globalThis.fetch = origFetch;
    axiosInstance.defaults.adapter = origAdapter;
    dom.restore();
  }
});

test("WP4-ITER2-01: Staff mobile header hides logo icon when onOpenMobileMenu is set and uses compact <sm camera labels with 44px targets", async () => {
  const headerCode = fs.readFileSync(
    path.resolve(SRC_ROOT, "components/layout/AppTopHeader.jsx"),
    "utf-8"
  );
  assert.ok(
    headerCode.includes("hidden sm:flex"),
    "AppTopHeader.jsx must hide the logo icon box on <sm via hidden sm:flex when onOpenMobileMenu is present"
  );
  assert.ok(
    headerCode.includes('<span className="sm:hidden">Vào</span>') &&
      headerCode.includes('<span className="hidden sm:inline">Camera vào</span>'),
    "AppTopHeader.jsx must render compact 'Vào' on <sm and full 'Camera vào' on sm+"
  );
  assert.ok(
    headerCode.includes('<span className="sm:hidden">Ra</span>') &&
      headerCode.includes('<span className="hidden sm:inline">Camera ra</span>'),
    "AppTopHeader.jsx must render compact 'Ra' on <sm and full 'Camera ra' on sm+"
  );

  const dom = installHomeDomShim();
  const { App, ToastProvider, axiosInstance } = await loadCompiledAppBundle();
  const origFetch = globalThis.fetch;
  const origAdapter = axiosInstance.defaults.adapter;

  const employeeUser = {
    id: 3,
    email: "luong.mai.phuong@example.org",
    full_name: "Lương Mai Phương",
    role: "EMPLOYEE",
  };
  globalThis.fetch = async (url) => {
    if (String(url).includes("/api/v1/auth/me/")) {
      return { ok: true, status: 200, json: async () => employeeUser };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  axiosInstance.defaults.adapter = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/dashboard/")) {
      return { data: makeDashboardPayload({ isManager: false }), status: 200, statusText: "OK", headers: {}, config };
    }
    if (url.includes("/api/v1/parking/sessions/")) {
      return { data: makeSessionsPayload(), status: 200, statusText: "OK", headers: {}, config };
    }
    if (url.includes("/api/v1/parking/structure/")) {
      return { data: makeStructurePayload(), status: 200, statusText: "OK", headers: {}, config };
    }
    return { data: { results: [] }, status: 200, statusText: "OK", headers: {}, config };
  };

  try {
    globalThis.localStorage.setItem("sp_user", JSON.stringify(employeeUser));
    const view = await renderAppAtRoute({ App, ToastProvider, route: "/home", dom });
    try {
      await view.flush();
      const header = view.container.querySelector("header");
      assert.ok(header, "Header element must render");

      const logoBox = [...header.querySelectorAll("div")].find(
        (d) =>
          String(d.className || "").includes("bg-blue-600") &&
          String(d.className || "").includes("rounded-xl")
      );
      assert.ok(logoBox, "Logo box element must exist");
      assert.ok(
        logoBox.className.includes("hidden") && logoBox.className.includes("sm:flex"),
        "Staff header inside AppLayout must hide logo box on <sm (hidden sm:flex)"
      );

      const camInBtn = header.querySelector('button[aria-label="Camera vào"]');
      const camOutBtn = header.querySelector('button[aria-label="Camera ra"]');
      assert.ok(camInBtn, "Camera vào button must preserve aria-label='Camera vào'");
      assert.ok(camOutBtn, "Camera ra button must preserve aria-label='Camera ra'");
      assert.ok(
        camInBtn.className.includes("min-h-[44px]") && camInBtn.className.includes("min-w-[44px]"),
        "Camera vào button must keep 44px touch target on mobile"
      );
      assert.ok(
        camOutBtn.className.includes("min-h-[44px]") && camOutBtn.className.includes("min-w-[44px]"),
        "Camera ra button must keep 44px touch target on mobile"
      );
      assert.ok(
        camInBtn.className.includes("px-2.5") && camOutBtn.className.includes("px-2.5"),
        "Camera buttons must use compact px-2.5 sm:px-3 padding"
      );
      assert.ok(
        camInBtn.textContent.includes("Vào") && camInBtn.textContent.includes("Camera vào"),
        "Camera vào must include both compact 'Vào' and desktop 'Camera vào' spans"
      );
      assert.ok(
        camOutBtn.textContent.includes("Ra") && camOutBtn.textContent.includes("Camera ra"),
        "Camera ra must include both compact 'Ra' and desktop 'Camera ra' spans"
      );
    } finally {
      await view.unmount();
    }
  } finally {
    globalThis.fetch = origFetch;
    axiosInstance.defaults.adapter = origAdapter;
    dom.restore();
  }
});

test("WP4-ITER2-02: homepage.jsx renders explicit errors.structure with 'Thử lại' when floors=[] and /parking/structure/ fails", async () => {
  const dom = installHomeDomShim();
  const { App, ToastProvider, axiosInstance } = await loadCompiledAppBundle();
  const origFetch = globalThis.fetch;
  const origAdapter = axiosInstance.defaults.adapter;

  const managerUser = {
    id: 1,
    email: "hoang.dinh.khang@example.com",
    full_name: "Hoàng Đình Khang",
    role: "MANAGER",
  };
  let structureShouldFail = true;

  globalThis.fetch = async (url) => {
    if (String(url).includes("/api/v1/auth/me/")) {
      return { ok: true, status: 200, json: async () => managerUser };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  axiosInstance.defaults.adapter = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/dashboard/")) {
      return {
        data: makeDashboardPayload({ isManager: true, empty: true }),
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }
    if (url.includes("/api/v1/parking/sessions/")) {
      return { data: makeSessionsPayload({ empty: true }), status: 200, statusText: "OK", headers: {}, config };
    }
    if (url.includes("/api/v1/parking/structure/")) {
      if (structureShouldFail) {
        const err = new Error("Không thể tải sơ đồ tầng từ máy chủ");
        err.response = { status: 500, data: { detail: "Không thể tải sơ đồ tầng từ máy chủ" }, headers: {} };
        err.config = config;
        throw err;
      }
      return { data: makeStructurePayload({ empty: false }), status: 200, statusText: "OK", headers: {}, config };
    }
    return { data: { results: [] }, status: 200, statusText: "OK", headers: {}, config };
  };

  try {
    globalThis.localStorage.setItem("sp_user", JSON.stringify(managerUser));
    const view = await renderAppAtRoute({ App, ToastProvider, route: "/home", dom });
    try {
      await view.flush();
      const text = view.container.textContent;
      assert.equal(
        text.includes("Chưa có dữ liệu tầng đỗ xe"),
        false,
        "When floors=[] and errors.structure is set, must NOT silently fall back to 'Chưa có dữ liệu tầng đỗ xe'"
      );
      assert.ok(
        text.includes("Không thể tải chi tiết khu vực theo tầng.") ||
          text.includes("Không thể tải sơ đồ tầng từ máy chủ"),
        "Must render explicit errors.structure message"
      );
      const retryBtn = [...view.container.querySelectorAll("button")].find((b) =>
        b.textContent.includes("Thử lại")
      );
      assert.ok(retryBtn, "Structure error when floors=[] must render 'Thử lại' button");

      structureShouldFail = false;
      await view.click(retryBtn);
      await view.flush();
      assert.ok(
        view.container.textContent.includes("Tầng B1") && view.container.textContent.includes("Tầng F1"),
        "Clicking 'Thử lại' must recover and render floor structure"
      );
    } finally {
      await view.unmount();
    }
  } finally {
    globalThis.fetch = origFetch;
    axiosInstance.defaults.adapter = origAdapter;
    dom.restore();
  }
});

// =====================================================================
// 3. VITE SSR SMOKE CHECK
// =====================================================================
test("WP4-SSR-01: SSR safety (node --no-experimental-webstorage) renders App and homepage.jsx without ReferenceError", () => {
  const ssrScript = `
    import React from "react";
    import { renderToString } from "react-dom/server";
    import { StaticRouter } from "react-router-dom";
    import { createServer } from "vite";

    console.log("ENV_CHECK:", typeof window, typeof localStorage, typeof sessionStorage);
    const vite = await createServer({
      root: ${JSON.stringify(FRONTEND_ROOT)},
      server: { middlewareMode: true },
      appType: "custom",
    });
    try {
      const { default: App } = await vite.ssrLoadModule("/src/App.jsx");
      const { default: Home } = await vite.ssrLoadModule("/src/pages/homepage.jsx");
      const { ToastProvider } = await vite.ssrLoadModule("/src/context/ToastContext.jsx");
      const htmlApp = renderToString(
        React.createElement(
          ToastProvider,
          null,
          React.createElement(StaticRouter, { location: "/home" }, React.createElement(App))
        )
      );
      const htmlHome = renderToString(
        React.createElement(
          ToastProvider,
          null,
          React.createElement(StaticRouter, { location: "/home" }, React.createElement(Home))
        )
      );
      console.log("SSR_APP_HOME_OK:", typeof htmlApp === "string");
      console.log("SSR_HOME_OK:", typeof htmlHome === "string", "len=" + htmlHome.length);
    } finally {
      await vite.close();
    }
  `;

  const res = spawnSync(
    process.execPath,
    ["--no-experimental-webstorage", "--input-type=module", "-e", ssrScript],
    { cwd: FRONTEND_ROOT, encoding: "utf-8", timeout: 30000 }
  );
  assert.equal(res.status, 0, `SSR smoke test failed:\nSTDOUT:\n${res.stdout}\nSTDERR:\n${res.stderr}`);
  assert.ok(res.stdout.includes("ENV_CHECK: undefined undefined undefined"));
  assert.ok(res.stdout.includes("SSR_APP_HOME_OK: true"));
  assert.ok(res.stdout.includes("SSR_HOME_OK: true"));
});

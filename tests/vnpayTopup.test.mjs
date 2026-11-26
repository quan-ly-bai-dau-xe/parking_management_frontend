import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { ROUTES } from "../src/config/navigation.js";
import {
  VNPAY_DISABLED_MESSAGE,
  VNPAY_SANDBOX_DISCLAIMER,
  parseTopupAmountParam,
} from "../src/constants/paymentConstants.js";
import { normalizeWallet } from "../src/services/walletService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.resolve(FRONTEND_ROOT, "src");

function installDomShim() {
  const navDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const saved = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    HTMLInputElement: globalThis.HTMLInputElement,
    HTMLButtonElement: globalThis.HTMLButtonElement,
    HTMLSelectElement: globalThis.HTMLSelectElement,
    HTMLTextAreaElement: globalThis.HTMLTextAreaElement,
    HTMLIFrameElement: globalThis.HTMLIFrameElement,
    HTMLVideoElement: globalThis.HTMLVideoElement,
    Element: globalThis.Element,
    Node: globalThis.Node,
    Text: globalThis.Text,
    Comment: globalThis.Comment,
    Event: globalThis.Event,
    CustomEvent: globalThis.CustomEvent,
    MouseEvent: globalThis.MouseEvent,
    localStorage: globalThis.localStorage,
    sessionStorage: globalThis.sessionStorage,
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
      event.target = event.target || this;
      let cur = this;
      while (cur) {
        event.currentTarget = cur;
        const set = cur._listeners.get(event.type);
        if (set) {
          for (const fn of [...set]) {
            fn.call(cur, event);
            if (event._stoppedImmediate) break;
          }
        }
        if (event.cancelBubble || !event.bubbles) break;
        cur = cur.parentNode;
      }
      return !event.defaultPrevented;
    }
  }

  class ShimText extends ShimNode {
    constructor(text) {
      super(3, "#text");
      this.nodeValue = String(text ?? "");
    }
    get textContent() {
      return this.nodeValue;
    }
    set textContent(v) {
      this.nodeValue = String(v ?? "");
    }
  }

  class ShimComment extends ShimNode {
    constructor(text) {
      super(8, "#comment");
      this.nodeValue = String(text ?? "");
    }
    get textContent() {
      return "";
    }
  }

  function matchesSimpleSelector(el, selector) {
    if (selector.startsWith("[")) {
      const m = selector.match(/^\[([a-zA-Z0-9_-]+)(?:="([^"]*)")?\]$/);
      if (!m) return false;
      const actual = el.getAttribute(m[1]);
      return m[2] === undefined ? actual !== null : actual === m[2];
    }
    if (selector.startsWith("#")) {
      return el.getAttribute("id") === selector.slice(1);
    }
    if (selector.startsWith(".")) {
      return String(el.className || "").split(/\s+/).includes(selector.slice(1));
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
  doc.oninput = null;
  doc.onchange = null;
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
      setItem: (k, v) => map.set(String(k), String(v)),
      removeItem: (k) => map.delete(k),
      clear: () => map.clear(),
    };
  };

  const win = new ShimNode(0, "#window");
  win.document = doc;
  win.navigator = { userAgent: "node-test" };
  win.location = {
    pathname: "/",
    search: "",
    href: "http://127.0.0.1:15173/",
    assignCalls: [],
    assign(url) {
      this.assignCalls.push(url);
    },
  };
  win.localStorage = storageFactory();
  win.sessionStorage = storageFactory();
  win.Event = ShimEvent;
  win.CustomEvent = ShimCustomEvent;
  win.MouseEvent = ShimEvent;
  win.HTMLElement = ShimElement;
  win.HTMLIFrameElement = ShimElement;
  win.HTMLInputElement = ShimElement;
  win.HTMLButtonElement = ShimElement;
  win.HTMLSelectElement = ShimElement;
  win.HTMLTextAreaElement = ShimElement;
  win.HTMLVideoElement = ShimElement;
  win.innerWidth = 1280;
  win.scrollTo = () => {};
  win.setTimeout = globalThis.setTimeout;
  win.clearTimeout = globalThis.clearTimeout;
  win.setInterval = globalThis.setInterval;
  win.clearInterval = globalThis.clearInterval;

  doc.defaultView = win;
  doc.activeElement = doc.body;
  win.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
  win.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  win.cancelAnimationFrame = (id) => clearTimeout(id);

  globalThis.window = win;
  globalThis.document = doc;
  Object.defineProperty(globalThis, "navigator", { value: win.navigator, configurable: true });
  globalThis.HTMLElement = ShimElement;
  globalThis.HTMLIFrameElement = ShimElement;
  globalThis.HTMLVideoElement = ShimElement;
  globalThis.HTMLInputElement = ShimElement;
  globalThis.HTMLButtonElement = ShimElement;
  globalThis.HTMLSelectElement = ShimElement;
  globalThis.HTMLTextAreaElement = ShimElement;
  globalThis.Element = ShimElement;
  globalThis.Node = ShimNode;
  globalThis.Text = ShimText;
  globalThis.Comment = ShimComment;
  globalThis.Event = ShimEvent;
  globalThis.CustomEvent = ShimCustomEvent;
  globalThis.MouseEvent = ShimEvent;
  globalThis.localStorage = win.localStorage;
  globalThis.sessionStorage = win.sessionStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  return {
    doc,
    win,
    restore() {
      if (navDescriptor) {
        Object.defineProperty(globalThis, "navigator", navDescriptor);
      }
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete globalThis[k];
        else globalThis[k] = v;
      }
    },
  };
}

let _bundleCache = null;
async function loadBundle() {
  if (_bundleCache) return _bundleCache;
  const [{ default: esbuild }, { default: babel }] = await Promise.all([
    import("esbuild"),
    import("@babel/core"),
  ]);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "r93-wp6-vnpay-"));
  try {
    const entryPath = path.join(tmpDir, "entry.js");
    const outPath = path.join(tmpDir, "bundle.mjs");
    fs.writeFileSync(
      entryPath,
      `
      export { default as App } from ${JSON.stringify(path.resolve(SRC_ROOT, "App.jsx"))};
      export { default as CustomerProfilePage } from ${JSON.stringify(path.resolve(SRC_ROOT, "pages/CustomerProfilePage.jsx"))};
      export { default as NotificationsPage } from ${JSON.stringify(path.resolve(SRC_ROOT, "pages/NotificationsPage.jsx"))};
      export { default as CustomerOverviewPage } from ${JSON.stringify(path.resolve(SRC_ROOT, "pages/CustomerOverviewPage.jsx"))};
      export { default as VnpayReturnPage } from ${JSON.stringify(path.resolve(SRC_ROOT, "pages/VnpayReturnPage.jsx"))};
      export { ToastProvider } from ${JSON.stringify(path.resolve(SRC_ROOT, "context/ToastContext.jsx"))};
      export { axiosInstance } from ${JSON.stringify(path.resolve(SRC_ROOT, "services/apiClient.js"))};
      `,
      "utf-8",
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
    _bundleCache = {
      ...mod,
      cleanup() {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      },
    };
    return _bundleCache;
  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }
}

test.after(() => {
  if (_bundleCache) {
    _bundleCache.cleanup();
    _bundleCache = null;
  }
});

async function renderNode({ element, ToastProvider, route, dom }) {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { MemoryRouter, useLocation } = await import("react-router-dom");

  let latestLocation = { pathname: route, search: "" };
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
          element,
        ),
      ),
    );
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
  });

  return {
    container,
    getLocation: () => latestLocation,
    async flush(ms = 0) {
      await act(async () => {
        if (ms > 0) await new Promise((r) => setTimeout(r, ms));
        for (let i = 0; i < 8; i += 1) await Promise.resolve();
      });
    },
    async unmount() {
      await act(async () => {
        root.unmount();
      });
      container.parentNode?.removeChild(container);
    },
  };
}

function setCustomerSession(dom) {
  dom.win.localStorage.setItem(
    "sp_user",
    JSON.stringify({ id: 1, email: "cust@example.com", role: "CUSTOMER", full_name: "Trường" }),
  );
}

test("WP6-UNIT-01: navigation, paymentConstants, normalizeWallet topup_channels, and zero secrets in src/", () => {
  assert.equal(ROUTES.VNPAY_RETURN, "/wallet/vnpay-return");
  assert.equal(parseTopupAmountParam("10000"), 10000);
  assert.equal(parseTopupAmountParam("10000.5"), null);
  assert.equal(parseTopupAmountParam("-100"), null);
  assert.equal(parseTopupAmountParam("0"), null);
  assert.equal(parseTopupAmountParam("abc"), null);
  assert.ok(VNPAY_SANDBOX_DISCLAIMER.includes("VNPAY SANDBOX"));

  const w = normalizeWallet({
    id: 1,
    balance: "50000.00",
    topup_channels: {
      vnpay_enabled: true,
      vnpay_is_sandbox: true,
      vnpay_topup_min: 10000,
      vnpay_topup_max: 50000000,
      simulated_vietqr_enabled: false,
    },
  });
  assert.equal(w.vnpayEnabled, true);
  assert.equal(w.vnpaySandbox, true);
  assert.equal(w.vnpayMinAmount, 10000);
  assert.equal(w.vnpayMaxAmount, 50000000);
  assert.equal(w.simulatedTopupEnabled, false);

  // Zero VNPAY credentials in FE src/
  const walkFiles = (dir) => {
    const out = [];
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) out.push(...walkFiles(full));
      else if (/\.(js|jsx)$/.test(ent.name)) out.push(full);
    }
    return out;
  };
  for (const f of walkFiles(SRC_ROOT)) {
    const txt = fs.readFileSync(f, "utf-8");
    assert.equal(/VNPAY_HASH_SECRET|VNPAY_TMN_CODE/.test(txt), false, `Secret env name in ${f}`);
  }
});

test("WP6-FLOW-01: NotificationsPage Nạp missingAmount shortcut & CustomerOverviewPage blocked-exit banner pass ?topup=vnpay&amount=", async () => {
  const dom = installDomShim();
  const { NotificationsPage, CustomerOverviewPage, ToastProvider, axiosInstance } =
    await loadBundle();
  const origAdapter = axiosInstance.defaults.adapter;
  try {
    setCustomerSession(dom);
    axiosInstance.defaults.adapter = async (config) => {
      const url = config.url || "";
      if (url.includes("/api/v1/me/notifications/101/read/")) {
        return { status: 200, data: { notification: { id: 101, is_read: true } }, headers: {}, config };
      }
      if (url.includes("/api/v1/me/notifications/")) {
        return {
          status: 200,
          data: {
            count: 1,
            unread_count: 1,
            results: [
              {
                id: 101,
                title: "Số dư ví không đủ tại cổng ra (OUT_01)",
                content: "Xe 29A-***01 còn thiếu 15.000 VND.",
                notification_type: "PAYMENT",
                is_read: false,
                missing_amount: "15000.00",
                created_at: "2026-11-23T08:00:00Z",
              },
            ],
          },
          headers: {},
          config,
        };
      }
      if (url.includes("/api/v1/me/profile/")) {
        return { status: 200, data: { full_name: "Trịnh Xuân Trường", code: "KH0001" }, headers: {}, config };
      }
      if (url.includes("/api/v1/me/wallet/transactions/")) {
        return { status: 200, data: { count: 0, results: [] }, headers: {}, config };
      }
      if (url.includes("/api/v1/me/wallet/")) {
        return { status: 200, data: { id: 1, balance: "5000.00", topup_channels: { vnpay_enabled: true } }, headers: {}, config };
      }
      if (url.includes("/api/v1/me/vehicles/") || url.includes("/api/v1/me/tickets/")) {
        return { status: 200, data: [], headers: {}, config };
      }
      return { status: 200, data: {}, headers: {}, config };
    };

    const React = (await import("react")).default;
    const { act } = await import("react");
    const notifView = await renderNode({
      element: React.createElement(NotificationsPage),
      ToastProvider,
      route: "/notifications",
      dom,
    });
    try {
      await notifView.flush();
      const topupBtn = notifView.container
        .querySelectorAll("button")
        .find((b) => b.textContent.includes("Nạp 15.000"));
      assert.ok(topupBtn, "NotificationsPage must render Nạp 15.000đ button");
      await act(async () => {
        topupBtn.click();
      });
      await notifView.flush();
      assert.equal(notifView.getLocation().pathname, "/profile");
      assert.equal(notifView.getLocation().search, "?topup=vnpay&amount=15000");
    } finally {
      await notifView.unmount();
    }

    const overviewView = await renderNode({
      element: React.createElement(CustomerOverviewPage),
      ToastProvider,
      route: "/overview",
      dom,
    });
    try {
      await overviewView.flush();
      const banner = overviewView.container.querySelector('[data-testid="blocked-exit-topup-banner"]');
      assert.ok(banner, "CustomerOverviewPage must render blocked-exit-topup-banner");
      const bannerBtn = banner.querySelector("button");
      await act(async () => {
        bannerBtn.click();
      });
      await overviewView.flush();
      assert.equal(overviewView.getLocation().pathname, "/profile");
      assert.equal(overviewView.getLocation().search, "?topup=vnpay&amount=15000");
    } finally {
      await overviewView.unmount();
    }
  } finally {
    axiosInstance.defaults.adapter = origAdapter;
    dom.restore();
  }
});

test("WP6-FLOW-02: CustomerProfilePage auto-opens VNPAY modal with prefill, validates integer VND, guards double-submit & handles disabled", async () => {
  const dom = installDomShim();
  const { CustomerProfilePage, ToastProvider, axiosInstance } = await loadBundle();
  const origAdapter = axiosInstance.defaults.adapter;
  try {
    setCustomerSession(dom);
    const vnpayPostCalls = [];
    let vnpayEnabled = true;

    axiosInstance.defaults.adapter = async (config) => {
      const url = config.url || "";
      if (url.includes("/api/v1/me/profile/")) {
        return { status: 200, data: { full_name: "Trịnh Xuân Trường", code: "KH0001" }, headers: {}, config };
      }
      if (url.includes("/api/v1/me/wallet/topups/vnpay/")) {
        vnpayPostCalls.push(JSON.parse(config.data || "{}"));
        return {
          status: 201,
          data: {
            payment_url: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=VP1-demo",
            txn_ref: "VP1-demo",
            amount: "25000.00",
            is_sandbox: true,
          },
          headers: {},
          config,
        };
      }
      if (url.includes("/api/v1/me/wallet/transactions/")) {
        return { status: 200, data: { count: 0, results: [] }, headers: {}, config };
      }
      if (url.includes("/api/v1/me/wallet/")) {
        return {
          status: 200,
          data: {
            id: 1,
            balance: "5000.00",
            topup_channels: {
              vnpay_enabled: vnpayEnabled,
              vnpay_is_sandbox: true,
              vnpay_topup_min: 10000,
              vnpay_topup_max: 50000000,
              simulated_vietqr_enabled: false,
            },
          },
          headers: {},
          config,
        };
      }
      return { status: 200, data: {}, headers: {}, config };
    };

    const React = (await import("react")).default;
    const { act } = await import("react");
    const redirects = [];
    const view = await renderNode({
      element: React.createElement(CustomerProfilePage, {
        onRedirect: (url) => redirects.push(url),
      }),
      ToastProvider,
      route: "/profile?topup=vnpay&amount=25000",
      dom,
    });
    try {
      await view.flush();

      const disclaimer = view.container.querySelector('[data-testid="vnpay-sandbox-disclaimer"]');
      assert.ok(disclaimer, "Must show VNPAY SANDBOX disclaimer");
      const amountInput = view.container.querySelector("#vnpay-topup-amount");
      assert.equal(amountInput.value, "25000");

      const setControlledInput = (el, nextVal) => {
        el.value = nextVal;
        if (el._valueTracker && typeof el._valueTracker.setValue === "function") {
          el._valueTracker.setValue("__force_change__");
        }
        el.dispatchEvent(new dom.win.Event("input", { bubbles: true }));
        el.dispatchEvent(new dom.win.Event("change", { bubbles: true }));
      };

      // Reject decimal input
      const form = view.container.querySelector("form");
      await act(async () => {
        setControlledInput(amountInput, "10000.5");
      });
      await act(async () => {
        form.dispatchEvent(new dom.win.Event("submit", { bubbles: true, cancelable: true }));
      });
      await view.flush();
      assert.equal(vnpayPostCalls.length, 0);
      assert.ok(view.container.textContent.includes("số nguyên VND"));

      // Reject below min
      await act(async () => {
        setControlledInput(amountInput, "5000");
      });
      await act(async () => {
        form.dispatchEvent(new dom.win.Event("submit", { bubbles: true, cancelable: true }));
      });
      await view.flush();
      assert.equal(vnpayPostCalls.length, 0);
      assert.ok(view.container.textContent.includes("tối thiểu"));

      // Valid submit
      await act(async () => {
        setControlledInput(amountInput, "25000");
      });
      await act(async () => {
        form.dispatchEvent(new dom.win.Event("submit", { bubbles: true, cancelable: true }));
      });
      await view.flush();
      assert.equal(vnpayPostCalls.length, 1);
      assert.equal(vnpayPostCalls[0].amount, 25000);
      assert.equal(redirects.length, 1);
      assert.ok(redirects[0].startsWith("https://sandbox.vnpayment.vn/"));
    } finally {
      await view.unmount();
    }

    // Disabled state when vnpay_enabled=false
    vnpayEnabled = false;
    const disabledView = await renderNode({
      element: React.createElement(CustomerProfilePage),
      ToastProvider,
      route: "/profile",
      dom,
    });
    try {
      await disabledView.flush();
      assert.ok(disabledView.container.querySelector('[data-testid="vnpay-card-disabled"]'));
      assert.ok(disabledView.container.textContent.includes(VNPAY_DISABLED_MESSAGE));
    } finally {
      await disabledView.unmount();
    }
  } finally {
    axiosInstance.defaults.adapter = origAdapter;
    dom.restore();
  }
});

test("WP6-FLOW-03: VnpayReturnPage never claims success on invalid_signature/failed and polls until CREDITED", async () => {
  const dom = installDomShim();
  const { VnpayReturnPage, ToastProvider, axiosInstance } = await loadBundle();
  const origAdapter = axiosInstance.defaults.adapter;
  try {
    setCustomerSession(dom);
    let pollStep = 0;
    let statusPolls = 0;

    axiosInstance.defaults.adapter = async (config) => {
      const url = config.url || "";
      if (url.includes("/api/v1/me/wallet/topups/vnpay/VP1-good/")) {
        statusPolls += 1;
        pollStep += 1;
        if (pollStep < 2) {
          return {
            status: 200,
            data: { txn_ref: "VP1-good", status: "PENDING", amount: "100000.00", balance: "0.00" },
            headers: {},
            config,
          };
        }
        return {
          status: 200,
          data: {
            txn_ref: "VP1-good",
            status: "CREDITED",
            amount: "100000.00",
            balance: "100000.00",
            wallet_transaction_id: 99,
          },
          headers: {},
          config,
        };
      }
      if (url.includes("/api/v1/me/wallet/transactions/")) {
        return { status: 200, data: { count: 0, results: [] }, headers: {}, config };
      }
      if (url.includes("/api/v1/me/wallet/")) {
        return { status: 200, data: { id: 1, balance: "0.00" }, headers: {}, config };
      }
      return { status: 200, data: {}, headers: {}, config };
    };

    const React = (await import("react")).default;

    // 1. invalid_signature -> zero polls, explicit error
    const badSigView = await renderNode({
      element: React.createElement(VnpayReturnPage, { pollIntervalMs: 5, maxPollAttempts: 2 }),
      ToastProvider,
      route: "/wallet/vnpay-return?status=invalid_signature&code=97",
      dom,
    });
    await badSigView.flush(20);
    assert.ok(badSigView.container.querySelector('[data-testid="vnpay-return-invalid"]'));
    assert.equal(statusPolls, 0);
    await badSigView.unmount();

    // 2. failed -> zero polls, explicit failed alert
    const failedView = await renderNode({
      element: React.createElement(VnpayReturnPage, { pollIntervalMs: 5, maxPollAttempts: 2 }),
      ToastProvider,
      route: "/wallet/vnpay-return?status=failed&txn_ref=VP1-good&code=24",
      dom,
    });
    await failedView.flush(20);
    assert.ok(failedView.container.querySelector('[data-testid="vnpay-return-failed"]'));
    assert.equal(statusPolls, 0);
    await failedView.unmount();

    // 3. pending -> polls PENDING first, then CREDITED
    const pendingView = await renderNode({
      element: React.createElement(VnpayReturnPage, { pollIntervalMs: 15, maxPollAttempts: 4 }),
      ToastProvider,
      route: "/wallet/vnpay-return?status=pending&txn_ref=VP1-good&code=00",
      dom,
    });
    assert.ok(
      pendingView.container.querySelector('[data-testid="vnpay-return-pending"]'),
      "Must show pending BEFORE IPN confirms",
    );
    await pendingView.flush(60);
    assert.ok(
      pendingView.container.querySelector('[data-testid="vnpay-return-credited"]'),
      "Must transition to credited AFTER backend confirms",
    );
    assert.ok(pendingView.container.textContent.includes("100.000"));
    assert.ok(statusPolls >= 2);
    await pendingView.unmount();
  } finally {
    axiosInstance.defaults.adapter = origAdapter;
    dom.restore();
  }
});

test("WP6-RBAC-01: CustomerOnlyRoute blocks EMPLOYEE/MANAGER from /wallet/vnpay-return and /profile with 403", async () => {
  const dom = installDomShim();
  const { App, ToastProvider } = await loadBundle();
  try {
    dom.win.localStorage.setItem(
      "sp_user",
      JSON.stringify({ id: 2, email: "emp@example.com", role: "EMPLOYEE" }),
    );
    const React = (await import("react")).default;
    const view = await renderNode({
      element: React.createElement(App),
      ToastProvider,
      route: "/wallet/vnpay-return?status=pending&txn_ref=VP1-x",
      dom,
    });
    await view.flush();
    assert.ok(view.container.querySelector('[data-testid="access-denied-403"]'));
    await view.unmount();
  } finally {
    dom.restore();
  }
});

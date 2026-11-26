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

function installAuthDomShim() {
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
    const attrMatch = selector.match(/^\[([^=\]]+)="([^"]*)"\]$/);
    if (attrMatch) return el.getAttribute(attrMatch[1]) === attrMatch[2];
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
      const out = [];
      const walk = (node) => {
        for (const c of node.childNodes) {
          if (c.nodeType === 1) {
            if (matchesSimpleSelector(c, selector)) out.push(c);
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
    location: { origin: "http://127.0.0.1:15173", pathname: "/vehicles", search: "" },
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

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "r93-rbac-auth-"));
  try {
    const entryPath = path.join(tmpDir, "entry.js");
    const outPath = path.join(tmpDir, "bundle.mjs");

    fs.writeFileSync(
      entryPath,
      `
      export { default as App } from ${JSON.stringify(path.resolve(SRC_ROOT, "App.jsx"))};
      export { ToastProvider } from ${JSON.stringify(path.resolve(SRC_ROOT, "context/ToastContext.jsx"))};
      export { authService, clearStoredAuth } from ${JSON.stringify(path.resolve(SRC_ROOT, "services/authService.js"))};
      export { authService as legacyAuthService, clearStoredAuth as legacyClearStoredAuth } from ${JSON.stringify(path.resolve(SRC_ROOT, "features/authService.js"))};
      export { axiosInstance, notifyUnauthorized } from ${JSON.stringify(path.resolve(SRC_ROOT, "services/apiClient.js"))};
      export { useCurrentUser } from ${JSON.stringify(path.resolve(SRC_ROOT, "hooks/useCurrentUser.js"))};
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
  const { MemoryRouter } = await import("react-router-dom");

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
          React.createElement(App)
        )
      )
    );
    await Promise.resolve();
    await Promise.resolve();
  });

  return {
    container,
    async flush() {
      await act(async () => {
        for (let i = 0; i < 6; i += 1) {
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

test("RBAC-AUTH-01: CUSTOMER login (rememberMe=false) after MANAGER login (rememberMe=true) clears localStorage sp_user and blocks /vehicles & /customers with 403", async () => {
  const dom = installAuthDomShim();
  const { App, ToastProvider, authService, legacyAuthService, axiosInstance } = await loadCompiledAppBundle();
  const origAdapter = axiosInstance.defaults.adapter;

  let activeUser = null;
  axiosInstance.defaults.adapter = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/auth/csrf/")) {
      return { data: { detail: "CSRF cookie set" }, status: 200, statusText: "OK", headers: {}, config };
    }
    if (url.includes("/api/v1/auth/login/")) {
      const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
      if (body.identifier.includes("khang")) {
        activeUser = { id: 1, email: "hoang.dinh.khang@example.com", full_name: "Hoàng Đình Khang", role: "MANAGER" };
      } else {
        activeUser = { id: 2, email: "trinh.xuan.truong@example.com", full_name: "Trịnh Xuân Trường", role: "CUSTOMER" };
      }
      return { data: activeUser, status: 200, statusText: "OK", headers: {}, config };
    }
    return { data: { results: [] }, status: 200, statusText: "OK", headers: {}, config };
  };

  try {
    // 1. Login MANAGER with rememberMe=true (writes localStorage)
    await authService.login({
      account: "hoang.dinh.khang@example.com",
      password: "Password123!",
      rememberMe: true,
    });
    assert.equal(JSON.parse(globalThis.localStorage.getItem("sp_user")).role, "MANAGER");

    // 2. Without logout, login CUSTOMER with rememberMe=false (writes sessionStorage)
    await authService.login({
      account: "trinh.xuan.truong@example.com",
      password: "Password123!",
      rememberMe: false,
    });

    assert.equal(
      globalThis.localStorage.getItem("sp_user"),
      null,
      "localStorage sp_user MUST be cleared so stale MANAGER does not shadow CUSTOMER in sessionStorage"
    );
    assert.equal(JSON.parse(globalThis.sessionStorage.getItem("sp_user")).role, "CUSTOMER");

    // Verify both /vehicles and /customers show 403 and NEVER staff UI / MANAGER badge
    for (const route of ["/vehicles", "/customers"]) {
      const rendered = await renderAppAtRoute({ App, ToastProvider, route, dom });
      try {
        const text = rendered.container.textContent;
        assert.ok(
          rendered.container.querySelector('[data-testid="access-denied-403"]'),
          `${route} must render access-denied-403 for CUSTOMER`
        );
        assert.ok(text.includes("403 - Không có quyền truy cập"), `${route} must show 403 heading`);
        assert.ok(!text.includes("Quản lý xe"), `${route} must NOT render staff Quản lý xe UI`);
        assert.ok(!text.includes("Quản lý khách hàng"), `${route} must NOT render staff Quản lý khách hàng UI`);
        assert.ok(!text.includes("MANAGER"), `${route} must NOT render stale MANAGER badge`);
      } finally {
        await rendered.unmount();
      }
    }

    // Verify legacy features/authService also clears stale localStorage on rememberMe=false login
    await legacyAuthService.login({
      account: "hoang.dinh.khang@example.com",
      password: "Password123!",
      rememberMe: true,
    });
    await legacyAuthService.login({
      account: "trinh.xuan.truong@example.com",
      password: "Password123!",
      rememberMe: false,
    });
    assert.equal(
      globalThis.localStorage.getItem("sp_user"),
      null,
      "features/authService must also clear localStorage sp_user before writing sessionStorage"
    );
  } finally {
    axiosInstance.defaults.adapter = origAdapter;
    dom.restore();
  }
});

test("RBAC-AUTH-02: EMPLOYEE login (rememberMe=false) after CUSTOMER login (rememberMe=true) can access /vehicles and sees 403 on /statistics and /employees", async () => {
  const dom = installAuthDomShim();
  const { App, ToastProvider, authService, axiosInstance } = await loadCompiledAppBundle();
  const origAdapter = axiosInstance.defaults.adapter;

  axiosInstance.defaults.adapter = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/auth/csrf/")) {
      return { data: {}, status: 200, statusText: "OK", headers: {}, config };
    }
    if (url.includes("/api/v1/auth/login/")) {
      const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
      if (body.identifier.includes("truong")) {
        return { data: { id: 2, email: "trinh.xuan.truong@example.com", full_name: "Trịnh Xuân Trường", role: "CUSTOMER" }, status: 200, statusText: "OK", headers: {}, config };
      }
      return { data: { id: 3, email: "luong.mai.phuong@example.org", full_name: "Lương Mai Phương", role: "EMPLOYEE" }, status: 200, statusText: "OK", headers: {}, config };
    }
    return { data: { results: [], count: 0 }, status: 200, statusText: "OK", headers: {}, config };
  };

  try {
    await authService.login({
      account: "trinh.xuan.truong@example.com",
      password: "Password123!",
      rememberMe: true,
    });
    await authService.login({
      account: "luong.mai.phuong@example.org",
      password: "Password123!",
      rememberMe: false,
    });

    assert.equal(globalThis.localStorage.getItem("sp_user"), null);
    assert.equal(JSON.parse(globalThis.sessionStorage.getItem("sp_user")).role, "EMPLOYEE");

    const vehiclesView = await renderAppAtRoute({ App, ToastProvider, route: "/vehicles", dom });
    try {
      assert.equal(
        vehiclesView.container.querySelector('[data-testid="access-denied-403"]'),
        null,
        "EMPLOYEE must be allowed to access /vehicles"
      );
      assert.ok(vehiclesView.container.textContent.includes("Quản lý xe"));
      assert.ok(vehiclesView.container.textContent.includes("EMPLOYEE"));
    } finally {
      await vehiclesView.unmount();
    }

    for (const managerRoute of ["/statistics", "/employees"]) {
      const blockedView = await renderAppAtRoute({ App, ToastProvider, route: managerRoute, dom });
      try {
        assert.ok(
          blockedView.container.textContent.includes("403 - Không có quyền truy cập"),
          `EMPLOYEE must receive 403 on ${managerRoute}`
        );
      } finally {
        await blockedView.unmount();
      }
    }
  } finally {
    axiosInstance.defaults.adapter = origAdapter;
    dom.restore();
  }
});

test("RBAC-AUTH-03: useCurrentUser reconciles stale sessionStorage MANAGER against GET /api/v1/auth/me/ returning CUSTOMER and triggers 403", async () => {
  const dom = installAuthDomShim();
  const { App, ToastProvider, authService, notifyUnauthorized, axiosInstance } = await loadCompiledAppBundle();
  const origFetch = globalThis.fetch;
  const origAdapter = axiosInstance.defaults.adapter;

  let meFetchCalls = 0;
  let logoutPosts = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/api/v1/auth/me/")) {
      meFetchCalls += 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 10,
          email: "cust@example.com",
          phone: "0900000010",
          role: "CUSTOMER",
        }),
      };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  axiosInstance.defaults.adapter = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/auth/logout/")) {
      logoutPosts += 1;
      return { data: { detail: "ok" }, status: 200, statusText: "OK", headers: {}, config };
    }
    return { data: { results: [] }, status: 200, statusText: "OK", headers: {}, config };
  };

  try {
    // Simulate stale MANAGER in sessionStorage while server cookie is CUSTOMER
    globalThis.sessionStorage.setItem(
      "sp_user",
      JSON.stringify({ id: 1, email: "hoang.dinh.khang@example.com", role: "MANAGER" })
    );

    const view = await renderAppAtRoute({ App, ToastProvider, route: "/vehicles", dom });
    try {
      await view.flush();
      assert.ok(meFetchCalls >= 1, "useCurrentUser must call GET /api/v1/auth/me/ when stored user exists");
      const updated = JSON.parse(globalThis.sessionStorage.getItem("sp_user"));
      assert.equal(updated.role, "CUSTOMER", "useCurrentUser must overwrite stale role with server /auth/me/ role");
      assert.equal(updated.id, 10);
      assert.ok(
        view.container.querySelector('[data-testid="access-denied-403"]'),
        "StaffOnlyRoute must switch to 403 once /auth/me/ reconciles role to CUSTOMER"
      );
    } finally {
      await view.unmount();
    }

    // Verify same-tab logout & notifyUnauthorized both clear storage & call server logout best-effort
    await authService.logout();
    assert.equal(logoutPosts, 1, "authService.logout must POST /api/v1/auth/logout/");
    assert.equal(globalThis.sessionStorage.getItem("sp_user"), null);

    let authChangedEventCount = 0;
    dom.win.addEventListener("sp:auth-user-changed", () => {
      authChangedEventCount += 1;
    });
    globalThis.localStorage.setItem("sp_user", JSON.stringify({ id: 1, role: "MANAGER" }));
    notifyUnauthorized("Expired");
    assert.equal(globalThis.localStorage.getItem("sp_user"), null);
    assert.equal(authChangedEventCount, 1, "notifyUnauthorized must emit sp:auth-user-changed");
  } finally {
    globalThis.fetch = origFetch;
    axiosInstance.defaults.adapter = origAdapter;
    dom.restore();
  }
});

test("RBAC-AUTH-04: SSR safety (node --no-experimental-webstorage) renders App, ProtectedRoute, StaffOnlyRoute without ReferenceError", () => {
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
      const { default: ProtectedRoute } = await vite.ssrLoadModule("/src/components/auth/ProtectedRoute.jsx");
      const { ToastProvider } = await vite.ssrLoadModule("/src/context/ToastContext.jsx");
      const htmlApp = renderToString(
        React.createElement(
          ToastProvider,
          null,
          React.createElement(StaticRouter, { location: "/vehicles" }, React.createElement(App))
        )
      );
      const htmlProtected = renderToString(
        React.createElement(
          ToastProvider,
          null,
          React.createElement(StaticRouter, { location: "/vehicles" }, React.createElement(ProtectedRoute))
        )
      );
      console.log("SSR_APP_OK:", typeof htmlApp === "string", "len=" + htmlApp.length);
      console.log("SSR_PROTECTED_OK:", typeof htmlProtected === "string", "len=" + htmlProtected.length);
    } finally {
      await vite.close();
    }
  `;
  const res = spawnSync(
    process.execPath,
    ["--no-experimental-webstorage", "--input-type=module", "-e", ssrScript],
    { cwd: FRONTEND_ROOT, encoding: "utf-8" }
  );
  assert.equal(res.status, 0, `SSR check failed: ${res.stderr}\n${res.stdout}`);
  assert.ok(res.stdout.includes("ENV_CHECK: undefined undefined undefined"));
  assert.ok(res.stdout.includes("SSR_APP_OK: true"));
  assert.ok(res.stdout.includes("SSR_PROTECTED_OK: true"));
});

test("RBAC-AUTH-05: stale in-flight /api/v1/auth/me/ resolving after authService.login(CUSTOMER) and component remount must NOT overwrite CUSTOMER or reopen staff UI", async () => {
  const dom = installAuthDomShim();
  const { App, ToastProvider, authService, axiosInstance } = await loadCompiledAppBundle();
  const { act } = await import("react");
  const origFetch = globalThis.fetch;
  const origAdapter = axiosInstance.defaults.adapter;

  let resolveStaleMe;
  let staleResolved = false;
  let capturedSignal = null;
  let meCallCount = 0;

  globalThis.fetch = async (url, init = {}) => {
    if (String(url).includes("/api/v1/auth/me/")) {
      meCallCount += 1;
      if (meCallCount === 1) {
        capturedSignal = init.signal || null;
        return await new Promise((resolve) => {
          resolveStaleMe = (val) => {
            staleResolved = true;
            resolve(val);
          };
        });
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 2,
          email: "trinh.xuan.truong@example.com",
          full_name: "Trịnh Xuân Trường",
          role: "CUSTOMER",
        }),
      };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  axiosInstance.defaults.adapter = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/auth/csrf/")) {
      return { data: { detail: "CSRF cookie set" }, status: 200, statusText: "OK", headers: {}, config };
    }
    if (url.includes("/api/v1/auth/login/")) {
      return {
        data: { id: 2, email: "trinh.xuan.truong@example.com", full_name: "Trịnh Xuân Trường", role: "CUSTOMER" },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }
    return { data: { results: [], count: 0 }, status: 200, statusText: "OK", headers: {}, config };
  };

  let view1 = null;
  let view2 = null;
  try {
    dom.win.dispatchEvent(new dom.win.CustomEvent("sp:auth-user-changed", { detail: { user: null } }));
    globalThis.localStorage.setItem(
      "sp_user",
      JSON.stringify({ id: 1, email: "hoang.dinh.khang@example.com", full_name: "Hoàng Đình Khang", role: "MANAGER" })
    );

    view1 = await renderAppAtRoute({ App, ToastProvider, route: "/vehicles", dom });
    await view1.flush();
    assert.equal(meCallCount, 1);
    assert.ok(typeof resolveStaleMe === "function", "First /api/v1/auth/me/ request must be in-flight");
    assert.equal(view1.container.querySelector('[data-testid="access-denied-403"]'), null);

    // Login as CUSTOMER (rememberMe=false) while the MANAGER /me/ request is still pending
    await act(async () => {
      await authService.login({
        account: "trinh.xuan.truong@example.com",
        password: "Password123!",
        rememberMe: false,
      });
    });
    await view1.flush();

    assert.ok(view1.container.querySelector('[data-testid="access-denied-403"]'));

    // Unmount and remount <App> while the stale /me/ promise still has not settled
    await view1.unmount();
    view1 = null;
    view2 = await renderAppAtRoute({ App, ToastProvider, route: "/vehicles", dom });
    await view2.flush();
    assert.ok(view2.container.querySelector('[data-testid="access-denied-403"]'));

    // Even if mocked transport ignores AbortSignal and resolves the stale MANAGER payload late, it must be discarded
    await act(async () => {
      resolveStaleMe({
        ok: true,
        status: 200,
        json: async () => ({
          id: 1,
          email: "hoang.dinh.khang@example.com",
          full_name: "Hoàng Đình Khang",
          role: "MANAGER",
        }),
      });
      for (let i = 0; i < 6; i += 1) {
        await Promise.resolve();
      }
    });
    await view2.flush();

    assert.equal(globalThis.localStorage.getItem("sp_user"), null);
    const activeSessionUser = JSON.parse(globalThis.sessionStorage.getItem("sp_user"));
    assert.equal(activeSessionUser.id, 2);
    assert.equal(activeSessionUser.role, "CUSTOMER");
    assert.ok(
      view2.container.querySelector('[data-testid="access-denied-403"]'),
      "Stale /me/ response must NOT reopen staff UI after CUSTOMER login & remount"
    );
    assert.ok(!view2.container.textContent.includes("Quản lý xe"));
    assert.equal(capturedSignal?.aborted, true, "Stale in-flight /me/ AbortController must be aborted on login()");
  } finally {
    if (!staleResolved && typeof resolveStaleMe === "function") {
      resolveStaleMe({ ok: false, status: 500, json: async () => ({}) });
    }
    if (view1) await view1.unmount();
    if (view2) await view2.unmount();
    globalThis.fetch = origFetch;
    axiosInstance.defaults.adapter = origAdapter;
    dom.restore();
  }
});

test("RBAC-AUTH-06: /api/v1/auth/me/ HTTP 401 clears storage and triggers unauthorized state, while 500 and network error preserve cache", async () => {
  const dom = installAuthDomShim();
  const { App, ToastProvider, axiosInstance } = await loadCompiledAppBundle();
  const origFetch = globalThis.fetch;
  const origAdapter = axiosInstance.defaults.adapter;
  const origDateNow = Date.now;

  Date.now = () => origDateNow() + 10000;
  axiosInstance.defaults.adapter = async (config) => ({
    data: { results: [], count: 0 },
    status: 200,
    statusText: "OK",
    headers: {},
    config,
  });

  try {
    // 1. HTTP 401 must clear sp_user & sp_auth_token from both storages and emit unauthorized events
    let unauthorizedEvents = 0;
    let userChangedNullEvents = 0;
    dom.win.addEventListener("app:auth-unauthorized", () => {
      unauthorizedEvents += 1;
    });
    dom.win.addEventListener("sp:auth-user-changed", (ev) => {
      if (ev?.detail?.user === null) userChangedNullEvents += 1;
    });

    dom.win.dispatchEvent(new dom.win.CustomEvent("sp:auth-user-changed", { detail: { user: null } }));
    globalThis.localStorage.setItem(
      "sp_user",
      JSON.stringify({ id: 61, full_name: "Hoàng Đình Khang", role: "MANAGER" })
    );
    globalThis.localStorage.setItem("sp_auth_token", "stale-ls-token");
    globalThis.sessionStorage.setItem("sp_auth_token", "stale-ss-token");

    globalThis.fetch = async (url) => {
      if (String(url).includes("/api/v1/auth/me/")) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ detail: "Authentication credentials were not provided." }),
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    const view401 = await renderAppAtRoute({ App, ToastProvider, route: "/vehicles", dom });
    try {
      await view401.flush();
      await view401.flush();
      assert.equal(globalThis.localStorage.getItem("sp_user"), null, "401 must clear localStorage sp_user");
      assert.equal(globalThis.localStorage.getItem("sp_auth_token"), null, "401 must clear localStorage sp_auth_token");
      assert.equal(globalThis.sessionStorage.getItem("sp_user"), null, "401 must clear sessionStorage sp_user");
      assert.equal(globalThis.sessionStorage.getItem("sp_auth_token"), null, "401 must clear sessionStorage sp_auth_token");
      assert.ok(unauthorizedEvents >= 1, "401 from /me/ must trigger app:auth-unauthorized");
      assert.ok(userChangedNullEvents >= 1, "401 from /me/ must emit sp:auth-user-changed with user: null");
      assert.ok(view401.container.textContent.includes("Đăng nhập"), "401 must redirect to login UI");
      assert.ok(!view401.container.textContent.includes("Hoàng Đình Khang"), "401 must clear stale user name");
      assert.ok(!view401.container.textContent.includes("MANAGER"), "401 must clear stale MANAGER badge");
    } finally {
      await view401.unmount();
    }

    // 2. HTTP 500 must preserve cached sp_user
    dom.win.dispatchEvent(new dom.win.CustomEvent("sp:auth-user-changed", { detail: { user: null } }));
    globalThis.localStorage.setItem(
      "sp_user",
      JSON.stringify({ id: 62, full_name: "Hoàng Đình Khang", role: "MANAGER" })
    );
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ detail: "Internal Server Error" }),
    });

    const view500 = await renderAppAtRoute({ App, ToastProvider, route: "/vehicles", dom });
    try {
      await view500.flush();
      const preserved500 = JSON.parse(globalThis.localStorage.getItem("sp_user"));
      assert.equal(preserved500?.id, 62);
      assert.equal(preserved500?.role, "MANAGER", "HTTP 500 must preserve cached sp_user");
    } finally {
      await view500.unmount();
    }

    // 3. Network error (fetch reject) must preserve cached sp_user
    dom.win.dispatchEvent(new dom.win.CustomEvent("sp:auth-user-changed", { detail: { user: null } }));
    globalThis.localStorage.setItem(
      "sp_user",
      JSON.stringify({ id: 63, full_name: "Hoàng Đình Khang", role: "MANAGER" })
    );
    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch");
    };

    const viewNet = await renderAppAtRoute({ App, ToastProvider, route: "/vehicles", dom });
    try {
      await viewNet.flush();
      const preservedNet = JSON.parse(globalThis.localStorage.getItem("sp_user"));
      assert.equal(preservedNet?.id, 63);
      assert.equal(preservedNet?.role, "MANAGER", "Network failure must preserve cached sp_user");
    } finally {
      await viewNet.unmount();
    }
  } finally {
    Date.now = origDateNow;
    globalThis.fetch = origFetch;
    axiosInstance.defaults.adapter = origAdapter;
    dom.restore();
  }
});

test("RBAC-AUTH-07: cross-user id mismatch does not leak full_name, inactive storage is cleaned, non-object sp_user is rejected, unrelated storage events do not re-render, and clearStoredAuth handles SecurityError", async () => {
  const dom = installAuthDomShim();
  const {
    App,
    ToastProvider,
    useCurrentUser,
    clearStoredAuth,
    legacyClearStoredAuth,
    axiosInstance,
  } = await loadCompiledAppBundle();
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const origFetch = globalThis.fetch;
  const origAdapter = axiosInstance.defaults.adapter;

  axiosInstance.defaults.adapter = async (config) => ({
    data: { results: [], count: 0 },
    status: 200,
    statusText: "OK",
    headers: {},
    config,
  });

  try {
    // 1. Cross-user id mismatch: must NOT leak full_name from old user and must clean inactive storage
    dom.win.dispatchEvent(new dom.win.CustomEvent("sp:auth-user-changed", { detail: { user: null } }));
    globalThis.localStorage.setItem(
      "sp_user",
      JSON.stringify({ id: 71, email: "hoang.dinh.khang@example.com", full_name: "Hoàng Đình Khang", role: "MANAGER" })
    );
    globalThis.sessionStorage.setItem(
      "sp_user",
      JSON.stringify({ id: 99, email: "stale@example.com", role: "EMPLOYEE" })
    );

    globalThis.fetch = async (url) => {
      if (String(url).includes("/api/v1/auth/me/")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 10,
            email: "cust@example.com",
            phone: "0900000010",
            role: "CUSTOMER",
          }),
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    const viewMismatch = await renderAppAtRoute({ App, ToastProvider, route: "/vehicles", dom });
    try {
      await viewMismatch.flush();
      const updatedUser = JSON.parse(globalThis.localStorage.getItem("sp_user"));
      assert.equal(updatedUser.id, 10);
      assert.equal(updatedUser.role, "CUSTOMER");
      assert.equal(updatedUser.full_name, undefined, "Cross-user reconcile must NOT leak previous user's full_name");
      assert.equal(globalThis.sessionStorage.getItem("sp_user"), null, "Inactive storage sp_user must be cleaned");
      assert.ok(!viewMismatch.container.textContent.includes("Hoàng Đình Khang"));
      assert.ok(viewMismatch.container.querySelector('[data-testid="access-denied-403"]'));
    } finally {
      await viewMismatch.unmount();
    }

    // 2. Primitive JSON string '"MANAGER"' in sp_user must be rejected by getStoredUser()
    dom.win.dispatchEvent(new dom.win.CustomEvent("sp:auth-user-changed", { detail: { user: null } }));
    globalThis.localStorage.setItem("sp_user", JSON.stringify("MANAGER"));
    globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });

    const viewPrimitive = await renderAppAtRoute({ App, ToastProvider, route: "/vehicles", dom });
    try {
      await viewPrimitive.flush();
      assert.ok(viewPrimitive.container.textContent.includes("Đăng nhập"), "Primitive string 'MANAGER' must redirect to login");
      assert.ok(!viewPrimitive.container.textContent.includes("MANAGER"), "Primitive string 'MANAGER' must NOT render staff badge");
    } finally {
      await viewPrimitive.unmount();
    }

    // 3. Unrelated storage events (e.g. smart_parking_latest_scan) must NOT trigger useCurrentUser re-render
    dom.win.dispatchEvent(new dom.win.CustomEvent("sp:auth-user-changed", { detail: { user: null } }));
    globalThis.localStorage.setItem(
      "sp_user",
      JSON.stringify({ id: 73, full_name: "Hoàng Đình Khang", role: "MANAGER" })
    );
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 73, role: "MANAGER" }),
    });

    let renderCount = 0;
    function RenderCounter() {
      renderCount += 1;
      const { role } = useCurrentUser();
      return React.createElement("span", null, role);
    }
    const probeContainer = dom.doc.createElement("div");
    dom.doc.body.appendChild(probeContainer);
    const probeRoot = createRoot(probeContainer);
    await act(async () => {
      probeRoot.render(React.createElement(RenderCounter));
      await Promise.resolve();
      await Promise.resolve();
    });
    const rendersAfterMount = renderCount;

    await act(async () => {
      const unrelatedEvent = Object.assign(new dom.win.Event("storage"), {
        key: "smart_parking_latest_scan",
      });
      dom.win.dispatchEvent(unrelatedEvent);
      await Promise.resolve();
    });
    assert.equal(renderCount, rendersAfterMount, "Unrelated storage keys must NOT trigger useCurrentUser re-renders");
    await act(async () => {
      probeRoot.unmount();
    });
    if (probeContainer.parentNode) probeContainer.parentNode.removeChild(probeContainer);

    // 4. clearStoredAuth must guard typeof localStorage/sessionStorage inside try/catch (SecurityError safe)
    const lsDesc = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const ssDesc = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
    try {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        get() {
          throw new Error("SecurityError: localStorage blocked");
        },
      });
      Object.defineProperty(globalThis, "sessionStorage", {
        configurable: true,
        get() {
          throw new Error("SecurityError: sessionStorage blocked");
        },
      });
      assert.doesNotThrow(() => clearStoredAuth({ notify: false }));
      assert.doesNotThrow(() => legacyClearStoredAuth({ notify: false }));
    } finally {
      if (lsDesc) Object.defineProperty(globalThis, "localStorage", lsDesc);
      if (ssDesc) Object.defineProperty(globalThis, "sessionStorage", ssDesc);
    }
  } finally {
    globalThis.fetch = origFetch;
    axiosInstance.defaults.adapter = origAdapter;
    dom.restore();
  }
});

test("RBAC-AUTH-08: Kịch bản 2B — unmounted authService.login aborts in-flight /me/, invalidates lastReconciledUserKey, detects 401 on remount, and discards late MANAGER resolve", async () => {
  const dom = installAuthDomShim();
  const { App, ToastProvider, authService, axiosInstance } = await loadCompiledAppBundle();
  const { act } = await import("react");
  const origFetch = globalThis.fetch;
  const origAdapter = axiosInstance.defaults.adapter;
  const origDateNow = Date.now;

  Date.now = () => origDateNow() + 20000;

  let meCallCount = 0;
  let signalMgr = null;
  let resolveMgrMe = null;
  let mgrResolved = false;

  globalThis.fetch = async (url, init = {}) => {
    if (String(url).includes("/api/v1/auth/me/")) {
      meCallCount += 1;
      if (meCallCount === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 2,
            email: "trinh.xuan.truong@example.com",
            full_name: "Trịnh Xuân Trường",
            role: "CUSTOMER",
          }),
        };
      }
      if (meCallCount === 2) {
        signalMgr = init.signal || null;
        return await new Promise((resolve) => {
          resolveMgrMe = (val) => {
            mgrResolved = true;
            resolve(val);
          };
        });
      }
      return {
        ok: false,
        status: 401,
        json: async () => ({ detail: "Expired" }),
      };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  axiosInstance.defaults.adapter = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/auth/csrf/")) {
      return { data: { detail: "CSRF cookie set" }, status: 200, statusText: "OK", headers: {}, config };
    }
    if (url.includes("/api/v1/auth/login/")) {
      const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
      if (body.identifier.includes("khang")) {
        return {
          data: { id: 1, email: "hoang.dinh.khang@example.com", full_name: "Hoàng Đình Khang", role: "MANAGER" },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }
      return {
        data: { id: 2, email: "trinh.xuan.truong@example.com", full_name: "Trịnh Xuân Trường", role: "CUSTOMER" },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }
    return { data: { results: [], count: 0 }, status: 200, statusText: "OK", headers: {}, config };
  };

  let view1 = null;
  let view2 = null;
  let view3 = null;
  try {
    // Bước 1: CUSTOMER (id=2) mount /vehicles -> /me/ lần 1 trả 200 CUSTOMER -> unmount
    await authService.login({
      account: "trinh.xuan.truong@example.com",
      password: "Password123!",
      rememberMe: false,
    });
    view1 = await renderAppAtRoute({ App, ToastProvider, route: "/vehicles", dom });
    await view1.flush();
    assert.equal(meCallCount, 1);
    assert.ok(view1.container.querySelector('[data-testid="access-denied-403"]'));
    await view1.unmount();
    view1 = null;

    // Bước 2: login(MANAGER id=1) -> mount /vehicles -> /me/ lần 2 treo in-flight (signalMgr) -> unmount
    await authService.login({
      account: "hoang.dinh.khang@example.com",
      password: "Password123!",
      rememberMe: true,
    });
    view2 = await renderAppAtRoute({ App, ToastProvider, route: "/vehicles", dom });
    await view2.flush();
    assert.equal(meCallCount, 2);
    assert.ok(typeof resolveMgrMe === "function", "Second /api/v1/auth/me/ request must be in-flight");
    assert.ok(signalMgr, "AbortSignal must be passed to /api/v1/auth/me/ fetch");
    assert.equal(signalMgr.aborted, false);
    await view2.unmount();
    view2 = null;

    // Bước 3: khi không có component mount useCurrentUser, login(CUSTOMER id=2) -> remount /vehicles (/me/ trả 401)
    await authService.login({
      account: "trinh.xuan.truong@example.com",
      password: "Password123!",
      rememberMe: false,
    });
    assert.equal(
      signalMgr.aborted,
      true,
      "Unmounted authService.login(CUSTOMER) must still abort in-flight MANAGER /me/ request"
    );

    view3 = await renderAppAtRoute({ App, ToastProvider, route: "/vehicles", dom });
    await view3.flush();
    await view3.flush();

    assert.equal(meCallCount, 3, "Remounting /vehicles after unmounted login(CUSTOMER) must invoke /me/ call #3");
    assert.equal(globalThis.sessionStorage.getItem("sp_user"), null, "401 must clear sessionStorage sp_user");
    assert.equal(globalThis.localStorage.getItem("sp_user"), null, "401 must clear localStorage sp_user");
    assert.ok(view3.container.textContent.includes("Đăng nhập"), "401 must redirect to login UI");

    // Late resolve của MANAGER không được ghi đè lại CUSTOMER / unauthenticated state
    await act(async () => {
      resolveMgrMe({
        ok: true,
        status: 200,
        json: async () => ({
          id: 1,
          email: "hoang.dinh.khang@example.com",
          full_name: "Hoàng Đình Khang",
          role: "MANAGER",
        }),
      });
      for (let i = 0; i < 6; i += 1) {
        await Promise.resolve();
      }
    });
    await view3.flush();

    assert.equal(globalThis.localStorage.getItem("sp_user"), null);
    assert.equal(globalThis.sessionStorage.getItem("sp_user"), null);
    assert.ok(view3.container.textContent.includes("Đăng nhập"));
    assert.equal(view3.container.querySelector("aside"), null, "Login UI must NOT render staff sidebar");
    assert.ok(!view3.container.textContent.includes("Quản lý nhân viên"));
    assert.ok(!view3.container.textContent.includes("MANAGER"));
  } finally {
    if (!mgrResolved && typeof resolveMgrMe === "function") {
      resolveMgrMe({ ok: false, status: 500, json: async () => ({}) });
    }
    if (view1) await view1.unmount();
    if (view2) await view2.unmount();
    if (view3) await view3.unmount();
    Date.now = origDateNow;
    globalThis.fetch = origFetch;
    axiosInstance.defaults.adapter = origAdapter;
    dom.restore();
  }
});

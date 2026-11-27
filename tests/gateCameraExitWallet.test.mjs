import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { formatCurrencyVND } from "../src/constants/paymentConstants.js";
import { evaluatePendingExitLiveness } from "../src/utils/walkinPendingEntry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_ROOT = path.resolve(__dirname, "../src");

test("WP3-EXIT-01: GateCameraControlModal Worker Mode handles laneMode === 'exit' GATE_AUTO_CHECK_OUT & GATE_AUTO_PAYMENT_REQUIRED", () => {
  const modalPath = path.resolve(__dirname, "../src/components/VehicleManagement/GateCameraControlModal.jsx");
  const code = fs.readFileSync(modalPath, "utf-8");

  assert.ok(
    code.includes('lastAutoEvent.action === "GATE_AUTO_CHECK_OUT"'),
    "Worker Mode effect must handle GATE_AUTO_CHECK_OUT when laneMode === 'exit'"
  );
  assert.ok(
    code.includes('lastAutoEvent.action === "GATE_AUTO_PAYMENT_REQUIRED"'),
    "Worker Mode effect must handle GATE_AUTO_PAYMENT_REQUIRED when laneMode === 'exit'"
  );
  assert.ok(
    code.includes('laneMode === "exit"'),
    "Worker Mode effect must not exit early for laneMode !== 'entry' before handling exit events"
  );
});

test("WP3-EXIT-02: GateCameraControlModal handleConfirmExit distinguishes 409 PROP-4.5.1-P10 from PROP-WALLET-INSUFFICIENT & PROP-WALLET-LOCKED", () => {
  const modalPath = path.resolve(__dirname, "../src/components/VehicleManagement/GateCameraControlModal.jsx");
  const code = fs.readFileSync(modalPath, "utf-8");
  const exitStart = code.indexOf("const handleConfirmExit = useCallback");
  const exitEnd = code.indexOf("// Tự động áp dụng (Auto-Apply) trong Browser Mode", exitStart);
  assert.ok(exitStart !== -1 && exitEnd > exitStart, "handleConfirmExit block must exist");
  const exitCode = code.slice(exitStart, exitEnd);

  assert.ok(
    exitCode.includes("PROP-WALLET-INSUFFICIENT") && exitCode.includes("PROP-WALLET-LOCKED"),
    "handleConfirmExit must explicitly exclude PROP-WALLET-INSUFFICIENT and PROP-WALLET-LOCKED from already-closed 409 banner"
  );
  assert.equal(
    /const is409 =\s*status === 409 \|\|/.test(exitCode),
    false,
    "handleConfirmExit must NOT unconditionally swallow all HTTP 409 errors as already-closed"
  );
  assert.ok(
    exitCode.includes("isSessionAlreadyClosed409"),
    "handleConfirmExit must use isSessionAlreadyClosed409 guard"
  );
});

test("WP3-EXIT-03: ExitLanePanel removes simulation copy & inaccurate partial-debit copy and shows exact missing amount", () => {
  const panelPath = path.resolve(__dirname, "../src/components/VehicleManagement/scanPlate/ExitLanePanel.jsx");
  const code = fs.readFileSync(panelPath, "utf-8");

  assert.equal(code.includes("Mô phỏng"), false, "ExitLanePanel must NOT label live wallet checkout as (Mô phỏng)");
  assert.equal(
    code.includes("Chưa trừ tiền tài khoản ngân hàng thật"),
    false,
    "ExitLanePanel must NOT contain simulated-mode disclaimer on real wallet debit"
  );
  assert.equal(
    code.includes("Hệ thống sẽ trừ hết số dư ví"),
    false,
    "ExitLanePanel must NOT claim partial wallet debit is supported"
  );
  assert.ok(
    code.includes("không trừ một phần") || code.includes("không hỗ trợ trừ một phần"),
    "ExitLanePanel must clearly explain no partial wallet debit and show missing amount"
  );
});

test("WP3-EXIT-04: GateCameraControlModal Browser Mode pendingExitInfo enables keepAlivePlate & D1 lastSeenAt expiry for exit", () => {
  const modalPath = path.resolve(__dirname, "../src/components/VehicleManagement/GateCameraControlModal.jsx");
  const code = fs.readFileSync(modalPath, "utf-8");

  assert.ok(
    code.includes('laneMode === "exit" && pendingExitInfo?.mode !== "worker"'),
    "usePlateAutoDetect keepAlivePlate must be active for Browser Mode pendingExitInfo when laneMode === 'exit'"
  );
  assert.ok(
    code.includes("evaluatePendingExitLiveness") || code.includes("pendingExitInfo.lastSeenAt"),
    "Browser Mode pendingExitInfo must track lastSeenAt and drop on D1 unseen timeout"
  );
});

test("WP3-UI-01: CustomerProfilePage includes PARKING_FEE & TICKET_RENEWAL options, ParkingHistoryTable & formatCurrencyVND format integer VND", () => {
  const profilePath = path.resolve(__dirname, "../src/pages/CustomerProfilePage.jsx");
  const profileCode = fs.readFileSync(profilePath, "utf-8");
  assert.ok(profileCode.includes('<option value="PARKING_FEE">'), "CustomerProfilePage must include PARKING_FEE filter option");
  assert.ok(profileCode.includes('<option value="TICKET_RENEWAL">'), "CustomerProfilePage must include TICKET_RENEWAL filter option");

  const tablePath = path.resolve(__dirname, "../src/components/ParkingHistory/ParkingHistoryTable.jsx");
  const tableCode = fs.readFileSync(tablePath, "utf-8");
  assert.ok(tableCode.includes("formatCurrencyVND(item.fee_amount)"), "ParkingHistoryTable must use formatCurrencyVND(item.fee_amount)");
  assert.equal(tableCode.includes("`${item.fee_amount}đ`"), false, "ParkingHistoryTable must not raw-concatenate .00đ");

  assert.equal(formatCurrencyVND(20000.4), "20.000đ");
  assert.equal(formatCurrencyVND(20000.6), "20.001đ");
});

test("WP3-EXIT-05: evaluatePendingExitLiveness stays alive <=60s unseen, drops >60s unseen and >=15m expired", () => {
  const start = 1_000_000;
  const pending = {
    mode: "browser",
    plate: "30A-612.35",
    sessionCode: "#PK-1",
    startedAt: start,
    lastSeenAt: start + 10_000,
    expiresAt: start + 15 * 60 * 1000,
  };

  assert.deepEqual(evaluatePendingExitLiveness(pending, start + 30_000), {
    alive: true,
    reason: "ACTIVE",
  });
  assert.deepEqual(evaluatePendingExitLiveness(pending, start + 70_000), {
    alive: true,
    reason: "ACTIVE",
  });
  assert.deepEqual(evaluatePendingExitLiveness(pending, start + 70_001), {
    alive: false,
    reason: "UNSEEN_TIMEOUT",
  });
  const keptSeen = { ...pending, lastSeenAt: start + 15 * 60 * 1000 };
  assert.deepEqual(evaluatePendingExitLiveness(keptSeen, start + 15 * 60 * 1000), {
    alive: false,
    reason: "EXPIRED_15M",
  });
});

// ============================================================================
// WP3 ITERATION 2: REACT 19 RUNTIME REGRESSION TESTS (A, B, C, D)
// ============================================================================

function installExitRuntimeDomShim({ withCamera = false } = {}) {
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

  let frameTick = 0;
  const doc = new ShimNode(9, "#document");
  doc.documentElement = new ShimElement("html");
  doc.head = new ShimElement("head");
  doc.body = new ShimElement("body");
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);
  doc.appendChild(doc.documentElement);
  doc.createElement = (tag) => {
    const el = new ShimElement(tag);
    el.ownerDocument = doc;
    if (withCamera) {
      const upper = String(tag).toUpperCase();
      if (upper === "VIDEO") {
        el.readyState = 4;
        el.videoWidth = 1280;
        el.videoHeight = 720;
        el.play = () => Promise.resolve();
        el.pause = () => {};
      } else if (upper === "CANVAS") {
        el.width = 0;
        el.height = 0;
        el.getContext = () => ({
          drawImage: () => {},
          getImageData: (_x, _y, w, h) => {
            frameTick += 1;
            const val = frameTick % 2 === 0 ? 120 : 180;
            return { data: new Uint8ClampedArray(w * h * 4).fill(val) };
          },
        });
        el.toBlob = (cb) => {
          cb(new Blob(["fake-jpeg"], { type: "image/jpeg" }));
        };
      }
    }
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

  const fakeTrack = {
    addEventListener: () => {},
    removeEventListener: () => {},
    stop: () => {},
  };
  const fakeStream = {
    getTracks: () => [fakeTrack],
    getVideoTracks: () => [fakeTrack],
  };

  const winListeners = new Map();
  const win = {
    document: doc,
    isSecureContext: true,
    location: { origin: "http://127.0.0.1:15173", pathname: "/vehicles", search: "" },
    navigator: {
      mediaDevices: withCamera
        ? {
            getUserMedia: async () => fakeStream,
            enumerateDevices: async () => [{ kind: "videoinput", deviceId: "cam-1", label: "Gate Cam 1" }],
          }
        : undefined,
    },
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
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  return {
    doc,
    win,
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

function installExitFakeTimers(startMs = 1_700_000_000_000) {
  const originalDateNow = Date.now;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;

  let fakeNowMs = startMs;
  let nextTimerId = 1;
  const timers = new Map();

  Date.now = () => fakeNowMs;

  globalThis.setInterval = (fn, ms = 1) => {
    const id = nextTimerId++;
    const period = Math.max(1, Number(ms) || 1);
    timers.set(id, { id, fn, ms: period, nextAt: fakeNowMs + period, repeat: true });
    return id;
  };
  globalThis.clearInterval = (id) => {
    timers.delete(id);
  };
  globalThis.setTimeout = (fn, ms = 0, ...args) => {
    const delay = Number(ms) || 0;
    if (delay <= 10) {
      return originalSetTimeout(fn, delay, ...args);
    }
    const id = nextTimerId++;
    timers.set(id, { id, fn: () => fn(...args), ms: delay, nextAt: fakeNowMs + delay, repeat: false });
    return id;
  };
  globalThis.clearTimeout = (id) => {
    if (timers.has(id)) {
      timers.delete(id);
    } else {
      originalClearTimeout(id);
    }
  };

  async function flushMicrotasks(rounds = 10) {
    for (let i = 0; i < rounds; i += 1) {
      await Promise.resolve();
    }
  }

  async function advanceMs(act, totalMs) {
    const targetMs = fakeNowMs + totalMs;
    let steps = 0;
    while (true) {
      steps += 1;
      if (steps > 5000) {
        throw new Error(`FAKE_TIMER_SPIN_GUARD steps=${steps} timers=${timers.size} now=${fakeNowMs}`);
      }
      let earliest = null;
      for (const t of timers.values()) {
        if (t.nextAt <= targetMs && (!earliest || t.nextAt < earliest.nextAt)) {
          earliest = t;
        }
      }
      if (!earliest) {
        fakeNowMs = targetMs;
        await act(async () => {
          await flushMicrotasks();
        });
        break;
      }
      fakeNowMs = earliest.nextAt;
      const due = [...timers.values()].filter((t) => t.nextAt <= fakeNowMs);
      await act(async () => {
        for (const t of due) {
          if (!timers.has(t.id)) continue;
          if (t.repeat) {
            t.nextAt += t.ms;
          } else {
            timers.delete(t.id);
          }
          t.fn();
        }
        await flushMicrotasks();
      });
    }
  }

  return {
    now: () => fakeNowMs,
    advanceMs,
    restore() {
      Date.now = originalDateNow;
      globalThis.setInterval = originalSetInterval;
      globalThis.clearInterval = originalClearInterval;
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    },
  };
}

let _compiledExitBundleCache = null;
async function loadCompiledExitModal() {
  if (_compiledExitBundleCache) return _compiledExitBundleCache;
  const [{ default: esbuild }, { default: babel }] = await Promise.all([
    import("esbuild"),
    import("@babel/core"),
  ]);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wp3-iter2-rt-"));
  try {
    const entryPath = path.join(tmpDir, "entry.js");
    const outPath = path.join(tmpDir, "bundle.mjs");
    const modalSrc = path.resolve(SRC_ROOT, "components/VehicleManagement/GateCameraControlModal.jsx");
    const hookSrc = path.resolve(SRC_ROOT, "components/VehicleManagement/scanPlate/hooks/usePlateMatching.js");
    const apiSrc = path.resolve(SRC_ROOT, "services/apiClient.js");

    fs.writeFileSync(
      entryPath,
      `
      export { default as GateCameraControlModal } from ${JSON.stringify(modalSrc)};
      export { usePlateMatching } from ${JSON.stringify(hookSrc)};
      export { axiosInstance } from ${JSON.stringify(apiSrc)};
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
    _compiledExitBundleCache = {
      ...mod,
      cleanup() {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      },
    };
    return _compiledExitBundleCache;
  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }
}

test.after(() => {
  if (_compiledExitBundleCache) {
    _compiledExitBundleCache.cleanup();
    _compiledExitBundleCache = null;
  }
});

test("WP3-ITER2-A (Major Timer Starvation): 3s keep-alive sightings on pendingExitInfo MUST NOT starve 5s lookup poll and auto-checkout on wallet top-up", async () => {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { GateCameraControlModal, axiosInstance } = await loadCompiledExitModal();

  const dom = installExitRuntimeDomShim({ withCamera: true });
  const clock = installExitFakeTimers();
  const originalRequest = axiosInstance.request;

  let walletBalance = "10000.00";
  let lookupCalls = 0;
  let plateScanCalls = 0;
  const checkOutPayloads = [];
  const sessionEvents = [];
  const onSessionEvent = (e) => sessionEvents.push(e.detail);
  dom.win.addEventListener("parking-session-changed", onSessionEvent);

  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/gates/")) {
      return { data: { results: [{ id: 3, code: "OUT_01", direction: "OUT", worker_online: false }] } };
    }
    if (url.includes("/api/v1/parking/plate-scans/")) {
      plateScanCalls += 1;
      return {
        data: {
          plate_final: "30A61235",
          review_status: "AUTO",
          confidence: 0.97,
          best_candidate: { plate_text: "30A61235", confidence: 0.97, bounding_box: { x1: 10, y1: 10, x2: 110, y2: 50 } },
        },
      };
    }
    if (url.includes("/api/v1/parking/vehicle-lookup/")) {
      lookupCalls += 1;
      return {
        data: {
          vehicle: { id: 95, license_plate: "30A-612.35", vehicle_type: "CAR", status: "ACTIVE" },
          customer: {
            id: 64,
            full_name: "Khách Ca 3",
            has_wallet: true,
            wallet_balance: walletBalance,
            wallet_status: "ACTIVE",
          },
          open_session: {
            id: 206,
            session_code: "#PK-20261122-206",
            entry_time: "2026-11-22T07:00:00Z",
          },
        },
      };
    }
    if (url.includes("/api/v1/parking/sessions/fee-preview/")) {
      return { data: { session_id: 206, session_code: "#PK-20261122-206", fee_amount: 30000 } };
    }
    if (url.includes("/api/v1/parking/sessions/check-out/")) {
      checkOutPayloads.push(JSON.parse(config.data));
      return {
        data: {
          payment: { method: "WALLET", amount: "30000.00" },
          session: { id: 206, session_code: "#PK-20261122-206", fee_amount: "30000.00" },
          vehicle_lookup: { open_session: null },
        },
      };
    }
    return { data: {} };
  };

  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        React.createElement(GateCameraControlModal, {
          isOpen: true,
          onClose: () => {},
          initialLane: "exit",
          gateId: 3,
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    // Achieve 3-of-4 detection and enter pendingExitInfo (wallet 10k < fee 30k)
    await clock.advanceMs(act, 6000);
    const infoBanner = container.querySelector('[data-testid="informational-banner"]');
    assert.ok(
      infoBanner && infoBanner.textContent.includes("Số dư ví không đủ"),
      `Must enter pendingExitInfo banner on insufficient wallet, got: ${container.textContent}`
    );

    const lookupsAtPendingStart = lookupCalls;
    const plateScansAtPendingStart = plateScanCalls;
    // Customer tops up wallet while vehicle remains in front of camera (3s keep-alive sightings run!)
    walletBalance = "50000.00";

    // Advance 12s -> 3s keep-alive runs at +3s/+6s/+9s/+12s, and 5s poll MUST still fire at +5s/+10s!
    await clock.advanceMs(act, 12000);

    const keepAliveScansDuringPending = plateScanCalls - plateScansAtPendingStart;
    assert.ok(
      keepAliveScansDuringPending >= 2,
      `Keep-alive 3s sightings must actually fire during pending exit (got ${keepAliveScansDuringPending})`
    );
    assert.ok(
      lookupCalls > lookupsAtPendingStart,
      `5s pending exit poll must NOT be starved by 3s keep-alive (before=${lookupsAtPendingStart}, after=${lookupCalls})`
    );
    assert.equal(
      checkOutPayloads.length,
      1,
      `Must automatically check out once after wallet top-up while still seen (got ${checkOutPayloads.length})`
    );
    assert.equal(checkOutPayloads[0].payment_method, "WALLET");
    assert.ok(
      container.textContent.includes("Check-out hoàn tất"),
      "Must show Check-out hoàn tất after automatic wallet check-out"
    );
    assert.ok(
      sessionEvents.some((e) => e.action === "check-out"),
      "Must dispatch parking-session-changed after automatic wallet check-out"
    );
  } finally {
    dom.win.removeEventListener("parking-session-changed", onSessionEvent);
    await act(async () => {
      root.unmount();
    });
    clock.restore();
    axiosInstance.request = originalRequest;
    dom.restore();
  }
});

test("WP3-ITER2-B (High UNSEEN_TIMEOUT >60s): dropPendingExit clears detection/matching state so pendingExitInfo NEVER resurrects", async () => {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { GateCameraControlModal, axiosInstance } = await loadCompiledExitModal();

  const dom = installExitRuntimeDomShim({ withCamera: true });
  const clock = installExitFakeTimers();
  const originalRequest = axiosInstance.request;

  let cameraPhase = "SEEN"; // "SEEN" | "GONE_422"
  let walletBalance = "10000.00";
  let lookupCalls = 0;
  const checkOutPayloads = [];

  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/gates/")) {
      return { data: { results: [{ id: 3, code: "OUT_01", direction: "OUT", worker_online: false }] } };
    }
    if (url.includes("/api/v1/parking/plate-scans/")) {
      if (cameraPhase === "GONE_422") {
        const err = new Error("No plate detected");
        err.status = 422;
        err.response = { status: 422, data: { code: "NO_PLATE" } };
        throw err;
      }
      return {
        data: {
          plate_final: "30A61235",
          review_status: "AUTO",
          confidence: 0.97,
          best_candidate: { plate_text: "30A61235", confidence: 0.97, bounding_box: { x1: 10, y1: 10, x2: 110, y2: 50 } },
        },
      };
    }
    if (url.includes("/api/v1/parking/vehicle-lookup/")) {
      lookupCalls += 1;
      return {
        data: {
          vehicle: { id: 95, license_plate: "30A-612.35", vehicle_type: "CAR", status: "ACTIVE" },
          customer: {
            id: 64,
            full_name: "Khách Ca 4",
            has_wallet: true,
            wallet_balance: walletBalance,
            wallet_status: "ACTIVE",
          },
          open_session: {
            id: 207,
            session_code: "#PK-20261122-207",
            entry_time: "2026-11-22T07:00:00Z",
          },
        },
      };
    }
    if (url.includes("/api/v1/parking/sessions/fee-preview/")) {
      return { data: { session_id: 207, session_code: "#PK-20261122-207", fee_amount: 30000 } };
    }
    if (url.includes("/api/v1/parking/sessions/check-out/")) {
      checkOutPayloads.push(JSON.parse(config.data));
      return { data: { session: { id: 207, fee_amount: "30000.00" } } };
    }
    return { data: {} };
  };

  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        React.createElement(GateCameraControlModal, {
          isOpen: true,
          onClose: () => {},
          initialLane: "exit",
          gateId: 3,
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    await clock.advanceMs(act, 6000);
    assert.ok(
      container.querySelector('[data-testid="informational-banner"]')?.textContent.includes("Số dư ví không đủ"),
      "Must enter pendingExitInfo initially"
    );

    // Keep vehicle visible for 10s via keep-alive, then vehicle leaves (422) for 65s
    await clock.advanceMs(act, 10000);
    cameraPhase = "GONE_422";
    await clock.advanceMs(act, 65000);

    const expiredBanner = container.querySelector('[data-testid="informational-banner"]');
    assert.ok(
      expiredBanner && expiredBanner.textContent.includes(">60 giây"),
      `Banner after >60s unseen MUST show '>60 giây' expiry (not resurrected), got: ${expiredBanner?.textContent}`
    );
    assert.equal(
      expiredBanner.textContent.includes("Số dư ví không đủ"),
      false,
      "pendingExitInfo must NOT resurrect after UNSEEN_TIMEOUT"
    );

    const lookupCountAfterExpire = lookupCalls;
    // Customer tops up AFTER leaving; road stays empty for 15s more -> 0 lookups, 0 checkouts!
    walletBalance = "80000.00";
    await clock.advanceMs(act, 15000);

    assert.equal(
      lookupCalls,
      lookupCountAfterExpire,
      `Must NOT continue polling vehicle-lookup after >60s UNSEEN_TIMEOUT (before=${lookupCountAfterExpire}, after=${lookupCalls})`
    );
    assert.equal(
      checkOutPayloads.length,
      0,
      "Must NEVER debit/check-out after vehicle left >60s"
    );
  } finally {
    await act(async () => {
      root.unmount();
    });
    clock.restore();
    axiosInstance.request = originalRequest;
    dom.restore();
  }
});

test("WP3-ITER2-C (High 409 PROP-4.5.1-P10): checkOutResult.alreadyClosed shows informational banner and NEVER opens barrier or says Check-out hoàn tất", async () => {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { GateCameraControlModal, axiosInstance } = await loadCompiledExitModal();

  const dom = installExitRuntimeDomShim({ withCamera: false });
  const originalRequest = axiosInstance.request;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  globalThis.setInterval = () => 1;
  globalThis.clearInterval = () => {};

  const sessionEvents = [];
  const onSessionEvent = (e) => sessionEvents.push(e.detail);
  dom.win.addEventListener("parking-session-changed", onSessionEvent);

  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/gates/")) {
      return { data: { results: [{ id: 1, worker_online: false }, { id: 3, worker_online: false }] } };
    }
    if (url.includes("/api/v1/parking/vehicle-lookup/")) {
      return {
        data: {
          vehicle: { id: 10, license_plate: "43B-999.77", vehicle_type: "CAR", status: "ACTIVE" },
          customer: { id: 20, full_name: "Test P10", has_wallet: false },
          open_session: { id: 77, session_code: "#PK-409-P10", entry_time: "2026-11-22T06:00:00Z" },
        },
      };
    }
    if (url.includes("/api/v1/parking/slots/")) {
      return { data: { results: [{ id: 1, code: "A-01", status: "AVAILABLE", vehicle_type: "CAR" }] } };
    }
    if (url.includes("/api/v1/parking/sessions/fee-preview/")) {
      return { data: { session_id: 77, session_code: "#PK-409-P10", fee_amount: 20000 } };
    }
    if (url.includes("/api/v1/parking/sessions/check-out/")) {
      const err = new Error("Phiên đỗ xe này đã được kết thúc trước đó.");
      err.response = {
        status: 409,
        data: { code: "PROP-4.5.1-P10", message: "Phiên đỗ xe này đã được kết thúc trước đó." },
      };
      throw err;
    }
    return { data: {} };
  };

  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        React.createElement(GateCameraControlModal, {
          isOpen: true,
          onClose: () => {},
          initialLane: "exit",
          gateId: 3,
          initialPlate: "43B99977",
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const checkOutBtn = container
      .querySelectorAll("button")
      .find((b) => b.textContent.includes("Mở Barrier") && !b.textContent.includes("Xe Vào"));
    assert.ok(checkOutBtn, "Exit confirm button must exist");

    await act(async () => {
      checkOutBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const infoBanner = container.querySelector('[data-testid="informational-banner"]');
    assert.ok(
      infoBanner && infoBanner.textContent.includes("đã được kết thúc"),
      `409 PROP-4.5.1-P10 (alreadyClosed) must render informational-banner, got: ${container.textContent}`
    );
    assert.equal(
      container.textContent.includes("Check-out hoàn tất"),
      false,
      "alreadyClosed must NEVER render 'Check-out hoàn tất'"
    );
    assert.equal(
      container.textContent.includes("BARRIER ĐANG MỞ") || container.textContent.includes("BARRIER ĐÃ MỞ"),
      false,
      "alreadyClosed must NEVER trigger barrier open"
    );
    assert.ok(
      sessionEvents.some((e) => e.action === "check-out"),
      "alreadyClosed must still dispatch parking-session-changed to sync stale history row"
    );

    // Verify open_session was cleared so switching to Làn Vào shows no stale open-session block
    const entryTabBtn = container.querySelectorAll("button").find((b) => b.textContent.includes("Làn Vào"));
    await act(async () => {
      entryTabBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.equal(
      container.textContent.includes("Xe đang có phiên gửi cũ chưa đóng"),
      false,
      "alreadyClosed must clear open_session before switching lanes"
    );
  } finally {
    dom.win.removeEventListener("parking-session-changed", onSessionEvent);
    await act(async () => {
      root.unmount();
    });
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
    axiosInstance.request = originalRequest;
    dom.restore();
  }
});

test("WP3-ITER2-D (Medium Worker null -> GATE_AUTO_CHECK_OUT/IN): transition from idle null event triggers barrier, banner & parking-session-changed", async () => {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { GateCameraControlModal, axiosInstance } = await loadCompiledExitModal();

  const dom = installExitRuntimeDomShim({ withCamera: false });
  const clock = installExitFakeTimers();
  const originalRequest = axiosInstance.request;

  let currentExitEvent = null;
  let currentEntryEvent = null;
  const sessionEvents = [];
  const onSessionEvent = (e) => sessionEvents.push(e.detail);
  dom.win.addEventListener("parking-session-changed", onSessionEvent);

  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/gates/")) {
      return {
        data: {
          results: [
            { id: 1, code: "IN_01", direction: "IN", worker_online: true, last_auto_event: currentEntryEvent },
            { id: 3, code: "OUT_01", direction: "OUT", worker_online: true, last_auto_event: currentExitEvent },
          ],
        },
      };
    }
    if (url.includes("/api/v1/parking/slots/")) {
      return { data: { results: [] } };
    }
    return { data: {} };
  };

  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container);

  try {
    // 1. Exit lane starting idle (last_auto_event: null) -> GATE_AUTO_CHECK_OUT
    await act(async () => {
      root.render(
        React.createElement(GateCameraControlModal, {
          isOpen: true,
          onClose: () => {},
          initialLane: "exit",
          gateId: 3,
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    assert.ok(container.querySelector('[data-testid="viewer-mode-badge"]'), "Viewer Mode must be active");

    currentExitEvent = {
      action: "GATE_AUTO_CHECK_OUT",
      reason: "VALID_WALLET_PAID",
      license_plate_masked: "30A***35",
      occurred_at: "2026-11-22T10:00:00Z",
    };
    await clock.advanceMs(act, 3500);

    const exitAutoBanner = container.querySelector('[data-testid="auto-apply-banner"]');
    assert.ok(
      exitAutoBanner && exitAutoBanner.textContent.includes("Đã tự động ghi nhận Check-out"),
      `Null -> GATE_AUTO_CHECK_OUT must display auto-apply-banner, got: ${container.textContent}`
    );
    assert.ok(
      sessionEvents.some((e) => e.action === "check-out" && e.reason === "VALID_WALLET_PAID"),
      `Null -> GATE_AUTO_CHECK_OUT must dispatch parking-session-changed, got: ${JSON.stringify(sessionEvents)}`
    );

    // 2. Entry lane starting idle (last_auto_event: null) -> GATE_AUTO_CHECK_IN
    await act(async () => {
      root.render(
        React.createElement(GateCameraControlModal, {
          isOpen: false,
          onClose: () => {},
          initialLane: "entry",
          gateId: 1,
        })
      );
      await Promise.resolve();
    });
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

    currentEntryEvent = {
      action: "GATE_AUTO_CHECK_IN",
      reason: "VALID_REGISTERED",
      license_plate_masked: "30A***35",
      occurred_at: "2026-11-22T10:01:00Z",
    };
    await clock.advanceMs(act, 3500);

    const entryAutoBanner = container.querySelector('[data-testid="auto-apply-banner"]');
    assert.ok(
      entryAutoBanner && entryAutoBanner.textContent.includes("Đã tự động ghi nhận Check-in"),
      `Null -> GATE_AUTO_CHECK_IN must display auto-apply-banner, got: ${container.textContent}`
    );
  } finally {
    dom.win.removeEventListener("parking-session-changed", onSessionEvent);
    await act(async () => {
      root.unmount();
    });
    clock.restore();
    axiosInstance.request = originalRequest;
    dom.restore();
  }
});

test("WP3-ITER3-B2 (Probe B2 Race): in-flight vehicle-lookup crossing >60s dropPendingExit must NOT write zombie customer or fee state", async () => {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { GateCameraControlModal, axiosInstance } = await loadCompiledExitModal();

  const dom = installExitRuntimeDomShim({ withCamera: true });
  const clock = installExitFakeTimers();
  const originalRequest = axiosInstance.request;

  let cameraPhase = "SEEN"; // "SEEN" | "GONE_422"
  let holdNextLookup = false;
  let releaseHeldLookup = null;
  let delayedTriggered = false;
  const checkOutPayloads = [];

  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/gates/")) {
      return { data: { results: [{ id: 3, code: "OUT_01", direction: "OUT", worker_online: false }] } };
    }
    if (url.includes("/api/v1/parking/plate-scans/")) {
      if (cameraPhase === "GONE_422") {
        const err = new Error("No plate detected");
        err.status = 422;
        err.response = { status: 422, data: { code: "NO_PLATE" } };
        throw err;
      }
      return {
        data: {
          plate_final: "30A61235",
          review_status: "AUTO",
          confidence: 0.97,
          best_candidate: { plate_text: "30A61235", confidence: 0.97, bounding_box: { x1: 10, y1: 10, x2: 110, y2: 50 } },
        },
      };
    }
    if (url.includes("/api/v1/parking/vehicle-lookup/")) {
      if (holdNextLookup) {
        holdNextLookup = false;
        delayedTriggered = true;
        return new Promise((resolve) => {
          releaseHeldLookup = () =>
            resolve({
              data: {
                vehicle: { id: 95, license_plate: "30A-612.35", vehicle_type: "CAR", status: "ACTIVE" },
                customer: {
                  id: 64,
                  full_name: "Khách B2 Race",
                  has_wallet: true,
                  wallet_balance: "90000.00",
                  wallet_status: "ACTIVE",
                },
                open_session: {
                  id: 208,
                  session_code: "#PK-208",
                  entry_time: "2026-11-22T07:00:00Z",
                },
              },
            });
        });
      }
      return {
        data: {
          vehicle: { id: 95, license_plate: "30A-612.35", vehicle_type: "CAR", status: "ACTIVE" },
          customer: {
            id: 64,
            full_name: "Khách B2 Race",
            has_wallet: true,
            wallet_balance: "10000.00",
            wallet_status: "ACTIVE",
          },
          open_session: {
            id: 208,
            session_code: "#PK-208",
            entry_time: "2026-11-22T07:00:00Z",
          },
        },
      };
    }
    if (url.includes("/api/v1/parking/sessions/fee-preview/")) {
      return { data: { session_id: 208, session_code: "#PK-208", fee_amount: 30000 } };
    }
    if (url.includes("/api/v1/parking/sessions/check-out/")) {
      checkOutPayloads.push(JSON.parse(config.data));
      return { data: { session: { id: 208, fee_amount: "30000.00" } } };
    }
    return { data: {} };
  };

  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        React.createElement(GateCameraControlModal, {
          isOpen: true,
          onClose: () => {},
          initialLane: "exit",
          gateId: 3,
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    // Enter pendingExitInfo on insufficient wallet
    await clock.advanceMs(act, 6000);
    assert.ok(
      container.querySelector('[data-testid="informational-banner"]')?.textContent.includes("Số dư ví không đủ"),
      "Must enter pendingExitInfo initially"
    );

    // Keep alive briefly, then vehicle disappears (422)
    await clock.advanceMs(act, 4000);
    cameraPhase = "GONE_422";

    // Advance near the 60s unseen edge (~54s), then hold the next 5s poll vehicle-lookup across the >60s drop
    await clock.advanceMs(act, 52000);
    holdNextLookup = true;
    await clock.advanceMs(act, 10000);

    assert.equal(delayedTriggered, true, "In-flight vehicle-lookup near ~60s must have been triggered");
    const bannerAtDrop = container.querySelector('[data-testid="informational-banner"]')?.textContent || "";
    assert.ok(
      bannerAtDrop.includes(">60 giây"),
      `Expected UNSEEN_TIMEOUT >60 giây banner before delayed lookup resolves, got: ${bannerAtDrop}`
    );

    // Resolve the delayed in-flight lookup AFTER dropPendingExit has already fired
    await act(async () => {
      releaseHeldLookup?.();
      for (let i = 0; i < 12; i += 1) {
        await Promise.resolve();
      }
    });
    await clock.advanceMs(act, 1000);

    const hasZombieCustomer =
      container.textContent.includes("Khách B2 Race") ||
      container.textContent.includes("90.000đ");
    const hasZombieFee = container.textContent.includes("30.000đ");
    const bannerAfterResolve = container.querySelector('[data-testid="informational-banner"]')?.textContent || "";

    assert.equal(
      hasZombieCustomer,
      false,
      `In-flight lookup resolved after >60s drop MUST NOT write zombie customer/balance (hasZombieCustomer=${hasZombieCustomer})`
    );
    assert.equal(
      hasZombieFee,
      false,
      `In-flight lookup resolved after >60s drop MUST NOT write zombie fee (hasZombieFee=${hasZombieFee})`
    );
    assert.equal(checkOutPayloads.length, 0, "Must NEVER auto check-out after >60s drop");
    assert.ok(
      bannerAfterResolve.includes(">60 giây"),
      `Expiry banner must remain intact after stale lookup resolves, got: ${bannerAfterResolve}`
    );
  } finally {
    await act(async () => {
      root.unmount();
    });
    clock.restore();
    axiosInstance.request = originalRequest;
    dom.restore();
  }
});

test("WP3-ITER3-D4 (Probe D4 Worker Lifecycle): closing modal after GATE_AUTO_PAYMENT_REQUIRED and reopening with last_auto_event: null clears informational-banner", async () => {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { GateCameraControlModal, axiosInstance } = await loadCompiledExitModal();

  const dom = installExitRuntimeDomShim({ withCamera: false });
  const clock = installExitFakeTimers();
  const originalRequest = axiosInstance.request;

  let currentExitEvent = {
    action: "GATE_AUTO_PAYMENT_REQUIRED",
    reason: "FEE_PAYMENT_REQUIRED",
    license_plate_masked: "30A***35",
    occurred_at: "2026-11-22T10:15:00Z",
  };

  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/gates/")) {
      return {
        data: {
          results: [
            { id: 3, code: "OUT_01", direction: "OUT", worker_online: true, last_auto_event: currentExitEvent },
          ],
        },
      };
    }
    if (url.includes("/api/v1/parking/slots/")) {
      return { data: { results: [] } };
    }
    return { data: {} };
  };

  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container);

  try {
    // 1. Open modal in Worker Mode with GATE_AUTO_PAYMENT_REQUIRED
    await act(async () => {
      root.render(
        React.createElement(GateCameraControlModal, {
          isOpen: true,
          onClose: () => {},
          initialLane: "exit",
          gateId: 3,
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const beforeCloseBanner = container.querySelector('[data-testid="informational-banner"]')?.textContent || "";
    assert.ok(
      beforeCloseBanner.includes("thanh toán tại quầy thu ngân"),
      `Initial GATE_AUTO_PAYMENT_REQUIRED must render informational-banner, got: ${beforeCloseBanner}`
    );

    // 2. Close modal, clear server last_auto_event, reopen modal and wait for poll
    await act(async () => {
      root.render(
        React.createElement(GateCameraControlModal, {
          isOpen: false,
          onClose: () => {},
          initialLane: "exit",
          gateId: 3,
        })
      );
      await Promise.resolve();
    });

    currentExitEvent = null;

    await act(async () => {
      root.render(
        React.createElement(GateCameraControlModal, {
          isOpen: true,
          onClose: () => {},
          initialLane: "exit",
          gateId: 3,
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    await clock.advanceMs(act, 3500);

    const afterReopenBanner = container.querySelector('[data-testid="informational-banner"]')?.textContent || "";
    assert.equal(
      afterReopenBanner,
      "",
      `Reopening modal with last_auto_event: null must clear informational-banner, got: ${afterReopenBanner}`
    );
    assert.equal(
      container.querySelector('[data-testid="server-event-banner"]'),
      null,
      "Reopening modal with last_auto_event: null must not show server-event-banner"
    );
  } finally {
    await act(async () => {
      root.unmount();
    });
    clock.restore();
    axiosInstance.request = originalRequest;
    dom.restore();
  }
});

// ============================================================================
// WP3 ITERATION 4: D4-RAPID & MINOR 1/2/3 REGRESSION TESTS
// ============================================================================

test("WP3-ITER4-D4-RAPID-A2: same-tick flushSync close/reopen with pending network (worker_online: true, last_auto_event: null) must NOT leak stale exit banner", async () => {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { flushSync } = await import("react-dom");
  const { createRoot } = await import("react-dom/client");
  const { GateCameraControlModal, axiosInstance } = await loadCompiledExitModal();

  const dom = installExitRuntimeDomShim({ withCamera: false });
  const clock = installExitFakeTimers();
  const originalRequest = axiosInstance.request;

  let holdNextGatePoll = false;
  let releaseHeldGatePoll = null;
  let currentExitEvent = {
    action: "GATE_AUTO_PAYMENT_REQUIRED",
    reason: "FEE_PAYMENT_REQUIRED",
    license_plate_masked: "30A***35",
    occurred_at: "2026-11-22T10:15:00Z",
  };

  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/gates/")) {
      if (holdNextGatePoll) {
        holdNextGatePoll = false;
        return new Promise((resolve) => {
          releaseHeldGatePoll = () =>
            resolve({
              data: {
                results: [
                  { id: 3, code: "OUT_01", direction: "OUT", worker_online: true, last_auto_event: currentExitEvent },
                ],
              },
            });
        });
      }
      return {
        data: {
          results: [
            { id: 3, code: "OUT_01", direction: "OUT", worker_online: true, last_auto_event: currentExitEvent },
          ],
        },
      };
    }
    if (url.includes("/api/v1/parking/slots/")) {
      return { data: { results: [] } };
    }
    return { data: {} };
  };

  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        React.createElement(GateCameraControlModal, {
          isOpen: true,
          onClose: () => {},
          initialLane: "exit",
          gateId: 3,
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const initialBanner = container.querySelector('[data-testid="informational-banner"]')?.textContent || "";
    assert.ok(initialBanner.includes("thanh toán tại quầy thu ngân"), `Expected initial banner, got: ${initialBanner}`);

    currentExitEvent = null;
    holdNextGatePoll = true;

    // Close and reopen synchronously in the same JS tick via flushSync
    await act(async () => {
      flushSync(() => {
        root.render(
          React.createElement(GateCameraControlModal, {
            isOpen: false,
            onClose: () => {},
            initialLane: "exit",
            gateId: 3,
          })
        );
      });
      flushSync(() => {
        root.render(
          React.createElement(GateCameraControlModal, {
            isOpen: true,
            onClose: () => {},
            initialLane: "exit",
            gateId: 3,
          })
        );
      });
      // Drain microtasks BEFORE network resolves
      for (let i = 0; i < 6; i += 1) {
        await Promise.resolve();
      }
    });

    const beforeNetworkBanner = container.querySelector('[data-testid="informational-banner"]')?.textContent || "";
    assert.equal(
      beforeNetworkBanner,
      "",
      `[D4-rapid-a2] Stale banner must NOT leak while reopen fetchStatus is in-flight, got: ${beforeNetworkBanner}`
    );

    await act(async () => {
      releaseHeldGatePoll?.();
      for (let i = 0; i < 8; i += 1) {
        await Promise.resolve();
      }
    });
    await clock.advanceMs(act, 3500);

    const afterPollBanner = container.querySelector('[data-testid="informational-banner"]')?.textContent || "";
    assert.equal(afterPollBanner, "", `Banner must stay empty after poll, got: ${afterPollBanner}`);
  } finally {
    await act(async () => {
      root.unmount();
    });
    clock.restore();
    axiosInstance.request = originalRequest;
    dom.restore();
  }
});

test("WP3-ITER4-D4-RAPID-A5: same-tick flushSync close/reopen with worker_online true -> false must NOT leak stale banner permanently", async () => {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { flushSync } = await import("react-dom");
  const { createRoot } = await import("react-dom/client");
  const { GateCameraControlModal, axiosInstance } = await loadCompiledExitModal();

  const dom = installExitRuntimeDomShim({ withCamera: false });
  const clock = installExitFakeTimers();
  const originalRequest = axiosInstance.request;

  let holdNextGatePoll = false;
  let releaseHeldGatePoll = null;
  let workerOnlineState = true;
  let currentExitEvent = {
    action: "GATE_AUTO_PAYMENT_REQUIRED",
    reason: "FEE_PAYMENT_REQUIRED",
    license_plate_masked: "30A***35",
    occurred_at: "2026-11-22T10:15:00Z",
  };

  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/gates/")) {
      if (holdNextGatePoll) {
        holdNextGatePoll = false;
        return new Promise((resolve) => {
          releaseHeldGatePoll = () =>
            resolve({
              data: {
                results: [
                  {
                    id: 3,
                    code: "OUT_01",
                    direction: "OUT",
                    worker_online: workerOnlineState,
                    last_auto_event: currentExitEvent,
                  },
                ],
              },
            });
        });
      }
      return {
        data: {
          results: [
            {
              id: 3,
              code: "OUT_01",
              direction: "OUT",
              worker_online: workerOnlineState,
              last_auto_event: currentExitEvent,
            },
          ],
        },
      };
    }
    if (url.includes("/api/v1/parking/slots/")) {
      return { data: { results: [] } };
    }
    return { data: {} };
  };

  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        React.createElement(GateCameraControlModal, {
          isOpen: true,
          onClose: () => {},
          initialLane: "exit",
          gateId: 3,
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    assert.ok(
      (container.querySelector('[data-testid="informational-banner"]')?.textContent || "").includes(
        "thanh toán tại quầy thu ngân"
      )
    );

    workerOnlineState = false;
    currentExitEvent = null;
    holdNextGatePoll = true;

    await act(async () => {
      flushSync(() => {
        root.render(
          React.createElement(GateCameraControlModal, {
            isOpen: false,
            onClose: () => {},
            initialLane: "exit",
            gateId: 3,
          })
        );
      });
      flushSync(() => {
        root.render(
          React.createElement(GateCameraControlModal, {
            isOpen: true,
            onClose: () => {},
            initialLane: "exit",
            gateId: 3,
          })
        );
      });
      for (let i = 0; i < 6; i += 1) {
        await Promise.resolve();
      }
    });

    const beforeNetworkBanner = container.querySelector('[data-testid="informational-banner"]')?.textContent || "";
    assert.equal(
      beforeNetworkBanner,
      "",
      `[D4-rapid-a5] Stale banner must NOT leak before network resolves, got: ${beforeNetworkBanner}`
    );

    await act(async () => {
      releaseHeldGatePoll?.();
      for (let i = 0; i < 8; i += 1) {
        await Promise.resolve();
      }
    });

    const afterResolveBanner = container.querySelector('[data-testid="informational-banner"]')?.textContent || "";
    assert.equal(
      afterResolveBanner,
      "",
      `[D4-rapid-a5] Banner must NOT remain after worker_online: false resolves, got: ${afterResolveBanner}`
    );

    await clock.advanceMs(act, 3500);
    const afterNextPollBanner = container.querySelector('[data-testid="informational-banner"]')?.textContent || "";
    assert.equal(
      afterNextPollBanner,
      "",
      `[D4-rapid-a5] Banner must NOT remain after next poll, got: ${afterNextPollBanner}`
    );
  } finally {
    await act(async () => {
      root.unmount();
    });
    clock.restore();
    axiosInstance.request = originalRequest;
    dom.restore();
  }
});

test("WP3-ITER4-D4-RAPID-B: same-tick microtask-delayed reopen must NOT leak stale exit banner", async () => {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { flushSync } = await import("react-dom");
  const { createRoot } = await import("react-dom/client");
  const { GateCameraControlModal, axiosInstance } = await loadCompiledExitModal();

  const dom = installExitRuntimeDomShim({ withCamera: false });
  const clock = installExitFakeTimers();
  const originalRequest = axiosInstance.request;

  let currentExitEvent = {
    action: "GATE_AUTO_PAYMENT_REQUIRED",
    reason: "FEE_PAYMENT_REQUIRED",
    license_plate_masked: "30A***35",
    occurred_at: "2026-11-22T10:15:00Z",
  };
  let holdNextGatePoll = false;
  let releaseHeldGatePoll = null;

  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/gates/")) {
      if (holdNextGatePoll) {
        holdNextGatePoll = false;
        return new Promise((resolve) => {
          releaseHeldGatePoll = () =>
            resolve({
              data: {
                results: [
                  { id: 3, code: "OUT_01", direction: "OUT", worker_online: true, last_auto_event: currentExitEvent },
                ],
              },
            });
        });
      }
      return {
        data: {
          results: [
            { id: 3, code: "OUT_01", direction: "OUT", worker_online: true, last_auto_event: currentExitEvent },
          ],
        },
      };
    }
    if (url.includes("/api/v1/parking/slots/")) {
      return { data: { results: [] } };
    }
    return { data: {} };
  };

  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        React.createElement(GateCameraControlModal, {
          isOpen: true,
          onClose: () => {},
          initialLane: "exit",
          gateId: 3,
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    assert.ok(
      (container.querySelector('[data-testid="informational-banner"]')?.textContent || "").includes(
        "thanh toán tại quầy thu ngân"
      )
    );

    currentExitEvent = null;
    holdNextGatePoll = true;

    // Schedule reopen in a microtask ahead of close's cleanup microtask
    await act(async () => {
      queueMicrotask(() => {
        flushSync(() => {
          root.render(
            React.createElement(GateCameraControlModal, {
              isOpen: true,
              onClose: () => {},
              initialLane: "exit",
              gateId: 3,
            })
          );
        });
      });
      flushSync(() => {
        root.render(
          React.createElement(GateCameraControlModal, {
            isOpen: false,
            onClose: () => {},
            initialLane: "exit",
            gateId: 3,
          })
        );
      });
      for (let i = 0; i < 8; i += 1) {
        await Promise.resolve();
      }
    });

    const afterMicrotaskReopenBanner =
      container.querySelector('[data-testid="informational-banner"]')?.textContent || "";
    assert.equal(
      afterMicrotaskReopenBanner,
      "",
      `[D4-rapid-b] Stale banner must NOT leak after microtask-delayed reopen, got: ${afterMicrotaskReopenBanner}`
    );

    await act(async () => {
      releaseHeldGatePoll?.();
      for (let i = 0; i < 8; i += 1) {
        await Promise.resolve();
      }
    });
    await clock.advanceMs(act, 3500);

    const afterPollBanner = container.querySelector('[data-testid="informational-banner"]')?.textContent || "";
    assert.equal(afterPollBanner, "", `[D4-rapid-b] Banner must stay empty after poll, got: ${afterPollBanner}`);
  } finally {
    await act(async () => {
      root.unmount();
    });
    clock.restore();
    axiosInstance.request = originalRequest;
    dom.restore();
  }
});

test("WP3-ITER4-D4-RAPID-ENTRY: laneMode === 'entry' same-tick close/reopen does NOT resurrect UNREGISTERED_VEHICLE / GATE_AUTO_CHECK_IN / PENDING_ENTRY_EXPIRED", async () => {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { flushSync } = await import("react-dom");
  const { createRoot } = await import("react-dom/client");
  const { GateCameraControlModal, axiosInstance } = await loadCompiledExitModal();

  const dom = installExitRuntimeDomShim({ withCamera: false });
  const clock = installExitFakeTimers();
  const originalRequest = axiosInstance.request;

  let workerOnlineState = true;
  let currentEntryEvent = {
    action: "GATE_AUTO_NEEDS_STAFF",
    reason: "UNREGISTERED_VEHICLE",
    license_plate_masked: "30A***35",
    occurred_at: new Date(clock.now()).toISOString(),
  };
  let holdNextGatePoll = false;
  let releaseHeldGatePoll = null;

  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/gates/")) {
      if (holdNextGatePoll) {
        holdNextGatePoll = false;
        return new Promise((resolve) => {
          releaseHeldGatePoll = () =>
            resolve({
              data: {
                results: [
                  {
                    id: 1,
                    code: "IN_01",
                    direction: "IN",
                    worker_online: workerOnlineState,
                    last_auto_event: currentEntryEvent,
                  },
                ],
              },
            });
        });
      }
      return {
        data: {
          results: [
            {
              id: 1,
              code: "IN_01",
              direction: "IN",
              worker_online: workerOnlineState,
              last_auto_event: currentEntryEvent,
            },
          ],
        },
      };
    }
    if (url.includes("/api/v1/parking/slots/")) {
      return { data: { results: [] } };
    }
    return { data: {} };
  };

  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container);

  try {
    // 1. Open on entry with UNREGISTERED_VEHICLE -> shows pending-entry countdown banner
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

    assert.ok(
      container.querySelector('[data-testid="pending-entry-card"]'),
      "Entry worker mode must render pending-entry-card for UNREGISTERED_VEHICLE"
    );

    // 2. Same-tick close/reopen when server cleared event & switched worker_online: false
    workerOnlineState = false;
    currentEntryEvent = null;
    holdNextGatePoll = true;

    await act(async () => {
      flushSync(() => {
        root.render(
          React.createElement(GateCameraControlModal, {
            isOpen: false,
            onClose: () => {},
            initialLane: "entry",
            gateId: 1,
          })
        );
      });
      flushSync(() => {
        root.render(
          React.createElement(GateCameraControlModal, {
            isOpen: true,
            onClose: () => {},
            initialLane: "entry",
            gateId: 1,
          })
        );
      });
      for (let i = 0; i < 6; i += 1) {
        await Promise.resolve();
      }
    });

    assert.equal(
      Boolean(container.querySelector('[data-testid="pending-entry-card"]')),
      false,
      "[D4-rapid-entry] Stale UNREGISTERED_VEHICLE pending-entry-card must NOT resurrect before network resolves"
    );

    await act(async () => {
      releaseHeldGatePoll?.();
      for (let i = 0; i < 8; i += 1) {
        await Promise.resolve();
      }
    });
    await clock.advanceMs(act, 3500);

    assert.equal(
      Boolean(container.querySelector('[data-testid="pending-entry-card"]')),
      false,
      "[D4-rapid-entry] Stale UNREGISTERED_VEHICLE pending-entry-card must NOT remain after poll"
    );

    // 3. Normal Worker entry transitions (null -> GATE_AUTO_CHECK_IN and null -> PENDING_ENTRY_EXPIRED) still work
    workerOnlineState = true;
    currentEntryEvent = null;
    await clock.advanceMs(act, 3500);

    currentEntryEvent = {
      action: "GATE_AUTO_CHECK_IN",
      reason: "AUTO_CHECK_IN",
      license_plate_masked: "30A***35",
      occurred_at: new Date(clock.now()).toISOString(),
    };
    await clock.advanceMs(act, 3500);

    assert.ok(
      (container.querySelector('[data-testid="auto-apply-banner"]')?.textContent || "").includes(
        "Check-in cho xe 30A***35"
      ),
      "Normal null -> GATE_AUTO_CHECK_IN must still show auto-apply banner"
    );

    currentEntryEvent = {
      action: "GATE_AUTO_CHECK_IN_DENIED",
      reason: "PENDING_ENTRY_EXPIRED",
      license_plate_masked: "30A***35",
      occurred_at: new Date(clock.now() + 1000).toISOString(),
    };
    await clock.advanceMs(act, 3500);

    assert.ok(
      (container.querySelector('[data-testid="informational-banner"]')?.textContent || "").includes(
        "hết thời gian chờ"
      ),
      "PENDING_ENTRY_EXPIRED must show informational-banner"
    );

    // 4. Same-tick close/reopen after PENDING_ENTRY_EXPIRED with worker_online: true & last_auto_event: null
    currentEntryEvent = null;
    holdNextGatePoll = true;

    await act(async () => {
      flushSync(() => {
        root.render(
          React.createElement(GateCameraControlModal, {
            isOpen: false,
            onClose: () => {},
            initialLane: "entry",
            gateId: 1,
          })
        );
      });
      flushSync(() => {
        root.render(
          React.createElement(GateCameraControlModal, {
            isOpen: true,
            onClose: () => {},
            initialLane: "entry",
            gateId: 1,
          })
        );
      });
      for (let i = 0; i < 6; i += 1) {
        await Promise.resolve();
      }
    });

    assert.equal(
      container.querySelector('[data-testid="informational-banner"]')?.textContent || "",
      "",
      "[D4-rapid-entry] PENDING_ENTRY_EXPIRED banner must NOT leak during reopen"
    );

    await act(async () => {
      releaseHeldGatePoll?.();
      for (let i = 0; i < 8; i += 1) {
        await Promise.resolve();
      }
    });
    assert.equal(
      container.querySelector('[data-testid="informational-banner"]')?.textContent || "",
      "",
      "[D4-rapid-entry] PENDING_ENTRY_EXPIRED banner must stay cleared after reopen resolves"
    );
  } finally {
    await act(async () => {
      root.unmount();
    });
    clock.restore();
    axiosInstance.request = originalRequest;
    dom.restore();
  }
});

test("WP3-ITER4-MINOR-1-2-3: Minor 1 (workerInfoBannerActiveRef reset on banner close & lane switch), Minor 2 (handleImageScanned clears isScanning), Minor 3 (isOpeningModal clears fee/matching when !initialPlate)", async () => {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { flushSync } = await import("react-dom");
  const { createRoot } = await import("react-dom/client");
  const { GateCameraControlModal, usePlateMatching, axiosInstance } = await loadCompiledExitModal();

  const dom = installExitRuntimeDomShim({ withCamera: false });
  const clock = installExitFakeTimers();
  const originalRequest = axiosInstance.request;

  // --- Minor 2: usePlateMatching handleImageScanned recognized branch clears isScanning ---
  let releaseSlowLookup = null;
  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/vehicle-lookup/")) {
      return new Promise((resolve) => {
        releaseSlowLookup = () =>
          resolve({
            data: {
              vehicle: { id: 99, license_plate: "51A-111.11", vehicle_type: "CAR", status: "ACTIVE" },
            },
          });
      });
    }
    return { data: {} };
  };

  let hookApi = null;
  function HookHarness() {
    hookApi = usePlateMatching({ mockVehiclesFallback: false });
    return React.createElement("div", { "data-scanning": String(hookApi.isScanning) });
  }

  const hookContainer = dom.doc.createElement("div");
  dom.doc.body.appendChild(hookContainer);
  const hookRoot = createRoot(hookContainer);

  try {
    await act(async () => {
      hookRoot.render(React.createElement(HookHarness));
    });

    // Start in-flight handleMatchPlate (isScanning becomes true)
    await act(async () => {
      hookApi.handleMatchPlate("51A11111");
      await Promise.resolve();
    });
    assert.equal(hookApi.isScanning, true, "isScanning must be true while handleMatchPlate is in-flight");

    // Call handleImageScanned with recognized scanResult -> must clear isScanning immediately
    await act(async () => {
      hookApi.handleImageScanned(
        {
          plate_final: "30A61235",
          review_status: "AUTO",
          confidence: 0.98,
          vehicle_lookup: {
            vehicle: { id: 95, license_plate: "30A-612.35", vehicle_type: "CAR", status: "ACTIVE" },
          },
        },
        "https://cdn.example/plate.jpg"
      );
      await Promise.resolve();
    });
    assert.equal(
      hookApi.isScanning,
      false,
      "[Minor 2] handleImageScanned recognized branch must call setIsScanning(false)"
    );

    await act(async () => {
      releaseSlowLookup?.();
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.equal(hookApi.isScanning, false, "isScanning must stay false after stale lookup resolves");
  } finally {
    await act(async () => {
      hookRoot.unmount();
    });
  }

  // --- Minor 1 & Minor 3 in GateCameraControlModal ---
  let exitWorkerOnline = true;
  let exitAutoEvent = {
    action: "GATE_AUTO_PAYMENT_REQUIRED",
    reason: "FEE_PAYMENT_REQUIRED",
    license_plate_masked: "30A***35",
    occurred_at: "2026-11-22T10:15:00Z",
  };
  let entryWorkerOnline = false;

  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/gates/")) {
      return {
        data: {
          results: [
            { id: 1, code: "IN_01", direction: "IN", worker_online: entryWorkerOnline, last_auto_event: null },
            { id: 3, code: "OUT_01", direction: "OUT", worker_online: exitWorkerOnline, last_auto_event: exitAutoEvent },
          ],
        },
      };
    }
    if (url.includes("/api/v1/parking/vehicle-lookup/")) {
      return {
        data: {
          vehicle: { id: 95, license_plate: "30A-612.35", vehicle_type: "CAR", status: "ACTIVE" },
          open_session: { id: 208, session_code: "#PK-208", entry_time: "2026-11-22T07:00:00Z" },
        },
      };
    }
    if (url.includes("/api/v1/parking/sessions/fee-preview/")) {
      return { data: { session_id: 208, session_code: "#PK-208", fee_amount: 45000 } };
    }
    if (url.includes("/api/v1/parking/sessions/check-out/")) {
      const err = new Error("Already closed");
      err.status = 409;
      err.response = { status: 409, data: { code: "PROP-4.5.1-P10", message: "Đã kết thúc" } };
      throw err;
    }
    if (url.includes("/api/v1/parking/slots/")) {
      return { data: { results: [] } };
    }
    return { data: {} };
  };

  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        React.createElement(GateCameraControlModal, {
          isOpen: true,
          onClose: () => {},
          initialLane: "exit",
          gateId: 3,
          initialPlate: "30A61235",
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    assert.ok(container.textContent.includes("45.000đ"), "Initial plate should load fee preview 45.000đ");

    const workerBanner = container.querySelector('[data-testid="informational-banner"]')?.textContent || "";
    assert.ok(workerBanner.includes("thanh toán tại quầy thu ngân"), `Expected worker banner, got: ${workerBanner}`);

    // Clicking ✕ closes worker banner & resets workerInfoBannerActiveRef
    const closeBannerBtn = container
      .querySelector('[data-testid="informational-banner"]')
      ?.querySelector("button");
    assert.ok(closeBannerBtn, "Close button on informational-banner must exist");
    await act(async () => {
      closeBannerBtn.click();
      await Promise.resolve();
    });
    assert.equal(container.querySelector('[data-testid="informational-banner"]'), null, "Banner must close on ✕ click");

    // Re-trigger worker banner via a new event, then trigger non-worker 409 banner
    exitAutoEvent = {
      action: "GATE_AUTO_PAYMENT_REQUIRED",
      reason: "FEE_PAYMENT_REQUIRED",
      license_plate_masked: "30A***35",
      occurred_at: "2026-11-22T10:16:00Z",
    };
    await clock.advanceMs(act, 3500);
    assert.ok(
      (container.querySelector('[data-testid="informational-banner"]')?.textContent || "").includes(
        "thanh toán tại quầy thu ngân"
      )
    );

    const exitBtn = container
      .querySelectorAll("button")
      .find((b) => b.textContent.includes("Mở Barrier") && !b.textContent.includes("Xe Vào"));
    assert.ok(exitBtn, "Exit confirm button must exist");
    await act(async () => {
      exitBtn.click();
      for (let i = 0; i < 8; i += 1) {
        await Promise.resolve();
      }
    });

    const banner409 = container.querySelector('[data-testid="informational-banner"]')?.textContent || "";
    assert.ok(banner409.includes("409 Conflict"), `Expected 409 banner, got: ${banner409}`);

    // Now server goes null -> poll must NOT wipe the non-worker 409 banner (Minor 1)
    exitAutoEvent = null;
    await clock.advanceMs(act, 3500);
    const banner409AfterPoll = container.querySelector('[data-testid="informational-banner"]')?.textContent || "";
    assert.ok(
      banner409AfterPoll.includes("409 Conflict"),
      `[Minor 1] Non-worker 409 banner must NOT be wiped by null worker poll, got: ${banner409AfterPoll}`
    );

    // Minor 3: Same-tick flushSync close/reopen without initialPlate must clear backendFeePreview & matching state
    await act(async () => {
      flushSync(() => {
        root.render(
          React.createElement(GateCameraControlModal, {
            isOpen: false,
            onClose: () => {},
            initialLane: "exit",
            gateId: 3,
            initialPlate: "",
          })
        );
      });
      flushSync(() => {
        root.render(
          React.createElement(GateCameraControlModal, {
            isOpen: true,
            onClose: () => {},
            initialLane: "exit",
            gateId: 3,
            initialPlate: "",
          })
        );
      });
      for (let i = 0; i < 6; i += 1) {
        await Promise.resolve();
      }
    });

    assert.equal(
      container.textContent.includes("45.000đ"),
      false,
      "[Minor 3] Same-tick reopen without initialPlate must clear stale backendFeePreview"
    );
    assert.equal(
      container.textContent.includes("30A-612.35"),
      false,
      "[Minor 3] Same-tick reopen without initialPlate must clear stale matched vehicle/plate"
    );
  } finally {
    await act(async () => {
      root.unmount();
    });
    clock.restore();
    axiosInstance.request = originalRequest;
    dom.restore();
  }
});

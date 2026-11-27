import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_ROOT = path.resolve(__dirname, "../src");

function installMinimalDom() {
  const keys = [
    "window",
    "document",
    "HTMLElement",
    "Element",
    "Node",
    "Text",
    "Comment",
    "Event",
    "CustomEvent",
    "IS_REACT_ACT_ENVIRONMENT",
  ];
  const saved = Object.fromEntries(keys.map((k) => [k, globalThis[k]]));

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
    dispatchEvent() {
      return true;
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
      this.className = "";
    }
    setAttribute(k, v) {
      this.attributes.set(k, String(v));
      if (k === "class") this.className = String(v);
    }
    getAttribute(k) {
      if (k === "class") return this.className || null;
      return this.attributes.has(k) ? this.attributes.get(k) : null;
    }
    removeAttribute(k) {
      this.attributes.delete(k);
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
  doc.body = new ShimElement("body");
  doc.body.ownerDocument = doc;
  doc.activeElement = doc.body;
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

  const win = {
    document: doc,
    HTMLIFrameElement: ShimElement,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  doc.defaultView = win;
  globalThis.window = win;
  globalThis.document = doc;
  globalThis.HTMLElement = ShimElement;
  globalThis.Element = ShimElement;
  globalThis.Node = ShimNode;
  globalThis.Text = ShimText;
  globalThis.Comment = ShimComment;
  globalThis.Event = class Event {
    constructor(type) {
      this.type = type;
    }
  };
  globalThis.CustomEvent = class CustomEvent extends globalThis.Event {};
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  return {
    doc,
    restore() {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete globalThis[k];
        else globalThis[k] = v;
      }
    },
  };
}

let _hookBundleCache = null;
async function loadHookBundle() {
  if (_hookBundleCache) return _hookBundleCache;
  const [{ default: esbuild }, { default: babel }] = await Promise.all([
    import("esbuild"),
    import("@babel/core"),
  ]);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "use-ticket-data-"));
  try {
    const entryPath = path.join(tmpDir, "entry.js");
    const outPath = path.join(tmpDir, "bundle.mjs");
    const hookSrc = path.resolve(SRC_ROOT, "hooks/useTicketData.js");
    const apiSrc = path.resolve(SRC_ROOT, "services/apiClient.js");

    fs.writeFileSync(
      entryPath,
      `
      export { default as useTicketData } from ${JSON.stringify(hookSrc)};
      export { axiosInstance } from ${JSON.stringify(apiSrc)};
      `,
      "utf-8"
    );

    const bareExternals = new Set(["react", "react/compiler-runtime", "react-dom/client", "axios"]);

    await esbuild.build({
      entryPoints: [entryPath],
      outfile: outPath,
      bundle: true,
      format: "esm",
      platform: "node",
      plugins: [
        {
          name: "externalize-node-modules",
          setup(build) {
            build.onResolve({ filter: /^[^./]/ }, (args) => {
              if (bareExternals.has(args.path)) {
                return { path: import.meta.resolve(args.path), external: true };
              }
              return undefined;
            });
            build.onLoad({ filter: /\.jsx?$/ }, async (args) => {
              const source = await fs.promises.readFile(args.path, "utf8");
              if (!args.path.endsWith(".jsx")) return { contents: source, loader: "js" };
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
    _hookBundleCache = {
      ...mod,
      cleanup() {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      },
    };
    return _hookBundleCache;
  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }
}

test.after(() => {
  if (_hookBundleCache) {
    _hookBundleCache.cleanup();
    _hookBundleCache = null;
  }
});

test("L5-USE-TICKET-DATA-01: loads tickets cleanly and handles getTickets + getTicketTypes rejections without unhandledRejection", async () => {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { useTicketData, axiosInstance } = await loadHookBundle();

  const dom = installMinimalDom();
  const originalRequest = axiosInstance.request;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  console.error = () => {};
  console.warn = () => {};

  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on("unhandledRejection", onUnhandled);

  let mode = "ok";
  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (mode === "reject_both") {
      if (url.includes("/api/v1/tickets/types/")) {
        throw new Error("Ticket types unavailable");
      }
      const err = new Error("Internal Server Error");
      err.data = { message: "Không thể tải danh sách vé từ máy chủ." };
      throw err;
    }
    if (url.includes("/api/v1/tickets/types/")) {
      return { data: [{ id: 1, code: "MONTHLY", name: "Vé tháng" }] };
    }
    return {
      data: {
        count: 1,
        results: [
          {
            id: 10,
            code: "VT0010",
            customer_name: "Khách Test",
            license_plate: "51A-897.14",
            price: "500000.00",
            status: "ACTIVE",
          },
        ],
      },
    };
  };

  function Harness() {
    const state = useTicketData();
    return React.createElement(
      "div",
      null,
      React.createElement("span", { "data-testid": "count" }, String(state.totalCount)),
      React.createElement("span", { "data-testid": "types" }, String(state.ticketTypes.length)),
      React.createElement("span", { "data-testid": "loading" }, String(state.isLoading)),
      React.createElement("span", { "data-testid": "error" }, state.error || "")
    );
  }

  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  let root = createRoot(container);

  try {
    // 1. Success path
    await act(async () => {
      root.render(React.createElement(Harness));
      await new Promise((r) => setTimeout(r, 20));
    });
    assert.equal(container.querySelector('[data-testid="count"]').textContent, "1");
    assert.equal(container.querySelector('[data-testid="types"]').textContent, "1");
    assert.equal(container.querySelector('[data-testid="loading"]').textContent, "false");
    assert.equal(container.querySelector('[data-testid="error"]').textContent, "");

    await act(async () => {
      root.unmount();
    });

    // 2. Rejection path (both getTickets and getTicketTypes reject)
    mode = "reject_both";
    root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(Harness));
      await new Promise((r) => setTimeout(r, 20));
    });
    assert.equal(container.querySelector('[data-testid="count"]').textContent, "0");
    assert.equal(container.querySelector('[data-testid="types"]').textContent, "0");
    assert.equal(container.querySelector('[data-testid="loading"]').textContent, "false");
    assert.equal(
      container.querySelector('[data-testid="error"]').textContent,
      "Không thể tải danh sách vé từ máy chủ."
    );
    assert.equal(unhandled.length, 0, "Expected zero unhandledRejection events");
  } finally {
    await act(async () => {
      root.unmount();
    });
    process.off("unhandledRejection", onUnhandled);
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    axiosInstance.request = originalRequest;
    dom.restore();
  }
});

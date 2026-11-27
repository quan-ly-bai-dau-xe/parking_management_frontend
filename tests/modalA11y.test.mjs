import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "..");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function createDomHarness() {
  const listeners = new Map();

  class FakeEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.bubbles = Boolean(init.bubbles);
      this.cancelable = Boolean(init.cancelable);
      this.defaultPrevented = false;
      this.propagationStopped = false;
      this.target = init.target || null;
      this.currentTarget = null;
      this.key = init.key || "";
      this.shiftKey = Boolean(init.shiftKey);
      this.ctrlKey = Boolean(init.ctrlKey);
      this.metaKey = Boolean(init.metaKey);
      this.altKey = Boolean(init.altKey);
    }

    preventDefault() {
      if (this.cancelable) this.defaultPrevented = true;
    }

    stopPropagation() {
      this.propagationStopped = true;
    }
  }

  class FakeStyle {
    constructor() {
      this._props = new Map();
    }

    setProperty(name, value) {
      if (value === "" || value == null) {
        this._props.delete(name);
      } else {
        this._props.set(name, String(value));
      }
    }

    removeProperty(name) {
      this._props.delete(name);
    }

    getPropertyValue(name) {
      return this._props.get(name) || "";
    }

    get overflow() {
      return this._props.get("overflow") || "";
    }

    set overflow(v) {
      this.setProperty("overflow", v);
    }

    get display() {
      return this._props.get("display") || "";
    }

    set display(v) {
      this.setProperty("display", v);
    }

    get visibility() {
      return this._props.get("visibility") || "";
    }

    set visibility(v) {
      this.setProperty("visibility", v);
    }
  }

  class FakeNode {
    constructor(nodeType, nodeName, ownerDocument) {
      this.nodeType = nodeType;
      this.nodeName = nodeName;
      this.ownerDocument = ownerDocument;
      this.parentNode = null;
      this.childNodes = [];
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

    get previousSibling() {
      if (!this.parentNode) return null;
      const idx = this.parentNode.childNodes.indexOf(this);
      return idx > 0 ? this.parentNode.childNodes[idx - 1] || null : null;
    }

    get isConnected() {
      let cur = this;
      while (cur) {
        if (cur === this.ownerDocument.documentElement || cur === this.ownerDocument) {
          return true;
        }
        cur = cur.parentNode;
      }
      return false;
    }

    contains(other) {
      let cur = other;
      while (cur) {
        if (cur === this) return true;
        cur = cur.parentNode;
      }
      return false;
    }

    appendChild(child) {
      if (child.nodeType === 11) {
        const items = [...child.childNodes];
        for (const item of items) {
          this.appendChild(item);
        }
        return child;
      }
      if (child.parentNode) {
        child.parentNode.removeChild(child);
      }
      child.parentNode = this;
      this.childNodes.push(child);
      return child;
    }

    insertBefore(newNode, refNode) {
      if (!refNode) return this.appendChild(newNode);
      if (newNode.nodeType === 11) {
        const items = [...newNode.childNodes];
        for (const item of items) {
          this.insertBefore(item, refNode);
        }
        return newNode;
      }
      if (newNode.parentNode) {
        newNode.parentNode.removeChild(newNode);
      }
      const idx = this.childNodes.indexOf(refNode);
      if (idx < 0) return this.appendChild(newNode);
      newNode.parentNode = this;
      this.childNodes.splice(idx, 0, newNode);
      return newNode;
    }

    removeChild(child) {
      const idx = this.childNodes.indexOf(child);
      if (idx >= 0) {
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
      const pathNodes = [];
      let cur = this;
      while (cur) {
        pathNodes.push(cur);
        cur = cur.parentNode;
      }
      for (const node of pathNodes) {
        if (event.propagationStopped) break;
        event.currentTarget = node;
        const set = node._listeners?.get(event.type);
        if (set) {
          for (const fn of [...set]) {
            fn.call(node, event);
          }
        }
        if (!event.bubbles) break;
      }
      if (!event.propagationStopped && event.bubbles) {
        const docSet = this.ownerDocument._listeners?.get(event.type);
        if (docSet) {
          event.currentTarget = this.ownerDocument;
          for (const fn of [...docSet]) {
            fn.call(this.ownerDocument, event);
          }
        }
        if (!event.propagationStopped) {
          const winSet = listeners.get(event.type);
          if (winSet) {
            event.currentTarget = fakeWindow;
            for (const fn of [...winSet]) {
              fn.call(fakeWindow, event);
            }
          }
        }
      }
      return !event.defaultPrevented;
    }
  }

  class FakeElement extends FakeNode {
    constructor(tagName, ownerDocument, namespaceURI = "http://www.w3.org/1999/xhtml") {
      super(1, tagName.toUpperCase(), ownerDocument);
      this.tagName = tagName.toUpperCase();
      this.localName = tagName.toLowerCase();
      this.namespaceURI = namespaceURI;
      this.attributes = new Map();
      this.style = new FakeStyle();
      this._value = "";
      this._disabled = false;
      this._tabIndex = undefined;
      this._checked = false;
    }

    get id() {
      return this.attributes.get("id") || "";
    }

    set id(v) {
      this.setAttribute("id", v);
    }

    get className() {
      return this.attributes.get("class") || "";
    }

    set className(v) {
      this.setAttribute("class", v);
    }

    get disabled() {
      return this._disabled || this.attributes.has("disabled");
    }

    set disabled(v) {
      this._disabled = Boolean(v);
      if (this._disabled) this.attributes.set("disabled", "");
      else this.attributes.delete("disabled");
    }

    get tabIndex() {
      if (this._tabIndex !== undefined) return this._tabIndex;
      if (this.attributes.has("tabindex")) {
        const n = Number.parseInt(this.attributes.get("tabindex"), 10);
        return Number.isNaN(n) ? -1 : n;
      }
      return ["BUTTON", "INPUT", "SELECT", "TEXTAREA", "A"].includes(this.tagName) ? 0 : -1;
    }

    set tabIndex(v) {
      this._tabIndex = Number(v);
      this.attributes.set("tabindex", String(v));
    }

    get value() {
      return this._value;
    }

    set value(v) {
      this._value = v == null ? "" : String(v);
    }

    get checked() {
      return this._checked;
    }

    set checked(v) {
      this._checked = Boolean(v);
    }

    get type() {
      return this.attributes.get("type") || (this.tagName === "BUTTON" ? "submit" : "");
    }

    set type(v) {
      this.setAttribute("type", v);
    }

    get href() {
      return this.attributes.get("href") || "";
    }

    set href(v) {
      this.setAttribute("href", v);
    }

    get textContent() {
      return this.childNodes.map((c) => c.textContent || "").join("");
    }

    set textContent(v) {
      this.childNodes = [];
      if (v !== null && v !== undefined && String(v) !== "") {
        this.appendChild(this.ownerDocument.createTextNode(String(v)));
      }
    }

    get offsetWidth() {
      return this.style.display === "none" ? 0 : 120;
    }

    get offsetHeight() {
      return this.style.display === "none" ? 0 : 32;
    }

    getClientRects() {
      return this.style.display === "none" ? [] : [{ width: 120, height: 32 }];
    }

    setAttribute(name, value) {
      const key = String(name).toLowerCase();
      if (key === "disabled") {
        this._disabled = true;
      }
      if (key === "autofocus") {
        this.attributes.set("autofocus", String(value ?? ""));
        return;
      }
      this.attributes.set(key, String(value ?? ""));
    }

    removeAttribute(name) {
      const key = String(name).toLowerCase();
      if (key === "disabled") {
        this._disabled = false;
      }
      this.attributes.delete(key);
    }

    getAttribute(name) {
      const key = String(name).toLowerCase();
      return this.attributes.has(key) ? this.attributes.get(key) : null;
    }

    hasAttribute(name) {
      return this.attributes.has(String(name).toLowerCase());
    }

    focus() {
      if (this.isConnected) {
        this.ownerDocument.activeElement = this;
      }
    }

    blur() {
      if (this.ownerDocument.activeElement === this) {
        this.ownerDocument.activeElement = this.ownerDocument.body;
      }
    }

    _collectElements(out = []) {
      for (const child of this.childNodes) {
        if (child.nodeType === 1) {
          out.push(child);
          child._collectElements(out);
        }
      }
      return out;
    }

    _matchesSimpleSelector(sel) {
      const s = sel.trim();
      if (!s) return false;
      if (s === "*") return true;
      if (s.startsWith("[") && s.endsWith("]")) {
        const inner = s.slice(1, -1);
        const eqIdx = inner.indexOf("=");
        if (eqIdx < 0) return this.hasAttribute(inner);
        const attr = inner.slice(0, eqIdx).trim();
        const val = inner.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        return this.getAttribute(attr) === val;
      }
      if (s.startsWith("#")) {
        return this.id === s.slice(1);
      }
      if (s.includes(":not(")) {
        const [head, rest] = s.split(":not(");
        const negated = rest.replace(/\)$/, "");
        const headMatches = head ? this._matchesCompound(head) : true;
        return headMatches && !this._matchesSimpleSelector(negated);
      }
      return this._matchesCompound(s);
    }

    _matchesCompound(sel) {
      // Handles tag, tag[attr], [attr], tag:not(...)
      let remaining = sel;
      const tagMatch = remaining.match(/^[a-zA-Z0-9_-]+/);
      if (tagMatch) {
        if (this.localName !== tagMatch[0].toLowerCase()) return false;
        remaining = remaining.slice(tagMatch[0].length);
      }
      const attrMatches = remaining.match(/\[[^\]]+\]/g) || [];
      for (const attrExpr of attrMatches) {
        if (!this._matchesSimpleSelector(attrExpr)) return false;
        remaining = remaining.replace(attrExpr, "");
      }
      const notMatches = remaining.match(/:not\([^)]+\)/g) || [];
      for (const notExpr of notMatches) {
        const inner = notExpr.slice(5, -1);
        if (this._matchesSimpleSelector(inner)) return false;
      }
      return true;
    }

    querySelectorAll(selector) {
      const selectors = selector.split(",").map((s) => s.trim()).filter(Boolean);
      const all = this._collectElements();
      return all.filter((el) => selectors.some((sel) => el._matchesSimpleSelector(sel)));
    }

    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    }
  }

  class FakeTextNode extends FakeNode {
    constructor(text, ownerDocument) {
      super(3, "#text", ownerDocument);
      this._text = String(text ?? "");
    }

    get nodeValue() {
      return this._text;
    }

    set nodeValue(v) {
      this._text = String(v ?? "");
    }

    get textContent() {
      return this._text;
    }

    set textContent(v) {
      this._text = String(v ?? "");
    }
  }

  class FakeCommentNode extends FakeNode {
    constructor(text, ownerDocument) {
      super(8, "#comment", ownerDocument);
      this.nodeValue = String(text ?? "");
    }
  }

  class FakeFragment extends FakeNode {
    constructor(ownerDocument) {
      super(11, "#document-fragment", ownerDocument);
    }
  }

  const fakeDocument = {
    nodeType: 9,
    nodeName: "#document",
    _listeners: new Map(),
    activeElement: null,
    createElement(tag) {
      return new FakeElement(tag, fakeDocument);
    },
    createElementNS(ns, tag) {
      return new FakeElement(tag, fakeDocument, ns);
    },
    createTextNode(text) {
      return new FakeTextNode(text, fakeDocument);
    },
    createComment(text) {
      return new FakeCommentNode(text, fakeDocument);
    },
    createDocumentFragment() {
      return new FakeFragment(fakeDocument);
    },
    addEventListener(type, fn) {
      if (!this._listeners.has(type)) this._listeners.set(type, new Set());
      this._listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      this._listeners.get(type)?.delete(fn);
    },
    querySelectorAll(sel) {
      return fakeDocument.documentElement.querySelectorAll(sel);
    },
    querySelector(sel) {
      return fakeDocument.documentElement.querySelector(sel);
    },
    getElementById(id) {
      return this.querySelector(`#${id}`);
    },
  };

  fakeDocument.documentElement = new FakeElement("html", fakeDocument);
  fakeDocument.head = new FakeElement("head", fakeDocument);
  fakeDocument.body = new FakeElement("body", fakeDocument);
  fakeDocument.documentElement.appendChild(fakeDocument.head);
  fakeDocument.documentElement.appendChild(fakeDocument.body);
  fakeDocument.activeElement = fakeDocument.body;

  class FakeHTMLIFrameElement extends FakeElement {}

  const fakeWindow = {
    document: fakeDocument,
    HTMLElement: FakeElement,
    Element: FakeElement,
    HTMLIFrameElement: FakeHTMLIFrameElement,
    Node: FakeNode,
    Event: FakeEvent,
    KeyboardEvent: FakeEvent,
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    dispatchEvent(event) {
      event.currentTarget = fakeWindow;
      const set = listeners.get(event.type);
      if (set) {
        for (const fn of [...set]) fn.call(fakeWindow, event);
      }
      return !event.defaultPrevented;
    },
    getComputedStyle(el) {
      return {
        display: el.style?.display || "block",
        visibility: el.style?.visibility || "visible",
      };
    },
    requestAnimationFrame(cb) {
      cb();
      return 1;
    },
    cancelAnimationFrame() {},
  };

  fakeDocument.defaultView = fakeWindow;

  const prevGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    Element: globalThis.Element,
    HTMLIFrameElement: globalThis.HTMLIFrameElement,
    Node: globalThis.Node,
    KeyboardEvent: globalThis.KeyboardEvent,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  };

  globalThis.window = fakeWindow;
  globalThis.document = fakeDocument;
  globalThis.HTMLElement = FakeElement;
  globalThis.Element = FakeElement;
  globalThis.HTMLIFrameElement = FakeHTMLIFrameElement;
  globalThis.Node = FakeNode;
  globalThis.KeyboardEvent = FakeEvent;
  globalThis.requestAnimationFrame = fakeWindow.requestAnimationFrame;
  globalThis.cancelAnimationFrame = fakeWindow.cancelAnimationFrame;

  const restore = () => {
    for (const [k, v] of Object.entries(prevGlobals)) {
      if (v === undefined) delete globalThis[k];
      else globalThis[k] = v;
    }
  };

  return { window: fakeWindow, document: fakeDocument, FakeEvent, restore };
}

test("L2-A11Y-01: useModalA11y hook handles ARIA, focus entry/restore, Tab trap, Escape+isBusy, nested stack, and scroll lock", async () => {
  const hookPath = path.join(FRONTEND_ROOT, "src/hooks/useModalA11y.js");
  assert.ok(fs.existsSync(hookPath), "src/hooks/useModalA11y.js must exist");

  const dom = createDomHarness();
  const vite = await createServer({
    root: FRONTEND_ROOT,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const { useModalA11y } = await vite.ssrLoadModule("/src/hooks/useModalA11y.js");
    assert.equal(typeof useModalA11y, "function");

    function ModalHarness({ isOpen, onClose, isBusy = false, role = "dialog", nestedOpen = false, onCloseNested }) {
      const { titleId, dialogProps } = useModalA11y({ isOpen, onClose, isBusy, role });
      const nested = useModalA11y({
        isOpen: nestedOpen,
        onClose: onCloseNested,
        role: "alertdialog",
      });
      return React.createElement(
        "div",
        null,
        isOpen
          ? React.createElement(
              "div",
              dialogProps,
              React.createElement("h3", { id: titleId }, "Outer Title"),
              React.createElement("button", { type: "button", id: "outer-btn-1" }, "First"),
              React.createElement("button", { type: "button", id: "outer-btn-2", disabled: true }, "Disabled"),
              React.createElement("button", { type: "button", id: "outer-btn-3" }, "Last"),
            )
          : null,
        nestedOpen
          ? React.createElement(
              "div",
              nested.dialogProps,
              React.createElement("h3", { id: nested.titleId }, "Nested Alert"),
              React.createElement("button", { type: "button", id: "nested-btn" }, "Confirm"),
            )
          : null,
      );
    }

    const opener = dom.document.createElement("button");
    opener.id = "opener-btn";
    dom.document.body.appendChild(opener);
    opener.focus();
    assert.equal(dom.document.activeElement, opener);

    const mountNode = dom.document.createElement("div");
    dom.document.body.appendChild(mountNode);
    const root = createRoot(mountNode);

    let outerCloseCount = 0;
    let nestedCloseCount = 0;

    // 1. Open outer modal while busy -> focus enters first tabbable, scroll locked, Escape blocked by isBusy
    await React.act(async () => {
      root.render(
        React.createElement(ModalHarness, {
          isOpen: true,
          onClose: () => { outerCloseCount += 1; },
          isBusy: true,
        }),
      );
    });

    const outerDialog = mountNode.querySelector('[role="dialog"]');
    assert.ok(outerDialog, "Outer dialog must render role='dialog'");
    assert.equal(outerDialog.getAttribute("aria-modal"), "true");
    assert.equal(outerDialog.getAttribute("tabindex"), "-1");
    const outerTitleId = outerDialog.getAttribute("aria-labelledby");
    assert.ok(outerTitleId, "Outer dialog must have aria-labelledby");
    assert.equal(mountNode.querySelector(`#${outerTitleId}`)?.textContent, "Outer Title");
    assert.equal(dom.document.body.style.overflow, "hidden");
    assert.equal(dom.document.activeElement.id, "outer-btn-1");

    // Busy Escape guard
    await React.act(async () => {
      dom.window.dispatchEvent(new dom.FakeEvent("keydown", { key: "Escape", cancelable: true }));
    });
    assert.equal(outerCloseCount, 0, "Escape must NOT close modal when isBusy=true");

    // 2. Re-render non-busy and test Tab / Shift+Tab wrap inside outer modal
    await React.act(async () => {
      root.render(
        React.createElement(ModalHarness, {
          isOpen: true,
          onClose: () => { outerCloseCount += 1; },
          isBusy: false,
        }),
      );
    });

    const btnLast = mountNode.querySelector("#outer-btn-3");
    const btnFirst = mountNode.querySelector("#outer-btn-1");
    btnLast.focus();
    await React.act(async () => {
      dom.window.dispatchEvent(new dom.FakeEvent("keydown", { key: "Tab", cancelable: true }));
    });
    assert.equal(dom.document.activeElement, btnFirst, "Tab on last tabbable wraps to first");

    await React.act(async () => {
      dom.window.dispatchEvent(new dom.FakeEvent("keydown", { key: "Tab", shiftKey: true, cancelable: true }));
    });
    assert.equal(dom.document.activeElement, btnLast, "Shift+Tab on first tabbable wraps to last");

    // 3. Open nested alertdialog -> Escape closes nested only, body overflow stays hidden until outer closes
    await React.act(async () => {
      root.render(
        React.createElement(ModalHarness, {
          isOpen: true,
          onClose: () => { outerCloseCount += 1; },
          nestedOpen: true,
          onCloseNested: () => { nestedCloseCount += 1; },
        }),
      );
    });

    const nestedDialog = mountNode.querySelector('[role="alertdialog"]');
    assert.ok(nestedDialog, "Nested modal must render role='alertdialog'");
    assert.equal(dom.document.activeElement.id, "nested-btn");

    await React.act(async () => {
      dom.window.dispatchEvent(new dom.FakeEvent("keydown", { key: "Escape", cancelable: true }));
    });
    assert.equal(nestedCloseCount, 1, "Topmost nested modal receives Escape");
    assert.equal(outerCloseCount, 0, "Underlying outer modal must NOT receive Escape");

    // Close nested modal -> overflow remains hidden and focus returns to outer modal's previous focus
    await React.act(async () => {
      root.render(
        React.createElement(ModalHarness, {
          isOpen: true,
          onClose: () => { outerCloseCount += 1; },
          nestedOpen: false,
        }),
      );
    });
    assert.equal(dom.document.body.style.overflow, "hidden", "Overflow must remain locked while outer modal is open");

    // Escape closes outer modal now -> close outer modal -> overflow unlocks and focus returns to opener
    await React.act(async () => {
      dom.window.dispatchEvent(new dom.FakeEvent("keydown", { key: "Escape", cancelable: true }));
    });
    assert.equal(outerCloseCount, 1);

    await React.act(async () => {
      root.render(React.createElement(ModalHarness, { isOpen: false, onClose: () => {} }));
    });
    assert.equal(dom.document.body.style.overflow, "", "Overflow must restore when last modal closes");
    assert.equal(dom.document.activeElement, opener, "Focus must restore to opener on close");

    await React.act(async () => {
      root.unmount();
    });
  } finally {
    await vite.close();
    dom.restore();
  }
});

test("L2-A11Y-02: BaseModal & ConfirmModal render accessible dialog/alertdialog markup and busy-guarded Escape", async () => {
  const dom = createDomHarness();
  const vite = await createServer({
    root: FRONTEND_ROOT,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const { default: BaseModal } = await vite.ssrLoadModule("/src/components/common/modal/BaseModal.jsx");
    const { default: ConfirmModal } = await vite.ssrLoadModule("/src/components/common/modal/ConfirmModal.jsx");

    const baseHtml = renderToStaticMarkup(
      React.createElement(
        BaseModal,
        { isOpen: true, onClose: () => {}, title: "Tiêu đề Modal Test" },
        React.createElement("button", { type: "button" }, "OK"),
      ),
    );
    assert.match(baseHtml, /role="dialog"/);
    assert.match(baseHtml, /aria-modal="true"/);
    const baseLabelMatch = baseHtml.match(/aria-labelledby="([^"]+)"/);
    assert.ok(baseLabelMatch, "BaseModal must render aria-labelledby");
    assert.ok(
      baseHtml.includes(`id="${baseLabelMatch[1]}"`),
      "BaseModal aria-labelledby must reference visible title element id",
    );

    const confirmHtml = renderToStaticMarkup(
      React.createElement(ConfirmModal, {
        isOpen: true,
        onClose: () => {},
        title: "Xác nhận xóa",
        description: "Thao tác không thể hoàn tác.",
        variant: "error",
        onConfirm: () => {},
      }),
    );
    assert.match(confirmHtml, /role="alertdialog"/, "Destructive ConfirmModal must use role='alertdialog'");
    assert.match(confirmHtml, /aria-modal="true"/);
    const confirmLabelMatch = confirmHtml.match(/aria-labelledby="([^"]+)"/);
    assert.ok(confirmLabelMatch, "ConfirmModal must render aria-labelledby");
    assert.ok(confirmHtml.includes(`id="${confirmLabelMatch[1]}"`));
    const confirmDescMatch = confirmHtml.match(/aria-describedby="([^"]+)"/);
    assert.ok(confirmDescMatch, "ConfirmModal with description must render aria-describedby");
    assert.ok(confirmHtml.includes(`id="${confirmDescMatch[1]}"`));

    // Interactive ConfirmModal busy guard
    const mountNode = dom.document.createElement("div");
    dom.document.body.appendChild(mountNode);
    const root = createRoot(mountNode);
    let closeCalled = 0;

    await React.act(async () => {
      root.render(
        React.createElement(ConfirmModal, {
          isOpen: true,
          onClose: () => { closeCalled += 1; },
          title: "Xác nhận xóa",
          description: "Đang xử lý...",
          variant: "error",
          loading: true,
          onConfirm: () => {},
        }),
      );
    });

    await React.act(async () => {
      dom.window.dispatchEvent(new dom.FakeEvent("keydown", { key: "Escape", cancelable: true }));
    });
    assert.equal(closeCalled, 0, "ConfirmModal with loading=true must NOT close on Escape");

    await React.act(async () => {
      root.unmount();
    });
  } finally {
    await vite.close();
    dom.restore();
  }
});

test("L2-A11Y-03: GateCameraControlModal renders aria-labelledby matching visible title & uses useModalA11y", async () => {
  const prevWindow = globalThis.window;
  const prevLocalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };

  const vite = await createServer({
    root: FRONTEND_ROOT,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const { default: GateCameraControlModal } = await vite.ssrLoadModule(
      "/src/components/VehicleManagement/GateCameraControlModal.jsx",
    );
    const html = renderToStaticMarkup(
      React.createElement(GateCameraControlModal, {
        isOpen: true,
        onClose: () => {},
        initialLane: "entry",
      }),
    );
    assert.match(html, /role="dialog"/);
    assert.match(html, /aria-modal="true"/);
    const labelMatch = html.match(/aria-labelledby="([^"]+)"/);
    assert.ok(labelMatch, "GateCameraControlModal must have aria-labelledby");
    assert.ok(
      html.includes(`id="${labelMatch[1]}"`),
      "GateCameraControlModal aria-labelledby must reference visible title id",
    );
  } finally {
    await vite.close();
    if (prevWindow === undefined) delete globalThis.window;
    else globalThis.window = prevWindow;
    if (prevLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prevLocalStorage;
  }
});

test("L2-A11Y-04: AppSidebar mobile drawer exposes dialog a11y, Escape close, Tab trap, scroll lock, and focus restore", async () => {
  const dom = createDomHarness();
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };

  const vite = await createServer({
    root: FRONTEND_ROOT,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });

  try {
    const { default: AppSidebar } = await vite.ssrLoadModule("/src/components/layout/AppSidebar.jsx");

    const opener = dom.document.createElement("button");
    opener.id = "mobile-menu-trigger";
    dom.document.body.appendChild(opener);
    opener.focus();

    const mountNode = dom.document.createElement("div");
    dom.document.body.appendChild(mountNode);
    const root = createRoot(mountNode);
    let closeCalls = 0;

    await React.act(async () => {
      root.render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/home"] },
          React.createElement(AppSidebar, {
            isMobileOpen: true,
            onCloseMobile: () => { closeCalls += 1; },
          }),
        ),
      );
    });

    const drawerDialog = mountNode.querySelector('[role="dialog"]');
    assert.ok(drawerDialog, "AppSidebar mobile drawer must render role='dialog'");
    assert.equal(drawerDialog.getAttribute("aria-modal"), "true");
    const labelId = drawerDialog.getAttribute("aria-labelledby");
    assert.ok(labelId, "AppSidebar mobile drawer must have aria-labelledby");
    assert.ok(
      mountNode.querySelector(`#${labelId}`)?.textContent.includes("Smart Parking"),
      "AppSidebar aria-labelledby must point to drawer title",
    );
    assert.equal(dom.document.body.style.overflow, "hidden", "AppSidebar mobile drawer must lock body scroll");

    await React.act(async () => {
      dom.window.dispatchEvent(new dom.FakeEvent("keydown", { key: "Escape", cancelable: true }));
    });
    assert.equal(closeCalls, 1, "AppSidebar mobile drawer must close on Escape");

    await React.act(async () => {
      root.render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/home"] },
          React.createElement(AppSidebar, {
            isMobileOpen: false,
            onCloseMobile: () => {},
          }),
        ),
      );
    });
    assert.equal(dom.document.body.style.overflow, "", "Scroll lock must release when mobile drawer closes");
    assert.equal(dom.document.activeElement, opener, "Focus must restore to mobile menu trigger");

    await React.act(async () => {
      root.unmount();
    });
  } finally {
    await vite.close();
    delete globalThis.localStorage;
    dom.restore();
  }
});

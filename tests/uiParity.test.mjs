import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(REPO_ROOT, "src");
const BASELINE_PATH = path.join(__dirname, "fixtures", "ui-parity-baseline.json");
const ALLOWLIST_PATH = path.join(__dirname, "fixtures", "ui-parity-allowlist.json");

const require = createRequire(path.join(REPO_ROOT, "package.json"));
const babelParser = require("@babel/parser");

function normalizeWs(str) {
  return String(str).replace(/\s+/g, " ").trim();
}

function walkAst(node, visitor) {
  if (!node || typeof node !== "object") return;
  visitor(node);
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "start" || key === "end" || key === "extra") continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item.type === "string") {
          walkAst(item, visitor);
        }
      }
    } else if (child && typeof child.type === "string") {
      walkAst(child, visitor);
    }
  }
}

function walkExprStrings(expr, out, options = { allowObjectKeys: true }) {
  if (!expr || typeof expr !== "object") return;
  switch (expr.type) {
    case "StringLiteral": {
      const val = normalizeWs(expr.value);
      if (val) out.push(val);
      break;
    }
    case "TemplateLiteral": {
      for (const q of expr.quasis || []) {
        const val = normalizeWs(q.value?.cooked ?? q.value?.raw ?? "");
        if (val) out.push(val);
      }
      for (const sub of expr.expressions || []) {
        walkExprStrings(sub, out, options);
      }
      break;
    }
    case "ConditionalExpression": {
      walkExprStrings(expr.consequent, out, options);
      walkExprStrings(expr.alternate, out, options);
      break;
    }
    case "LogicalExpression": {
      if (expr.operator === "&&") {
        walkExprStrings(expr.right, out, options);
      } else {
        walkExprStrings(expr.left, out, options);
        walkExprStrings(expr.right, out, options);
      }
      break;
    }
    case "BinaryExpression": {
      if (expr.operator === "+") {
        walkExprStrings(expr.left, out, options);
        walkExprStrings(expr.right, out, options);
      }
      break;
    }
    case "ArrayExpression": {
      for (const el of expr.elements || []) {
        if (el) walkExprStrings(el, out, options);
      }
      break;
    }
    case "CallExpression": {
      const callee = expr.callee;
      const calleeName =
        callee?.type === "Identifier"
          ? callee.name
          : callee?.type === "MemberExpression" && callee.property?.type === "Identifier"
            ? callee.property.name
            : "";
      if (["cn", "clsx", "twMerge", "classNames", "cva"].includes(calleeName)) {
        for (const arg of expr.arguments || []) {
          walkExprStrings(arg, out, options);
        }
      } else if (calleeName === "join") {
        if (callee?.object) walkExprStrings(callee.object, out, options);
      }
      break;
    }
    case "ObjectExpression": {
      if (options.allowObjectKeys) {
        for (const prop of expr.properties || []) {
          if (prop.type === "ObjectProperty" && !prop.computed) {
            if (prop.key?.type === "Identifier" && prop.key.name) {
              out.push(normalizeWs(prop.key.name));
            } else if (prop.key?.type === "StringLiteral") {
              const val = normalizeWs(prop.key.value);
              if (val) out.push(val);
            }
          }
        }
      }
      break;
    }
    default:
      break;
  }
}

function walkTextExprStrings(expr, out) {
  if (!expr || typeof expr !== "object") return;
  switch (expr.type) {
    case "StringLiteral": {
      const val = normalizeWs(expr.value);
      if (val) out.push(val);
      break;
    }
    case "TemplateLiteral": {
      for (const q of expr.quasis || []) {
        const val = normalizeWs(q.value?.cooked ?? q.value?.raw ?? "");
        if (val) out.push(val);
      }
      for (const sub of expr.expressions || []) {
        walkTextExprStrings(sub, out);
      }
      break;
    }
    case "ConditionalExpression": {
      walkTextExprStrings(expr.consequent, out);
      walkTextExprStrings(expr.alternate, out);
      break;
    }
    case "LogicalExpression": {
      if (expr.operator === "&&") {
        walkTextExprStrings(expr.right, out);
      } else {
        walkTextExprStrings(expr.left, out);
        walkTextExprStrings(expr.right, out);
      }
      break;
    }
    case "BinaryExpression": {
      if (expr.operator === "+") {
        walkTextExprStrings(expr.left, out);
        walkTextExprStrings(expr.right, out);
      }
      break;
    }
    default:
      break;
  }
}

function walkHelperValueStrings(expr, out) {
  if (!expr || typeof expr !== "object") return;
  if (expr.type === "ObjectExpression") {
    for (const prop of expr.properties || []) {
      if (prop.type === "ObjectProperty") {
        walkHelperValueStrings(prop.value, out);
      }
    }
    return;
  }
  walkExprStrings(expr, out, { allowObjectKeys: false });
}

// Keep AST extraction logic identical to measure_ui_diff.mjs so parity checks match offline reports
function extractUiSignatures(code, filePath = "") {
  const ext = path.extname(filePath).toLowerCase();
  if (![".js", ".jsx", ".ts", ".tsx", ".mjs"].includes(ext)) {
    return {
      classStrings: [],
      styleStrings: [],
      jsxTexts: [],
      helperClassStrings: [],
      parseError: null,
    };
  }

  const plugins = ["jsx"];
  if (ext === ".ts" || ext === ".tsx") plugins.push("typescript");

  let ast;
  try {
    ast = babelParser.parse(code, {
      sourceType: "module",
      plugins,
      errorRecovery: false,
    });
  } catch (err) {
    return {
      classStrings: [],
      styleStrings: [],
      jsxTexts: [],
      helperClassStrings: [],
      parseError: err.message,
    };
  }

  const classStrings = [];
  const styleStrings = [];
  const jsxTexts = [];
  const helperClassStrings = [];
  let hasJsx = false;
  const helperNameRe = /(class|style|badge|variant|tone|theme|color|status|tab)/i;

  walkAst(ast.program, (node) => {
    if (node.type === "JSXElement" || node.type === "JSXFragment") {
      hasJsx = true;
    }

    if (node.type === "VariableDeclarator" && node.id?.type === "Identifier" && helperNameRe.test(node.id.name)) {
      if (node.init) {
        walkHelperValueStrings(node.init, helperClassStrings);
      }
    }

    if (node.type === "JSXAttribute") {
      const attrName = node.name?.name;
      if (attrName === "className" || attrName === "class") {
        if (node.value?.type === "StringLiteral") {
          const val = normalizeWs(node.value.value);
          if (val) classStrings.push(val);
        } else if (node.value?.type === "JSXExpressionContainer") {
          walkExprStrings(node.value.expression, classStrings, { allowObjectKeys: true });
        }
      } else if (attrName === "style" && node.value) {
        const raw = normalizeWs(code.slice(node.value.start, node.value.end));
        if (raw) styleStrings.push(raw);
      }
    }

    if (node.type === "JSXElement" || node.type === "JSXFragment") {
      for (const child of node.children || []) {
        if (child.type === "JSXText") {
          const val = normalizeWs(child.value);
          if (val) jsxTexts.push(val);
        } else if (child.type === "JSXExpressionContainer") {
          walkTextExprStrings(child.expression, jsxTexts);
        }
      }
    }
  });

  return {
    classStrings,
    styleStrings,
    jsxTexts,
    helperClassStrings: hasJsx ? helperClassStrings : [],
    parseError: null,
  };
}

function multisetDiff(baseArr, workArr) {
  const workCounts = new Map();
  for (const item of workArr) {
    workCounts.set(item, (workCounts.get(item) || 0) + 1);
  }
  const onlyInBaseline = [];
  for (const item of baseArr) {
    const cnt = workCounts.get(item) || 0;
    if (cnt > 0) {
      workCounts.set(item, cnt - 1);
    } else {
      onlyInBaseline.push(item);
    }
  }

  const baseCounts = new Map();
  for (const item of baseArr) {
    baseCounts.set(item, (baseCounts.get(item) || 0) + 1);
  }
  const onlyInWorking = [];
  for (const item of workArr) {
    const cnt = baseCounts.get(item) || 0;
    if (cnt > 0) {
      baseCounts.set(item, cnt - 1);
    } else {
      onlyInWorking.push(item);
    }
  }
  return { onlyInBaseline, onlyInWorking };
}

function findUnallowlistedItems(actualArr, allowedArr) {
  const allowedCounts = new Map();
  for (const item of allowedArr || []) {
    allowedCounts.set(item, (allowedCounts.get(item) || 0) + 1);
  }
  const unexpected = [];
  for (const item of actualArr || []) {
    const cnt = allowedCounts.get(item) || 0;
    if (cnt > 0) {
      allowedCounts.set(item, cnt - 1);
    } else {
      unexpected.push(item);
    }
  }
  return unexpected;
}

function walkSourceFiles(dir, relPrefix = "src") {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absPath = path.join(dir, entry.name);
    const relPath = `${relPrefix}/${entry.name}`;
    if (entry.isDirectory()) {
      results.push(...walkSourceFiles(absPath, relPath));
    } else if (/\.(js|jsx|ts|tsx|mjs)$/.test(entry.name)) {
      results.push(relPath);
    }
  }
  return results.sort();
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, "utf8"));

test("U4-PARITY-01: Tracked src/ files match origin/main AST signatures within justified allowlist", () => {
  const baselineEntries = Object.entries(baseline.files || {});
  assert.ok(baselineEntries.length >= 170, "Baseline fixture must contain all origin/main src/ files");

  const violations = [];
  for (const [relPath, baseSig] of baselineEntries) {
    const absPath = path.join(REPO_ROOT, relPath);
    assert.ok(fs.existsSync(absPath), `Missing baseline file in working tree: ${relPath}`);

    const code = fs.readFileSync(absPath, "utf8");
    const workSig = extractUiSignatures(code, relPath);
    assert.equal(workSig.parseError, null, `AST parse error in ${relPath}: ${workSig.parseError}`);

    const allowEntry = allowlist.files?.[relPath] || null;
    if (allowEntry) {
      assert.ok(
        typeof allowEntry.reason === "string" && allowEntry.reason.trim().length > 0,
        `Allowlist entry for ${relPath} must document a non-empty reason`
      );
    }

    const checks = [
      ["classDiff", multisetDiff(baseSig.classStrings, workSig.classStrings), allowEntry?.classDiff],
      ["styleDiff", multisetDiff(baseSig.styleStrings, workSig.styleStrings), allowEntry?.styleDiff],
      ["textDiff", multisetDiff(baseSig.jsxTexts, workSig.jsxTexts), allowEntry?.textDiff],
      ["helperDiff", multisetDiff(baseSig.helperClassStrings, workSig.helperClassStrings), allowEntry?.helperDiff],
    ];

    for (const [kind, actual, allowed] of checks) {
      const extraRemoved = findUnallowlistedItems(actual.onlyInBaseline, allowed?.onlyInBaseline);
      const extraAdded = findUnallowlistedItems(actual.onlyInWorking, allowed?.onlyInWorking);
      if (extraRemoved.length > 0 || extraAdded.length > 0) {
        violations.push({
          file: relPath,
          kind,
          extraRemoved,
          extraAdded,
        });
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Unallowlisted UI parity drift detected:\n${JSON.stringify(violations, null, 2)}`
  );
});

test("U4-PARITY-02: Untracked src/ files are explicitly allowlisted and valid AST modules", () => {
  const allSrcFiles = walkSourceFiles(SRC_ROOT, "src");
  const baselineSet = new Set(Object.keys(baseline.files || {}));
  const allowedUntracked = allowlist.allowedUntrackedFiles || {};

  const unexpectedUntracked = [];
  for (const relPath of allSrcFiles) {
    if (baselineSet.has(relPath)) continue;
    const meta = allowedUntracked[relPath];
    if (!meta || typeof meta.reason !== "string" || meta.reason.trim().length === 0) {
      unexpectedUntracked.push(relPath);
      continue;
    }
    const code = fs.readFileSync(path.join(REPO_ROOT, relPath), "utf8");
    const sig = extractUiSignatures(code, relPath);
    assert.equal(sig.parseError, null, `AST parse error in untracked file ${relPath}: ${sig.parseError}`);
  }

  assert.deepEqual(
    unexpectedUntracked,
    [],
    `Unexpected or unjustified untracked src/ files: ${unexpectedUntracked.join(", ")}`
  );
});

test("U4-PARITY-03: NEW FEATURE UI files and added RESTYLED classes contain zero disallowed non-GitHub tokens", () => {
  const bannedTokens = allowlist.disallowedTokens || [];
  assert.ok(bannedTokens.length >= 10, "disallowedTokens list must be populated");

  const hits = [];
  for (const relPath of allowlist.newFeatureUiFiles || []) {
    const absPath = path.join(REPO_ROOT, relPath);
    assert.ok(fs.existsSync(absPath), `Missing NEW FEATURE UI file: ${relPath}`);
    const lines = fs.readFileSync(absPath, "utf8").split(/\r?\n/);
    lines.forEach((line, idx) => {
      for (const token of bannedTokens) {
        if (line.includes(token)) {
          hits.push(`${relPath}:${idx + 1} contains disallowed token "${token}"`);
        }
      }
    });
  }

  for (const [relPath, entry] of Object.entries(allowlist.files || {})) {
    if (entry.classification !== "RESTYLED") continue;
    for (const cls of [...(entry.classDiff?.onlyInWorking || []), ...(entry.helperDiff?.onlyInWorking || [])]) {
      for (const token of bannedTokens) {
        if (cls.includes(token)) {
          hits.push(`${relPath} added class/helper "${cls}" contains disallowed token "${token}"`);
        }
      }
    }
  }

  assert.deepEqual(
    hits,
    [],
    `Disallowed non-GitHub tokens detected:\n${hits.join("\n")}`
  );
});

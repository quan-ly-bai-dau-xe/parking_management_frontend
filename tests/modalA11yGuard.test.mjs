import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(FRONTEND_ROOT, "src");

function walkFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(abs));
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name) && !/\.stories\./.test(entry.name)) {
      out.push(abs);
    }
  }
  return out.sort();
}

const NON_MODAL_FIXED_ALLOWLIST = new Set([
  "src/context/ToastContext.jsx",
  "src/pages/LoginPage.jsx",
]);

test("L2-GUARD-01: Shared useModalA11y hook exists and is wired into BaseModal and ConfirmModal", () => {
  const hookFile = path.join(SRC_ROOT, "hooks/useModalA11y.js");
  assert.ok(fs.existsSync(hookFile), "Missing src/hooks/useModalA11y.js");
  const hookSrc = fs.readFileSync(hookFile, "utf8");
  assert.match(hookSrc, /export\s+function\s+useModalA11y/, "useModalA11y must be exported");
  assert.match(hookSrc, /modalStack/, "useModalA11y must maintain a modalStack for nested dialogs");
  assert.match(hookSrc, /aria-modal/, "useModalA11y must configure aria-modal");
  assert.match(hookSrc, /aria-labelledby/, "useModalA11y must configure aria-labelledby");
  assert.match(hookSrc, /isBusy/, "useModalA11y must enforce Escape isBusy guard");

  const baseSrc = fs.readFileSync(path.join(SRC_ROOT, "components/common/modal/BaseModal.jsx"), "utf8");
  assert.match(baseSrc, /useModalA11y/, "BaseModal.jsx must use useModalA11y");
  assert.match(baseSrc, /id=\{titleId\}/, "BaseModal.jsx must wire titleId to heading");

  const confirmSrc = fs.readFileSync(path.join(SRC_ROOT, "components/common/modal/ConfirmModal.jsx"), "utf8");
  assert.match(confirmSrc, /alertdialog/, "ConfirmModal.jsx must support role='alertdialog'");
  assert.match(confirmSrc, /isBusy=\{loading\}/, "ConfirmModal.jsx must pass isBusy={loading} to BaseModal");
  assert.match(confirmSrc, /ariaDescribedBy|aria-describedby/, "ConfirmModal.jsx must wire aria-describedby");
});

test("L2-GUARD-02: Every custom fixed-inset-0 modal/drawer in src/** uses useModalA11y with aria-labelledby", () => {
  const files = walkFiles(SRC_ROOT);
  const violations = [];

  for (const absPath of files) {
    const relPath = path.relative(FRONTEND_ROOT, absPath).replace(/\\/g, "/");
    if (relPath === "src/components/common/modal/BaseModal.jsx") continue;
    if (NON_MODAL_FIXED_ALLOWLIST.has(relPath)) continue;

    const src = fs.readFileSync(absPath, "utf8");
    const hasCustomOverlay = /fixed\s+inset-0/.test(src);
    if (!hasCustomOverlay) continue;

    if (!src.includes("useModalA11y")) {
      violations.push(`${relPath}: renders custom modal/drawer overlay without useModalA11y`);
      continue;
    }
    if (!/aria-labelledby|dialogProps/.test(src)) {
      violations.push(`${relPath}: missing aria-labelledby or {...dialogProps}`);
    }
    if (!/titleId/.test(src)) {
      violations.push(`${relPath}: missing titleId wired to visible heading`);
    }
  }

  assert.deepEqual(violations, [], `Modal accessibility violations:\n${violations.join("\n")}`);
});

test("L2-GUARD-03: Destructive inline confirmations use alertdialog & async modals wire isBusy", () => {
  const ticketPageSrc = fs.readFileSync(path.join(SRC_ROOT, "pages/CustomerTicketPage.jsx"), "utf8");
  assert.ok(
    /role:\s*["']alertdialog["']/.test(ticketPageSrc),
    "CustomerTicketPage.jsx cancel confirmation must use role: 'alertdialog'",
  );
  assert.ok(
    /isBusy:\s*isCanceling/.test(ticketPageSrc),
    "CustomerTicketPage.jsx cancel confirmation must pass isBusy: isCanceling",
  );

  const vehiclePageSrc = fs.readFileSync(path.join(SRC_ROOT, "pages/CustomerVehiclePage.jsx"), "utf8");
  assert.ok(
    /role:\s*["']alertdialog["']/.test(vehiclePageSrc),
    "CustomerVehiclePage.jsx delete confirmation must use role: 'alertdialog'",
  );
  assert.ok(
    /isBusy:\s*isDeleting/.test(vehiclePageSrc),
    "CustomerVehiclePage.jsx delete confirmation must pass isBusy: isDeleting",
  );

  const busyModalExpectations = [
    ["src/components/ResetPasswordModal.jsx", /isBusy=\{loading\}/],
    ["src/components/CustomerManagement/CustomerModal.jsx", /isBusy=\{isSubmitting\}/],
    ["src/components/CustomerManagement/CustomerDetailModal.jsx", /isBusy=\{/],
    ["src/components/TicketManagement/EditTicketModal.jsx", /isBusy=\{loading\}/],
    ["src/components/VehicleManagement/EditVehicleModal.jsx", /isBusy=\{isSubmitting\}/],
    ["src/components/VehicleManagement/AssignSlotModal.jsx", /isBusy=\{isSubmitting\}/],
    ["src/components/ParkingLotManagement/ReserveSlotModal.jsx", /isBusy=\{isSubmitting\}/],
    ["src/pages/CustomerProfilePage.jsx", /isBusy=\{/],
    ["src/components/VehicleManagement/GateCameraControlModal.jsx", /isBusy:\s*isActionPending/],
    ["src/components/VehicleManagement/ScanPlateModal.jsx", /isBusy:\s*isActionPending/],
    ["src/components/ForgotPasswordModal.jsx", /isBusy:\s*loading/],
    ["src/components/OTPModal.jsx", /isBusy:\s*loading/],
    ["src/components/PlateScannerModal.jsx", /isBusy:\s*isApplying/],
    ["src/components/CustomerManagement/CustomerBuyTicketModal.jsx", /isBusy:\s*isSubmitting/],
    ["src/components/CustomerManagement/CustomerVehicleModal.jsx", /isBusy:\s*isSubmitting/],
  ];

  const missingBusy = [];
  for (const [relPath, pattern] of busyModalExpectations) {
    const src = fs.readFileSync(path.join(FRONTEND_ROOT, relPath), "utf8");
    if (!pattern.test(src)) {
      missingBusy.push(`${relPath}: missing busy guard matching ${pattern}`);
    }
  }
  assert.deepEqual(missingBusy, [], `Missing busy guards:\n${missingBusy.join("\n")}`);
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as plateFormatter from "../src/utils/plateFormatter.js";
import {
  evaluateAutoApplyPolicy,
  REASON_NEEDS_REVIEW,
  REASON_LOW_CONFIDENCE,
  REASON_UNREGISTERED_VEHICLE,
} from "../src/utils/gateAutoApplyPolicy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_ROOT = path.resolve(__dirname, "../src");

async function loadWalkinHelper() {
  try {
    return await import("../src/utils/walkinPendingEntry.js");
  } catch {
    return null;
  }
}

// ============================================================================
// WP0 Leftovers: Linux Case-Sensitive Imports & CUSTOMER FE Route Guard
// ============================================================================

test("WP0-LINUX-01: All relative imports in src/ match exact filesystem casing (CloseSessionModal & CloseSessionSafetyModal)", () => {
  const closeModalCode = fs.readFileSync(
    path.join(SRC_ROOT, "components/ParkingHistory/CloseSessionModal.jsx"),
    "utf-8"
  );
  const safetyModalCode = fs.readFileSync(
    path.join(SRC_ROOT, "components/VehicleManagement/scanPlate/CloseSessionSafetyModal.jsx"),
    "utf-8"
  );

  assert.ok(
    !closeModalCode.includes("common/Modal/ConfirmModal"),
    "CloseSessionModal must import ../common/modal/ConfirmModal (lowercase modal dir for Linux)"
  );
  assert.ok(
    closeModalCode.includes("common/modal/ConfirmModal"),
    "CloseSessionModal must reference common/modal/ConfirmModal"
  );
  assert.ok(
    !safetyModalCode.includes("common/Modal/ConfirmModal"),
    "CloseSessionSafetyModal must import ../../common/modal/ConfirmModal (lowercase modal dir for Linux)"
  );
  assert.ok(
    safetyModalCode.includes("common/modal/ConfirmModal"),
    "CloseSessionSafetyModal must reference common/modal/ConfirmModal"
  );
});

test("WP0-RBAC-01: App.jsx guards staff routes (VEHICLES, CUSTOMERS, HISTORY, TICKETS, CAMERA_SCANNER) against CUSTOMER role", () => {
  const appCode = fs.readFileSync(path.join(SRC_ROOT, "App.jsx"), "utf-8");

  assert.ok(
    appCode.includes("StaffOnlyRoute"),
    "App.jsx must define StaffOnlyRoute to prevent CUSTOMER rendering /vehicles, /customers, etc."
  );
  assert.ok(
    appCode.includes("ManagerOnlyRoute"),
    "App.jsx must retain ManagerOnlyRoute"
  );
  assert.ok(
    appCode.includes("<StaffOnlyRoute>"),
    "App.jsx must wrap staff LAYOUT_ROUTES and CAMERA_SCANNER with <StaffOnlyRoute>"
  );
});

// ============================================================================
// WP2-MODAL-01: Browser Mode Waiting Banner, Countdown, QR & Keep-Alive Liveness
// ============================================================================

test("WP2-MODAL-01: Browser Mode activates waiting banner on unregistered plate even with NEEDS_REVIEW or conf=0 / 0..1 scale (without auto-checkin on NEEDS_REVIEW)", async () => {
  const helper = await loadWalkinHelper();
  assert.ok(
    helper && typeof helper.evaluateBrowserEntryDecision === "function",
    "src/utils/walkinPendingEntry.js must export evaluateBrowserEntryDecision"
  );

  const walkInMatch = { id: "WALK_IN_59V184625", licensePlate: "59-V1 846.25" };

  // (a) Unregistered motorbike plate flagged NEEDS_REVIEW (e.g. bike_walkin 59-V1 846.25):
  // MUST activate waiting banner, MUST NOT auto-checkin
  const needsReviewRes = helper.evaluateBrowserEntryDecision({
    reviewStatus: "NEEDS_REVIEW",
    rawConfidence: 1.0, // 0..1 scale
    matchedVehicle: walkInMatch,
    hasOpenSession: false,
    isBlacklisted: false,
    availableSlot: { id: 1, code: "A-01" },
  });
  assert.equal(needsReviewRes.shouldAutoCheckIn, false, "NEEDS_REVIEW must NEVER auto-checkin");
  assert.equal(needsReviewRes.shouldStartPendingEntry, true, "NEEDS_REVIEW unregistered plate must start waiting banner");
  assert.equal(needsReviewRes.normalizedConfidence, 100.0, "0..1 confidence 1.0 must scale to 100.0");

  // (b) Registered vehicle with NEEDS_REVIEW: MUST NOT auto-checkin and MUST NOT start unregistered pending banner
  const registeredNeedsReview = helper.evaluateBrowserEntryDecision({
    reviewStatus: "NEEDS_REVIEW",
    rawConfidence: 96.0,
    matchedVehicle: { id: 42, licensePlate: "30A-612.35" },
    hasOpenSession: false,
    isBlacklisted: false,
    availableSlot: { id: 1, code: "A-01" },
  });
  assert.equal(registeredNeedsReview.shouldAutoCheckIn, false);
  assert.equal(registeredNeedsReview.shouldStartPendingEntry, false);

  // (c) Unregistered plate with conf=0 (e.g. initialPlate handoff) -> waiting banner enabled, no auto-checkin
  const zeroConfRes = helper.evaluateBrowserEntryDecision({
    reviewStatus: "AUTO",
    rawConfidence: 0,
    matchedVehicle: null,
    hasOpenSession: false,
    isBlacklisted: false,
    availableSlot: { id: 1, code: "A-01" },
  });
  assert.equal(zeroConfRes.shouldAutoCheckIn, false);
  assert.equal(zeroConfRes.shouldStartPendingEntry, true);

  // (d) Registered vehicle with 0..1 scale confidence 0.985 + AUTO -> auto-checkin allowed
  const autoScaleRes = helper.evaluateBrowserEntryDecision({
    reviewStatus: "AUTO",
    rawConfidence: 0.985,
    matchedVehicle: { id: 99, licensePlate: "30A-612.35" },
    hasOpenSession: false,
    isBlacklisted: false,
    availableSlot: { id: 1, code: "A-01" },
  });
  assert.equal(autoScaleRes.normalizedConfidence, 98.5);
  assert.equal(autoScaleRes.shouldAutoCheckIn, true);
  assert.equal(autoScaleRes.shouldStartPendingEntry, false);

  // Keep existing evaluateAutoApplyPolicy contract intact
  assert.equal(
    evaluateAutoApplyPolicy({ direction: "IN", reviewStatus: "NEEDS_REVIEW", confidence: 100, vehicleMatch: walkInMatch }).reasonCode,
    REASON_NEEDS_REVIEW
  );
  assert.equal(
    evaluateAutoApplyPolicy({ direction: "IN", reviewStatus: "AUTO", confidence: 0, vehicleMatch: walkInMatch }).reasonCode,
    REASON_LOW_CONFIDENCE
  );
  assert.equal(
    evaluateAutoApplyPolicy({ direction: "IN", reviewStatus: "AUTO", confidence: 98, vehicleMatch: walkInMatch }).reasonCode,
    REASON_UNREGISTERED_VEHICLE
  );

  // Verify GateCameraControlModal uses the helper instead of checking policy.reasonCode === REASON_UNREGISTERED_VEHICLE only
  const modalCode = fs.readFileSync(
    path.join(SRC_ROOT, "components/VehicleManagement/GateCameraControlModal.jsx"),
    "utf-8"
  );
  assert.ok(
    modalCode.includes("evaluateBrowserEntryDecision"),
    "GateCameraControlModal must use evaluateBrowserEntryDecision"
  );
});

test("WP2-MODAL-02: Browser Mode keep-alive drops pendingEntryInfo when unseen >60s or expired >15m", async () => {
  const helper = await loadWalkinHelper();
  assert.ok(
    helper && typeof helper.evaluatePendingEntryLiveness === "function",
    "src/utils/walkinPendingEntry.js must export evaluatePendingEntryLiveness"
  );

  const t0 = 1_700_000_000_000;
  const entry = {
    mode: "browser",
    plate: "30A-612.35",
    startedAt: t0,
    lastSeenAt: t0,
    expiresAt: t0 + 15 * 60 * 1000,
  };

  // Still seen within 60s -> alive
  assert.deepEqual(helper.evaluatePendingEntryLiveness(entry, t0 + 59_000), {
    alive: true,
    reason: "ACTIVE",
  });

  // Unseen > 60s -> drop!
  const unseenDrop = helper.evaluatePendingEntryLiveness(entry, t0 + 61_000);
  assert.equal(unseenDrop.alive, false);
  assert.equal(unseenDrop.reason, "UNSEEN_TIMEOUT");

  // Continuously seen up to 15m -> expired at >15m!
  const refreshedEntry = { ...entry, lastSeenAt: t0 + 14 * 60 * 1000 + 55_000 };
  const totalDrop = helper.evaluatePendingEntryLiveness(refreshedEntry, t0 + 15 * 60 * 1000 + 1000);
  assert.equal(totalDrop.alive, false);
  assert.equal(totalDrop.reason, "EXPIRED_15M");

  // Hook & modal must wire keep-alive presence probing while DETECTED
  const hookCode = fs.readFileSync(path.join(SRC_ROOT, "hooks/usePlateAutoDetect.js"), "utf-8");
  const modalCode = fs.readFileSync(
    path.join(SRC_ROOT, "components/VehicleManagement/GateCameraControlModal.jsx"),
    "utf-8"
  );
  assert.ok(
    hookCode.includes("keepAlivePlate") && hookCode.includes("onKeepAliveSighting"),
    "usePlateAutoDetect must support keepAlivePlate presence probe while pending"
  );
  assert.ok(
    modalCode.includes("evaluatePendingEntryLiveness"),
    "GateCameraControlModal must enforce evaluatePendingEntryLiveness (>60s unseen / >15m)"
  );
});

// ============================================================================
// WP2-MODAL-03: Worker Mode Syncs pendingEntryInfo & Masks QR Safely (D8(d))
// ============================================================================

test("WP2-MODAL-03: Worker Mode syncs pendingEntryInfo from lastAutoEvent transitions and NEVER puts *** into QR ?plate=", async () => {
  const helper = await loadWalkinHelper();
  assert.ok(
    helper &&
      typeof helper.syncPendingEntryFromWorkerEvent === "function" &&
      typeof helper.buildQuickRegisterUrl === "function",
    "src/utils/walkinPendingEntry.js must export syncPendingEntryFromWorkerEvent and buildQuickRegisterUrl"
  );

  const baseTime = Date.parse("2026-11-22T05:30:00.000Z");

  // 1. UNREGISTERED_VEHICLE -> creates pendingEntryInfo without raw plate, expiresAt = occurred_at + 15m
  const pendingState = helper.syncPendingEntryFromWorkerEvent(
    null,
    {
      action: "GATE_AUTO_NEEDS_STAFF",
      reason: "UNREGISTERED_VEHICLE",
      license_plate_masked: "30A***35",
      occurred_at: "2026-11-22T05:30:00.000Z",
    },
    baseTime + 10_000
  );
  assert.ok(pendingState !== null, "Worker UNREGISTERED_VEHICLE must produce pendingEntryInfo");
  assert.equal(pendingState.plate, "", "Worker pendingEntryInfo must NOT put masked plate into .plate");
  assert.equal(pendingState.plateMasked, "30A***35");
  assert.equal(pendingState.expiresAt, baseTime + 15 * 60 * 1000);

  // 2. QR URL in Worker Mode must NEVER contain *** or ?plate=30A***35
  const workerQr = helper.buildQuickRegisterUrl("http://127.0.0.1:15173", pendingState);
  assert.equal(workerQr, "http://127.0.0.1:15173/register");
  assert.ok(!workerQr.includes("*"), "Worker QR URL must never include masked *** plate");
  assert.ok(!workerQr.includes("plate="), "Worker QR URL must not pass masked plate query param");

  // Browser Mode QR URL with real unmasked plate DOES include ?plate=
  const browserQr = helper.buildQuickRegisterUrl("http://127.0.0.1:15173", {
    mode: "browser",
    plate: "30A-612.35",
  });
  assert.equal(browserQr, "http://127.0.0.1:15173/register?plate=30A-612.35");

  // Defensive: even if plate accidentally has ***, buildQuickRegisterUrl strips ?plate=
  const defensiveQr = helper.buildQuickRegisterUrl("http://127.0.0.1:15173", {
    mode: "browser",
    plate: "30A***35",
  });
  assert.ok(!defensiveQr.includes("*"), "Defensive guard: masked plate must never enter ?plate=");

  // 3. PENDING_ENTRY_EXPIRED -> drops pendingEntryInfo
  const afterExpire = helper.syncPendingEntryFromWorkerEvent(
    pendingState,
    {
      action: "GATE_AUTO_NEEDS_STAFF",
      reason: "PENDING_ENTRY_EXPIRED",
      license_plate_masked: "30A***35",
      occurred_at: "2026-11-22T05:31:05.000Z",
    },
    baseTime + 65_000
  );
  assert.equal(afterExpire, null, "PENDING_ENTRY_EXPIRED must clear pendingEntryInfo");

  // 4. GATE_AUTO_CHECK_IN -> drops pendingEntryInfo
  const afterCheckIn = helper.syncPendingEntryFromWorkerEvent(
    pendingState,
    {
      action: "GATE_AUTO_CHECK_IN",
      reason: "VALID_REGISTERED",
      license_plate_masked: "30A***35",
      occurred_at: "2026-11-22T05:31:00.000Z",
    },
    baseTime + 60_000
  );
  assert.equal(afterCheckIn, null, "GATE_AUTO_CHECK_IN must clear pendingEntryInfo");

  // 5. Verify GateCameraControlModal & EntryLanePanel & VehicleManagement wire Worker sync cleanly
  const modalCode = fs.readFileSync(
    path.join(SRC_ROOT, "components/VehicleManagement/GateCameraControlModal.jsx"),
    "utf-8"
  );
  const entryPanelCode = fs.readFileSync(
    path.join(SRC_ROOT, "components/VehicleManagement/scanPlate/EntryLanePanel.jsx"),
    "utf-8"
  );
  const vmCode = fs.readFileSync(path.join(SRC_ROOT, "pages/VehicleManagement.jsx"), "utf-8");

  assert.ok(
    modalCode.includes("syncPendingEntryFromWorkerEvent") && modalCode.includes("buildQuickRegisterUrl"),
    "GateCameraControlModal must sync Worker pendingEntryInfo and use buildQuickRegisterUrl"
  );
  assert.ok(
    entryPanelCode.includes("quickRegisterUrl") && entryPanelCode.includes("pendingEntryInfo.plateMasked"),
    "EntryLanePanel must display plateMasked when plate is empty in Worker Mode"
  );
  assert.ok(
    vmCode.includes("GateCameraControlModal"),
    "VehicleManagement.jsx scan flow must use GateCameraControlModal for full Dual-Mode walk-in support"
  );
});

// ============================================================================
// WP2-REG-01: Mobile /register -> /onboard Step 2, Plate Normalization & 375px Layout
// ============================================================================

test("WP2-REG-01: plateFormatter normalizes customer input variants matching license_plate_norm and rejects invalid symbols", () => {
  assert.equal(
    typeof plateFormatter.validateVehiclePlateInput,
    "function",
    "plateFormatter.js must export validateVehiclePlateInput"
  );

  const v1 = plateFormatter.validateVehiclePlateInput(" 51a - 897.14 ", "CAR");
  assert.equal(v1.valid, true);
  assert.equal(v1.normalized, "51A89714");
  assert.equal(v1.formatted, "51A-897.14");

  const v2 = plateFormatter.validateVehiclePlateInput("51a\t89714", "CAR");
  assert.equal(v2.valid, true);
  assert.equal(v2.normalized, "51A89714");
  assert.equal(v2.formatted, "51A-897.14");

  const v3 = plateFormatter.validateVehiclePlateInput("  51k  992.15  ", "CAR");
  assert.equal(v3.valid, true);
  assert.equal(v3.normalized, "51K99215");
  assert.equal(v3.formatted, "51K-992.15");

  const vEmpty = plateFormatter.validateVehiclePlateInput("   ", "CAR");
  assert.equal(vEmpty.valid, false);
  assert.equal(vEmpty.reason, "EMPTY");

  const vInvalid = plateFormatter.validateVehiclePlateInput("51A-897.14😊", "CAR");
  assert.equal(vInvalid.valid, false);
  assert.equal(vInvalid.reason, "INVALID_CHARS");
});

test("WP2-REG-02: RegisterPage -> OnBoardProfile requires licensePlate, normalizes it, handles 409, and fixes 375px overflow", () => {
  const registerCode = fs.readFileSync(path.join(SRC_ROOT, "pages/RegisterPage.jsx"), "utf-8");
  const onboardCode = fs.readFileSync(path.join(SRC_ROOT, "pages/OnBoardProfile.jsx"), "utf-8");
  const vehicleModalCode = fs.readFileSync(
    path.join(SRC_ROOT, "components/CustomerManagement/CustomerVehicleModal.jsx"),
    "utf-8"
  );
  const toastCode = fs.readFileSync(path.join(SRC_ROOT, "context/ToastContext.jsx"), "utf-8");

  // 1. RegisterPage preserves & normalizes ?plate=
  assert.ok(
    registerCode.includes("validateVehiclePlateInput") || registerCode.includes("normalizeLicensePlate"),
    "RegisterPage must normalize ?plate= cleanly"
  );

  // 2. OnBoardProfile requires licensePlate in step 2 (not optional!)
  assert.ok(
    onboardCode.includes('id="licensePlate"') &&
      onboardCode.includes("required") &&
      /htmlFor="licensePlate"[\s\S]*?\*/.test(onboardCode),
    "OnBoardProfile licensePlate field must be required with '*' indicator"
  );
  assert.ok(
    onboardCode.includes("validateVehiclePlateInput"),
    "OnBoardProfile must validate and normalize licensePlate via validateVehiclePlateInput"
  );
  assert.ok(
    onboardCode.includes("extractApiErrorInfo"),
    "OnBoardProfile must surface 409 MSG-4.3.1-M05 backend message via extractApiErrorInfo"
  );

  // 3. CustomerVehicleModal also normalizes plate input
  assert.ok(
    vehicleModalCode.includes("validateVehiclePlateInput"),
    "CustomerVehicleModal must normalize license_plate via validateVehiclePlateInput"
  );

  // 4. 375px horizontal overflow prevention on RegisterPage, OnBoardProfile, and ToastContext
  assert.ok(
    registerCode.includes("min-w-0"),
    "RegisterPage grid/flex containers must include min-w-0 to prevent 375px horizontal overflow"
  );
  assert.ok(
    onboardCode.includes("lg:col-span-7 min-w-0") && onboardCode.includes("whitespace-nowrap"),
    "OnBoardProfile must have min-w-0 on grid columns and whitespace-nowrap on '* Bắt buộc'"
  );
  assert.ok(
    !toastCode.includes("fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full"),
    "ToastContext fixed container must fit 375px viewports without max-w-sm right-5 overflow"
  );
});

// ============================================================================
// WP2 ITERATION 2 REGRESSION TESTS (Defects 1-6)
// ============================================================================

test("WP2-MODAL-04 (Defect 1): 3s keep-alive lastSeenAt updates never starve/cancel 5s lookupVehicleByPlate polling", async () => {
  const helper = await loadWalkinHelper();
  assert.ok(
    helper && typeof helper.getPendingEntryEffectKey === "function",
    "src/utils/walkinPendingEntry.js must export getPendingEntryEffectKey"
  );
  assert.equal(
    typeof helper.executePendingEntryLookupTick,
    "function",
    "src/utils/walkinPendingEntry.js must export executePendingEntryLookupTick"
  );

  // 1. Verify GateCameraControlModal uses pendingEntryInfoRef & stable primitive dependency arrays (never raw pendingEntryInfo)
  const modalCode = fs.readFileSync(
    path.join(SRC_ROOT, "components/VehicleManagement/GateCameraControlModal.jsx"),
    "utf-8"
  );
  assert.ok(
    modalCode.includes("pendingEntryInfoRef"),
    "GateCameraControlModal must store latest pendingEntryInfo in pendingEntryInfoRef"
  );
  const countdownMatch = modalCode.match(
    /D7 Pending Entry countdown ticker[\s\S]*?return \(\) => clearInterval\(tickId\);\s*\}, \[([^\]]*)\]\)/
  );
  assert.ok(countdownMatch, "Countdown effect dependency array must exist");
  const countdownDeps = countdownMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
  assert.ok(
    !countdownDeps.includes("pendingEntryInfo"),
    `Countdown useEffect must NOT depend on raw pendingEntryInfo object (found: ${countdownDeps.join(", ")})`
  );
  assert.ok(
    countdownDeps.includes("hasPendingEntry") &&
      countdownDeps.includes("pendingEntryMode") &&
      countdownDeps.includes("pendingEntryPlate") &&
      countdownDeps.includes("pendingEntryStartedAt") &&
      countdownDeps.includes("pendingEntryExpiresAt"),
    "Countdown useEffect must depend only on stable primitive pendingEntryInfo keys"
  );

  const pollingMatch = modalCode.match(
    /D7 Pending Entry Re-evaluation[\s\S]*?clearInterval\(intervalId\);\s*\};?\s*\}, \[([^\]]*)\]\)/
  );
  assert.ok(pollingMatch, "5s polling effect dependency array must exist");
  const pollingDeps = pollingMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
  assert.ok(
    !pollingDeps.includes("pendingEntryInfo"),
    `5s polling useEffect must NOT depend on raw pendingEntryInfo object (found: ${pollingDeps.join(", ")})`
  );
  assert.ok(
    pollingDeps.includes("hasPendingEntry") &&
      pollingDeps.includes("pendingEntryMode") &&
      pollingDeps.includes("pendingEntryPlate") &&
      pollingDeps.includes("pendingEntryStartedAt") &&
      pollingDeps.includes("pendingEntryExpiresAt"),
    "5s polling useEffect must depend only on stable primitive keys"
  );

  // 2. Simulate deterministic clock 0..12s with 3s keep-alive updates and 5s lookup polling
  let nowMs = 1_700_000_000_000;
  let pendingEntryInfo = {
    mode: "browser",
    plate: "30A-612.35",
    plateMasked: "",
    startedAt: nowMs,
    lastSeenAt: nowMs,
    expiresAt: nowMs + 15 * 60 * 1000,
  };
  const pendingEntryRef = { current: pendingEntryInfo };
  let activeEffectKey = helper.getPendingEntryEffectKey(pendingEntryInfo);
  let activeTimerId = 1;
  let teardownCount = 0;
  let lookupCallCount = 0;
  let nextLookupAt = nowMs + 5000;
  let nextKeepAliveAt = nowMs + 3000;

  const lookupVehicleByPlate = async () => {
    lookupCallCount += 1;
    // Customer finishes registration at t = 9s, so t = 10s lookup sees vehicle.id
    if (nowMs >= 1_700_000_000_000 + 9_000) {
      return { vehicle: { id: 88, license_plate: "30A-612.35" } };
    }
    return null;
  };

  let registeredAt = null;
  for (let sec = 1; sec <= 12; sec += 1) {
    nowMs = 1_700_000_000_000 + sec * 1000;

    // 3s keep-alive updates lastSeenAt (new object reference) while pending
    if (pendingEntryInfo && nowMs >= nextKeepAliveAt) {
      nextKeepAliveAt += 3000;
      pendingEntryInfo = { ...pendingEntryInfo, lastSeenAt: nowMs };
      pendingEntryRef.current = pendingEntryInfo;
      const nextKey = helper.getPendingEntryEffectKey(pendingEntryInfo);
      if (nextKey !== activeEffectKey) {
        activeEffectKey = nextKey;
        teardownCount += 1;
        activeTimerId += 1;
        nextLookupAt = nowMs + 5000;
      }
    }

    if (activeTimerId && nowMs >= nextLookupAt) {
      nextLookupAt += 5000;
      await helper.executePendingEntryLookupTick({
        pendingEntry: pendingEntryRef.current,
        nowMs,
        isBusy: () => false,
        lookupVehicleByPlate,
        onExpired: () => {
          throw new Error("Should remain alive during 3s keep-alive");
        },
        onRegistered: async (plate) => {
          registeredAt = sec;
          pendingEntryInfo = null;
          pendingEntryRef.current = null;
          activeTimerId = 0;
          assert.equal(plate, "30A-612.35");
        },
      });
    }
  }

  assert.equal(teardownCount, 0, "3s keep-alive updates must NEVER tear down/reset the 5s lookup timer");
  assert.equal(lookupCallCount, 2, "5s lookup polling must execute at t=5s and t=10s");
  assert.equal(registeredAt, 10, "5s lookup must detect registration at t=10s while vehicle is still seen");
});

test("WP2-MODAL-05 (Defects 2 & 3): UNSEEN_TIMEOUT resets plate refs for re-trigger, and Browser OCR never wipes Worker Mode banner", () => {
  const modalCode = fs.readFileSync(
    path.join(SRC_ROOT, "components/VehicleManagement/GateCameraControlModal.jsx"),
    "utf-8"
  );

  // Defect 2: Both 1s countdown and 5s polling !liveness.alive branches must clear lastDetectedPlateRef & autoAppliedPlateRef
  const countdownUnseenBlock = modalCode.match(
    /D7 Pending Entry countdown ticker[\s\S]*?if \(!liveness\.alive\) \{([\s\S]*?)setInformationalMessage/
  );
  assert.ok(countdownUnseenBlock, "1s countdown !liveness.alive branch must exist");
  assert.ok(
    countdownUnseenBlock[1].includes('lastDetectedPlateRef.current = ""') &&
      countdownUnseenBlock[1].includes('autoAppliedPlateRef.current = ""'),
    "1s countdown !liveness.alive must reset lastDetectedPlateRef.current and autoAppliedPlateRef.current"
  );

  const pollingUnseenBlock = modalCode.match(
    /D7 Pending Entry Re-evaluation[\s\S]*?onExpired: \(liveness\) => \{([\s\S]*?)setInformationalMessage/
  );
  assert.ok(pollingUnseenBlock, "5s polling onExpired (!liveness.alive) branch must exist");
  assert.ok(
    pollingUnseenBlock[1].includes('lastDetectedPlateRef.current = ""') &&
      pollingUnseenBlock[1].includes('autoAppliedPlateRef.current = ""'),
    "5s polling !liveness.alive must reset lastDetectedPlateRef.current and autoAppliedPlateRef.current"
  );

  // Defect 3: Browser OCR detectedData effect must not wipe out Worker Mode pendingEntryInfo
  const browserDetectEffect = modalCode.match(
    /\/\/ Lắng nghe camera tự động nhận diện biển số[\s\S]*?setPendingExitInfo\(null\);/
  );
  assert.ok(browserDetectEffect, "Browser OCR detectedData effect must exist");
  assert.ok(
    !browserDetectEffect[0].includes("setPendingEntryInfo(null);"),
    "Browser OCR detectedData effect must NOT unconditionally call setPendingEntryInfo(null)"
  );
  assert.ok(
    browserDetectEffect[0].includes('prev?.mode === "worker" ? prev : null'),
    "Browser OCR detectedData effect must preserve Worker Mode pendingEntryInfo"
  );
});

test("WP2-MODAL-06 (Defect 4): Post-registration handles AUTO>=90 vs NEEDS_REVIEW/conf<90/initialPlate via fresh live scan (never faking AUTO)", async () => {
  const helper = await loadWalkinHelper();
  assert.ok(
    helper && typeof helper.evaluatePostRegistrationAction === "function",
    "src/utils/walkinPendingEntry.js must export evaluatePostRegistrationAction"
  );

  // Case 1: Initial scan was AUTO with >= 90% confidence -> immediate auto check-in
  const autoRes = helper.evaluatePostRegistrationAction({
    detectedData: { review_status: "AUTO", confidence: 0.965 },
    scanDetails: { confidence: 0.965, reviewStatus: "AUTO" },
  });
  assert.equal(autoRes.canImmediateAutoCheckIn, true);
  assert.equal(autoRes.requiresFreshScan, false);

  // Case 2: Initial scan was NEEDS_REVIEW -> must require fresh scan (never fake AUTO)
  const needsReviewRes = helper.evaluatePostRegistrationAction({
    detectedData: { review_status: "NEEDS_REVIEW", confidence: 0.99 },
    scanDetails: { confidence: 0.99, reviewStatus: "NEEDS_REVIEW" },
  });
  assert.equal(needsReviewRes.canImmediateAutoCheckIn, false);
  assert.equal(needsReviewRes.requiresFreshScan, true);

  // Case 3: Initial scan had conf < 90% -> must require fresh scan
  const lowConfRes = helper.evaluatePostRegistrationAction({
    detectedData: { review_status: "AUTO", confidence: 0.84 },
    scanDetails: { confidence: 0.84, reviewStatus: "AUTO" },
  });
  assert.equal(lowConfRes.canImmediateAutoCheckIn, false);
  assert.equal(lowConfRes.requiresFreshScan, true);

  // Case 4: initialPlate handoff with no scanDetails/detectedData -> conf=0 -> requires fresh scan
  const initialPlateRes = helper.evaluatePostRegistrationAction({
    detectedData: null,
    scanDetails: null,
  });
  assert.equal(initialPlateRes.canImmediateAutoCheckIn, false);
  assert.equal(initialPlateRes.requiresFreshScan, true);

  // Verify modal wires post-registration fresh scan without faking AUTO/confidence
  const modalCode = fs.readFileSync(
    path.join(SRC_ROOT, "components/VehicleManagement/GateCameraControlModal.jsx"),
    "utf-8"
  );
  assert.ok(
    modalCode.includes("evaluatePostRegistrationAction"),
    "GateCameraControlModal must call evaluatePostRegistrationAction after lookupVehicleByPlate matches a newly registered vehicle"
  );
  assert.ok(
    modalCode.includes("resetDetection()"),
    "GateCameraControlModal must trigger resetDetection() when camera stream is active for NEEDS_REVIEW/conf<90/initialPlate"
  );
});

test("WP2-CAM-01 (Defects 5 & 6): CameraScannerPage SSR guard, exitGateId=3 default, scanResult handoff, and App.jsx StaffOnlyRoute uses checkIsEmployeeOrManager", () => {
  const scannerPageCode = fs.readFileSync(path.join(SRC_ROOT, "pages/CameraScannerPage.jsx"), "utf-8");
  const topHeaderCode = fs.readFileSync(path.join(SRC_ROOT, "components/layout/AppTopHeader.jsx"), "utf-8");
  const modalCode = fs.readFileSync(
    path.join(SRC_ROOT, "components/VehicleManagement/GateCameraControlModal.jsx"),
    "utf-8"
  );
  const appCode = fs.readFileSync(path.join(SRC_ROOT, "App.jsx"), "utf-8");

  // Defect 5a: CameraScannerPage SSR window guard & exitGateId = 3
  assert.ok(
    scannerPageCode.includes('typeof window !== "undefined"'),
    "CameraScannerPage.jsx must guard window.location.search for SSR"
  );
  assert.ok(
    scannerPageCode.includes('mode === "out" ? 3 : 1'),
    "CameraScannerPage.jsx must default exitGateId to 3 (OUT_01), not 2 (IN_02)"
  );

  // Defect 5b: AppTopHeader exitGateId = 3 & preserves scanResult -> initialScanResult
  assert.ok(
    topHeaderCode.includes("exitGateId = 3"),
    "AppTopHeader.jsx must default exitGateId to 3 (OUT_01)"
  );
  assert.ok(
    topHeaderCode.includes("initialScanResult={gateModalScanResult}"),
    "AppTopHeader.jsx must forward scanResult via initialScanResult to GateCameraControlModal"
  );
  assert.ok(
    modalCode.includes("initialScanResult = null"),
    "GateCameraControlModal.jsx must accept initialScanResult and populate scanDetails"
  );

  // Defect 6: App.jsx StaffOnlyRoute uses checkIsEmployeeOrManager(user || role)
  assert.ok(
    appCode.includes("checkIsEmployeeOrManager") &&
      appCode.includes("checkIsEmployeeOrManager(user || role)"),
    "App.jsx StaffOnlyRoute must use checkIsEmployeeOrManager(user || role)"
  );
});

// ============================================================================
// WP2 ITERATION 3 REGRESSION TESTS (Critical/Major/Minor from reviewer_wp2_2_2)
// ============================================================================

test("WP2-MODAL-07 (Critical): onResetBarrier memoization + ref-backed polling prevent 1s re-render teardown of 5s timers", () => {
  const modalCode = fs.readFileSync(
    path.join(SRC_ROOT, "components/VehicleManagement/GateCameraControlModal.jsx"),
    "utf-8"
  );

  // 1. onResetBarrier must NOT be an inline arrow function inside usePlateMatching({...})
  const plateMatchingCall = modalCode.match(/usePlateMatching\(\{([\s\S]*?)\}\);/);
  assert.ok(plateMatchingCall, "usePlateMatching call must exist");
  assert.ok(
    !/onResetBarrier:\s*\(\)\s*=>/.test(plateMatchingCall[1]),
    "onResetBarrier passed to usePlateMatching must be memoized via useCallback (not an inline arrow function)"
  );
  assert.ok(
    modalCode.includes("useCallback") && /handleResetBarrier\s*=\s*useCallback\(/.test(modalCode),
    "GateCameraControlModal must wrap onResetBarrier in useCallback"
  );

  // 2. Refs for handleMatchPlate, resetDetection, and isScanning must exist and be synced
  assert.ok(modalCode.includes("handleMatchPlateRef"), "Must define handleMatchPlateRef");
  assert.ok(modalCode.includes("resetDetectionRef"), "Must define resetDetectionRef");
  assert.ok(modalCode.includes("isScanningRef"), "Must define isScanningRef");
  assert.ok(
    modalCode.includes("handleMatchPlateRef.current = handleMatchPlate"),
    "Must sync handleMatchPlateRef.current"
  );
  assert.ok(
    modalCode.includes("resetDetectionRef.current = resetDetection"),
    "Must sync resetDetectionRef.current"
  );

  // 3. None of the 3 timer useEffects (1s countdown, 5s entry polling, 5s exit polling) may depend on volatile functions/state
  const forbiddenDeps = ["handleMatchPlate", "resetDetection", "isScanning"];

  const countdownMatch = modalCode.match(
    /D7 Pending Entry countdown ticker[\s\S]*?return \(\) => clearInterval\(tickId\);\s*\}, \[([^\]]*)\]\)/
  );
  assert.ok(countdownMatch, "1s countdown effect must exist");
  const countdownDeps = countdownMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
  for (const dep of forbiddenDeps) {
    assert.ok(
      !countdownDeps.includes(dep),
      `1s countdown useEffect must NOT depend on ${dep} (found: ${countdownDeps.join(", ")})`
    );
  }

  const entryPollingMatch = modalCode.match(
    /D7 Pending Entry Re-evaluation[\s\S]*?clearInterval\(intervalId\);\s*\};?\s*\}, \[([^\]]*)\]\)/
  );
  assert.ok(entryPollingMatch, "5s entry polling effect must exist");
  const entryPollingDeps = entryPollingMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
  for (const dep of forbiddenDeps) {
    assert.ok(
      !entryPollingDeps.includes(dep),
      `5s entry polling useEffect must NOT depend on ${dep} (found: ${entryPollingDeps.join(", ")})`
    );
  }

  const exitPollingMatch = modalCode.match(
    /D8 Pending Exit Re-evaluation[\s\S]*?clearInterval\(intervalId\);\s*\};?\s*\}, \[([^\]]*)\]\)/
  );
  assert.ok(exitPollingMatch, "5s exit polling effect must exist");
  const exitPollingDeps = exitPollingMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
  for (const dep of forbiddenDeps) {
    assert.ok(
      !exitPollingDeps.includes(dep),
      `5s exit polling useEffect must NOT depend on ${dep} (found: ${exitPollingDeps.join(", ")})`
    );
  }
  assert.ok(
    exitPollingMatch[0].includes("isScanningRef.current") &&
      exitPollingMatch[0].includes("handleMatchPlateRef.current"),
    "5s exit polling must read isScanningRef.current and handleMatchPlateRef.current"
  );
});

test("WP2-MODAL-08 (Major + Minor): setScanDetails records reviewStatus, requiresFreshScan clears scanDetails, and auto-apply never defaults null detectedData to AUTO", () => {
  const modalCode = fs.readFileSync(
    path.join(SRC_ROOT, "components/VehicleManagement/GateCameraControlModal.jsx"),
    "utf-8"
  );

  // 1. Live camera detectedData setScanDetails must store reviewStatus
  const cameraDetectBlock = modalCode.match(
    /\/\/ Lắng nghe camera tự động nhận diện biển số[\s\S]*?setScanDetails\(\{([\s\S]*?)\}\);/
  );
  assert.ok(cameraDetectBlock, "Camera detectedData setScanDetails call must exist");
  assert.ok(
    cameraDetectBlock[1].includes("reviewStatus"),
    "Camera detectedData setScanDetails must record reviewStatus: detectedData?.review_status || null"
  );

  // 2. onRegistered with postAction.requiresFreshScan must clear scanDetails & refs before resetDetection()
  const onRegisteredBlock = modalCode.match(
    /onRegistered:\s*async\s*\(registeredPlate\)\s*=>\s*\{([\s\S]*?)\},\s*\}\);/
  );
  assert.ok(onRegisteredBlock, "onRegistered handler must exist");
  assert.ok(
    onRegisteredBlock[1].includes("setScanDetails(null)") &&
      onRegisteredBlock[1].includes("scanDetailsRef.current = null") &&
      onRegisteredBlock[1].includes("detectedDataRef.current = null"),
    "onRegistered requiresFreshScan must clear setScanDetails(null), scanDetailsRef.current, and detectedDataRef.current"
  );

  // 3. Entry & Exit auto-apply must NOT default detectedData === null && !scanDetails?.reviewStatus to "AUTO"
  const entryAutoBlock = modalCode.match(
    /if \(laneMode === "entry"\) \{([\s\S]*?)\} else if \(laneMode === "exit"\) \{/
  );
  assert.ok(entryAutoBlock, "Entry auto-apply block must exist");
  assert.ok(
    !/detectedData\?\.review_status\s*\|\|\s*scanDetails\?\.reviewStatus\s*\|\|\s*"AUTO"/.test(
      entryAutoBlock[1]
    ),
    "Entry auto-apply must not unconditionally fall back to \"AUTO\" when detectedData is null and scanDetails.reviewStatus is absent"
  );

  const exitAutoBlock = modalCode.match(
    /\} else if \(laneMode === "exit"\) \{([\s\S]*?)evaluateAutoApplyPolicy\(/
  );
  assert.ok(exitAutoBlock, "Exit auto-apply block must exist");
  assert.ok(
    exitAutoBlock[1].includes("normalizeConfidencePercent("),
    "Exit auto-apply must normalize confidence with normalizeConfidencePercent"
  );
  assert.ok(
    exitAutoBlock[1].includes("scanDetails?.reviewStatus"),
    "Exit auto-apply must consult scanDetails?.reviewStatus and guard null detectedData"
  );
});

test("WP2-HDR-01 (Minor): AppTopHeader open-gate-control-modal listener updates gateModalMode and gateModalGateId from event.detail", () => {
  const topHeaderCode = fs.readFileSync(
    path.join(SRC_ROOT, "components/layout/AppTopHeader.jsx"),
    "utf-8"
  );
  const listenerBlock = topHeaderCode.match(
    /const handleOpenGateModal = \(event\) => \{([\s\S]*?)\};\s*if \(typeof window !== "undefined"/
  );
  assert.ok(listenerBlock, "handleOpenGateModal listener must exist in AppTopHeader.jsx");
  assert.ok(
    listenerBlock[1].includes("setGateModalMode") &&
      listenerBlock[1].includes("setGateModalGateId"),
    "handleOpenGateModal must update gateModalMode and gateModalGateId from event.detail when provided"
  );
});

// ============================================================================
// WP2 ITERATION 4 REGRESSION TESTS (Defects A, B, C — Real React 19 Runtime)
// ============================================================================

function installMinimalDomShim() {
  const saved = {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
    HTMLElement: globalThis.HTMLElement,
    HTMLInputElement: globalThis.HTMLInputElement,
    HTMLButtonElement: globalThis.HTMLButtonElement,
    HTMLVideoElement: globalThis.HTMLVideoElement,
    HTMLIFrameElement: globalThis.HTMLIFrameElement,
    HTMLSelectElement: globalThis.HTMLSelectElement,
    HTMLTextAreaElement: globalThis.HTMLTextAreaElement,
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

  function matchesSimpleSelector(el, selector) {
    const attrMatch = selector.match(/^\[([^=\]]+)="([^"]*)"\]$/);
    if (attrMatch) return el.getAttribute(attrMatch[1]) === attrMatch[2];
    return el.tagName.toLowerCase() === selector.toLowerCase();
  }

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
    navigator: { mediaDevices: undefined },
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

let _compiledBundleCache = null;
async function loadCompiledFeComponents() {
  if (_compiledBundleCache) return _compiledBundleCache;
  const [{ default: esbuild }, { default: babel }, os, url] = await Promise.all([
    import("esbuild"),
    import("@babel/core"),
    import("node:os"),
    import("node:url"),
  ]);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wp2-iter4-rt-"));
  try {
    const entryPath = path.join(tmpDir, "entry.js");
    const outPath = path.join(tmpDir, "bundle.mjs");
    const modalSrc = path.resolve(SRC_ROOT, "components/VehicleManagement/GateCameraControlModal.jsx");
    const headerSrc = path.resolve(SRC_ROOT, "components/layout/AppTopHeader.jsx");
    const apiSrc = path.resolve(SRC_ROOT, "services/apiClient.js");

    fs.writeFileSync(
      entryPath,
      `
      export { default as GateCameraControlModal } from ${JSON.stringify(modalSrc)};
      export { default as AppTopHeader } from ${JSON.stringify(headerSrc)};
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

    const mod = await import(url.pathToFileURL(outPath).href);
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

test("WP2-ITER4-A (Critical): Unregistered plate in Browser Mode must NOT enter infinite queueMicrotask loop or overwrite lastSeenAt", async () => {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { GateCameraControlModal, axiosInstance } = await loadCompiledFeComponents();

  const dom = installMinimalDomShim();
  const originalRequest = axiosInstance.request;
  const originalQueueMicrotask = globalThis.queueMicrotask;
  const originalDateNow = Date.now;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;

  let fakeNowMs = 1_700_000_000_000;
  Date.now = () => fakeNowMs;

  const intervals = new Map();
  let nextTimerId = 1;
  globalThis.setInterval = (fn, ms) => {
    const id = nextTimerId++;
    intervals.set(id, { fn, ms, nextAt: fakeNowMs + ms });
    return id;
  };
  globalThis.clearInterval = (id) => {
    intervals.delete(id);
  };

  let microtaskCount = 0;
  globalThis.queueMicrotask = (fn) => {
    microtaskCount += 1;
    if (microtaskCount > 60) {
      throw new Error(`INFINITE_MICROTASK_LOOP_ABORT count=${microtaskCount}`);
    }
    return originalQueueMicrotask(fn);
  };

  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/gates/")) {
      return { data: { results: [{ id: 1, code: "IN_01", direction: "IN", worker_online: false }] } };
    }
    if (url.includes("/api/v1/parking/vehicle-lookup/")) {
      const err = new Error("Not found");
      err.response = { status: 404, data: { code: "MSG-4.5.1-M01" } };
      throw err;
    }
    if (url.includes("/api/v1/parking/slots/")) {
      return { data: { results: [{ id: 1, code: "A-01", status: "AVAILABLE", vehicle_type: "CAR" }] } };
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
          initialLane: "entry",
          gateId: 1,
          initialPlate: "51A12345",
          initialScanResult: {
            plate_final: "51A12345",
            review_status: "AUTO",
            confidence: 0.96,
          },
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    assert.ok(
      microtaskCount <= 25,
      `Expected bounded microtasks when pending entry starts, got ${microtaskCount}`
    );
    assert.ok(
      container.querySelector('[data-testid="pending-entry-card"]'),
      "Pending entry waiting card must render for unregistered plate"
    );

    // Advance fake clock 65s with NO camera keep-alive sighting: 1s countdown ticker MUST drop via UNSEEN_TIMEOUT
    for (let sec = 1; sec <= 65; sec += 1) {
      microtaskCount = 0;
      fakeNowMs += 1000;
      const due = [...intervals.values()].filter((t) => t.ms === 1000);
      await act(async () => {
        for (const t of due) t.fn();
        await Promise.resolve();
      });
    }

    assert.equal(
      container.querySelector('[data-testid="pending-entry-card"]'),
      null,
      "Pending entry card must disappear after >60s without keep-alive sighting (lastSeenAt must not be overwritten)"
    );
    const infoBanner = container.querySelector('[data-testid="informational-banner"]');
    assert.ok(
      infoBanner && infoBanner.textContent.includes(">60 giây"),
      "Must show UNSEEN_TIMEOUT (>60 giây) informational message after vehicle leaves"
    );
  } finally {
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
    Date.now = originalDateNow;
    globalThis.queueMicrotask = originalQueueMicrotask;
    await act(async () => {
      root.unmount();
    });
    axiosInstance.request = originalRequest;
    dom.restore();
  }
});

test("WP2-ITER4-B (High): Switching lanes inside GateCameraControlModal updates activeGateId and AppTopHeader resets gateId on scanner entry", async () => {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { MemoryRouter } = await import("react-router-dom");
  const { GateCameraControlModal, AppTopHeader, axiosInstance } = await loadCompiledFeComponents();

  const dom = installMinimalDomShim();
  const originalRequest = axiosInstance.request;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  globalThis.setInterval = () => 1;
  globalThis.clearInterval = () => {};

  let gatesCallCount = 0;
  const checkoutPayloads = [];

  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/gates/")) {
      gatesCallCount += 1;
      return {
        data: {
          results: [
            { id: 1, code: "IN_01", direction: "IN", worker_online: false },
            { id: 3, code: "OUT_01", direction: "OUT", worker_online: true },
          ],
        },
      };
    }
    if (url.includes("/api/v1/parking/vehicle-lookup/")) {
      return {
        data: {
          vehicle: { id: 10, license_plate: "43B-999.77", vehicle_type: "CAR", status: "ACTIVE" },
          customer: { id: 20, full_name: "Test User", has_wallet: true, wallet_balance: "100000.00", wallet_status: "ACTIVE" },
          open_session: { id: 37, session_code: "#PK-20261017-037", entry_time: "2026-10-17T00:20:00Z" },
        },
      };
    }
    if (url.includes("/api/v1/parking/slots/")) {
      return { data: { results: [{ id: 1, code: "A-01", status: "AVAILABLE", vehicle_type: "CAR" }] } };
    }
    if (url.includes("/api/v1/parking/sessions/fee-preview/")) {
      return { data: { session_id: 37, session_code: "#PK-20261017-037", fee_amount: 10000 } };
    }
    if (url.includes("/api/v1/parking/sessions/check-out/")) {
      checkoutPayloads.push(JSON.parse(config.data));
      return {
        data: {
          payment: { method: "CASH", amount: "10000.00" },
          session: { id: 37, session_code: "#PK-20261017-037", fee_amount: "10000.00" },
        },
      };
    }
    return { data: {} };
  };

  // 1. Switch from entry (gateId=1) to exit inside GateCameraControlModal
  const modalContainer = dom.doc.createElement("div");
  dom.doc.body.appendChild(modalContainer);
  const modalRoot = createRoot(modalContainer);

  try {
    await act(async () => {
      modalRoot.render(
        React.createElement(GateCameraControlModal, {
          isOpen: true,
          onClose: () => {},
          initialLane: "entry",
          gateId: 1,
          initialPlate: "43B99977",
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const exitTabBtn = modalContainer
      .querySelectorAll("button")
      .find((b) => b.textContent.includes("Làn Ra") && !b.textContent.includes("Chuyển"));
    assert.ok(exitTabBtn, "Làn Ra tab button must exist");

    assert.ok(
      modalContainer.querySelector('[data-testid="auto-apply-toggle"]'),
      "Entry gate 1 (worker_online=false) must initially render Browser Mode toggle"
    );

    const callsBeforeSwitch = gatesCallCount;
    await act(async () => {
      exitTabBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    assert.ok(
      gatesCallCount > callsBeforeSwitch,
      "Switching to Làn Ra must re-poll getGateWorkerStatus for the new activeGateId"
    );
    assert.ok(
      modalContainer.querySelector('[data-testid="viewer-mode-badge"]'),
      "Switching to Làn Ra must poll gate 3 (worker_online=true) rather than staying locked on gate 1"
    );

    const checkoutBtn = modalContainer
      .querySelectorAll("button")
      .find(
        (b) =>
          b.textContent.includes("Mở Barrier") &&
          !b.textContent.includes("Xe Vào")
      );
    assert.ok(checkoutBtn, "Exit confirm checkout button must exist");

    await act(async () => {
      checkoutBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    assert.equal(checkoutPayloads.length, 1, "check-out must be called once");
    assert.equal(
      checkoutPayloads[0].exit_gate_id,
      3,
      `Switching to Làn Ra inside modal must send exit_gate_id=3 (not locked to prop gateId=1)`
    );

    // 2. Verify AppTopHeader.handlePlateDetectedFromScanner resets gateModalGateId to entryGateId (1) after exit mode
    const headerCode = fs.readFileSync(path.resolve(SRC_ROOT, "components/layout/AppTopHeader.jsx"), "utf-8");
    const scannerHandlerMatch = headerCode.match(
      /const handlePlateDetectedFromScanner = \([\s\S]*?\n  \};/
    );
    assert.ok(scannerHandlerMatch, "handlePlateDetectedFromScanner must exist");
    assert.ok(
      scannerHandlerMatch[0].includes("setGateModalGateId"),
      "handlePlateDetectedFromScanner must reset gateModalGateId to entryGateId || 1"
    );

    // Also render AppTopHeader and open exit modal via CustomEvent then verify modal opens on exit gate 3
    const hdrContainer = dom.doc.createElement("div");
    dom.doc.body.appendChild(hdrContainer);
    const hdrRoot = createRoot(hdrContainer);
    try {
      await act(async () => {
        hdrRoot.render(
          React.createElement(
            MemoryRouter,
            null,
            React.createElement(AppTopHeader, { entryGateId: 1, exitGateId: 3 })
          )
        );
        await Promise.resolve();
      });

      await act(async () => {
        dom.win.dispatchEvent(
          new dom.win.CustomEvent("open-gate-control-modal", {
            detail: { mode: "exit", gateId: 3, plate: "43B99977" },
          })
        );
        await Promise.resolve();
        await Promise.resolve();
      });
      assert.ok(
        hdrContainer.textContent.includes("Thông tin phương tiện ra"),
        "AppTopHeader must open GateCameraControlModal in Exit mode"
      );
    } finally {
      await act(async () => {
        hdrRoot.unmount();
      });
    }
  } finally {
    await act(async () => {
      modalRoot.unmount();
    });
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
    axiosInstance.request = originalRequest;
    dom.restore();
  }
});

test("WP2-ITER4-C (Medium): GateCameraControlModal unwraps .session from checkInVehicle and checkOutVehicle BE responses", async () => {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { GateCameraControlModal, axiosInstance } = await loadCompiledFeComponents();

  const dom = installMinimalDomShim();
  const originalRequest = axiosInstance.request;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  globalThis.setInterval = () => 1;
  globalThis.clearInterval = () => {};

  const sessionEvents = [];
  const onWindowSessionChanged = (e) => sessionEvents.push(e.detail);
  dom.win.addEventListener("parking-session-changed", onWindowSessionChanged);

  let mode = "entry";
  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/gates/")) {
      return { data: { results: [{ id: 1, worker_online: false }, { id: 3, worker_online: false }] } };
    }
    if (url.includes("/api/v1/parking/vehicle-lookup/")) {
      return {
        data: {
          vehicle: { id: 10, license_plate: "43B-999.77", vehicle_type: "CAR", status: "ACTIVE" },
          customer: { id: 20, full_name: "Test User", has_wallet: false },
          open_session:
            mode === "exit"
              ? { id: 51, session_code: "#PK-20261122-001", entry_time: "2026-11-22T06:00:00Z" }
              : null,
        },
      };
    }
    if (url.includes("/api/v1/parking/slots/")) {
      return { data: { results: [{ id: 1, code: "A-01", status: "AVAILABLE", vehicle_type: "CAR" }] } };
    }
    if (url.includes("/api/v1/parking/sessions/fee-preview/")) {
      // Simulate unavailable/404 preview so fallback reads checkOutResult.session.fee_amount
      const err = new Error("Preview unavailable");
      err.response = { status: 404, data: { code: "PROP-4.5.1-P06" } };
      throw err;
    }
    if (url.includes("/api/v1/parking/sessions/check-in/")) {
      return {
        data: {
          session: {
            id: 51,
            session_code: "#PK-20261122-001",
            entry_time: "2026-11-22T07:00:00Z",
            entry_image_url: "https://example.com/in.jpg",
            slot_code: "A-01",
          },
          vehicle_lookup: {
            open_session: { id: 51, session_code: "#PK-20261122-001" },
          },
        },
      };
    }
    if (url.includes("/api/v1/parking/sessions/check-out/")) {
      return {
        data: {
          payment: { method: "CASH", amount: "10000.00" },
          session: {
            id: 51,
            session_code: "#PK-20261122-001",
            fee_amount: "10000.00",
          },
        },
      };
    }
    return { data: {} };
  };

  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container);

  try {
    // 1. Entry check-in: sessionCode in parking-session-changed must be "#PK-20261122-001"
    await act(async () => {
      root.render(
        React.createElement(GateCameraControlModal, {
          isOpen: true,
          onClose: () => {},
          initialLane: "entry",
          gateId: 1,
          initialPlate: "43B99977",
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const checkInBtn = container
      .querySelectorAll("button")
      .find((b) => b.textContent.includes("Xác nhận Xe Vào"));
    assert.ok(checkInBtn, "Check-in confirm button must exist");

    await act(async () => {
      checkInBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const checkInEvent = sessionEvents.find((e) => e.action === "check-in");
    assert.ok(checkInEvent, "parking-session-changed event must fire on check-in");
    assert.equal(
      checkInEvent.sessionCode,
      "#PK-20261122-001",
      "Check-in must unwrap checkInResult.session.session_code"
    );

    // 2. Exit check-out without backendFeePreview: must display 10.000đ from checkOutResult.session.fee_amount
    mode = "exit";
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
      .find(
        (b) =>
          b.textContent.includes("Mở Barrier") &&
          !b.textContent.includes("Xe Vào")
      );
    assert.ok(checkOutBtn, "Check-out confirm button must exist");

    await act(async () => {
      checkOutBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    assert.ok(
      container.textContent.includes("10.000đ"),
      `Check-out success message must show 10.000đ from checkOutResult.session.fee_amount, got: ${container.textContent}`
    );
    const checkOutEvent = sessionEvents.find((e) => e.action === "check-out");
    assert.ok(checkOutEvent, "parking-session-changed event must fire on check-out");
    assert.equal(
      checkOutEvent.sessionCode,
      "#PK-20261122-001",
      "Check-out must unwrap session_code when open_session lacked it or match #PK-20261122-001"
    );
  } finally {
    dom.win.removeEventListener("parking-session-changed", onWindowSessionChanged);
    await act(async () => {
      root.unmount();
    });
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
    axiosInstance.request = originalRequest;
    dom.restore();
  }
});

// ============================================================================
// WP2 ITERATION 5 REGRESSION TESTS (Live Camera Runtime Defects 1, 2 & Exit Caveat)
// ============================================================================

function installLiveCameraDomShim() {
  const dom = installMinimalDomShim();
  let frameTick = 0;

  dom.win.isSecureContext = true;
  const fakeTrack = {
    addEventListener: () => {},
    removeEventListener: () => {},
    stop: () => {},
  };
  const fakeStream = {
    getTracks: () => [fakeTrack],
    getVideoTracks: () => [fakeTrack],
  };
  dom.win.navigator.mediaDevices = {
    getUserMedia: async () => fakeStream,
    enumerateDevices: async () => [{ kind: "videoinput", deviceId: "cam-1", label: "Gate Cam 1" }],
  };

  const origCreateElement = dom.doc.createElement.bind(dom.doc);
  dom.doc.createElement = (tag) => {
    const el = origCreateElement(tag);
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
    return el;
  };

  return dom;
}

function installFakeTimers(startMs = 1_700_000_000_000) {
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

  async function flushMicrotasks(rounds = 8) {
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

test("WP2-ITER5-A (Defect 1): Live camera UNSEEN_TIMEOUT (>60s) clears stale camera/matching state so Auto-Apply NEVER resurrects 15:00 and allows re-detection on return", async () => {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { GateCameraControlModal, axiosInstance } = await loadCompiledFeComponents();

  const dom = installLiveCameraDomShim();
  const clock = installFakeTimers();
  const originalRequest = axiosInstance.request;

  let cameraPhase = "SEEN_UNREGISTERED"; // "SEEN_UNREGISTERED" | "GONE_422"
  let lookupCalls = 0;
  const lookupTimestamps = [];

  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/gates/")) {
      return { data: { results: [{ id: 1, code: "IN_01", direction: "IN", worker_online: false }] } };
    }
    if (url.includes("/api/v1/parking/slots/")) {
      return { data: { results: [{ id: 1, code: "A-01", status: "AVAILABLE", vehicle_type: "CAR" }] } };
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
          plate_final: "51A12345",
          review_status: "AUTO",
          confidence: 0.96,
          best_candidate: { plate_text: "51A12345", confidence: 0.96, bounding_box: { x1: 10, y1: 10, x2: 110, y2: 50 } },
        },
      };
    }
    if (url.includes("/api/v1/parking/vehicle-lookup/")) {
      lookupCalls += 1;
      lookupTimestamps.push(clock.now());
      const err = new Error("Not found");
      err.status = 404;
      err.response = { status: 404, data: { code: "MSG-4.5.1-M01" } };
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
          initialLane: "entry",
          gateId: 1,
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    // Wait for live 3-of-4 camera detection + keep-alive sightings for 16s
    await clock.advanceMs(act, 6000);
    assert.ok(
      container.querySelector('[data-testid="pending-entry-card"]'),
      "Live camera must open pending-entry-card for unregistered plate 51A12345"
    );

    await clock.advanceMs(act, 10000);
    assert.ok(
      container.querySelector('[data-testid="pending-entry-card"]'),
      "Keep-alive sightings must keep pending-entry-card alive during 16s"
    );

    // Vehicle leaves the lane -> camera returns 422 for 65 seconds
    cameraPhase = "GONE_422";
    await clock.advanceMs(act, 65000);

    assert.equal(
      Boolean(container.querySelector('[data-testid="pending-entry-card"]')),
      false,
      "Live camera pending-entry-card MUST expire permanently after >60s unseen (never resurrect back to 15:00)"
    );
    const infoBanner = container.querySelector('[data-testid="informational-banner"]');
    assert.ok(
      infoBanner && infoBanner.textContent.includes(">60 giây"),
      "Must display UNSEEN_TIMEOUT (>60 giây) banner after vehicle departs"
    );

    const lookupCountAfterExpire = lookupCalls;
    await clock.advanceMs(act, 10000);
    assert.equal(
      lookupCalls,
      lookupCountAfterExpire,
      "Must stop polling vehicle-lookup after UNSEEN_TIMEOUT expires"
    );
    assert.equal(
      Boolean(container.querySelector('[data-testid="pending-entry-card"]')),
      false,
      "pending-entry-card must stay null while road remains empty"
    );

    // Vehicle returns later -> live camera detects 51A12345 again and restarts pending cleanly
    cameraPhase = "SEEN_UNREGISTERED";
    await clock.advanceMs(act, 6000);
    assert.ok(
      container.querySelector('[data-testid="pending-entry-card"]'),
      "Returning vehicle must be re-detected cleanly and restart pending-entry-card"
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

test("WP2-ITER5-B (Defect 2): Live camera NEEDS_REVIEW conf=0.99 post-registration calls resetDetection, scans fresh AUTO 0.97, and auto-checks in", async () => {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { GateCameraControlModal, axiosInstance } = await loadCompiledFeComponents();

  const dom = installLiveCameraDomShim();
  const clock = installFakeTimers();
  const originalRequest = axiosInstance.request;

  let cameraMode = "NEEDS_REVIEW"; // "NEEDS_REVIEW" -> "AUTO"
  let isRegistered = false;
  const scanLog = [];
  const checkInPayloads = [];

  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/gates/")) {
      return { data: { results: [{ id: 1, code: "IN_01", direction: "IN", worker_online: false }] } };
    }
    if (url.includes("/api/v1/parking/slots/")) {
      return { data: { results: [{ id: 1, code: "A-01", status: "AVAILABLE", vehicle_type: "CAR" }] } };
    }
    if (url.includes("/api/v1/parking/plate-scans/")) {
      scanLog.push({ t: clock.now(), mode: cameraMode });
      if (cameraMode === "NEEDS_REVIEW") {
        return {
          data: {
            plate_final: "51A88888",
            review_status: "NEEDS_REVIEW",
            confidence: 0.99,
            best_candidate: { plate_text: "51A88888", confidence: 0.99, bounding_box: { x1: 10, y1: 10, x2: 110, y2: 50 } },
          },
        };
      }
      return {
        data: {
          plate_final: "51A88888",
          review_status: "AUTO",
          confidence: 0.97,
          image_url: "https://example.com/51a88888-auto.jpg",
          best_candidate: { plate_text: "51A88888", confidence: 0.97, bounding_box: { x1: 10, y1: 10, x2: 110, y2: 50 } },
        },
      };
    }
    if (url.includes("/api/v1/parking/vehicle-lookup/")) {
      if (!isRegistered) {
        const err = new Error("Not found");
        err.status = 404;
        err.response = { status: 404, data: { code: "MSG-4.5.1-M01" } };
        throw err;
      }
      return {
        data: {
          vehicle: { id: 88, license_plate: "51A-888.88", vehicle_type: "CAR", status: "ACTIVE" },
          customer: { id: 22, full_name: "Walk-in Owner", has_wallet: true, wallet_balance: "100000.00", wallet_status: "ACTIVE" },
          open_session: null,
        },
      };
    }
    if (url.includes("/api/v1/parking/sessions/check-in/")) {
      checkInPayloads.push(JSON.parse(config.data));
      return {
        data: {
          session: {
            id: 91,
            session_code: "#PK-20261122-091",
            entry_time: "2026-11-22T07:30:00Z",
            slot_code: "A-01",
          },
          vehicle_lookup: {
            open_session: { id: 91, session_code: "#PK-20261122-091" },
          },
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
          initialLane: "entry",
          gateId: 1,
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    // Achieve live NEEDS_REVIEW detection & start pending entry banner
    await clock.advanceMs(act, 6000);
    assert.ok(
      container.querySelector('[data-testid="pending-entry-card"]'),
      "NEEDS_REVIEW unregistered plate must display pending-entry-card"
    );
    assert.equal(checkInPayloads.length, 0, "NEEDS_REVIEW must NOT auto check-in");

    // Customer completes registration while camera switches to fresh AUTO (0.97)
    isRegistered = true;
    cameraMode = "AUTO";
    const scansBeforeRegPolling = scanLog.length;

    // 5s lookup detects registration -> clears pending banner -> must call resetDetection -> fresh AUTO scans -> auto check-in
    await clock.advanceMs(act, 12000);

    assert.equal(
      Boolean(container.querySelector('[data-testid="pending-entry-card"]')),
      false,
      "Pending entry banner must clear after registration"
    );
    const autoScansAfterReg = scanLog.slice(scansBeforeRegPolling).filter((s) => s.mode === "AUTO");
    assert.ok(
      autoScansAfterReg.length >= 3,
      `Must run fresh plate-scans after NEEDS_REVIEW registration (got ${autoScansAfterReg.length} AUTO scans)`
    );
    assert.equal(
      checkInPayloads.length,
      1,
      `Must auto check-in once after fresh AUTO 0.97 scan (got ${checkInPayloads.length})`
    );
    assert.equal(checkInPayloads[0].entry_gate_id, 1);
    assert.equal(checkInPayloads[0].recognition_source, "AI");
    assert.equal(checkInPayloads[0].ai_confidence, 0.97);
  } finally {
    await act(async () => {
      root.unmount();
    });
    clock.restore();
    axiosInstance.request = originalRequest;
    dom.restore();
  }
});

test("WP2-ITER5-C (Low Caveat): handleConfirmExit clears rawLookup.open_session so switching Làn Ra -> Làn Vào shows no stale open session", async () => {
  const React = (await import("react")).default;
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { GateCameraControlModal, axiosInstance } = await loadCompiledFeComponents();

  const dom = installMinimalDomShim();
  const originalRequest = axiosInstance.request;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  globalThis.setInterval = () => 1;
  globalThis.clearInterval = () => {};

  axiosInstance.request = async (config) => {
    const url = String(config.url || "");
    if (url.includes("/api/v1/parking/gates/")) {
      return { data: { results: [{ id: 1, worker_online: false }, { id: 3, worker_online: false }] } };
    }
    if (url.includes("/api/v1/parking/vehicle-lookup/")) {
      return {
        data: {
          vehicle: { id: 10, license_plate: "43B-999.77", vehicle_type: "CAR", status: "ACTIVE" },
          customer: { id: 20, full_name: "Test User", has_wallet: false },
          open_session: { id: 37, session_code: "#PK-20261017-037", entry_time: "2026-10-17T00:20:00Z" },
        },
      };
    }
    if (url.includes("/api/v1/parking/slots/")) {
      return { data: { results: [{ id: 1, code: "A-01", status: "AVAILABLE", vehicle_type: "CAR" }] } };
    }
    if (url.includes("/api/v1/parking/sessions/fee-preview/")) {
      return { data: { session_id: 37, session_code: "#PK-20261017-037", fee_amount: 10000 } };
    }
    if (url.includes("/api/v1/parking/sessions/check-out/")) {
      return {
        data: {
          payment: { method: "CASH", amount: "10000.00" },
          session: { id: 37, session_code: "#PK-20261017-037", fee_amount: "10000.00" },
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
          initialPlate: "43B99977",
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const checkOutBtn = container
      .querySelectorAll("button")
      .find((b) => b.textContent.includes("Mở Barrier") && !b.textContent.includes("Xe Vào"));
    assert.ok(checkOutBtn, "Exit check-out button must exist");

    await act(async () => {
      checkOutBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    assert.ok(
      container.textContent.includes("Check-out hoàn tất"),
      "Check-out must succeed"
    );

    const entryTabBtn = container
      .querySelectorAll("button")
      .find((b) => b.textContent.includes("Làn Vào"));
    assert.ok(entryTabBtn, "Làn Vào tab button must exist");

    await act(async () => {
      entryTabBtn.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    assert.ok(
      !container.textContent.includes("Xe đang có phiên gửi cũ chưa đóng"),
      "Switching from Làn Ra -> Làn Vào right after check-out must NOT show stale 'Xe đang có phiên gửi cũ chưa đóng'"
    );
  } finally {
    await act(async () => {
      root.unmount();
    });
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
    axiosInstance.request = originalRequest;
    dom.restore();
  }
});

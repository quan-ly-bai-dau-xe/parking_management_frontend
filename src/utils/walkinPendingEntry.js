import { ROUTES } from "../config/navigation.js";
import { evaluateAutoApplyPolicy } from "./gateAutoApplyPolicy.js";

export const PENDING_ENTRY_MAX_MS = 15 * 60 * 1000;
export const PENDING_UNSEEN_TIMEOUT_MS = 60 * 1000;

export function normalizeConfidencePercent(rawConf) {
  if (rawConf === null || rawConf === undefined || rawConf === "") {
    return 0.0;
  }
  const num = Number(rawConf);
  if (!Number.isFinite(num) || num <= 0) {
    return 0.0;
  }
  return num <= 1.0 ? num * 100.0 : num;
}

export function isMatchedVehicleRegistered(matchedVehicle) {
  if (!matchedVehicle || typeof matchedVehicle !== "object") {
    return false;
  }
  if (matchedVehicle.is_registered !== undefined) {
    return Boolean(matchedVehicle.is_registered);
  }
  if (matchedVehicle.isRegistered !== undefined) {
    return Boolean(matchedVehicle.isRegistered);
  }
  if (matchedVehicle.registered !== undefined) {
    return Boolean(matchedVehicle.registered);
  }
  const vid = matchedVehicle.id || matchedVehicle.vehicle_id || matchedVehicle.vehicleId;
  const isWalkIn = Boolean(vid && String(vid).startsWith("WALK_IN_"));
  return Boolean(vid) && !isWalkIn;
}

/**
 * Evaluate Browser Mode Entry decision without auto-checking-in NEEDS_REVIEW or LOW_CONFIDENCE,
 * while still enabling the walk-in waiting banner whenever the sighted vehicle is unregistered.
 */
export function evaluateBrowserEntryDecision({
  gateActive = true,
  isAutoScan = true,
  isPlateStable = true,
  reviewStatus = "AUTO",
  rawConfidence = 0.0,
  confidenceThreshold = 90.0,
  matchedVehicle = null,
  openSession = null,
  hasOpenSession = Boolean(openSession),
  isBlacklisted = false,
  availableSlot = null,
} = {}) {
  const normalizedConfidence = normalizeConfidencePercent(rawConfidence);
  const policy = evaluateAutoApplyPolicy({
    direction: "IN",
    gateActive,
    isAutoScan,
    reviewStatus,
    confidence: normalizedConfidence,
    confidenceThreshold,
    isPlateStable,
    vehicleMatch: matchedVehicle ? { ...matchedVehicle, is_blacklisted: isBlacklisted } : null,
    openSession: openSession || (hasOpenSession ? { open: true } : null),
    availableSlot,
  });

  const isRegistered = isMatchedVehicleRegistered(matchedVehicle);
  const shouldAutoCheckIn = Boolean(policy.canAutoApply);
  const shouldStartPendingEntry =
    Boolean(gateActive) &&
    Boolean(isAutoScan) &&
    Boolean(isPlateStable) &&
    !shouldAutoCheckIn &&
    !hasOpenSession &&
    !isBlacklisted &&
    !isRegistered;

  return {
    policy,
    normalizedConfidence,
    isRegistered,
    shouldAutoCheckIn,
    shouldStartPendingEntry,
  };
}

export function evaluatePendingEntryLiveness(pendingEntryInfo, nowMs = Date.now()) {
  if (!pendingEntryInfo || typeof pendingEntryInfo !== "object") {
    return { alive: false, reason: "NONE" };
  }
  if (pendingEntryInfo.expiresAt && nowMs >= pendingEntryInfo.expiresAt) {
    return { alive: false, reason: "EXPIRED_15M" };
  }
  if (pendingEntryInfo.mode !== "worker") {
    const lastSeen = pendingEntryInfo.lastSeenAt ?? pendingEntryInfo.startedAt;
    if (typeof lastSeen === "number" && nowMs - lastSeen > PENDING_UNSEEN_TIMEOUT_MS) {
      return { alive: false, reason: "UNSEEN_TIMEOUT" };
    }
  }
  return { alive: true, reason: "ACTIVE" };
}

export function evaluatePendingExitLiveness(pendingExitInfo, nowMs = Date.now()) {
  if (!pendingExitInfo || typeof pendingExitInfo !== "object") {
    return { alive: false, reason: "NONE" };
  }
  const maxDeadline =
    pendingExitInfo.expiresAt ||
    (pendingExitInfo.startedAt ? pendingExitInfo.startedAt + PENDING_ENTRY_MAX_MS : 0);
  if (maxDeadline && nowMs >= maxDeadline) {
    return { alive: false, reason: "EXPIRED_15M" };
  }
  if (pendingExitInfo.mode !== "worker") {
    const lastSeen = pendingExitInfo.lastSeenAt ?? pendingExitInfo.startedAt;
    if (typeof lastSeen === "number" && nowMs - lastSeen > PENDING_UNSEEN_TIMEOUT_MS) {
      return { alive: false, reason: "UNSEEN_TIMEOUT" };
    }
  }
  return { alive: true, reason: "ACTIVE" };
}

export function syncPendingEntryFromWorkerEvent(
  currentPending,
  lastAutoEvent,
  nowMs = Date.now()
) {
  if (!lastAutoEvent || typeof lastAutoEvent !== "object") {
    return currentPending || null;
  }

  const action = String(lastAutoEvent.action || "").toUpperCase();
  const reason = String(lastAutoEvent.reason || "").toUpperCase();

  if (action === "GATE_AUTO_CHECK_IN" || reason === "PENDING_ENTRY_EXPIRED") {
    return null;
  }

  if (action === "GATE_AUTO_NEEDS_STAFF" && reason === "UNREGISTERED_VEHICLE") {
    const parsedStart = Date.parse(lastAutoEvent.occurred_at || "");
    if (!Number.isFinite(parsedStart)) {
      return null;
    }
    const expiresAt = parsedStart + PENDING_ENTRY_MAX_MS;
    if (nowMs >= expiresAt) {
      return null;
    }
    return {
      mode: "worker",
      plate: "",
      plateMasked: lastAutoEvent.license_plate_masked || "",
      startedAt: parsedStart,
      lastSeenAt: nowMs,
      expiresAt,
      occurredAt: lastAutoEvent.occurred_at || "",
    };
  }

  return null;
}

export function buildQuickRegisterUrl(origin, pendingEntryInfo) {
  if (!pendingEntryInfo || typeof pendingEntryInfo !== "object") {
    return "";
  }
  const baseOrigin = String(origin || "");
  const rawPlate = String(pendingEntryInfo.plate || "").trim();
  if (rawPlate && !rawPlate.includes("*")) {
    return `${baseOrigin}${ROUTES.REGISTER}?plate=${encodeURIComponent(rawPlate)}`;
  }
  return `${baseOrigin}${ROUTES.REGISTER}`;
}

export function getPendingEntryEffectKey(pendingEntryInfo) {
  if (!pendingEntryInfo || typeof pendingEntryInfo !== "object") {
    return "";
  }
  return `${pendingEntryInfo.mode || ""}|${pendingEntryInfo.plate || ""}|${pendingEntryInfo.startedAt || 0}|${pendingEntryInfo.expiresAt || 0}`;
}

/**
 * Determine whether a registered vehicle lookup can auto-check-in immediately
 * with the current scan result, or requires a fresh live scan via resetDetection().
 */
export function evaluatePostRegistrationAction({
  detectedData = null,
  scanDetails = null,
} = {}) {
  const reviewStatus =
    detectedData?.review_status || scanDetails?.reviewStatus || "AUTO";
  const rawConf =
    scanDetails?.confidence ??
    detectedData?.confidence ??
    detectedData?.best_candidate?.confidence ??
    null;
  const normalizedConfidence = normalizeConfidencePercent(rawConf);
  const canImmediateAutoCheckIn =
    reviewStatus === "AUTO" && normalizedConfidence >= 90.0;
  return {
    canImmediateAutoCheckIn,
    requiresFreshScan: !canImmediateAutoCheckIn,
    reviewStatus,
    normalizedConfidence,
  };
}

export async function executePendingEntryLookupTick({
  pendingEntry,
  nowMs = Date.now(),
  nowFn = null,
  isBusy = () => false,
  lookupVehicleByPlate,
  onExpired,
  onRegistered,
}) {
  if (!pendingEntry || !pendingEntry.plate) {
    return { status: "idle" };
  }
  const currentNow = nowFn ? nowFn() : nowMs;
  const liveness = evaluatePendingEntryLiveness(pendingEntry, currentNow);
  if (!liveness.alive) {
    onExpired?.(liveness);
    return { status: "expired", reason: liveness.reason };
  }
  if (isBusy()) {
    return { status: "busy" };
  }
  const lookupRes = await lookupVehicleByPlate(pendingEntry.plate);
  if (
    lookupRes &&
    (lookupRes.vehicle?.id || lookupRes.vehicle_id || lookupRes.id)
  ) {
    const postNow = nowFn ? nowFn() : currentNow;
    const postLiveness = evaluatePendingEntryLiveness(pendingEntry, postNow);
    if (!postLiveness.alive) {
      onExpired?.(postLiveness);
      return { status: "expired_post_lookup", reason: postLiveness.reason };
    }
    await onRegistered?.(pendingEntry.plate, lookupRes);
    return { status: "registered", plate: pendingEntry.plate };
  }
  return { status: "waiting" };
}

/**
 * Pure auto-apply decision policy for barrier gate automation.
 * Implements ADR-0011 Section 2.5 Decision Table strictly (TL-69, TL-71).
 * Side-effect free, deterministic, mirrors backend decide_gate_action service.
 */

// ==============================================================================
// Action & Audit Action Constants (ADR-0011 Section 2.5, TL-69)
// ==============================================================================
export const ACTION_AUTO_CHECK_IN = 'AUTO_CHECK_IN';
export const ACTION_AUTO_CHECK_OUT = 'AUTO_CHECK_OUT';
export const ACTION_HOLD = 'HOLD';

export const AUDIT_GATE_AUTO_CHECK_IN = 'GATE_AUTO_CHECK_IN';
export const AUDIT_GATE_AUTO_CHECK_OUT = 'GATE_AUTO_CHECK_OUT';
export const AUDIT_GATE_AUTO_NEEDS_STAFF = 'GATE_AUTO_NEEDS_STAFF';
export const AUDIT_GATE_AUTO_PAYMENT_REQUIRED = 'GATE_AUTO_PAYMENT_REQUIRED';

// ==============================================================================
// Reason Code Constants (ADR-0011 Section 2.5, TL-69)
// ==============================================================================
export const REASON_GATE_INACTIVE = 'GATE_INACTIVE';
export const REASON_AUTO_SCAN_DISABLED = 'AUTO_SCAN_DISABLED';
export const REASON_PLATE_UNSTABLE = 'PLATE_UNSTABLE';
export const REASON_NEEDS_REVIEW = 'NEEDS_REVIEW';
export const REASON_LOW_CONFIDENCE = 'LOW_CONFIDENCE';
export const REASON_BLACKLISTED = 'BLACKLISTED';
export const REASON_OPEN_SESSION_ALREADY_EXISTS = 'OPEN_SESSION_ALREADY_EXISTS';
export const REASON_UNREGISTERED_VEHICLE = 'UNREGISTERED_VEHICLE';
export const REASON_NO_AVAILABLE_SLOT = 'NO_AVAILABLE_SLOT';
export const REASON_VALID_REGISTERED = 'VALID_REGISTERED';
export const REASON_NO_OPEN_SESSION = 'NO_OPEN_SESSION';
export const REASON_FEE_PAYMENT_REQUIRED = 'FEE_PAYMENT_REQUIRED';
export const REASON_VALID_FEE_ZERO = 'VALID_FEE_ZERO';
export const REASON_VALID_WALLET_PAID = 'VALID_WALLET_PAID';
export const REASON_WALLET_INSUFFICIENT = 'WALLET_INSUFFICIENT';
export const REASON_EXECUTION_FAILED = 'EXECUTION_FAILED';

/**
 * Pure function evaluating camera detection and vehicle state against
 * the 12-row truth table in ADR-0011 Section 2.5.
 *
 * @param {Object} params
 * @param {string} [params.direction='IN'] - 'IN' | 'OUT' (or laneMode 'entry' | 'exit')
 * @param {boolean} [params.gateActive=true] - Gate operational status
 * @param {boolean} [params.isAutoScan=true] - Whether automated scanning is enabled
 * @param {string} [params.reviewStatus='AUTO'] - 'AUTO' | 'NEEDS_REVIEW' from plate recognizer
 * @param {number|null} [params.confidence=null] - Recognized plate confidence percentage
 * @param {number} [params.confidenceThreshold=90.0] - Minimum acceptable confidence
 * @param {boolean} [params.isPlateStable=true] - 3-of-4 temporal stability vote status
 * @param {Object|null} [params.vehicleMatch=null] - Vehicle registration and blacklist status
 * @param {Object|null} [params.openSession=null] - Active open parking session, if any
 * @param {Object|null} [params.availableSlot=null] - Compatible available parking slot, if any
 * @param {number|string|Object|null} [params.feePreview=null] - Calculated checkout parking fee
 *
 * @returns {{
 *   canAutoApply: boolean,
 *   action: string,
 *   auditAction: string|null,
 *   reason: string,
 *   reasonCode: string,
 *   needsStaff: boolean,
 *   paymentRequired: boolean,
 *   isApproved: boolean
 * }}
 */
export function evaluateAutoApplyPolicy(params = {}) {
  const {
    direction: rawDirection,
    laneMode,
    gateActive = params.gate_active !== undefined ? params.gate_active : true,
    isAutoScan = params.is_auto_scan !== undefined ? params.is_auto_scan : true,
    reviewStatus = params.review_status !== undefined ? params.review_status : 'AUTO',
    confidence = params.confidence !== undefined ? params.confidence : null,
    confidenceThreshold = params.confidence_threshold !== undefined
      ? params.confidence_threshold
      : 90.0,
    isPlateStable = params.is_plate_stable !== undefined ? params.is_plate_stable : true,
    vehicleMatch = params.vehicle_match !== undefined ? params.vehicle_match : null,
    openSession = params.open_session !== undefined ? params.open_session : null,
    availableSlot = params.available_slot !== undefined ? params.available_slot : null,
    feePreview = params.fee_preview !== undefined ? params.fee_preview : null,
    customerHasWallet: rawCustomerHasWallet,
    walletBalance: rawWalletBalance,
    walletStatus: rawWalletStatus,
  } = params;

  const customerHasWallet = Boolean(
    rawCustomerHasWallet ??
      params.customer_has_wallet ??
      params.hasWallet ??
      params.has_wallet ??
      vehicleMatch?.customer?.hasWallet ??
      vehicleMatch?.customer?.has_wallet ??
      vehicleMatch?.hasWallet ??
      vehicleMatch?.has_wallet ??
      false
  );
  const walletBalance =
    rawWalletBalance !== undefined
      ? rawWalletBalance
      : params.wallet_balance !== undefined
        ? params.wallet_balance
        : vehicleMatch?.customer?.walletBalance !== undefined
          ? vehicleMatch.customer.walletBalance
          : vehicleMatch?.customer?.wallet_balance !== undefined
            ? vehicleMatch.customer.wallet_balance
            : null;
  const walletStatus =
    rawWalletStatus !== undefined
      ? rawWalletStatus
      : params.wallet_status !== undefined
        ? params.wallet_status
        : vehicleMatch?.customer?.walletStatus !== undefined
          ? vehicleMatch.customer.walletStatus
          : vehicleMatch?.customer?.wallet_status !== undefined
            ? vehicleMatch.customer.wallet_status
            : 'ACTIVE';

  // --------------------------------------------------------------------------
  // Row 1: Gate inactive or auto-scan disabled -> HOLD, no audit action
  // --------------------------------------------------------------------------
  if (!gateActive) {
    return {
      canAutoApply: false,
      isApproved: false,
      action: ACTION_HOLD,
      auditAction: null,
      reason: REASON_GATE_INACTIVE,
      reasonCode: REASON_GATE_INACTIVE,
      needsStaff: false,
      paymentRequired: false,
    };
  }

  if (!isAutoScan) {
    return {
      canAutoApply: false,
      isApproved: false,
      action: ACTION_HOLD,
      auditAction: null,
      reason: REASON_AUTO_SCAN_DISABLED,
      reasonCode: REASON_AUTO_SCAN_DISABLED,
      needsStaff: false,
      paymentRequired: false,
    };
  }

  // --------------------------------------------------------------------------
  // Row 2: Unstable temporal plate voting (< 3/4 frames) -> HOLD, no audit
  // --------------------------------------------------------------------------
  if (!isPlateStable) {
    return {
      canAutoApply: false,
      isApproved: false,
      action: ACTION_HOLD,
      auditAction: null,
      reason: REASON_PLATE_UNSTABLE,
      reasonCode: REASON_PLATE_UNSTABLE,
      needsStaff: false,
      paymentRequired: false,
    };
  }

  // --------------------------------------------------------------------------
  // Row 3: OCR Review Status is not AUTO -> HOLD, alert staff
  // --------------------------------------------------------------------------
  if (reviewStatus !== 'AUTO') {
    return {
      canAutoApply: false,
      isApproved: false,
      action: ACTION_HOLD,
      auditAction: AUDIT_GATE_AUTO_NEEDS_STAFF,
      reason: REASON_NEEDS_REVIEW,
      reasonCode: REASON_NEEDS_REVIEW,
      needsStaff: true,
      paymentRequired: false,
    };
  }

  // --------------------------------------------------------------------------
  // Row 4: Confidence below required threshold -> HOLD, no audit spam
  // --------------------------------------------------------------------------
  let conf;
  let thresh;
  try {
    conf = confidence !== null && confidence !== undefined && !Number.isNaN(Number(confidence))
      ? Number(confidence)
      : 0.0;
    thresh = confidenceThreshold !== null &&
      confidenceThreshold !== undefined &&
      !Number.isNaN(Number(confidenceThreshold))
      ? Number(confidenceThreshold)
      : 90.0;
  } catch {
    conf = 0.0;
    thresh = 90.0;
  }

  if (conf < thresh) {
    return {
      canAutoApply: false,
      isApproved: false,
      action: ACTION_HOLD,
      auditAction: null,
      reason: REASON_LOW_CONFIDENCE,
      reasonCode: REASON_LOW_CONFIDENCE,
      needsStaff: false,
      paymentRequired: false,
    };
  }

  // --------------------------------------------------------------------------
  // Row 5: Plate or vehicle is blacklisted -> HOLD, alert staff immediately
  // --------------------------------------------------------------------------
  let isBlacklisted = false;
  if (vehicleMatch && typeof vehicleMatch === 'object') {
    isBlacklisted = Boolean(
      vehicleMatch.is_blacklisted ||
        vehicleMatch.isBlacklisted ||
        vehicleMatch.blacklisted
    );
  }

  if (isBlacklisted) {
    return {
      canAutoApply: false,
      isApproved: false,
      action: ACTION_HOLD,
      auditAction: AUDIT_GATE_AUTO_NEEDS_STAFF,
      reason: REASON_BLACKLISTED,
      reasonCode: REASON_BLACKLISTED,
      needsStaff: true,
      paymentRequired: false,
    };
  }

  // Determine normalized direction: 'IN' or 'OUT'
  let direction = 'IN';
  if (rawDirection) {
    const d = String(rawDirection).trim().toUpperCase();
    if (d === 'OUT' || d === 'EXIT') {
      direction = 'OUT';
    } else if (d === 'IN' || d === 'ENTRY') {
      direction = 'IN';
    } else {
      direction = d;
    }
  } else if (laneMode) {
    const lm = String(laneMode).trim().toLowerCase();
    direction = lm === 'exit' || lm === 'out' ? 'OUT' : 'IN';
  }

  // ==========================================================================
  // ENTRY BARRIER RULES (Direction: IN)
  // ==========================================================================
  if (direction === 'IN') {
    // Row 6: Wildcard Row 6 - Active session already exists for this plate
    if (openSession) {
      return {
        canAutoApply: false,
        isApproved: false,
        action: ACTION_HOLD,
        auditAction: AUDIT_GATE_AUTO_NEEDS_STAFF,
        reason: REASON_OPEN_SESSION_ALREADY_EXISTS,
        reasonCode: REASON_OPEN_SESSION_ALREADY_EXISTS,
        needsStaff: true,
        paymentRequired: false,
      };
    }

    // Row 7: Unregistered vehicle -> HOLD, requires manual staff assignment
    let isRegistered = false;
    if (vehicleMatch && typeof vehicleMatch === 'object') {
      if (vehicleMatch.is_registered !== undefined) {
        isRegistered = Boolean(vehicleMatch.is_registered);
      } else if (vehicleMatch.isRegistered !== undefined) {
        isRegistered = Boolean(vehicleMatch.isRegistered);
      } else if (vehicleMatch.registered !== undefined) {
        isRegistered = Boolean(vehicleMatch.registered);
      } else {
        // Dict presence: if it is a walk-in placeholder or has no valid vehicle id, it's not registered
        const vid = vehicleMatch.id || vehicleMatch.vehicle_id || vehicleMatch.vehicleId;
        const isWalkIn = vid && String(vid).startsWith('WALK_IN_');
        isRegistered = Boolean(vid) && !isWalkIn;
      }
    }

    if (!isRegistered) {
      return {
        canAutoApply: false,
        isApproved: false,
        action: ACTION_HOLD,
        auditAction: AUDIT_GATE_AUTO_NEEDS_STAFF,
        reason: REASON_UNREGISTERED_VEHICLE,
        reasonCode: REASON_UNREGISTERED_VEHICLE,
        needsStaff: true,
        paymentRequired: false,
      };
    }

    // Row 8: Registered vehicle but no compatible parking slot available
    if (!availableSlot) {
      return {
        canAutoApply: false,
        isApproved: false,
        action: ACTION_HOLD,
        auditAction: AUDIT_GATE_AUTO_NEEDS_STAFF,
        reason: REASON_NO_AVAILABLE_SLOT,
        reasonCode: REASON_NO_AVAILABLE_SLOT,
        needsStaff: true,
        paymentRequired: false,
      };
    }

    // Row 9: Registered vehicle with available slot -> Automated barrier open
    return {
      canAutoApply: true,
      isApproved: true,
      action: ACTION_AUTO_CHECK_IN,
      auditAction: AUDIT_GATE_AUTO_CHECK_IN,
      reason: REASON_VALID_REGISTERED,
      reasonCode: REASON_VALID_REGISTERED,
      needsStaff: false,
      paymentRequired: false,
    };
  }

  // ==========================================================================
  // EXIT BARRIER RULES (Direction: OUT)
  // ==========================================================================
  if (direction === 'OUT') {
    // Row 10: No active open session found for vehicle -> HOLD, needs staff
    if (!openSession) {
      return {
        canAutoApply: false,
        isApproved: false,
        action: ACTION_HOLD,
        auditAction: AUDIT_GATE_AUTO_NEEDS_STAFF,
        reason: REASON_NO_OPEN_SESSION,
        reasonCode: REASON_NO_OPEN_SESSION,
        needsStaff: true,
        paymentRequired: false,
      };
    }

    // Parse fee amount
    let feeAmount = 1.0;
    let rawFee = feePreview;
    if (rawFee && typeof rawFee === 'object') {
      rawFee = rawFee.fee_amount !== undefined ? rawFee.fee_amount : rawFee.feeAmount;
    }

    if (rawFee !== null && rawFee !== undefined) {
      const parsed = Number(rawFee);
      if (!Number.isNaN(parsed)) {
        feeAmount = parsed;
      }
    }

    // Row 11: Fee preview > 0.00 -> check customer wallet before holding
    if (feeAmount > 0.0) {
      if (customerHasWallet) {
        const parsedBal =
          walletBalance !== null && walletBalance !== undefined && walletBalance !== ''
            ? Number(walletBalance)
            : NaN;
        if (
          walletStatus !== null &&
          walletStatus !== undefined &&
          String(walletStatus).toUpperCase() === 'ACTIVE' &&
          Number.isFinite(parsedBal) &&
          parsedBal >= feeAmount
        ) {
          return {
            canAutoApply: true,
            isApproved: true,
            action: ACTION_AUTO_CHECK_OUT,
            auditAction: AUDIT_GATE_AUTO_CHECK_OUT,
            reason: REASON_VALID_WALLET_PAID,
            reasonCode: REASON_VALID_WALLET_PAID,
            needsStaff: false,
            paymentRequired: false,
          };
        }
        return {
          canAutoApply: false,
          isApproved: false,
          action: ACTION_HOLD,
          auditAction: AUDIT_GATE_AUTO_PAYMENT_REQUIRED,
          reason: REASON_WALLET_INSUFFICIENT,
          reasonCode: REASON_WALLET_INSUFFICIENT,
          needsStaff: false,
          paymentRequired: true,
        };
      }
      return {
        canAutoApply: false,
        isApproved: false,
        action: ACTION_HOLD,
        auditAction: AUDIT_GATE_AUTO_PAYMENT_REQUIRED,
        reason: REASON_FEE_PAYMENT_REQUIRED,
        reasonCode: REASON_FEE_PAYMENT_REQUIRED,
        needsStaff: false,
        paymentRequired: true,
      };
    }

    // Row 12: Fee preview == 0.00 (subscription ticket or free tier) -> Auto checkout
    if (feeAmount === 0.0) {
      return {
        canAutoApply: true,
        isApproved: true,
        action: ACTION_AUTO_CHECK_OUT,
        auditAction: AUDIT_GATE_AUTO_CHECK_OUT,
        reason: REASON_VALID_FEE_ZERO,
        reasonCode: REASON_VALID_FEE_ZERO,
        needsStaff: false,
        paymentRequired: false,
      };
    }

    // Negative fee fallback -> HOLD, payment required
    return {
      canAutoApply: false,
      isApproved: false,
      action: ACTION_HOLD,
      auditAction: AUDIT_GATE_AUTO_PAYMENT_REQUIRED,
      reason: REASON_FEE_PAYMENT_REQUIRED,
      reasonCode: REASON_FEE_PAYMENT_REQUIRED,
      needsStaff: false,
      paymentRequired: true,
    };
  }

  // Fallback: Unrecognized direction -> HOLD
  return {
    canAutoApply: false,
    isApproved: false,
    action: ACTION_HOLD,
    auditAction: null,
    reason: REASON_GATE_INACTIVE,
    reasonCode: REASON_GATE_INACTIVE,
    needsStaff: false,
    paymentRequired: false,
  };
}

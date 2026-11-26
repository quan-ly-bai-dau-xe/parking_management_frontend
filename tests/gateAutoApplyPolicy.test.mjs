import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ACTION_AUTO_CHECK_IN,
  ACTION_AUTO_CHECK_OUT,
  ACTION_HOLD,
  AUDIT_GATE_AUTO_CHECK_IN,
  AUDIT_GATE_AUTO_CHECK_OUT,
  AUDIT_GATE_AUTO_NEEDS_STAFF,
  AUDIT_GATE_AUTO_PAYMENT_REQUIRED,
  REASON_AUTO_SCAN_DISABLED,
  REASON_BLACKLISTED,
  REASON_EXECUTION_FAILED,
  REASON_FEE_PAYMENT_REQUIRED,
  REASON_GATE_INACTIVE,
  REASON_LOW_CONFIDENCE,
  REASON_NEEDS_REVIEW,
  REASON_NO_AVAILABLE_SLOT,
  REASON_NO_OPEN_SESSION,
  REASON_OPEN_SESSION_ALREADY_EXISTS,
  REASON_PLATE_UNSTABLE,
  REASON_UNREGISTERED_VEHICLE,
  REASON_VALID_FEE_ZERO,
  REASON_VALID_REGISTERED,
  REASON_VALID_WALLET_PAID,
  REASON_WALLET_INSUFFICIENT,
  evaluateAutoApplyPolicy,
} from '../src/utils/gateAutoApplyPolicy.js';
import { computeDownscaledDimensions } from '../src/utils/plateAutoDetect.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOCK_REGISTERED_VEHICLE = {
  vehicle_id: 101,
  license_plate: '51A-897.14',
  is_registered: true,
  is_blacklisted: false,
};

const MOCK_UNREGISTERED_VEHICLE = {
  vehicle_id: null,
  license_plate: '43A-999.88',
  is_registered: false,
  is_blacklisted: false,
};

const MOCK_BLACKLISTED_VEHICLE = {
  vehicle_id: 102,
  license_plate: '29X-666.77',
  is_registered: true,
  is_blacklisted: true,
};

const MOCK_OPEN_SESSION = {
  session_id: 5001,
  session_code: 'SES-20261108-0001',
  license_plate: '51A-897.14',
};

const MOCK_SLOT = {
  slot_id: 12,
  slot_code: 'A-01',
};

const TRUTH_TABLE_CASES = [
  // Row 1a: Gate inactive -> HOLD, null, GATE_INACTIVE
  {
    name: 'Row 1a: Gate inactive',
    input: {
      direction: 'IN',
      gateActive: false,
      isAutoScan: true,
      reviewStatus: 'AUTO',
      confidence: 95.0,
      confidenceThreshold: 90.0,
      isPlateStable: true,
      vehicleMatch: MOCK_REGISTERED_VEHICLE,
      openSession: null,
      availableSlot: MOCK_SLOT,
      feePreview: null,
    },
    expected: {
      action: ACTION_HOLD,
      auditAction: null,
      reason: REASON_GATE_INACTIVE,
      canAutoApply: false,
      needsStaff: false,
      paymentRequired: false,
    },
  },
  // Row 1b: Auto scan disabled -> HOLD, null, AUTO_SCAN_DISABLED
  {
    name: 'Row 1b: Auto scan disabled',
    input: {
      direction: 'IN',
      gateActive: true,
      isAutoScan: false,
      reviewStatus: 'AUTO',
      confidence: 95.0,
      confidenceThreshold: 90.0,
      isPlateStable: true,
      vehicleMatch: MOCK_REGISTERED_VEHICLE,
      openSession: null,
      availableSlot: MOCK_SLOT,
      feePreview: null,
    },
    expected: {
      action: ACTION_HOLD,
      auditAction: null,
      reason: REASON_AUTO_SCAN_DISABLED,
      canAutoApply: false,
      needsStaff: false,
      paymentRequired: false,
    },
  },
  // Row 2: Unstable voting (< 3/4) -> HOLD, null, PLATE_UNSTABLE
  {
    name: 'Row 2: Plate unstable',
    input: {
      direction: 'IN',
      gateActive: true,
      isAutoScan: true,
      reviewStatus: 'AUTO',
      confidence: 95.0,
      confidenceThreshold: 90.0,
      isPlateStable: false,
      vehicleMatch: MOCK_REGISTERED_VEHICLE,
      openSession: null,
      availableSlot: MOCK_SLOT,
      feePreview: null,
    },
    expected: {
      action: ACTION_HOLD,
      auditAction: null,
      reason: REASON_PLATE_UNSTABLE,
      canAutoApply: false,
      needsStaff: false,
      paymentRequired: false,
    },
  },
  // Row 3: Review status != AUTO -> HOLD, GATE_AUTO_NEEDS_STAFF, NEEDS_REVIEW
  {
    name: 'Row 3: Review status NEEDS_REVIEW',
    input: {
      direction: 'IN',
      gateActive: true,
      isAutoScan: true,
      reviewStatus: 'NEEDS_REVIEW',
      confidence: 95.0,
      confidenceThreshold: 90.0,
      isPlateStable: true,
      vehicleMatch: MOCK_REGISTERED_VEHICLE,
      openSession: null,
      availableSlot: MOCK_SLOT,
      feePreview: null,
    },
    expected: {
      action: ACTION_HOLD,
      auditAction: AUDIT_GATE_AUTO_NEEDS_STAFF,
      reason: REASON_NEEDS_REVIEW,
      canAutoApply: false,
      needsStaff: true,
      paymentRequired: false,
    },
  },
  // Row 4: Low confidence (< threshold) -> HOLD, null, LOW_CONFIDENCE
  {
    name: 'Row 4: Low confidence',
    input: {
      direction: 'IN',
      gateActive: true,
      isAutoScan: true,
      reviewStatus: 'AUTO',
      confidence: 88.5,
      confidenceThreshold: 90.0,
      isPlateStable: true,
      vehicleMatch: MOCK_REGISTERED_VEHICLE,
      openSession: null,
      availableSlot: MOCK_SLOT,
      feePreview: null,
    },
    expected: {
      action: ACTION_HOLD,
      auditAction: null,
      reason: REASON_LOW_CONFIDENCE,
      canAutoApply: false,
      needsStaff: false,
      paymentRequired: false,
    },
  },
  // Row 5: Blacklisted plate -> HOLD, GATE_AUTO_NEEDS_STAFF, BLACKLISTED
  {
    name: 'Row 5: Blacklisted plate',
    input: {
      direction: 'IN',
      gateActive: true,
      isAutoScan: true,
      reviewStatus: 'AUTO',
      confidence: 95.0,
      confidenceThreshold: 90.0,
      isPlateStable: true,
      vehicleMatch: MOCK_BLACKLISTED_VEHICLE,
      openSession: null,
      availableSlot: MOCK_SLOT,
      feePreview: null,
    },
    expected: {
      action: ACTION_HOLD,
      auditAction: AUDIT_GATE_AUTO_NEEDS_STAFF,
      reason: REASON_BLACKLISTED,
      canAutoApply: false,
      needsStaff: true,
      paymentRequired: false,
    },
  },
  // Row 6: IN, Open session exists -> HOLD, GATE_AUTO_NEEDS_STAFF, OPEN_SESSION_ALREADY_EXISTS
  {
    name: 'Row 6: Open session duplicate entry',
    input: {
      direction: 'IN',
      gateActive: true,
      isAutoScan: true,
      reviewStatus: 'AUTO',
      confidence: 95.0,
      confidenceThreshold: 90.0,
      isPlateStable: true,
      vehicleMatch: MOCK_REGISTERED_VEHICLE,
      openSession: MOCK_OPEN_SESSION,
      availableSlot: MOCK_SLOT,
      feePreview: null,
    },
    expected: {
      action: ACTION_HOLD,
      auditAction: AUDIT_GATE_AUTO_NEEDS_STAFF,
      reason: REASON_OPEN_SESSION_ALREADY_EXISTS,
      canAutoApply: false,
      needsStaff: true,
      paymentRequired: false,
    },
  },
  // Row 7: IN, Unregistered vehicle -> HOLD, GATE_AUTO_NEEDS_STAFF, UNREGISTERED_VEHICLE
  {
    name: 'Row 7: Unregistered casual vehicle',
    input: {
      direction: 'IN',
      gateActive: true,
      isAutoScan: true,
      reviewStatus: 'AUTO',
      confidence: 95.0,
      confidenceThreshold: 90.0,
      isPlateStable: true,
      vehicleMatch: MOCK_UNREGISTERED_VEHICLE,
      openSession: null,
      availableSlot: MOCK_SLOT,
      feePreview: null,
    },
    expected: {
      action: ACTION_HOLD,
      auditAction: AUDIT_GATE_AUTO_NEEDS_STAFF,
      reason: REASON_UNREGISTERED_VEHICLE,
      canAutoApply: false,
      needsStaff: true,
      paymentRequired: false,
    },
  },
  // Row 8: IN, Registered but no slot -> HOLD, GATE_AUTO_NEEDS_STAFF, NO_AVAILABLE_SLOT
  {
    name: 'Row 8: No parking slot available',
    input: {
      direction: 'IN',
      gateActive: true,
      isAutoScan: true,
      reviewStatus: 'AUTO',
      confidence: 95.0,
      confidenceThreshold: 90.0,
      isPlateStable: true,
      vehicleMatch: MOCK_REGISTERED_VEHICLE,
      openSession: null,
      availableSlot: null,
      feePreview: null,
    },
    expected: {
      action: ACTION_HOLD,
      auditAction: AUDIT_GATE_AUTO_NEEDS_STAFF,
      reason: REASON_NO_AVAILABLE_SLOT,
      canAutoApply: false,
      needsStaff: true,
      paymentRequired: false,
    },
  },
  // Row 9: IN, Registered + slot -> AUTO_CHECK_IN, GATE_AUTO_CHECK_IN, VALID_REGISTERED
  {
    name: 'Row 9: Valid auto check-in',
    input: {
      direction: 'IN',
      gateActive: true,
      isAutoScan: true,
      reviewStatus: 'AUTO',
      confidence: 95.0,
      confidenceThreshold: 90.0,
      isPlateStable: true,
      vehicleMatch: MOCK_REGISTERED_VEHICLE,
      openSession: null,
      availableSlot: MOCK_SLOT,
      feePreview: null,
    },
    expected: {
      action: ACTION_AUTO_CHECK_IN,
      auditAction: AUDIT_GATE_AUTO_CHECK_IN,
      reason: REASON_VALID_REGISTERED,
      canAutoApply: true,
      needsStaff: false,
      paymentRequired: false,
    },
  },
  // Row 10: OUT, No open session -> HOLD, GATE_AUTO_NEEDS_STAFF, NO_OPEN_SESSION
  {
    name: 'Row 10: Exit without open session',
    input: {
      direction: 'OUT',
      gateActive: true,
      isAutoScan: true,
      reviewStatus: 'AUTO',
      confidence: 95.0,
      confidenceThreshold: 90.0,
      isPlateStable: true,
      vehicleMatch: MOCK_REGISTERED_VEHICLE,
      openSession: null,
      availableSlot: null,
      feePreview: null,
    },
    expected: {
      action: ACTION_HOLD,
      auditAction: AUDIT_GATE_AUTO_NEEDS_STAFF,
      reason: REASON_NO_OPEN_SESSION,
      canAutoApply: false,
      needsStaff: true,
      paymentRequired: false,
    },
  },
  // Row 11: OUT, Open session + Fee > 0 -> HOLD, GATE_AUTO_PAYMENT_REQUIRED, FEE_PAYMENT_REQUIRED
  {
    name: 'Row 11: Exit fee payment required',
    input: {
      direction: 'OUT',
      gateActive: true,
      isAutoScan: true,
      reviewStatus: 'AUTO',
      confidence: 95.0,
      confidenceThreshold: 90.0,
      isPlateStable: true,
      vehicleMatch: MOCK_REGISTERED_VEHICLE,
      openSession: MOCK_OPEN_SESSION,
      availableSlot: null,
      feePreview: 10000.0,
    },
    expected: {
      action: ACTION_HOLD,
      auditAction: AUDIT_GATE_AUTO_PAYMENT_REQUIRED,
      reason: REASON_FEE_PAYMENT_REQUIRED,
      canAutoApply: false,
      needsStaff: false,
      paymentRequired: true,
    },
  },
  // Row 12: OUT, Open session + Fee == 0 -> AUTO_CHECK_OUT, GATE_AUTO_CHECK_OUT, VALID_FEE_ZERO
  {
    name: 'Row 12: Valid auto check-out zero fee',
    input: {
      direction: 'OUT',
      gateActive: true,
      isAutoScan: true,
      reviewStatus: 'AUTO',
      confidence: 95.0,
      confidenceThreshold: 90.0,
      isPlateStable: true,
      vehicleMatch: MOCK_REGISTERED_VEHICLE,
      openSession: MOCK_OPEN_SESSION,
      availableSlot: null,
      feePreview: 0.0,
    },
    expected: {
      action: ACTION_AUTO_CHECK_OUT,
      auditAction: AUDIT_GATE_AUTO_CHECK_OUT,
      reason: REASON_VALID_FEE_ZERO,
      canAutoApply: true,
      needsStaff: false,
      paymentRequired: false,
    },
  },
];

test('GateAutoApplyPolicy: Comprehensive 12-row truth table verification', () => {
  for (const tc of TRUTH_TABLE_CASES) {
    const res = evaluateAutoApplyPolicy(tc.input);
    assert.equal(res.action, tc.expected.action, `${tc.name}: action mismatch`);
    assert.equal(res.auditAction, tc.expected.auditAction, `${tc.name}: auditAction mismatch`);
    assert.equal(res.reason, tc.expected.reason, `${tc.name}: reason mismatch`);
    assert.equal(res.reasonCode, tc.expected.reason, `${tc.name}: reasonCode mismatch`);
    assert.equal(res.canAutoApply, tc.expected.canAutoApply, `${tc.name}: canAutoApply mismatch`);
    assert.equal(res.isApproved, tc.expected.canAutoApply, `${tc.name}: isApproved mismatch`);
    assert.equal(res.needsStaff, tc.expected.needsStaff, `${tc.name}: needsStaff mismatch`);
    assert.equal(res.paymentRequired, tc.expected.paymentRequired, `${tc.name}: paymentRequired mismatch`);
  }
});

test('GateAutoApplyPolicy: Parameter aliases (camelCase and snake_case)', () => {
  // Test snake_case inputs
  const resSnake = evaluateAutoApplyPolicy({
    direction: 'IN',
    gate_active: true,
    is_auto_scan: true,
    review_status: 'AUTO',
    confidence: 95.0,
    confidence_threshold: 90.0,
    is_plate_stable: true,
    vehicle_match: MOCK_REGISTERED_VEHICLE,
    open_session: null,
    available_slot: MOCK_SLOT,
  });
  assert.equal(resSnake.canAutoApply, true);
  assert.equal(resSnake.action, ACTION_AUTO_CHECK_IN);

  // Test laneMode alias
  const resEntry = evaluateAutoApplyPolicy({
    laneMode: 'entry',
    confidence: 95.0,
    vehicleMatch: MOCK_REGISTERED_VEHICLE,
    availableSlot: MOCK_SLOT,
  });
  assert.equal(resEntry.canAutoApply, true);
  assert.equal(resEntry.action, ACTION_AUTO_CHECK_IN);

  const resExit = evaluateAutoApplyPolicy({
    laneMode: 'exit',
    confidence: 95.0,
    openSession: MOCK_OPEN_SESSION,
    feePreview: 0.0,
  });
  assert.equal(resExit.canAutoApply, true);
  assert.equal(resExit.action, ACTION_AUTO_CHECK_OUT);
});

test('GateAutoApplyPolicy: Confidence boundary values', () => {
  // 89.99 < 90.0 -> LOW_CONFIDENCE
  const resLow = evaluateAutoApplyPolicy({
    direction: 'IN',
    confidence: 89.99,
    confidenceThreshold: 90.0,
    vehicleMatch: MOCK_REGISTERED_VEHICLE,
    availableSlot: MOCK_SLOT,
  });
  assert.equal(resLow.canAutoApply, false);
  assert.equal(resLow.reason, REASON_LOW_CONFIDENCE);

  // Exactly 90.0 >= 90.0 -> approved
  const resExact = evaluateAutoApplyPolicy({
    direction: 'IN',
    confidence: 90.0,
    confidenceThreshold: 90.0,
    vehicleMatch: MOCK_REGISTERED_VEHICLE,
    availableSlot: MOCK_SLOT,
  });
  assert.equal(resExact.canAutoApply, true);
  assert.equal(resExact.reason, REASON_VALID_REGISTERED);

  // Null or invalid confidence defaults safely to 0.0 -> LOW_CONFIDENCE
  const resNull = evaluateAutoApplyPolicy({
    direction: 'IN',
    confidence: null,
    vehicleMatch: MOCK_REGISTERED_VEHICLE,
    availableSlot: MOCK_SLOT,
  });
  assert.equal(resNull.canAutoApply, false);
  assert.equal(resNull.reason, REASON_LOW_CONFIDENCE);
});

test('GateAutoApplyPolicy: Fee preview formats and boundary values', () => {
  // Exact 0.00 number
  const resNumZero = evaluateAutoApplyPolicy({
    direction: 'OUT',
    confidence: 92.0,
    openSession: MOCK_OPEN_SESSION,
    feePreview: 0,
  });
  assert.equal(resNumZero.canAutoApply, true);
  assert.equal(resNumZero.reason, REASON_VALID_FEE_ZERO);

  // Exact '0.00' string
  const resStrZero = evaluateAutoApplyPolicy({
    direction: 'OUT',
    confidence: 92.0,
    openSession: MOCK_OPEN_SESSION,
    feePreview: '0.00',
  });
  assert.equal(resStrZero.canAutoApply, true);
  assert.equal(resStrZero.reason, REASON_VALID_FEE_ZERO);

  // Object { fee_amount: 0.0 }
  const resObjZero = evaluateAutoApplyPolicy({
    direction: 'OUT',
    confidence: 92.0,
    openSession: MOCK_OPEN_SESSION,
    feePreview: { fee_amount: 0.0 },
  });
  assert.equal(resObjZero.canAutoApply, true);
  assert.equal(resObjZero.reason, REASON_VALID_FEE_ZERO);

  // Positive fee -> payment required
  const resPenny = evaluateAutoApplyPolicy({
    direction: 'OUT',
    confidence: 92.0,
    openSession: MOCK_OPEN_SESSION,
    feePreview: 0.01,
  });
  assert.equal(resPenny.canAutoApply, false);
  assert.equal(resPenny.reason, REASON_FEE_PAYMENT_REQUIRED);
  assert.equal(resPenny.paymentRequired, true);

  // Null fee preview on exit -> payment required
  const resNullFee = evaluateAutoApplyPolicy({
    direction: 'OUT',
    confidence: 92.0,
    openSession: MOCK_OPEN_SESSION,
    feePreview: null,
  });
  assert.equal(resNullFee.canAutoApply, false);
  assert.equal(resNullFee.reason, REASON_FEE_PAYMENT_REQUIRED);
  assert.equal(resNullFee.paymentRequired, true);

  // Negative fee -> payment required fallback
  const resNegative = evaluateAutoApplyPolicy({
    direction: 'OUT',
    confidence: 92.0,
    openSession: MOCK_OPEN_SESSION,
    feePreview: -5000,
  });
  assert.equal(resNegative.canAutoApply, false);
  assert.equal(resNegative.reason, REASON_FEE_PAYMENT_REQUIRED);
  assert.equal(resNegative.paymentRequired, true);
});

test('GateAutoApplyPolicy: Row 6 Wildcard prevents entry if session exists regardless of registration', () => {
  // Unregistered with open session
  const resUnregSession = evaluateAutoApplyPolicy({
    direction: 'IN',
    confidence: 95.0,
    vehicleMatch: MOCK_UNREGISTERED_VEHICLE,
    openSession: MOCK_OPEN_SESSION,
    availableSlot: MOCK_SLOT,
  });
  assert.equal(resUnregSession.canAutoApply, false);
  assert.equal(resUnregSession.reason, REASON_OPEN_SESSION_ALREADY_EXISTS);
  assert.equal(resUnregSession.needsStaff, true);

  // Registered without slot but with open session
  const resNoSlotSession = evaluateAutoApplyPolicy({
    direction: 'IN',
    confidence: 95.0,
    vehicleMatch: MOCK_REGISTERED_VEHICLE,
    openSession: MOCK_OPEN_SESSION,
    availableSlot: null,
  });
  assert.equal(resNoSlotSession.canAutoApply, false);
  assert.equal(resNoSlotSession.reason, REASON_OPEN_SESSION_ALREADY_EXISTS);
});


test('GateAutoApplyPolicy: Precedence hierarchy is strictly preserved across all 12 rows', () => {
  assert.equal(REASON_EXECUTION_FAILED, 'EXECUTION_FAILED');

  const resInactive = evaluateAutoApplyPolicy({
    direction: 'IN',
    gateActive: false,
    isAutoScan: false,
    isPlateStable: false,
    reviewStatus: 'NEEDS_REVIEW',
    confidence: 10.0,
    vehicleMatch: { is_blacklisted: true, is_registered: false },
    openSession: { session_id: 1 },
    availableSlot: null,
  });
  assert.equal(resInactive.action, ACTION_HOLD);
  assert.equal(resInactive.reason, REASON_GATE_INACTIVE);
  assert.equal(resInactive.auditAction, null);

  const resNoAutoScan = evaluateAutoApplyPolicy({
    direction: 'IN',
    gateActive: true,
    isAutoScan: false,
    isPlateStable: false,
    reviewStatus: 'NEEDS_REVIEW',
    confidence: 10.0,
    vehicleMatch: { is_blacklisted: true },
  });
  assert.equal(resNoAutoScan.reason, REASON_AUTO_SCAN_DISABLED);
  assert.equal(resNoAutoScan.auditAction, null);

  const resUnstable = evaluateAutoApplyPolicy({
    direction: 'IN',
    gateActive: true,
    isAutoScan: true,
    isPlateStable: false,
    reviewStatus: 'NEEDS_REVIEW',
    confidence: 50.0,
    vehicleMatch: { is_blacklisted: true },
  });
  assert.equal(resUnstable.reason, REASON_PLATE_UNSTABLE);

  const resReviewStatus = evaluateAutoApplyPolicy({
    direction: 'IN',
    gateActive: true,
    isAutoScan: true,
    isPlateStable: true,
    reviewStatus: 'NEEDS_REVIEW',
    confidence: 20.0,
    vehicleMatch: { is_blacklisted: true },
  });
  assert.equal(resReviewStatus.reason, REASON_NEEDS_REVIEW);
  assert.equal(resReviewStatus.auditAction, AUDIT_GATE_AUTO_NEEDS_STAFF);

  const resLowConf = evaluateAutoApplyPolicy({
    direction: 'IN',
    gateActive: true,
    isAutoScan: true,
    isPlateStable: true,
    reviewStatus: 'AUTO',
    confidence: 88.0,
    confidenceThreshold: 90.0,
    vehicleMatch: { is_blacklisted: true },
  });
  assert.equal(resLowConf.reason, REASON_LOW_CONFIDENCE);
  assert.equal(resLowConf.auditAction, null);

  const resBlacklisted = evaluateAutoApplyPolicy({
    direction: 'IN',
    gateActive: true,
    isAutoScan: true,
    isPlateStable: true,
    reviewStatus: 'AUTO',
    confidence: 95.0,
    vehicleMatch: { is_blacklisted: true, is_registered: false },
    openSession: { session_id: 1 },
    availableSlot: null,
  });
  assert.equal(resBlacklisted.reason, REASON_BLACKLISTED);
  assert.equal(resBlacklisted.auditAction, AUDIT_GATE_AUTO_NEEDS_STAFF);
});

test('GateAutoApplyPolicy: Property-based fuzzing across 10,000 combinations preserves invariants', () => {
  const directions = ['IN', 'OUT', 'entry', 'exit', 'INVALID', '', null, undefined, 123];
  const booleans = [true, false, undefined, null, 1, 0];
  const reviewStatuses = ['AUTO', 'NEEDS_REVIEW', 'UNKNOWN', '', null, undefined];
  const confidences = [-10, 0, 50, 89.999, 90.0, 90.001, 100, NaN, '95.5', 'invalid', null, undefined];
  const vehicleMatches = [
    null,
    undefined,
    {},
    { is_registered: true, is_blacklisted: false },
    { is_registered: false, is_blacklisted: false },
    { is_registered: true, is_blacklisted: true },
    { id: 'WALK_IN_123', vehicle_id: null },
    { vehicle_id: 42 },
  ];
  const openSessions = [null, undefined, false, { id: 101, session_code: 'SES-001' }];
  const availableSlots = [null, undefined, false, { id: 5, code: 'A-01' }];
  const feePreviews = [0, 0.0, '0', '0.00', 10000, -500, null, undefined, NaN, { fee_amount: 0.0 }, { fee_amount: 15000 }];

  let autoCheckInCount = 0;
  let autoCheckOutCount = 0;

  for (let i = 0; i < 10000; i++) {
    const input =
      i === 0
        ? {
            direction: 'OUT',
            gateActive: true,
            isAutoScan: true,
            isPlateStable: true,
            reviewStatus: 'AUTO',
            confidence: 95.0,
            vehicleMatch: { is_registered: true, is_blacklisted: false },
            openSession: { id: 101, session_code: 'SES-001' },
            availableSlot: null,
            feePreview: 0,
          }
        : i === 1
          ? {
              direction: 'IN',
              gateActive: true,
              isAutoScan: true,
              isPlateStable: true,
              reviewStatus: 'AUTO',
              confidence: 95.0,
              vehicleMatch: { is_registered: true, is_blacklisted: false },
              openSession: null,
              availableSlot: { id: 5, code: 'A-01' },
              feePreview: null,
            }
          : {
              direction: directions[i % directions.length],
              gateActive: booleans[Math.floor(i / 2) % booleans.length],
              isAutoScan: booleans[Math.floor(i / 3) % booleans.length],
              isPlateStable: booleans[Math.floor(i / 5) % booleans.length],
              reviewStatus: reviewStatuses[Math.floor(i / 7) % reviewStatuses.length],
              confidence: confidences[Math.floor(i / 11) % confidences.length],
              vehicleMatch: vehicleMatches[Math.floor(i / 13) % vehicleMatches.length],
              openSession: openSessions[Math.floor(i / 17) % openSessions.length],
              availableSlot: availableSlots[Math.floor(i / 19) % availableSlots.length],
              feePreview: feePreviews[Math.floor(i / 23) % feePreviews.length],
            };

    const res = evaluateAutoApplyPolicy(input);
    assert.ok([ACTION_AUTO_CHECK_IN, ACTION_AUTO_CHECK_OUT, ACTION_HOLD].includes(res.action));
    assert.equal(res.isApproved, res.canAutoApply);
    if (res.canAutoApply) {
      assert.equal(res.needsStaff, false);
      assert.equal(res.paymentRequired, false);
      if (res.action === ACTION_AUTO_CHECK_IN) autoCheckInCount++;
      if (res.action === ACTION_AUTO_CHECK_OUT) autoCheckOutCount++;
    } else {
      assert.equal(res.action, ACTION_HOLD);
    }
  }

  assert.ok(autoCheckInCount > 0);
  assert.ok(autoCheckOutCount > 0);
});

test('GateAutoApplyPolicy: usePlateAutoDetect enforces committed MAX_LONG_SIDE = 1280 downscaling boundary and JPEG_QUALITY = 0.85', () => {
  const hookPath = path.resolve(__dirname, '../src/hooks/usePlateAutoDetect.js');
  const hookSource = fs.readFileSync(hookPath, 'utf8');
  assert.match(
    hookSource,
    /const\s+MAX_LONG_SIDE\s*=\s*1280\s*;/,
    'usePlateAutoDetect must set MAX_LONG_SIDE = 1280 per honest empirical OCR benchmark (TL Decision 2)'
  );
  assert.match(
    hookSource,
    /const\s+JPEG_QUALITY\s*=\s*0\.85\s*;/,
    'usePlateAutoDetect must set JPEG_QUALITY = 0.85 per honest empirical OCR benchmark (TL Decision 2)'
  );

  const MAX_LONG_SIDE = 1280;
  const standardResolutions = [
    { name: '1080p Landscape', w: 1920, h: 1080, expectedW: 1280, expectedH: 720 },
    { name: '1080p Portrait', w: 1080, h: 1920, expectedW: 720, expectedH: 1280 },
    { name: '720p Landscape', w: 1280, h: 720, expectedW: 1280, expectedH: 720 },
    { name: '4K UHD Landscape', w: 3840, h: 2160, expectedW: 1280, expectedH: 720 },
    { name: 'VGA Standard', w: 640, h: 480, expectedW: 640, expectedH: 480 },
    { name: 'Square 1600', w: 1600, h: 1600, expectedW: 1280, expectedH: 1280 },
  ];

  for (const tc of standardResolutions) {
    const dim = computeDownscaledDimensions(tc.w, tc.h, MAX_LONG_SIDE);
    assert.equal(dim.width, tc.expectedW, `${tc.name}: width mismatch`);
    assert.equal(dim.height, tc.expectedH, `${tc.name}: height mismatch`);
    assert.ok(Math.max(dim.width, dim.height) <= MAX_LONG_SIDE);
  }

  assert.deepEqual(computeDownscaledDimensions(0, 0, MAX_LONG_SIDE), { width: 0, height: 0, scale: 0 });
  assert.deepEqual(computeDownscaledDimensions(-100, 500, MAX_LONG_SIDE), { width: 0, height: 0, scale: 0 });
});

test('GateAutoApplyPolicy: Safe Defaults - Missing, null, undefined, or NaN confidence evaluates to 0.0 and returns HOLD', () => {
  const testValues = [null, undefined, NaN, 'not-a-number', {}, []];
  for (const val of testValues) {
    const result = evaluateAutoApplyPolicy({
      direction: 'IN',
      gateActive: true,
      isAutoScan: true,
      reviewStatus: 'AUTO',
      confidence: val,
      confidenceThreshold: 90.0,
      isPlateStable: true,
      vehicleMatch: MOCK_REGISTERED_VEHICLE,
      openSession: null,
      availableSlot: MOCK_SLOT,
    });
    assert.equal(result.canAutoApply, false, `Confidence ${String(val)} must never auto-apply`);
    assert.equal(result.action, ACTION_HOLD);
    assert.equal(result.reason, REASON_LOW_CONFIDENCE);
  }
});

test('GateAutoApplyPolicy: Row 11 Wallet Decision Policy (VALID_WALLET_PAID, WALLET_INSUFFICIENT, FEE_PAYMENT_REQUIRED)', () => {
  // 11a: Wallet ACTIVE & sufficient balance -> AUTO_CHECK_OUT / VALID_WALLET_PAID
  const resPaid = evaluateAutoApplyPolicy({
    direction: 'OUT',
    gateActive: true,
    isAutoScan: true,
    reviewStatus: 'AUTO',
    confidence: 95.0,
    isPlateStable: true,
    vehicleMatch: MOCK_REGISTERED_VEHICLE,
    openSession: MOCK_OPEN_SESSION,
    feePreview: 20000,
    customerHasWallet: true,
    walletBalance: 20000,
    walletStatus: 'ACTIVE',
  });
  assert.equal(resPaid.action, ACTION_AUTO_CHECK_OUT);
  assert.equal(resPaid.auditAction, AUDIT_GATE_AUTO_CHECK_OUT);
  assert.equal(resPaid.reasonCode, REASON_VALID_WALLET_PAID);
  assert.equal(resPaid.canAutoApply, true);
  assert.equal(resPaid.paymentRequired, false);

  // 11b: Wallet insufficient -> HOLD / WALLET_INSUFFICIENT
  const resInsufficient = evaluateAutoApplyPolicy({
    direction: 'OUT',
    gateActive: true,
    isAutoScan: true,
    reviewStatus: 'AUTO',
    confidence: 95.0,
    isPlateStable: true,
    vehicleMatch: MOCK_REGISTERED_VEHICLE,
    openSession: MOCK_OPEN_SESSION,
    feePreview: 20000,
    customerHasWallet: true,
    walletBalance: 19999,
    walletStatus: 'ACTIVE',
  });
  assert.equal(resInsufficient.action, ACTION_HOLD);
  assert.equal(resInsufficient.auditAction, AUDIT_GATE_AUTO_PAYMENT_REQUIRED);
  assert.equal(resInsufficient.reasonCode, REASON_WALLET_INSUFFICIENT);
  assert.equal(resInsufficient.canAutoApply, false);
  assert.equal(resInsufficient.paymentRequired, true);

  // 11b: Wallet LOCKED -> HOLD / WALLET_INSUFFICIENT
  const resLocked = evaluateAutoApplyPolicy({
    direction: 'OUT',
    gateActive: true,
    isAutoScan: true,
    reviewStatus: 'AUTO',
    confidence: 95.0,
    isPlateStable: true,
    vehicleMatch: MOCK_REGISTERED_VEHICLE,
    openSession: MOCK_OPEN_SESSION,
    feePreview: 20000,
    customerHasWallet: true,
    walletBalance: 500000,
    walletStatus: 'LOCKED',
  });
  assert.equal(resLocked.action, ACTION_HOLD);
  assert.equal(resLocked.reasonCode, REASON_WALLET_INSUFFICIENT);

  // 11c: No wallet -> HOLD / FEE_PAYMENT_REQUIRED
  const resNoWallet = evaluateAutoApplyPolicy({
    direction: 'OUT',
    gateActive: true,
    isAutoScan: true,
    reviewStatus: 'AUTO',
    confidence: 95.0,
    isPlateStable: true,
    vehicleMatch: MOCK_REGISTERED_VEHICLE,
    openSession: MOCK_OPEN_SESSION,
    feePreview: 20000,
    customerHasWallet: false,
    walletBalance: null,
  });
  assert.equal(resNoWallet.action, ACTION_HOLD);
  assert.equal(resNoWallet.reasonCode, REASON_FEE_PAYMENT_REQUIRED);

  // 11d: Explicit walletStatus: null with customerHasWallet=true -> HOLD / WALLET_INSUFFICIENT (matches gate_decision.py:264)
  const resNullWalletStatus = evaluateAutoApplyPolicy({
    direction: 'OUT',
    gateActive: true,
    isAutoScan: true,
    reviewStatus: 'AUTO',
    confidence: 95.0,
    isPlateStable: true,
    vehicleMatch: MOCK_REGISTERED_VEHICLE,
    openSession: MOCK_OPEN_SESSION,
    feePreview: 20000,
    customerHasWallet: true,
    walletBalance: 50000,
    walletStatus: null,
  });
  assert.equal(resNullWalletStatus.action, ACTION_HOLD);
  assert.equal(resNullWalletStatus.auditAction, AUDIT_GATE_AUTO_PAYMENT_REQUIRED);
  assert.equal(resNullWalletStatus.reasonCode, REASON_WALLET_INSUFFICIENT);
  assert.equal(resNullWalletStatus.paymentRequired, true);

  const resNestedNullWalletStatus = evaluateAutoApplyPolicy({
    direction: 'OUT',
    gateActive: true,
    isAutoScan: true,
    reviewStatus: 'AUTO',
    confidence: 95.0,
    isPlateStable: true,
    vehicleMatch: {
      ...MOCK_REGISTERED_VEHICLE,
      customer: {
        hasWallet: true,
        walletBalance: 50000,
        walletStatus: null,
      },
    },
    openSession: MOCK_OPEN_SESSION,
    feePreview: 20000,
  });
  assert.equal(resNestedNullWalletStatus.action, ACTION_HOLD);
  assert.equal(resNestedNullWalletStatus.reasonCode, REASON_WALLET_INSUFFICIENT);
});

test('GateAutoApplyPolicy: GateCameraControlModal propagates is_blacklisted, wallet state, and real slots API', () => {
  const modalPath = path.resolve(__dirname, '../src/components/VehicleManagement/GateCameraControlModal.jsx');
  const modalSource = fs.readFileSync(modalPath, 'utf8');
  assert.match(
    modalSource,
    /detectedData\?\.is_blacklisted/,
    'GateCameraControlModal must include detectedData?.is_blacklisted in isBlacklisted evaluation'
  );
  assert.match(
    modalSource,
    /getAvailableSlotsForCheckIn/,
    'GateCameraControlModal loadSlots must call getAvailableSlotsForCheckIn'
  );
  assert.match(
    modalSource,
    /REASON_VALID_WALLET_PAID/,
    'GateCameraControlModal must handle REASON_VALID_WALLET_PAID for WALLET auto-checkout'
  );
  assert.match(
    modalSource,
    /REASON_WALLET_INSUFFICIENT/,
    'GateCameraControlModal must handle REASON_WALLET_INSUFFICIENT for D8 pending exit polling'
  );
  assert.match(
    modalSource,
    /vehicleMatch:\s*matchedVehicle\s*\?\s*\{\s*\.\.\.matchedVehicle,\s*is_blacklisted:\s*isBlacklisted\s*\}\s*:\s*null/,
    'GateCameraControlModal must pass is_blacklisted on vehicleMatch to evaluateAutoApplyPolicy'
  );
});


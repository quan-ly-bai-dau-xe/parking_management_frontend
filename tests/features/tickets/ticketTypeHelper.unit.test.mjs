import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTicketTypeName,
  resolveTicketTypeName,
  formatActiveTicketFeeLabel,
  formatActiveTicketBreakdown,
  TICKET_TYPE_NAMES,
} from "../../../src/utils/ticket/ticketTypeHelper.js";

test("ticketTypeHelper: normalizeTicketTypeName formats codes and names accurately", () => {
  assert.equal(normalizeTicketTypeName("YEARLY"), "Vé năm");
  assert.equal(normalizeTicketTypeName("yearly"), "Vé năm");
  assert.equal(normalizeTicketTypeName("Vé năm"), "Vé năm");

  assert.equal(normalizeTicketTypeName("QUARTERLY"), "Vé quý");
  assert.equal(normalizeTicketTypeName("Vé quý"), "Vé quý");

  assert.equal(normalizeTicketTypeName("MONTHLY"), "Vé tháng");
  assert.equal(normalizeTicketTypeName("Vé tháng"), "Vé tháng");

  assert.equal(normalizeTicketTypeName("DAILY"), "Vé ngày");
  assert.equal(normalizeTicketTypeName("Vé ngày"), "Vé ngày");

  // Fallbacks
  assert.equal(normalizeTicketTypeName(null, true), "Vé định kỳ");
  assert.equal(normalizeTicketTypeName("", true), "Vé định kỳ");
  assert.equal(normalizeTicketTypeName("—", true), "Vé định kỳ");

  assert.equal(normalizeTicketTypeName(null, false), "Vé lượt");
  assert.equal(normalizeTicketTypeName("", false), "Vé lượt");
  assert.equal(normalizeTicketTypeName("—", false), "Vé lượt");

  // Object shape
  assert.equal(normalizeTicketTypeName({ code: "YEARLY" }), "Vé năm");
  assert.equal(normalizeTicketTypeName({ ticket_type_name: "Vé quý" }), "Vé quý");
});

test("ticketTypeHelper: resolveTicketTypeName extracts ticket type correctly from diverse sources", () => {
  // Case 1: VT0012 with YEARLY ticket type
  const yearlyVehicle = {
    licensePlate: "75V-56297",
    ticketState: "active",
    ticket: {
      code: "VT0012",
      type: "YEARLY",
      ticket_type_name: "Vé năm",
      status: "active",
    },
  };

  const resolvedYearly = resolveTicketTypeName({
    matchedVehicle: yearlyVehicle,
    hasValidTicket: true,
  });
  assert.equal(resolvedYearly, "Vé năm");
  assert.equal(formatActiveTicketFeeLabel(resolvedYearly), "0đ (Vé năm có hiệu lực)");
  assert.equal(formatActiveTicketBreakdown(resolvedYearly), "Được đài thọ bởi vé năm hiệu lực");

  // Case 2: QUARTERLY ticket
  const quarterlySession = {
    ticketType: "QUARTERLY",
    hasActiveTicket: true,
  };
  const resolvedQuarterly = resolveTicketTypeName({
    session: quarterlySession,
  });
  assert.equal(resolvedQuarterly, "Vé quý");
  assert.equal(formatActiveTicketFeeLabel(resolvedQuarterly), "0đ (Vé quý có hiệu lực)");

  // Case 3: Backend fee preview with ticket_type_name
  const backendPreview = {
    fee_amount: "0.00",
    has_active_ticket: true,
    ticket_type_name: "Vé tháng",
  };
  const resolvedMonthly = resolveTicketTypeName({
    backendFeePreview: backendPreview,
  });
  assert.equal(resolvedMonthly, "Vé tháng");
  assert.equal(formatActiveTicketFeeLabel(resolvedMonthly), "0đ (Vé tháng có hiệu lực)");

  // Case 4: Ticket active but type unknown -> generic fallback "Vé định kỳ"
  const genericActive = resolveTicketTypeName({
    hasValidTicket: true,
  });
  assert.equal(genericActive, "Vé định kỳ");
  assert.equal(formatActiveTicketFeeLabel(genericActive), "0đ (Vé định kỳ có hiệu lực)");
  assert.equal(formatActiveTicketBreakdown(genericActive), "Được đài thọ bởi vé định kỳ hiệu lực");

  // Case 5: No active ticket -> null
  const guestVehicle = {
    licensePlate: "29A-12345",
    ticketState: "none",
  };
  assert.equal(resolveTicketTypeName({ matchedVehicle: guestVehicle }), null);
});

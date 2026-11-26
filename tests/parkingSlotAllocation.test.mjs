import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { axiosInstance } from "../src/services/apiClient.js";
import {
  getAllParkingSlotsInventory,
  getAvailableSlotsForCheckIn,
} from "../src/services/parkingSessionService.js";
import {
  getSlots,
  getStatusText,
  normalizeSlot,
} from "../src/services/parkingLotService.js";
import {
  SLOT_STATUS,
  SLOT_STATUS_OPTIONS,
} from "../src/constants/parkingLotConstants.js";
import { makeMockSlot, makeMockFullInventory } from "./factories/slotFactory.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("SLOT-01: getAllParkingSlotsInventory returns exactly 96 slots conforming to PostgreSQL schema", () => {
  const slots = getAllParkingSlotsInventory();
  assert.equal(slots.length, 96, "Tổng số slot toàn bãi phải là 96");

  // Zone A: IDs 1..24, Tầng B1
  const zoneA = slots.filter((s) => s.zone === "Khu A");
  assert.equal(zoneA.length, 24);
  assert.equal(zoneA[0].code, "A-01");
  assert.equal(zoneA[23].code, "A-24");
  assert.equal(zoneA[0].floor, "Tầng B1");
  assert.equal(zoneA[0].kind, "STANDARD");

  // Zone B: IDs 25..48, Tầng B1
  const zoneB = slots.filter((s) => s.zone === "Khu B");
  assert.equal(zoneB.length, 24);
  assert.equal(zoneB[0].code, "B-01");
  assert.equal(zoneB[23].code, "B-24");

  // Zone C (EV Charging): IDs 49..72, Tầng B2
  const zoneC = slots.filter((s) => s.zone === "Khu C");
  assert.equal(zoneC.length, 24);
  assert.equal(zoneC[0].code, "C-01");
  assert.equal(zoneC[23].code, "C-24");
  assert.equal(zoneC[0].kind, "EV_CHARGING");
  assert.equal(zoneC[0].type, "ev");

  // Zone D: IDs 73..96, Tầng B2
  const zoneD = slots.filter((s) => s.zone === "Khu D");
  assert.equal(zoneD.length, 24);
  assert.equal(zoneD[0].code, "D-01");
  assert.equal(zoneD[23].code, "D-24");
});

test("SLOT-02: getAvailableSlotsForCheckIn excludes slots occupied by open sessions", async () => {
  const originalRequest = axiosInstance.request;

  try {
    // Giả lập slot 1, 2, 3 (A-01, A-02, A-03) đang có session mở
    axiosInstance.request = async () => ({
      data: {
        count: 3,
        results: [
          { id: 101, slot_id: 1, status: "open" },
          { id: 102, slot_id: 2, status: "open" },
          { id: 103, slot_id: 3, status: "open" },
        ],
      },
    });

    const availableSlots = await getAvailableSlotsForCheckIn({ useMock: true });
    assert.equal(availableSlots.length, 96 - 3, "Phải còn lại 93 slots");

    // Đảm bảo A-01, A-02, A-03 không xuất hiện trong danh sách khả dụng
    const availableIds = new Set(availableSlots.map((s) => s.id));
    assert.equal(availableIds.has(1), false);
    assert.equal(availableIds.has(2), false);
    assert.equal(availableIds.has(3), false);
    assert.equal(availableIds.has(4), true); // A-04 vẫn khả dụng
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("SLOT-03: normalizeSlot correctly maps status and human-readable badges", () => {
  const rawMaintenanceSlot = {
    id: 15,
    code: "A-15",
    status: "MAINTENANCE",
    slot_kind: "STANDARD",
  };
  const normalized = normalizeSlot(rawMaintenanceSlot);
  assert.equal(normalized.status, "MAINTENANCE");
  assert.equal(normalized.statusText, "Bảo trì");

  const rawReservedSlot = {
    id: 20,
    code: "A-20",
    status: "RESERVED",
    reserved_by: "Khách VIP",
  };
  const normReserved = normalizeSlot(rawReservedSlot);
  assert.equal(normReserved.status, "RESERVED");
  assert.equal(normReserved.statusText, "Đã đặt");
});

test("SLOT-04: Zone density calculation accurately reports occupancy percentage", () => {
  function calculateZoneDensity(totalSlots, occupiedSlots) {
    if (!totalSlots || totalSlots <= 0) return { densityPercent: 0, available: 0, status: "EMPTY" };
    const safeOccupied = Math.max(0, Math.min(totalSlots, occupiedSlots || 0));
    const densityPercent = Math.round((safeOccupied / totalSlots) * 100);
    const available = totalSlots - safeOccupied;

    let status = "NORMAL";
    if (densityPercent >= 90) status = "CRITICAL";
    else if (densityPercent >= 75) status = "HIGH";
    else if (densityPercent === 0) status = "EMPTY";

    return { densityPercent, available, status };
  }

  // Zone 24 slots, 18 occupied -> 75% (HIGH)
  const highDensity = calculateZoneDensity(24, 18);
  assert.equal(highDensity.densityPercent, 75);
  assert.equal(highDensity.available, 6);
  assert.equal(highDensity.status, "HIGH");

  // Zone 24 slots, 23 occupied -> 96% (CRITICAL)
  const criticalDensity = calculateZoneDensity(24, 23);
  assert.equal(criticalDensity.densityPercent, 96);
  assert.equal(criticalDensity.available, 1);
  assert.equal(criticalDensity.status, "CRITICAL");

  // Bãi trống hoàn toàn
  const emptyDensity = calculateZoneDensity(24, 0);
  assert.equal(emptyDensity.densityPercent, 0);
  assert.equal(emptyDensity.available, 24);
  assert.equal(emptyDensity.status, "EMPTY");
});

test("SLOT-05: EV slot compatibility check enforces charging kind for electric vehicles", () => {
  function checkSlotCompatibility(slot, vehicleType) {
    const isEvVehicle = vehicleType === "EV" || vehicleType === "Ô tô điện";
    const isEvSlot = slot.kind === "EV_CHARGING" || slot.type === "ev";

    if (isEvVehicle && !isEvSlot) {
      return { compatible: false, warning: "Xe điện nên được xếp vào ô sạc điện (Khu C)" };
    }
    if (!isEvVehicle && isEvSlot) {
      return { compatible: false, warning: "Ô sạc điện ưu tiên dành cho xe điện EV" };
    }
    return { compatible: true, warning: null };
  }

  const standardSlot = makeMockSlot({ kind: "STANDARD", type: "car" });
  const evSlot = makeMockSlot({ kind: "EV_CHARGING", type: "ev" });

  assert.equal(checkSlotCompatibility(standardSlot, "CAR").compatible, true);
  assert.equal(checkSlotCompatibility(evSlot, "EV").compatible, true);
  assert.equal(checkSlotCompatibility(standardSlot, "EV").compatible, false);
  assert.equal(checkSlotCompatibility(evSlot, "CAR").compatible, false);
});

test("SLOT-06: getAvailableSlotsForCheckIn with filterReserved excludes ticket-reserved and maintenance slots unless matching licensePlate", async () => {
  const originalRequest = axiosInstance.request;

  try {
    // Không có open session nào
    axiosInstance.request = async () => ({
      data: { count: 0, results: [] },
    });

    // Trường hợp 1: Xe vãng lai (không có vé tháng)
    const visitorSlots = await getAvailableSlotsForCheckIn({
      filterReserved: true,
      licensePlate: "29A-999.99",
      useMock: true,
    });
    const visitorIds = new Set(visitorSlots.map((s) => s.id));

    // A-01 (id 1) là ô vé tháng của 43K-860.50 -> Phải bị loại trừ
    assert.equal(visitorIds.has(1), false, "Ô A-01 (vé tháng 43K-860.50) không được phân cho xe vãng lai");
    // A-08 (id 8) là ô bảo trì -> Phải bị loại trừ
    assert.equal(visitorIds.has(8), false, "Ô A-08 (bảo trì) không được phân bổ");
    // Ô hợp lệ như A-11 -> Phải khả dụng
    assert.equal(visitorIds.has(11), true, "Ô A-11 phải khả dụng");

    // Trường hợp 2: Đúng xe sở hữu vé tháng ô A-01 (43K-860.50)
    const ticketOwnerSlots = await getAvailableSlotsForCheckIn({
      filterReserved: true,
      licensePlate: "43K-860.50",
      useMock: true,
    });
    const ticketOwnerIds = new Set(ticketOwnerSlots.map((s) => s.id));
    assert.equal(ticketOwnerIds.has(1), true, "Chủ vé tháng 43K-860.50 phải được chọn ô A-01");
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("SLOT-07 (WP0-Iter2): getSlots forwards slot_kind param and ParkingLotManagement uses slotKind, numericId, row_version, and res?.success checks", async () => {
  const originalRequest = axiosInstance.request;
  let capturedConfig = null;

  try {
    axiosInstance.request = async (config) => {
      capturedConfig = config;
      return { data: { results: [] } };
    };

    await getSlots({ floor: "B2", zone: "C", slotKind: "EV_CHARGING" });
    assert.equal(capturedConfig?.params?.slot_kind, "EV_CHARGING");
    assert.equal(capturedConfig?.params?.vehicle_type, undefined);
  } finally {
    axiosInstance.request = originalRequest;
  }

  const pageContent = fs.readFileSync(
    path.resolve(__dirname, "../src/pages/ParkingLotManagement.jsx"),
    "utf-8"
  );
  assert.ok(
    pageContent.includes("slotKind: vehicleTypeFilter"),
    "ParkingLotManagement must pass vehicleTypeFilter via slotKind to match Backend SlotFilterSerializer"
  );
  assert.ok(
    pageContent.includes("row_version: slot?.row_version ?? 1") &&
      pageContent.includes("slot?.numericId"),
    "handleUpdateSlotStatus must pass numericId and row_version to PATCH /api/v1/parking/slots/<id>/"
  );
  assert.ok(
    pageContent.includes('s.status === "OCCUPIED" || s.status === "CHARGING"'),
    "Occupancy stats must count CHARGING alongside OCCUPIED"
  );
});

test("SLOT-08 (WP0-Iter2): EditSlotModal excludes OVERSTAY from PATCH status options while keeping it in SLOT_STATUS_OPTIONS for filters", () => {
  assert.ok(
    SLOT_STATUS_OPTIONS.some((opt) => opt.value === SLOT_STATUS.OVERSTAY),
    "SLOT_STATUS_OPTIONS must retain OVERSTAY for ParkingLotFilters"
  );

  const editModalContent = fs.readFileSync(
    path.resolve(__dirname, "../src/components/ParkingLotManagement/EditSlotModal.jsx"),
    "utf-8"
  );
  assert.ok(
    editModalContent.includes("opt.value !== SLOT_STATUS.OVERSTAY"),
    "EditSlotModal must filter out OVERSTAY from PATCH status dropdown"
  );
});

test("SLOT-09 (WP0-Iter2): useCurrentUser safely guards missing localStorage/sessionStorage in SSR", async () => {
  const hookContent = fs.readFileSync(
    path.resolve(__dirname, "../src/hooks/useCurrentUser.js"),
    "utf-8"
  );
  assert.ok(
    hookContent.includes('typeof localStorage !== "undefined"') &&
      hookContent.includes('typeof localStorage?.getItem === "function"'),
    "useCurrentUser must guard localStorage access in SSR environments without storage shim"
  );
});

test("SLOT-10 (WP0-Iter3 Finding C): ParkingLotManagement resolves integer PK id when numericId is undefined and uses getSlotTypeDisplayLabel in handleSelectSlot", () => {
  const resolveSlotApiId = (target) =>
    target.numericId ?? (typeof target.id === "number" ? target.id : target.slotId);

  // Case 1: ListView item from normalizeSlot({ id: 1, code: "A-01", slot_kind: "EV_CHARGING" })
  const listViewSlot = normalizeSlot({
    id: 1,
    code: "A-01",
    status: "AVAILABLE",
    slot_kind: "EV_CHARGING",
  });
  assert.equal(listViewSlot.numericId, undefined);
  assert.equal(listViewSlot.slotId, "A-01");
  assert.equal(listViewSlot.id, 1);
  assert.equal(
    resolveSlotApiId(listViewSlot),
    1,
    "Must resolve integer PK (1) instead of code ('A-01') when numericId is undefined"
  );

  // Case 2: Matrix / selectedSlot item where id was coerced to string label "A-01" and numericId is 1
  const selectedSlotObj = { id: "A-01", numericId: 1, slotId: "A-01" };
  assert.equal(resolveSlotApiId(selectedSlotObj), 1);

  // Case 3: Verify ParkingLotManagement.jsx uses the exact numeric PK resolution and getSlotTypeDisplayLabel
  const pageContent = fs.readFileSync(
    path.resolve(__dirname, "../src/pages/ParkingLotManagement.jsx"),
    "utf-8"
  );
  assert.ok(
    !pageContent.includes("slotToDelete.numericId || slotToDelete.slotId || slotToDelete.id") &&
      !pageContent.includes("updatedSlot.numericId || updatedSlot.slotId || updatedSlot.id"),
    "ParkingLotManagement must not prioritize string slotId before numeric id"
  );
  assert.ok(
    pageContent.includes("slotToDelete.numericId ??") &&
      pageContent.includes('typeof slotToDelete.id === "number" ? slotToDelete.id : slotToDelete.slotId') &&
      pageContent.includes("updatedSlot.numericId ??") &&
      pageContent.includes('typeof updatedSlot.id === "number" ? updatedSlot.id : updatedSlot.slotId'),
    "handleConfirmDeleteSlot and handleSaveEditSlot must resolve integer id before string slotId"
  );
  assert.ok(
    pageContent.includes("vehicleType: getSlotTypeDisplayLabel(slot.type || slot.slot_kind)"),
    "handleSelectSlot must use getSlotTypeDisplayLabel(slot.type || slot.slot_kind)"
  );
});

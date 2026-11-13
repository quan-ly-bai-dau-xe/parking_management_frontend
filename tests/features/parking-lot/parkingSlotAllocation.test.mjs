import test from "node:test";
import assert from "node:assert/strict";
import { axiosInstance } from "#src/services/apiClient.js";
import {
  getAllParkingSlotsInventory,
  getAvailableSlotsForCheckIn,
} from "#src/services/parkingSessionService.js";
import {
  getStatusText,
  normalizeSlot,
} from "#src/services/parkingLotService.js";
import { makeMockSlot, makeMockFullInventory } from "#tests/factories/slotFactory.mjs";

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

    const availableSlots = await getAvailableSlotsForCheckIn();
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
    });
    const ticketOwnerIds = new Set(ticketOwnerSlots.map((s) => s.id));
    assert.equal(ticketOwnerIds.has(1), true, "Chủ vé tháng 43K-860.50 phải được chọn ô A-01");
  } finally {
    axiosInstance.request = originalRequest;
  }
});

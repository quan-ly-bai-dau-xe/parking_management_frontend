import test from "node:test";
import assert from "node:assert/strict";
import { getAvailableSlotsForCheckIn } from "#src/services/parkingSessionService.js";
import { MODULE_MOCK_CONFIG } from "#src/config/mockConfig.js";
import { axiosInstance } from "#src/services/apiClient.js";

test("SLOT-PICKER-01: getAvailableSlotsForCheckIn handles string slot IDs without producing NaN", async () => {
  const originalParkingLotMock = MODULE_MOCK_CONFIG.parkingLot;
  const originalRequest = axiosInstance.request;

  try {
    // Tắt mock cho parkingLot để test flow gọi getSlots từ API
    MODULE_MOCK_CONFIG.parkingLot = false;

    // Giả lập backend /api/v1/parking/slots/ trả về danh sách có id là chuỗi (ví dụ: 'A-01', 'A-02'...)
    axiosInstance.request = async (config) => {
      if (config.url?.includes("/api/v1/parking/slots/")) {
        return {
          data: [
            { id: "A-01", code: "A-01", floor: "B1", zone: "A", status: "AVAILABLE", slot_kind: "STANDARD" },
            { id: "A-02", code: "A-02", floor: "B1", zone: "A", status: "AVAILABLE", slot_kind: "STANDARD" },
            { id: 105, code: "A-05", floor: "B1", zone: "A", status: "AVAILABLE", slot_kind: "STANDARD" },
            { id: "106", code: "A-06", floor: "B1", zone: "A", status: "AVAILABLE", slot_kind: "STANDARD" },
          ],
        };
      }
      return { data: [] };
    };

    const slots = await getAvailableSlotsForCheckIn();
    assert.ok(Array.isArray(slots));
    assert.equal(slots.length, 4);

    // Không có ô nào có id là NaN
    for (const slot of slots) {
      assert.notEqual(Number.isNaN(slot.id), true, `Slot ${slot.code} id must not be NaN`);
    }

    // A-01 giữ nguyên chuỗi "A-01"
    const slotA01 = slots.find((s) => s.code === "A-01");
    assert.ok(slotA01);
    assert.equal(slotA01.id, "A-01");

    // 105 giữ nguyên số 105
    const slot105 = slots.find((s) => s.code === "A-05");
    assert.ok(slot105);
    assert.equal(slot105.id, 105);

    // "106" được chuẩn hóa thành số 106
    const slot106 = slots.find((s) => s.code === "A-06");
    assert.ok(slot106);
    assert.equal(slot106.id, 106);
  } finally {
    MODULE_MOCK_CONFIG.parkingLot = originalParkingLotMock;
    axiosInstance.request = originalRequest;
  }
});

test("SLOT-PICKER-02: Slot selection matching supports string and numeric comparison seamlessly", () => {
  const sampleSlots = [
    { id: "A-01", code: "A-01", floor: "Tầng B1", zone: "Khu A" },
    { id: 102, code: "A-02", floor: "Tầng B1", zone: "Khu A" },
  ];

  // Helper matching tương đồng logic trong ParkingSlotPicker
  const matchSlot = (slots, selectedSlotId) =>
    slots.find(
      (s) =>
        selectedSlotId !== null &&
        selectedSlotId !== undefined &&
        (String(s.id) === String(selectedSlotId) ||
          String(s.code || "").toUpperCase() === String(selectedSlotId).toUpperCase())
    ) || null;

  // Khớp chuỗi "A-01"
  assert.equal(matchSlot(sampleSlots, "A-01")?.code, "A-01");

  // Khớp số 102 với số 102
  assert.equal(matchSlot(sampleSlots, 102)?.code, "A-02");

  // Khớp số 102 với chuỗi "102"
  assert.equal(matchSlot(sampleSlots, "102")?.code, "A-02");

  // Khớp mã "A-02"
  assert.equal(matchSlot(sampleSlots, "A-02")?.code, "A-02");

  // null / undefined trả về null
  assert.equal(matchSlot(sampleSlots, null), null);
  assert.equal(matchSlot(sampleSlots, undefined), null);
});

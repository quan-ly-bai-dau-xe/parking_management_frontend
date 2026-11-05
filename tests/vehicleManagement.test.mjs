import test from "node:test";
import assert from "node:assert/strict";
import { VehicleFormSchema, VehicleListItemSchema } from "../src/schemas/vehicleSchema.js";
import {
  mapVehicleSearchItem,
  mapVehicleResults,
  toCreatePayload,
  toUpdatePayload,
} from "../src/utils/vehicle/vehicleApiMapper.js";
import {
  mapVehicleToFormData,
  mapFormDataToVehicleEntity,
} from "../src/utils/vehicle/vehicleFormMapper.js";
import {
  makeMockRawBackendVehicle,
  makeMockVehicle,
  makeMockVehicleFormData,
} from "./factories/vehicleFactory.mjs";

test("VEHICLE-01: VehicleFormSchema validates valid Vietnamese license plates", () => {
  const validPlates = [
    "30A-123.45",
    "51K-992.14",
    "43A-9999",
    "29B-123.45",
    "60A-1234",
  ];

  for (const plate of validPlates) {
    const data = makeMockVehicleFormData({ licensePlate: plate });
    const result = VehicleFormSchema.safeParse(data);
    assert.equal(result.success, true, `Plate ${plate} should be valid`);
  }
});

test("VEHICLE-02: VehicleFormSchema rejects invalid or malformed license plates", () => {
  const invalidPlates = [
    "",
    "   ",
    "INVALID",
    "12345",
    "ABC-12345",
    "123-ABCDE",
    "@#$-123",
  ];

  for (const plate of invalidPlates) {
    const data = makeMockVehicleFormData({ licensePlate: plate });
    const result = VehicleFormSchema.safeParse(data);
    assert.equal(result.success, false, `Plate ${plate} must be rejected`);
  }
});

test("VEHICLE-03: VehicleListItemSchema accepts complete and sparse vehicle models", () => {
  const fullVehicle = makeMockVehicle();
  const fullResult = VehicleListItemSchema.safeParse(fullVehicle);
  assert.equal(fullResult.success, true);

  const sparseVehicle = {
    id: 99,
    licensePlate: "29A-888.88",
  };
  const sparseResult = VehicleListItemSchema.safeParse(sparseVehicle);
  assert.equal(sparseResult.success, true);
});

test("VEHICLE-04: mapVehicleSearchItem resolves vehicle status (parked, active, left)", () => {
  // Case A: Đang đỗ do có active_session mở chưa có exit_time
  const parkedFromSession = makeMockRawBackendVehicle({
    status: "active",
    active_session: {
      id: 50,
      exit_time: null,
      status: "open",
    },
  });
  const mappedParked = mapVehicleSearchItem(parkedFromSession);
  assert.equal(mappedParked.status, "parked");
  assert.equal(mappedParked.statusDisplay, "Đang đỗ");

  // Case B: Xe đăng ký hoạt động nhưng không trong bãi
  const activeVehicle = makeMockRawBackendVehicle({
    status: "active",
    active_session: null,
  });
  const mappedActive = mapVehicleSearchItem(activeVehicle);
  assert.equal(mappedActive.status, "active");
  assert.equal(mappedActive.statusDisplay, "Đang hoạt động");

  // Case C: Xe đã rời bãi
  const leftVehicle = makeMockRawBackendVehicle({
    status: "left",
    active_session: null,
  });
  const mappedLeft = mapVehicleSearchItem(leftVehicle);
  assert.equal(mappedLeft.status, "left");
  assert.equal(mappedLeft.statusDisplay, "Đã rời bãi");
});

test("VEHICLE-05: mapVehicleSearchItem handles customer fallback without crash", () => {
  const noCustomerVehicle = makeMockRawBackendVehicle({
    customer: null,
    customer_name: null,
    customer_phone: null,
    owner_name: null,
  });

  const mapped = mapVehicleSearchItem(noCustomerVehicle);
  assert.equal(mapped.customer.name, "—");
  assert.equal(mapped.customer.phone, "—");
  assert.equal(mapped.customer.email, "—");
});

test("VEHICLE-06: toCreatePayload formats fields for backend POST request", () => {
  const input = {
    licensePlate: " 30a-123.45 ",
    model: "Camry 2.5Q",
    brand: "Toyota",
    color: "Đen",
    customerId: "15",
    notes: "Ưu tiên đỗ gần thang máy",
  };

  const payload = toCreatePayload(input);
  assert.equal(payload.license_plate, "30a-123.45");
  assert.equal(payload.model_name, "Camry 2.5Q");
  assert.equal(payload.brand, "Toyota");
  assert.equal(payload.color, "Đen");
  assert.equal(payload.customer_id, 15);
  assert.equal(payload.notes, "Ưu tiên đỗ gần thang máy");
  assert.equal(payload.vehicle_type_id, 1);
});

test("VEHICLE-07: toUpdatePayload preserves row_version for optimistic concurrency control", () => {
  const input = {
    rowVersion: 4,
    model: "Vios E",
    color: "Bạc",
  };

  const payload = toUpdatePayload(input);
  assert.equal(payload.row_version, 4);
  assert.equal(payload.model_name, "Vios E");
  assert.equal(payload.color, "Bạc");
  // Các trường không truyền không được đưa vào payload
  assert.equal(payload.license_plate, undefined);
});

test("VEHICLE-08: 2-way form conversion consistency (Entity <-> FormData)", () => {
  const originalEntity = makeMockVehicle({
    licensePlate: "51K-992.14",
    model: "Mazda CX-5",
    brand: "Mazda",
    color: "Đỏ",
    note: "Khách VIP",
  });

  const formData = mapVehicleToFormData(originalEntity);
  assert.equal(formData.licensePlate, "51K-992.14");
  assert.equal(formData.model, "Mazda CX-5");
  assert.equal(formData.brand, "Mazda");
  assert.equal(formData.notes, "Khách VIP");

  const reconvertedEntity = mapFormDataToVehicleEntity(formData, originalEntity);
  assert.equal(reconvertedEntity.licensePlate, "51K-992.14");
  assert.equal(reconvertedEntity.model, "Mazda CX-5");
  assert.equal(reconvertedEntity.brand, "Mazda");
});

test("VEHICLE-09: Edge cases & Adversarial inputs (null, undefined, non-objects)", () => {
  assert.equal(mapVehicleSearchItem(null), null);
  assert.equal(mapVehicleSearchItem(undefined), null);

  assert.doesNotThrow(() => {
    const mapped = mapVehicleSearchItem({});
    assert.equal(mapped.licensePlate, "—");
    assert.equal(mapped.status, "left");
  });

  assert.deepEqual(mapVehicleResults(null), []);
  assert.deepEqual(mapVehicleResults([]), []);
  assert.deepEqual(mapVehicleResults({ results: [] }), []);
});


test("VEHICLE-10: assignSlotToSession validates slotId and throws on missing slot", async () => {
  const { assignSlotToSession } = await import("../src/services/parkingSessionService.js");
  await assert.rejects(
    async () => {
      await assignSlotToSession({
        licensePlate: "51K-992.14",
        slotId: null,
      });
    },
    { message: "Vui lòng chọn ô đỗ hợp lệ." }
  );
});

test("VEHICLE-11: assignSlotToSession updates local state and syncs slot assignment", async () => {
  const { assignSlotToSession } = await import("../src/services/parkingSessionService.js");
  const result = await assignSlotToSession({
    sessionId: "mock-session-123",
    licensePlate: "51K-992.14",
    slotId: 42,
    slotData: {
      code: "A-42",
      floor: "Tầng B1",
      zone: "Khu A",
      display: "Tầng B1 · Khu A · Slot A-42",
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.slotId, 42);
});

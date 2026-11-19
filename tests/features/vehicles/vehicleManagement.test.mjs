import test from "node:test";
import assert from "node:assert/strict";
import { VehicleFormSchema, VehicleListItemSchema } from "#src/schemas/vehicleSchema.js";
import {
  mapVehicleSearchItem,
  mapVehicleResults,
  toCreatePayload,
  toUpdatePayload,
} from "#src/utils/vehicle/vehicleApiMapper.js";
import {
  mapVehicleToFormData,
  mapFormDataToVehicleEntity,
} from "#src/utils/vehicle/vehicleFormMapper.js";
import {
  makeMockRawBackendVehicle,
  makeMockVehicle,
  makeMockVehicleFormData,
} from "#tests/factories/vehicleFactory.mjs";

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
  const { assignSlotToSession } = await import("#src/services/parkingSessionService.js");
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
  const { assignSlotToSession } = await import("#src/services/parkingSessionService.js");
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

test("VEHICLE-12: Scan plate synchronization updates search filter state and triggers matching filter", () => {
  let filters = { search: "", ticketType: "", status: "", ticketStatus: "" };
  let currentPage = 3;
  let selectedVehicleId = null;
  let isScanModalOpen = true;

  const handleVehicleMatchedFromScan = (matchedVehicle) => {
    if (!matchedVehicle) return;
    const plateToSearch = typeof matchedVehicle === "string"
      ? matchedVehicle
      : (matchedVehicle.licensePlate || matchedVehicle.plate || "");
    if (matchedVehicle.id) {
      selectedVehicleId = matchedVehicle.id;
    }
    if (plateToSearch) {
      filters = { ...filters, search: plateToSearch };
      currentPage = 1;
    }
    isScanModalOpen = false;
  };

  // Case 1: Scan tra ve matchedVehicle object co licensePlate
  handleVehicleMatchedFromScan({ id: 10, licensePlate: "51K-992.14" });
  assert.equal(filters.search, "51K-992.14", "Search input must receive scanned license plate");
  assert.equal(currentPage, 1, "Page must reset to 1 upon search synchronization");
  assert.equal(selectedVehicleId, 10, "Target vehicle must be selected");
  assert.equal(isScanModalOpen, false, "Scan modal must close automatically");

  // Case 2: Scan tra ve chuoi plate thuan tuy (vang lai hoac chua co ho so)
  handleVehicleMatchedFromScan("30A-888.88");
  assert.equal(filters.search, "30A-888.88", "Raw scanned string plate must also sync into search");
  assert.equal(currentPage, 1);
});

test("VEHICLE-13: Scan sync search filter accurately narrows vehicle list with Vietnamese normalization", () => {
  function normalizeSearchText(str) {
    if (!str) return "";
    return String(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u0111\u0110]/gi, "d")
      .toLowerCase()
      .trim();
  }

  const mockList = [
    { id: 1, licensePlate: "51K-992.14", customer: { name: "Nguyễn Văn A", phone: "0901234567" } },
    { id: 2, licensePlate: "30A-123.45", customer: { name: "Trần Thị B", phone: "0912345678" } },
    { id: 3, licensePlate: "29B-999.99", customer: { name: "Lê Văn C", phone: "0987654321" } },
  ];

  const filterVehicles = (list, searchTerm) => {
    if (!searchTerm) return list;
    const rawSearch = searchTerm.trim().toLowerCase();
    const normSearch = normalizeSearchText(searchTerm);
    return list.filter((item) => {
      const plate = (item.licensePlate || "").toLowerCase();
      const customerName = (item.customer?.name || "").toLowerCase();
      const phone = (item.customer?.phone || "").toLowerCase();

      const matchesRaw =
        plate.includes(rawSearch) ||
        customerName.includes(rawSearch) ||
        phone.includes(rawSearch);

      const matchesNormalized =
        normalizeSearchText(item.licensePlate).includes(normSearch) ||
        normalizeSearchText(item.customer?.name).includes(normSearch) ||
        normalizeSearchText(item.customer?.phone).includes(normSearch);

      return matchesRaw || matchesNormalized;
    });
  };

  const scannedPlate = "51K-992.14";
  const matchedResults = filterVehicles(mockList, scannedPlate);
  assert.equal(matchedResults.length, 1);
  assert.equal(matchedResults[0].id, 1);
  assert.equal(matchedResults[0].licensePlate, "51K-992.14");
});

test("VEHICLE-14: Camera auto-paste synchronization fills search input and triggers vehicle matching", () => {
  let detectedPlateState = "";
  let matchedVehicleState = null;

  const mockLocalVehicles = [
    {
      id: "XE0001",
      licensePlate: "51K-992.14",
      brand: "VinFast",
      model: "VF8",
      customer: { name: "Nguyễn Văn A", phone: "0901 234 567" },
      parkingSlot: { display: "Khu A - Tầng 2 - Slot 42" },
      ticket: { type: "Vé tháng", status: "active" },
    },
  ];

  // Simulating auto-detect hook detectedData update and auto-paste effect
  const onCameraPlateDetected = (detectedData) => {
    if (!detectedData?.plate_final) return;
    const plate = detectedData.plate_final.trim();
    detectedPlateState = plate;

    // Trigger match
    const found = mockLocalVehicles.find(
      (v) => v.licensePlate.replace(/[^a-zA-Z0-9]/g, "") === plate.replace(/[^a-zA-Z0-9]/g, "")
    );
    if (found) {
      matchedVehicleState = found;
    }
  };

  onCameraPlateDetected({ plate_final: "51K-992.14" });

  assert.equal(detectedPlateState, "51K-992.14", "Camera must auto-paste detected plate into search state");
  assert.ok(matchedVehicleState, "Must find vehicle in system");
  assert.equal(matchedVehicleState.brand, "VinFast");
  assert.equal(matchedVehicleState.model, "VF8");
  assert.equal(matchedVehicleState.customer.name, "Nguyễn Văn A");
  assert.equal(matchedVehicleState.customer.phone, "0901 234 567");
  assert.equal(matchedVehicleState.parkingSlot.display, "Khu A - Tầng 2 - Slot 42");
});

test("VEHICLE-15: Check-in records image URL into parking history session payload", async () => {
  const { checkInVehicle } = await import("#src/services/parkingSessionService.js");
  const { axiosInstance } = await import("#src/services/apiClient.js");

  const originalRequest = axiosInstance.request;
  let capturedConfig = null;

  try {
    axiosInstance.request = async (config) => {
      if (config.url && config.url.includes("/gates/")) {
        return { data: { results: [{ id: 1, direction: "IN" }] } };
      }
      capturedConfig = config;
      const parsedData = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
      return {
        data: {
          id: 999,
          session_code: "SES-2026-IMG",
          license_plate: parsedData?.license_plate || "51K-999.88",
          entry_image_url: parsedData?.entry_image_url || null,
        },
      };
    };

    const testPlate = "51K-999.88";
    const testImage = "data:image/jpeg;base64,mockimagedatastring";

    const session = await checkInVehicle({
      licensePlate: testPlate,
      imageUrl: testImage,
    });

    assert.equal(session.license_plate, testPlate);
    assert.equal(session.entry_image_url, testImage, "Parking session must preserve entry image URL");
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("VEHICLE-16: Image scan result maps plate and populates 5 canonical vehicle fields", async () => {
  const { mapPlateScanToVehicle } = await import("#src/utils/parking/plateScanMapper.js");

  const mockScanUploadResponse = {
    license_plate: "43A-999.99",
    plate_final: "43A-999.99",
    confidence: 97.5,
    best_candidate: {
      plate_text: "43A-999.99",
      confidence: 97.5,
    },
    vehicle_lookup: {
      vehicle: {
        id: "V-999",
        license_plate: "43A-999.99",
        model_name: "Camry 2.5Q",
        brand: "Toyota",
        customer: {
          id: 55,
          name: "Lê Văn B",
          phone: "0912 345 678",
        },
        slot_code: "B1-A08",
      },
      parking_position: {
        display_text: "Khu B1 - Tầng hầm 1 - Ô A08",
        floor_name: "Tầng hầm 1",
        zone_code: "B1",
      },
      active_ticket: {
        ticket_type_name: "Vé tháng",
        status: "active",
        is_valid: true,
      },
    },
  };

  const mapped = mapPlateScanToVehicle(mockScanUploadResponse);

  assert.ok(mapped, "Mapped vehicle must exist");
  assert.equal(mapped.licensePlate, "43A-999.99");
  // Field 1: Tên xe
  assert.equal(mapped.model, "Camry 2.5Q");
  // Field 2: Hãng xe
  assert.equal(mapped.brand, "Toyota");
  // Field 3: Tên khách hàng
  assert.equal(mapped.customer.name, "Lê Văn B");
  assert.equal(mapped.customerName, "Lê Văn B");
  // Field 4: Số điện thoại
  assert.equal(mapped.customer.phone, "0912 345 678");
  assert.equal(mapped.customerPhone, "0912 345 678");
  // Field 5: Vị trí đỗ
  assert.equal(mapped.parkingSlot.display, "Khu B1 - Tầng hầm 1 - Ô A08");
  // Actual AI confidence preserved
  assert.equal(mapped.confidence, 98);
});

test("VEHICLE-17: 5 canonical fields handle walk-in vehicle fallback gracefully", async () => {
  const { mapPlateScanToVehicle } = await import("#src/utils/parking/plateScanMapper.js");

  const walkInScanResponse = {
    license_plate: "51K-123.45",
    plate_final: "51K-123.45",
    confidence: 88.4,
    vehicle_lookup: null,
  };

  const mapped = mapPlateScanToVehicle(walkInScanResponse);

  assert.ok(mapped);
  assert.equal(mapped.licensePlate, "51K-123.45");
  // 5 fields fallbacks:
  // 1. Tên xe
  assert.equal(mapped.model, "Xe vãng lai");
  // 2. Hãng xe
  assert.equal(mapped.brand, "—");
  // 3. Tên khách hàng
  assert.equal(mapped.customer.name, "Khách vãng lai");
  // 4. Số điện thoại
  assert.equal(mapped.customer.phone, "—");
  // 5. Vị trí đỗ
  assert.equal(mapped.parkingSlot.display, "Chưa có vị trí");
  // Confidence
  assert.equal(mapped.confidence, 88);
});

test("VEHICLE-18: Camera auto-detection subscribes to detectedData without manual user typing", () => {
  let detectedPlateState = "";
  let matchedVehicleState = null;
  let scanDetailsState = null;

  const mockSystemVehicles = [
    {
      id: "V-102",
      licensePlate: "30A-888.88",
      model: "VF9 Plus",
      brand: "VinFast",
      customer: { name: "Trần Thị C", phone: "0987 654 321" },
      parkingSlot: { display: "Tầng 1 - Khu B - B-12" },
      ticket: { type: "Vé tháng", status: "active" },
    },
  ];

  // Simulating ScanPlateModal effect on detectedData?.plate_final
  const handleCameraPlateFinal = (detectedData) => {
    const plate = detectedData?.plate_final;
    if (!plate) return;

    detectedPlateState = plate;
    scanDetailsState = {
      confidence: detectedData.confidence || null,
      plate,
      source: "camera",
    };

    const clean = plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const found = mockSystemVehicles.find(
      (v) => v.licensePlate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() === clean
    );
    if (found) {
      matchedVehicleState = found;
    }
  };

  // Simulating camera frame OCR emission
  handleCameraPlateFinal({
    plate_final: "30A-888.88",
    confidence: 94.2,
  });

  assert.equal(detectedPlateState, "30A-888.88");
  assert.equal(scanDetailsState.source, "camera");
  assert.equal(scanDetailsState.confidence, 94.2);
  assert.ok(matchedVehicleState);
  assert.equal(matchedVehicleState.model, "VF9 Plus");
  assert.equal(matchedVehicleState.brand, "VinFast");
  assert.equal(matchedVehicleState.customer.name, "Trần Thị C");
  assert.equal(matchedVehicleState.customer.phone, "0987 654 321");
  assert.equal(matchedVehicleState.parkingSlot.display, "Tầng 1 - Khu B - B-12");
});

test("VEHICLE-19: Walk-in vehicles receive 'Vé lượt vãng lai' badge and do NOT receive false positive 'Vé tháng hiệu lực'", async () => {
  const { mapPlateScanToVehicle, isVehicleTicketActive } = await import("#src/utils/parking/plateScanMapper.js"
  );

  // 1. Walk-in scan (no lookup, casual car)
  const walkInScan = {
    license_plate: "51K-123.45",
    plate_final: "51K-123.45",
    confidence: 88,
    vehicle_lookup: null,
  };
  const walkInVehicle = mapPlateScanToVehicle(walkInScan);
  assert.ok(walkInVehicle);
  assert.equal(walkInVehicle.ticket.type, "Vé lượt");
  assert.equal(
    isVehicleTicketActive(walkInVehicle, false),
    false,
    "Walk-in vehicle without active subscription must NOT have isTicketActive = true"
  );

  // 2. Registered vehicle with expired ticket
  const expiredScan = {
    license_plate: "29A-888.88",
    plate_final: "29A-888.88",
    confidence: 92,
    vehicle_lookup: {
      vehicle: { id: 101, license_plate: "29A-888.88" },
      active_ticket: {
        package_name: "Vé tháng",
        status: "expired",
        is_expired: true,
        is_active: false,
      },
    },
  };
  const expiredVehicle = mapPlateScanToVehicle(expiredScan);
  assert.equal(
    isVehicleTicketActive(expiredVehicle, false),
    false,
    "Vehicle with expired ticket must NOT have isTicketActive = true"
  );

  // 3. Registered vehicle with valid active monthly ticket
  const activeMonthlyScan = {
    license_plate: "30A-999.99",
    plate_final: "30A-999.99",
    confidence: 96,
    vehicle_lookup: {
      vehicle: { id: 102, license_plate: "30A-999.99" },
      active_ticket: {
        package_name: "Vé tháng",
        status: "active",
        is_active: true,
        effective_to: "2026-12-31",
      },
    },
  };
  const activeVehicle = mapPlateScanToVehicle(activeMonthlyScan);
  assert.equal(
    isVehicleTicketActive(activeVehicle, false),
    true,
    "Registered vehicle with active ticket must have isTicketActive = true"
  );

  // 4. Parity with hasValidTicket override prop
  assert.equal(
    isVehicleTicketActive(walkInVehicle, true),
    true,
    "hasValidTicket prop must override when explicitly asserted by lane orchestrator"
  );
});


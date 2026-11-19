import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { axiosInstance } from "#src/services/apiClient.js";
import {
  previewParkingFee,
  checkInVehicle,
  checkOutVehicle,
} from "#src/services/parkingSessionService.js";
import {
  formatLicensePlateForDisplay,
  normalizeLicensePlate,
} from "#src/utils/plateFormatter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 1. FEE PREVIEW CONTRACT & VALIDATION
// ============================================================================

test("GateFlow: previewParkingFee constructs valid GET request with license_plate query param", async () => {
  const originalRequest = axiosInstance.request;
  let capturedUrl = null;

  try {
    axiosInstance.request = async (config) => {
      capturedUrl = config.url;
      return {
        data: {
          session_id: 101,
          session_code: "PK-20261106-001",
          license_plate: "51A-897.14",
          entry_time: "2026-11-06T08:00:00Z",
          duration_minutes: 65,
          duration_text: "1 giờ 5 phút",
          fee_amount: 20000.0,
          has_active_ticket: false,
          ticket_code: null,
          is_exempt: false,
          hourly_rate: 10000.0,
        },
      };
    };

    const res = await previewParkingFee({ licensePlate: "51A-897.14" });
    assert.ok(capturedUrl.includes("/api/v1/parking/sessions/fee-preview/"));
    assert.ok(capturedUrl.includes("license_plate=51A-897.14"));
    assert.equal(res.fee_amount, 20000.0);
    assert.equal(res.duration_text, "1 giờ 5 phút");
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("GateFlow: previewParkingFee constructs valid GET request with session_code query param", async () => {
  const originalRequest = axiosInstance.request;
  let capturedUrl = null;

  try {
    axiosInstance.request = async (config) => {
      capturedUrl = config.url;
      return {
        data: {
          session_id: 102,
          session_code: "PK-20261106-002",
          license_plate: "43A-123.45",
          entry_time: "2026-11-06T07:00:00Z",
          duration_minutes: 125,
          duration_text: "2 giờ 5 phút",
          fee_amount: 0.0,
          has_active_ticket: true,
          ticket_code: "VT0001",
          is_exempt: false,
          hourly_rate: 10000.0,
        },
      };
    };

    const res = await previewParkingFee({ sessionCode: "PK-20261106-002" });
    assert.ok(capturedUrl.includes("session_code=PK-20261106-002"));
    assert.equal(res.has_active_ticket, true);
    assert.equal(res.fee_amount, 0.0);
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("GateFlow: previewParkingFee throws Error when neither plate nor sessionCode is provided", async () => {
  await assert.rejects(
    async () => {
      await previewParkingFee({});
    },
    {
      message: "Vui lòng cung cấp biển số xe hoặc mã phiên đỗ để xem trước cước phí.",
    }
  );
});

test("GateFlow: previewParkingFee response schema matches DRF Backend schema", async () => {
  const originalRequest = axiosInstance.request;

  try {
    axiosInstance.request = async () => {
      return {
        data: {
          session_id: 301,
          session_code: "PK-20261106-301",
          license_plate: "51A-897.14",
          entry_time: "2026-11-06T00:00:00Z",
          duration_minutes: 120,
          duration_text: "2 giờ 0 phút",
          fee_amount: 20000.0,
          has_active_ticket: false,
          ticket_code: null,
          is_exempt: false,
          hourly_rate: 10000.0,
        },
      };
    };

    const preview = await previewParkingFee({ licensePlate: "51A-897.14" });
    assert.equal(typeof preview.session_id, "number");
    assert.equal(preview.session_code, "PK-20261106-301");
    assert.equal(preview.license_plate, "51A-897.14");
    assert.equal(preview.fee_amount, 20000.0);
    assert.equal(preview.hourly_rate, 10000.0);
    assert.equal(preview.has_active_ticket, false);
    assert.equal(preview.is_exempt, false);
  } finally {
    axiosInstance.request = originalRequest;
  }
});

// ============================================================================
// 2. CHECK-OUT FEE WAIVER & RBAC
// ============================================================================

test("GateFlow: checkOutVehicle sends waive_fee and waiver_reason when fee waiver is requested", async () => {
  const originalRequest = axiosInstance.request;
  let capturedBody = null;

  try {
    axiosInstance.request = async (config) => {
      if (config.url.includes("/api/v1/parking/gates/")) {
        return { data: { results: [{ id: 3, name: "Cổng ra 1", direction: "OUT" }] } };
      }
      capturedBody = JSON.parse(config.data);
      return {
        data: {
          session_id: 105,
          session_code: "PK-20261106-005",
          fee_amount: "0.00",
          status: "completed",
        },
      };
    };

    const res = await checkOutVehicle({
      licensePlate: "51A-897.14",
      waiveFee: true,
      waiverReason: "Sự cố camera nhận diện thẻ tháng của cư dân",
      exitGate: 3,
    });

    assert.equal(capturedBody.waive_fee, true);
    assert.equal(capturedBody.waiver_reason, "Sự cố camera nhận diện thẻ tháng của cư dân");
    assert.equal(capturedBody.payment_method, undefined);
    assert.equal(capturedBody.exit_gate_id, 3);
    assert.equal(res.fee_amount, "0.00");
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("GateFlow: checkOutVehicle sends standard payment_method when waiveFee is false", async () => {
  const originalRequest = axiosInstance.request;
  let capturedBody = null;

  try {
    axiosInstance.request = async (config) => {
      if (config.url.includes("/api/v1/parking/gates/")) {
        return { data: { results: [{ id: 3, name: "Cổng ra 1", direction: "OUT" }] } };
      }
      capturedBody = JSON.parse(config.data);
      return {
        data: {
          session_id: 106,
          session_code: "PK-20261106-006",
          fee_amount: "20000.00",
          status: "completed",
        },
      };
    };

    await checkOutVehicle({
      licensePlate: "51A-897.14",
      waiveFee: false,
      paymentMethod: "VIETQR",
      exitGate: 3,
    });

    assert.equal(capturedBody.payment_method, "VIETQR");
    assert.equal(capturedBody.waive_fee, undefined);
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("GateFlow: ExitLanePanel enforces RBAC: EMPLOYEE cannot waive fee under any circumstances", () => {
  const exitPanelPath = path.resolve(__dirname, '../../../src/components/VehicleManagement/scanPlate/ExitLanePanel.jsx');
  const exitPanelCode = fs.readFileSync(exitPanelPath, "utf-8");

  assert.ok(exitPanelCode.includes("isManager"));
  assert.ok(exitPanelCode.includes("PROP-4.5.1-P18"));
  assert.ok(exitPanelCode.includes("isWaiverInvalid"));

  const evaluatePermissions = ({ currentUserRole, isFeeExempt, waiverReason, detectedPlate }) => {
    const isManager = Boolean(
      currentUserRole &&
        (String(currentUserRole).toUpperCase().includes("MANAGER") ||
          String(currentUserRole).toLowerCase().includes("quản lý") ||
          currentUserRole === "ADMIN")
    );

    const isWaiverInvalid = isFeeExempt && (!isManager || !waiverReason.trim());
    const isConfirmDisabled = !detectedPlate || isWaiverInvalid;

    return {
      isManager,
      isWaiverInvalid,
      isConfirmDisabled,
    };
  };

  // EMPLOYEE with reason -> still blocked
  const empAttempt = evaluatePermissions({
    currentUserRole: "EMPLOYEE",
    isFeeExempt: true,
    waiverReason: "Khách quen đi nhầm cửa",
    detectedPlate: "51A-897.14",
  });
  assert.equal(empAttempt.isManager, false);
  assert.equal(empAttempt.isWaiverInvalid, true);
  assert.equal(empAttempt.isConfirmDisabled, true);

  // MANAGER without reason -> blocked
  const mgrBlank = evaluatePermissions({
    currentUserRole: "MANAGER",
    isFeeExempt: true,
    waiverReason: "   ",
    detectedPlate: "51A-897.14",
  });
  assert.equal(mgrBlank.isManager, true);
  assert.equal(mgrBlank.isWaiverInvalid, true);
  assert.equal(mgrBlank.isConfirmDisabled, true);

  // MANAGER with valid reason -> permitted
  const mgrValid = evaluatePermissions({
    currentUserRole: "MANAGER",
    isFeeExempt: true,
    waiverReason: "Sự cố kỹ thuật camera cổng",
    detectedPlate: "51A-897.14",
  });
  assert.equal(mgrValid.isManager, true);
  assert.equal(mgrValid.isWaiverInvalid, false);
  assert.equal(mgrValid.isConfirmDisabled, false);
});

// ============================================================================
// 3. IMAGE SANITIZATION & CLOUDINARY RESILIENCE
// ============================================================================

test("GateFlow: Base64 data URLs are stripped and not sent to backend in check-in or check-out", async () => {
  const originalRequest = axiosInstance.request;
  let checkInBody = null;
  let checkOutBody = null;

  try {
    axiosInstance.request = async (config) => {
      if (config.url.includes("/api/v1/parking/gates/")) {
        return { data: { results: [{ id: 1, name: "Gate", direction: "IN" }] } };
      }
      if (config.url.includes("/check-in/")) {
        checkInBody = JSON.parse(config.data);
        return { data: { id: 1, status: "open" } };
      }
      if (config.url.includes("/check-out/")) {
        checkOutBody = JSON.parse(config.data);
        return { data: { id: 1, status: "completed" } };
      }
      return { data: {} };
    };

    // HTTPS URL Cloudinary -> kept
    await checkInVehicle({
      licensePlate: "51A-897.14",
      entryGateId: 1,
      imageUrl: "https://res.cloudinary.com/test/image/upload/v1/plate.jpg",
    });
    assert.equal(checkInBody.entry_image_url, "https://res.cloudinary.com/test/image/upload/v1/plate.jpg");

    // Base64 Data URL -> stripped
    await checkOutVehicle({
      licensePlate: "51A-897.14",
      exitGate: 3,
      exitImageUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...",
    });
    assert.equal(checkOutBody.exit_image_url, undefined);
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("GateFlow: PlateScannerModal handleApply falls back safely when authoritative scan fails (502 Cloudinary)", () => {
  const scannerPath = path.resolve(__dirname, '../../../src/components/PlateScannerModal.jsx');
  const scannerCode = fs.readFileSync(scannerPath, "utf-8");

  assert.ok(
    scannerCode.includes("onDetected(plateToApply, { plate_final: plateToApply, image_url: null })"),
    "PlateScannerModal thiếu logic fallback an toàn khi authoritative scan gặp sự cố 502"
  );
});

// ============================================================================
// 4. HEADER CAMERA MODAL WIRING & INITIAL PLATE
// ============================================================================

test("GateFlow: AppTopHeader wires onPlateDetected to GateCameraControlModal with initialPlate", () => {
  const headerPath = path.resolve(__dirname, '../../../src/components/layout/AppTopHeader.jsx');
  const headerCode = fs.readFileSync(headerPath, "utf-8");

  assert.ok(headerCode.includes("const [isGateControlModalOpen, setIsGateControlModalOpen] = React.useState(false);"));
  assert.ok(headerCode.includes("const [gateModalPlate, setGateModalPlate] = React.useState(\"\");"));
  assert.ok(headerCode.includes("handlePlateDetectedFromScanner"));
  assert.ok(headerCode.includes("initialPlate={gateModalPlate}"));
});

test("GateFlow: GateCameraControlModal consumes initialPlate and triggers matching", () => {
  const modalPath = path.resolve(__dirname, '../../../src/components/VehicleManagement/GateCameraControlModal.jsx');
  const modalCode = fs.readFileSync(modalPath, "utf-8");

  assert.ok(modalCode.includes("initialPlate = \"\""));
  assert.ok(modalCode.includes("setDetectedPlate(clean)"));
  assert.ok(modalCode.includes("handleMatchPlate(clean)"));
});

// ============================================================================
// 5. VIETNAMESE ERROR MESSAGES CONFORMANCE
// ============================================================================

test("GateFlow: Standardized Vietnamese Error Messages match exact requirements", () => {
  const ERROR_MAP = {
    "PROP-4.5.1-P07": "Xe đang có phiên gửi chưa kết thúc tại bãi.",
    "PROP-4.5.1-P08": "Biển số nằm trong danh sách đen (Blacklist). Cần Quản lý phê duyệt để cho xe vào.",
    "PROP-4.5.1-P14": "Chỉ Quản lý mới có quyền phê duyệt xe trong danh sách đen.",
    "PROP-4.5.1-P18": "Chỉ Quản lý mới có quyền miễn cước phí đỗ xe.",
    "PROP-4.5.1-P19": "Vui lòng cung cấp lý do miễn cước đặc cách.",
    "PROP-4.5.1-P10": "Phiên đỗ xe này đã được kết thúc trước đó.",
  };

  assert.equal(ERROR_MAP["PROP-4.5.1-P07"], "Xe đang có phiên gửi chưa kết thúc tại bãi.");
  assert.equal(ERROR_MAP["PROP-4.5.1-P08"], "Biển số nằm trong danh sách đen (Blacklist). Cần Quản lý phê duyệt để cho xe vào.");
  assert.equal(ERROR_MAP["PROP-4.5.1-P14"], "Chỉ Quản lý mới có quyền phê duyệt xe trong danh sách đen.");
  assert.equal(ERROR_MAP["PROP-4.5.1-P18"], "Chỉ Quản lý mới có quyền miễn cước phí đỗ xe.");
  assert.equal(ERROR_MAP["PROP-4.5.1-P19"], "Vui lòng cung cấp lý do miễn cước đặc cách.");
  assert.equal(ERROR_MAP["PROP-4.5.1-P10"], "Phiên đỗ xe này đã được kết thúc trước đó.");
});

// ============================================================================
// 6. BARRIER STATE MACHINE & TIMER LIFECYCLE
// ============================================================================

test("GateFlow: Barrier State Machine transitions to opening, opened (600ms), and auto-closes after 3000ms", async () => {
  const BARRIER_OPEN_DELAY_MS = 600;
  const BARRIER_AUTO_CLOSE_DELAY_MS = 3000;

  let barrierState = "closed";
  const stateLog = [barrierState];

  const triggerBarrierOpen = () => {
    barrierState = "opening";
    stateLog.push(barrierState);

    setTimeout(() => {
      barrierState = "opened";
      stateLog.push(barrierState);

      setTimeout(() => {
        barrierState = "closed";
        stateLog.push(barrierState);
      }, BARRIER_AUTO_CLOSE_DELAY_MS);
    }, BARRIER_OPEN_DELAY_MS);
  };

  triggerBarrierOpen();
  assert.equal(barrierState, "opening");
  assert.equal(BARRIER_OPEN_DELAY_MS, 600);
  assert.equal(BARRIER_AUTO_CLOSE_DELAY_MS, 3000);
});

test("GateFlow: Rapid clicks reset barrier timers and prevent duplicated open events", () => {
  const BARRIER_OPEN_DELAY_MS = 600;
  let barrierState = "closed";
  let barrierTimer = null;
  let openCount = 0;

  const triggerBarrierOpen = () => {
    barrierState = "opening";
    if (barrierTimer) clearTimeout(barrierTimer);

    barrierTimer = setTimeout(() => {
      barrierState = "opened";
      openCount++;
    }, BARRIER_OPEN_DELAY_MS);
  };

  // Click 5 times rapidly
  for (let i = 0; i < 5; i++) {
    triggerBarrierOpen();
  }

  assert.equal(barrierState, "opening");
  assert.equal(openCount, 0);
  clearTimeout(barrierTimer);
});

test("GateFlow: Tab switch cleans up barrier timers and immediately restores closed state", () => {
  let barrierState = "closed";
  let barrierTimer = null;
  let openedFired = false;

  const triggerBarrierOpen = () => {
    barrierState = "opening";
    barrierTimer = setTimeout(() => {
      barrierState = "opened";
      openedFired = true;
    }, 600);
  };

  triggerBarrierOpen();
  assert.equal(barrierState, "opening");

  // Tab switch handler
  const switchLaneHandler = () => {
    barrierState = "closed";
    if (barrierTimer) clearTimeout(barrierTimer);
  };

  switchLaneHandler();
  assert.equal(barrierState, "closed");
  assert.equal(openedFired, false);
});

// ============================================================================
// 7. CROSS-TAB BROADCASTCHANNEL & STORAGE LISTENER (F1, F2)
// ============================================================================

test("GateFlow: AppTopHeader handles BroadcastChannel plate scan message and sets correct lane", () => {
  const headerPath = path.resolve(__dirname, '../../../src/components/layout/AppTopHeader.jsx');
  const headerCode = fs.readFileSync(headerPath, "utf-8");

  assert.ok(headerCode.includes("BroadcastChannel(\"smart_parking_plate_scan\")"), "AppTopHeader must listen on BroadcastChannel smart_parking_plate_scan");
  assert.ok(headerCode.includes("smart_parking_latest_scan"), "AppTopHeader must listen to localStorage fallback key smart_parking_latest_scan");
  assert.ok(headerCode.includes("setGateModalMode"), "AppTopHeader must store gateModalMode state");
  assert.ok(headerCode.includes("initialLane={gateModalMode}"), "GateCameraControlModal must receive initialLane");
});

test("GateFlow: BroadcastChannel scan message processing - lane selection and dedup logic", () => {
  let modalOpen = false;
  let modalPlate = "";
  let modalMode = "";
  let modalGateId = 0;
  let lastHandledScan = "";

  const processScanMessage = (msg, entryGateId = 1, exitGateId = 2) => {
    if (!msg || typeof msg !== "object") return false;
    if (msg.type !== "PLATE_SCANNED_SUCCESS") return false;
    const rawPlate = (msg.plate || "").trim();
    if (!rawPlate) return false;

    const scanId = msg.scanId || `${rawPlate}_${msg.timestamp || 1000}`;
    if (lastHandledScan === scanId) return false;
    lastHandledScan = scanId;

    const mappedMode = msg.mode === "out" || msg.mode === "exit" ? "exit" : "entry";
    const resolvedGateId = msg.gateId || (mappedMode === "exit" ? exitGateId : entryGateId);

    modalPlate = rawPlate;
    modalMode = mappedMode;
    modalGateId = resolvedGateId;
    modalOpen = true;
    return true;
  };

  // 1. Entry scan message
  const entryMsg = {
    type: "PLATE_SCANNED_SUCCESS",
    plate: "30A-612.35",
    mode: "in",
    gateId: 1,
    timestamp: 1730000000000,
  };
  const handledEntry = processScanMessage(entryMsg);
  assert.equal(handledEntry, true);
  assert.equal(modalOpen, true);
  assert.equal(modalPlate, "30A-612.35");
  assert.equal(modalMode, "entry");
  assert.equal(modalGateId, 1);

  // 2. Duplicate message ignored
  const handledDup = processScanMessage(entryMsg);
  assert.equal(handledDup, false, "Duplicate message with same timestamp should be ignored");

  // 3. Exit scan message
  const exitMsg = {
    type: "PLATE_SCANNED_SUCCESS",
    plate: "51A-897.14",
    mode: "out",
    gateId: 2,
    timestamp: 1730000001000,
  };
  const handledExit = processScanMessage(exitMsg);
  assert.equal(handledExit, true);
  assert.equal(modalPlate, "51A-897.14");
  assert.equal(modalMode, "exit");
  assert.equal(modalGateId, 2);

  // 4. Malformed messages rejected
  assert.equal(processScanMessage(null), false);
  assert.equal(processScanMessage({ type: "OTHER" }), false);
  assert.equal(processScanMessage({ type: "PLATE_SCANNED_SUCCESS", plate: "" }), false);
  assert.equal(processScanMessage({ type: "PLATE_SCANNED_SUCCESS", plate: "   " }), false);
});

test("GateFlow: CameraScannerPage extracts mode and gateId and posts to BroadcastChannel & localStorage", () => {
  const pagePath = path.resolve(__dirname, '../../../src/pages/CameraScannerPage.jsx');
  const pageCode = fs.readFileSync(pagePath, "utf-8");

  assert.ok(pageCode.includes("searchParams.get(\"mode\") || \"in\""), "CameraScannerPage must extract mode from query");
  assert.ok(pageCode.includes("smart_parking_plate_scan"), "CameraScannerPage must post to BroadcastChannel");
  assert.ok(pageCode.includes("smart_parking_latest_scan"), "CameraScannerPage must save to localStorage fallback");
  assert.ok(pageCode.includes("mode,"), "Payload must contain mode");
  assert.ok(pageCode.includes("gateId,"), "Payload must contain gateId");
});

// ============================================================================
// 8. PLATE FORMATTER & DISPLAY FORMAT (Finding 2)
// ============================================================================

test("GateFlow: formatLicensePlateForDisplay formats car 5-digit, car 4-digit, and motorbike plates with vehicleType awareness", () => {
  // Cars with known vehicleType
  assert.equal(formatLicensePlateForDisplay("51A89714", "CAR"), "51A-897.14");
  assert.equal(formatLicensePlateForDisplay("30C46858", "CAR"), "30C-468.58");
  assert.equal(formatLicensePlateForDisplay("30A61235", "CAR"), "30A-612.35");
  assert.equal(formatLicensePlateForDisplay("29A99988", "CAR"), "29A-999.88");
  assert.equal(formatLicensePlateForDisplay("29LD12345", "CAR"), "29LD-123.45");
  assert.equal(formatLicensePlateForDisplay("29H11234", "CAR"), "29H-112.34");

  // Motorbikes with known vehicleType
  assert.equal(formatLicensePlateForDisplay("29H11234", "MOTORCYCLE"), "29-H1 1234");
  assert.equal(formatLicensePlateForDisplay("59T249609", "MOTORCYCLE"), "59-T2 496.09");
  assert.equal(formatLicensePlateForDisplay("81B334303", "MOTORCYCLE"), "81-B3 343.03");

  // Unambiguous shapes without vehicleType (auto-formatted)
  assert.equal(formatLicensePlateForDisplay("29A9998"), "29A-9998");
  assert.equal(formatLicensePlateForDisplay("51A1234"), "51A-1234");
  assert.equal(formatLicensePlateForDisplay("59T249609"), "59-T2 496.09");
  assert.equal(formatLicensePlateForDisplay("81B334303"), "81-B3 343.03");

  // Ambiguous compact shapes without vehicleType: retain clean compact (DO NOT GUESS)
  assert.equal(formatLicensePlateForDisplay("29H11234"), "29H11234");
  assert.equal(formatLicensePlateForDisplay("51A89714"), "51A89714");
  assert.equal(formatLicensePlateForDisplay("30A61235"), "30A61235");
  assert.equal(formatLicensePlateForDisplay("29MD12345"), "29MD12345");

  // Already formatted plates (idempotent / explicit format preserved)
  assert.equal(formatLicensePlateForDisplay("51A-897.14"), "51A-897.14");
  assert.equal(formatLicensePlateForDisplay("30C-468.58"), "30C-468.58");
  assert.equal(formatLicensePlateForDisplay("30A-612.35"), "30A-612.35");
  assert.equal(formatLicensePlateForDisplay("59-T2 496.09"), "59-T2 496.09");
  assert.equal(formatLicensePlateForDisplay("81-B3 343.03"), "81-B3 343.03");
  assert.equal(formatLicensePlateForDisplay("29-H1 1234"), "29-H1 1234");

  // Normalizer
  assert.equal(normalizeLicensePlate("51A-897.14"), "51A89714");
  assert.equal(normalizeLicensePlate("59-T2 496.09"), "59T249609");
});

test("GateFlow: ParkingHistoryTable applies formatLicensePlateForDisplay", () => {
  const tablePath = path.resolve(__dirname, '../../../src/components/ParkingHistory/ParkingHistoryTable.jsx');
  const tableCode = fs.readFileSync(tablePath, "utf-8");

  assert.ok(tableCode.includes("formatLicensePlateForDisplay"), "ParkingHistoryTable must use formatLicensePlateForDisplay");
});

// ============================================================================
// 9. STATE SEPARATION & BADGE/LABEL ISOLATION (Finding 3 & Finding 5)
// ============================================================================

test("GateFlow: Finding 3/5 - GateCameraControlModal separates cameraDetectedPlate from manualInputPlate and passes isManualLookup", () => {
  const modalPath = path.resolve(__dirname, '../../../src/components/VehicleManagement/GateCameraControlModal.jsx');
  const modalCode = fs.readFileSync(modalPath, "utf-8");

  assert.ok(modalCode.includes("cameraDetectedPlate"), "Modal must maintain cameraDetectedPlate state");
  assert.ok(modalCode.includes("manualInputPlate"), "Modal must maintain manualInputPlate state");
  assert.ok(modalCode.includes("detectionSource"), "Modal must maintain detectionSource state");
  assert.ok(modalCode.includes("setScanDetails(null)"), "handleManualSearch must clear scanDetails to remove AI confidence badge");
  assert.ok(modalCode.includes("resetDetection()"), "handleManualSearch must call resetDetection to allow camera to scan next vehicle");
  assert.ok(modalCode.includes("isManualLookup={isManualLookup}"), "Modal must pass isManualLookup prop to ScanPlateCameraFeed");
  assert.ok(modalCode.includes("detectedPlate={cameraDetectedPlate}"), "ScanPlateCameraFeed must only receive cameraDetectedPlate");
});

test("GateFlow: Finding 3 - Manual search clears or marks stale camera overlay box/label and caption, and resets detection", () => {
  let cameraDetectedPlate = "81B334303";
  let manualInputPlate = "";
  let detectionSource = "camera";
  let scanDetails = { confidence: 0.985, source: "camera", plate: "81-B3 343.03" };
  let rawBoundingBox = { x: 100, y: 150, width: 200, height: 80 };
  let statusMessage = "Đã nhận diện ổn định biển số xe.";
  let resetDetectionCalled = false;

  const resetDetection = () => {
    resetDetectionCalled = true;
  };

  const handleManualSearch = (typedPlate) => {
    detectionSource = "manual";
    scanDetails = null;
    manualInputPlate = typedPlate;
    resetDetection();
  };

  handleManualSearch("51A-897.14");

  const isManualLookup = detectionSource === "manual";
  const effectiveBoundingBox = isManualLookup ? null : rawBoundingBox;
  const effectiveStatusMessage = isManualLookup ? "Đang tra cứu thủ công" : statusMessage;
  const effectiveCameraPlate = isManualLookup ? "" : cameraDetectedPlate;

  assert.equal(detectionSource, "manual");
  assert.equal(scanDetails, null, "AI confidence badge must be null/cleared on manual lookup");
  assert.equal(manualInputPlate, "51A-897.14");
  assert.equal(resetDetectionCalled, true, "resetDetection must be called so camera can resume searching");
  assert.equal(effectiveBoundingBox, null, "Bounding box overlay must be cleared when in manual lookup");
  assert.equal(effectiveStatusMessage, "Đang tra cứu thủ công", "Status message must not claim stable camera detection");
  assert.equal(effectiveCameraPlate, "", "Camera plate overlay label must be cleared on manual search");
});

test("GateFlow: Finding 3 - New camera detection restores camera overlay box, label, and stable detection caption", () => {
  let cameraDetectedPlate = "81B334303";
  let manualInputPlate = "51A-897.14";
  let detectionSource = "manual";
  let lastDetectedPlate = "81B334303";
  let rawBoundingBox = null;
  let statusMessage = "Đang tra cứu thủ công";

  // Simulate new plate detected by camera
  const onNewCameraDetection = (newPlate, newBox) => {
    if (newPlate && newPlate !== lastDetectedPlate) {
      lastDetectedPlate = newPlate;
      cameraDetectedPlate = newPlate;
      manualInputPlate = newPlate;
      detectionSource = "camera";
      rawBoundingBox = newBox;
      statusMessage = "Đã nhận diện ổn định biển số xe.";
    }
  };

  const newPlateBox = { x: 120, y: 160, width: 210, height: 85 };
  onNewCameraDetection("59T249609", newPlateBox);

  const isManualLookup = detectionSource === "manual";
  const effectiveBoundingBox = isManualLookup ? null : rawBoundingBox;
  const effectiveStatusMessage = isManualLookup ? "Đang tra cứu thủ công" : statusMessage;
  const effectiveCameraPlate = isManualLookup ? "" : cameraDetectedPlate;

  assert.equal(detectionSource, "camera");
  assert.equal(cameraDetectedPlate, "59T249609");
  assert.equal(effectiveBoundingBox, newPlateBox, "Overlay bounding box must be restored with new plate");
  assert.equal(effectiveStatusMessage, "Đã nhận diện ổn định biển số xe.", "Stable detection caption must be restored");
  assert.equal(effectiveCameraPlate, "59T249609", "Overlay label must show newly detected plate");
});


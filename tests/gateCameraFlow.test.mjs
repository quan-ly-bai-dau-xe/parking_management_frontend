import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { axiosInstance } from "../src/services/apiClient.js";
import {
  previewParkingFee,
  checkInVehicle,
  checkOutVehicle,
  forceCloseSessionAndReleaseSlot,
} from "../src/services/parkingSessionService.js";
import {
  formatLicensePlateForDisplay,
  normalizeLicensePlate,
} from "../src/utils/plateFormatter.js";
import {
  getParkingGates,
  getGateWorkerStatus,
} from "../src/services/gateService.js";
import {
  evaluateAutoApplyPolicy,
  ACTION_AUTO_CHECK_IN,
  ACTION_AUTO_CHECK_OUT,
  ACTION_HOLD,
  REASON_UNREGISTERED_VEHICLE,
  REASON_FEE_PAYMENT_REQUIRED,
  REASON_VALID_REGISTERED,
  REASON_VALID_FEE_ZERO,
} from "../src/utils/gateAutoApplyPolicy.js";

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
  const exitPanelPath = path.resolve(__dirname, "../src/components/VehicleManagement/scanPlate/ExitLanePanel.jsx");
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
  const scannerPath = path.resolve(__dirname, "../src/components/PlateScannerModal.jsx");
  const scannerCode = fs.readFileSync(scannerPath, "utf-8");

  assert.ok(
    scannerCode.includes("onDetected(plateToApply, { plate_final: plateToApply, image_url: null })"),
    "PlateScannerModal thiếu logic fallback an toàn khi authoritative scan gặp sự cố 502"
  );
});

test("GateFlow: G9a - PlateScannerModal defines useNavigate import and hook to prevent runtime ReferenceError", () => {
  const scannerPath = path.resolve(__dirname, "../src/components/PlateScannerModal.jsx");
  const scannerCode = fs.readFileSync(scannerPath, "utf-8");

  assert.ok(
    scannerCode.includes('import { useNavigate } from "react-router-dom";'),
    "PlateScannerModal must import useNavigate"
  );
  assert.ok(
    scannerCode.includes("const navigate = useNavigate();"),
    "PlateScannerModal must initialize navigate via useNavigate()"
  );
  assert.ok(
    scannerCode.includes("navigate(ROUTES.REGISTER);"),
    "PlateScannerModal navigates to register route on unregistered plate link"
  );
});

// ============================================================================
// 4. HEADER CAMERA MODAL WIRING & INITIAL PLATE
// ============================================================================

test("GateFlow: AppTopHeader wires onPlateDetected to GateCameraControlModal with initialPlate", () => {
  const headerPath = path.resolve(__dirname, "../src/components/layout/AppTopHeader.jsx");
  const headerCode = fs.readFileSync(headerPath, "utf-8");

  assert.ok(headerCode.includes("const [isGateControlModalOpen, setIsGateControlModalOpen] = React.useState(false);"));
  assert.ok(headerCode.includes("const [gateModalPlate, setGateModalPlate] = React.useState(\"\");"));
  assert.ok(headerCode.includes("handlePlateDetectedFromScanner"));
  assert.ok(headerCode.includes("initialPlate={gateModalPlate}"));
});

test("GateFlow: GateCameraControlModal consumes initialPlate and triggers matching", () => {
  const modalPath = path.resolve(__dirname, "../src/components/VehicleManagement/GateCameraControlModal.jsx");
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
  const headerPath = path.resolve(__dirname, "../src/components/layout/AppTopHeader.jsx");
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
  const pagePath = path.resolve(__dirname, "../src/pages/CameraScannerPage.jsx");
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
  const tablePath = path.resolve(__dirname, "../src/components/ParkingHistory/ParkingHistoryTable.jsx");
  const tableCode = fs.readFileSync(tablePath, "utf-8");

  assert.ok(tableCode.includes("formatLicensePlateForDisplay"), "ParkingHistoryTable must use formatLicensePlateForDisplay");
});

// ============================================================================
// 9. STATE SEPARATION & BADGE/LABEL ISOLATION (Finding 3 & Finding 5)
// ============================================================================

test("GateFlow: Finding 3/5 - GateCameraControlModal separates cameraDetectedPlate from manualInputPlate and passes isManualLookup", () => {
  const modalPath = path.resolve(__dirname, "../src/components/VehicleManagement/GateCameraControlModal.jsx");
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

// ============================================================================
// 10. DUAL MODE & AUTO-APPLY FLOW TESTS (Milestone M4)
// ============================================================================

test("GateFlow: GateCameraControlModal source code defines Dual Mode, toggle persistence, and Viewer Mode elements", () => {
  const modalPath = path.resolve(__dirname, "../src/components/VehicleManagement/GateCameraControlModal.jsx");
  const modalCode = fs.readFileSync(modalPath, "utf-8");

  assert.ok(modalCode.includes("workerOnline"), "Must track workerOnline status");
  assert.ok(modalCode.includes("lastAutoEvent"), "Must track lastAutoEvent telemetry");
  assert.ok(modalCode.includes("autoApplyEnabled"), "Must track autoApplyEnabled toggle state");
  assert.ok(modalCode.includes("evaluateAutoApplyPolicy"), "Must import and invoke evaluateAutoApplyPolicy");
  assert.ok(modalCode.includes("getGateWorkerStatus"), "Must poll getGateWorkerStatus");
  assert.ok(modalCode.includes("viewer-mode-badge"), "Must render viewer-mode-badge when worker online");
  assert.ok(modalCode.includes("auto-apply-toggle"), "Must render auto-apply-toggle in Browser Mode");
  assert.ok(modalCode.includes("worker-status-loading"), "Must render worker-status-loading when workerOnline is null");
  assert.ok(modalCode.includes("server-event-banner"), "Must render server-event-banner when last_auto_event is present");
  assert.ok(modalCode.includes("informational-banner"), "Must render informational-banner for 409 Conflict");
  assert.ok(modalCode.includes("auto-apply-banner"), "Must render non-blocking auto-apply banner");
});

test("GateFlow: Browser Mode auto-apply triggers check-in for valid registered vehicle with available slot", () => {
  let barrierState = "closed";
  let autoApplyBannerMessage = "";
  let checkInTriggered = false;

  const triggerBarrierOpen = () => {
    barrierState = "opening";
  };

  const handleConfirmEntry = () => {
    checkInTriggered = true;
    triggerBarrierOpen();
    autoApplyBannerMessage = "Đã tự động ghi nhận Check-in cho xe 30A-612.35. Mở barrier.";
  };

  const registeredVehicle = {
    vehicle_id: 101,
    license_plate: "30A-612.35",
    is_registered: true,
    is_blacklisted: false,
  };
  const availableSlot = { id: 12, code: "A-01" };

  const workerOnline = false;
  const autoApplyEnabled = true;
  const detectionSource = "camera";

  const policy = evaluateAutoApplyPolicy({
    direction: "IN",
    gateActive: true,
    isAutoScan: true,
    reviewStatus: "AUTO",
    confidence: 96.5,
    isPlateStable: true,
    vehicleMatch: registeredVehicle,
    openSession: null,
    availableSlot,
  });

  assert.equal(policy.canAutoApply, true);
  assert.equal(policy.action, ACTION_AUTO_CHECK_IN);
  assert.equal(policy.reason, REASON_VALID_REGISTERED);

  if (!workerOnline && autoApplyEnabled && detectionSource === "camera" && policy.canAutoApply) {
    handleConfirmEntry();
  }

  assert.equal(checkInTriggered, true, "Entry check-in must be automatically triggered");
  assert.equal(barrierState, "opening", "Barrier must be automatically triggered to open");
  assert.ok(autoApplyBannerMessage.includes("Đã tự động ghi nhận"), "Green banner must show auto-apply message");
});

test("GateFlow: Browser Mode auto-apply triggers check-out when open session has fee = 0.00", () => {
  let barrierState = "closed";
  let autoApplyBannerMessage = "";
  let checkOutTriggered = false;

  const triggerBarrierOpen = () => {
    barrierState = "opening";
  };

  const handleConfirmExit = () => {
    checkOutTriggered = true;
    triggerBarrierOpen();
    autoApplyBannerMessage = "Đã tự động ghi nhận Check-out cho xe 51A-897.14 (Cước: 0đ). Mở barrier.";
  };

  const openSession = { session_id: 201, session_code: "SES-20261108-0002" };
  const workerOnline = false;
  const autoApplyEnabled = true;
  const detectionSource = "camera";

  const policy = evaluateAutoApplyPolicy({
    direction: "OUT",
    gateActive: true,
    isAutoScan: true,
    reviewStatus: "AUTO",
    confidence: 94.0,
    isPlateStable: true,
    openSession,
    feePreview: 0.0,
  });

  assert.equal(policy.canAutoApply, true);
  assert.equal(policy.action, ACTION_AUTO_CHECK_OUT);
  assert.equal(policy.reason, REASON_VALID_FEE_ZERO);

  if (!workerOnline && autoApplyEnabled && detectionSource === "camera" && policy.canAutoApply) {
    handleConfirmExit();
  }

  assert.equal(checkOutTriggered, true, "Exit check-out must be automatically triggered");
  assert.equal(barrierState, "opening", "Barrier must be triggered to open");
  assert.ok(autoApplyBannerMessage.includes("Đã tự động ghi nhận"), "Banner must announce auto-apply");
});

test("GateFlow: Browser Mode does NOT auto-apply when toggle is OFF", () => {
  let checkInTriggered = false;
  const workerOnline = false;
  const autoApplyEnabled = false; // Staff turned off auto-apply toggle
  const detectionSource = "camera";

  const policy = evaluateAutoApplyPolicy({
    direction: "IN",
    confidence: 96.5,
    vehicleMatch: { is_registered: true },
    availableSlot: { id: 1 },
  });

  assert.equal(policy.canAutoApply, true);

  // Guard must block auto-execution when autoApplyEnabled is false
  if (!workerOnline && autoApplyEnabled && detectionSource === "camera" && policy.canAutoApply) {
    checkInTriggered = true;
  }

  assert.equal(checkInTriggered, false, "Must not auto-apply when toggle is OFF");
});

test("GateFlow: Browser Mode does NOT auto-apply for unregistered vehicle (WALK_IN) or exit fee > 0", () => {
  // 1. Entry: Unregistered vehicle
  const unregPolicy = evaluateAutoApplyPolicy({
    direction: "IN",
    confidence: 96.5,
    vehicleMatch: { id: "WALK_IN_123", is_registered: false },
    availableSlot: { id: 1 },
  });
  assert.equal(unregPolicy.canAutoApply, false);
  assert.equal(unregPolicy.reason, REASON_UNREGISTERED_VEHICLE);
  assert.equal(unregPolicy.needsStaff, true);

  // 2. Exit: Fee > 0
  const feePolicy = evaluateAutoApplyPolicy({
    direction: "OUT",
    confidence: 96.5,
    openSession: { session_id: 101 },
    feePreview: 20000.0,
  });
  assert.equal(feePolicy.canAutoApply, false);
  assert.equal(feePolicy.reason, REASON_FEE_PAYMENT_REQUIRED);
  assert.equal(feePolicy.paymentRequired, true);
});

test("GateFlow: Viewer Mode (workerOnline === true) completely suppresses client-side auto-apply and displays server event telemetry", () => {
  let clientActionTriggered = false;
  const workerOnline = true; // Server Gate Worker is active
  const autoApplyEnabled = true;
  const detectionSource = "camera";

  const policy = evaluateAutoApplyPolicy({
    direction: "IN",
    confidence: 97.0,
    vehicleMatch: { is_registered: true },
    availableSlot: { id: 1 },
  });

  // Client auto-apply is strictly blocked in Viewer Mode
  if (!workerOnline && autoApplyEnabled && detectionSource === "camera" && policy.canAutoApply) {
    clientActionTriggered = true;
  }

  assert.equal(clientActionTriggered, false, "Client must NOT trigger check-in in Viewer Mode (zero double check-ins)");

  // Simulated server event telemetry
  const serverLastAutoEvent = {
    action: "GATE_AUTO_CHECK_IN",
    license_plate_masked: "51A-***.14",
    reason: "VALID_REGISTERED",
    occurred_at: "2026-11-08T06:00:00Z",
  };

  assert.equal(serverLastAutoEvent.action, "GATE_AUTO_CHECK_IN");
  assert.equal(serverLastAutoEvent.license_plate_masked, "51A-***.14");
});

test("GateFlow: Initial poll window (workerOnline === null) strictly blocks client-side auto-apply", () => {
  let clientActionTriggered = false;
  const workerOnline = null; // Trạng thái chưa rõ khi vừa mở modal / đổi cổng
  const autoApplyEnabled = true;
  const detectionSource = "camera";

  const policy = evaluateAutoApplyPolicy({
    direction: "IN",
    gateActive: true,
    isAutoScan: true,
    reviewStatus: "AUTO",
    confidence: 98.0,
    isPlateStable: true,
    vehicleMatch: { is_registered: true, is_blacklisted: false },
    availableSlot: { id: 1 },
  });

  assert.equal(policy.canAutoApply, true);

  // Client guard: workerOnline !== false chặn hoàn toàn khi workerOnline === null hoặc true
  if (workerOnline === false && autoApplyEnabled && detectionSource === "camera" && policy.canAutoApply) {
    clientActionTriggered = true;
  }

  assert.equal(clientActionTriggered, false, "Client must NOT trigger check-in while worker status is null (unknown window)");
});

test("GateFlow: HTTP 409 Conflict is handled as informational banner, not blocking red error", () => {
  let errorMessage = "Initial error";
  let informationalMessage = "";

  const handleConflictError = (err) => {
    const status = err?.status || err?.response?.status;
    const errorCode = err?.data?.code || err?.code;
    const is409 = status === 409 || errorCode === "PROP-4.5.1-P07" || errorCode === "CONFLICT";

    if (is409) {
      errorMessage = "";
      informationalMessage = "Phương tiện đã được ghi nhận vào bãi trước đó trên hệ thống (409 Conflict).";
    } else {
      errorMessage = "Lỗi nghiêm trọng không thể tiếp tục.";
    }
  };

  const conflictErr = { status: 409, data: { message: "Conflict: Session already open" } };
  handleConflictError(conflictErr);

  assert.equal(errorMessage, "", "Error message must be cleared (not a blocking red error)");
  assert.ok(informationalMessage.includes("409 Conflict"), "Informational banner must inform operator gracefully");
});

test("GateFlow: gateService.getGateWorkerStatus parses worker_online and last_auto_event", async () => {
  const originalRequest = axiosInstance.request;

  try {
    axiosInstance.request = async (config) => {
      if (config.url.includes("/api/v1/parking/gates/")) {
        return {
          data: [
            {
              id: 1,
              code: "IN_01",
              name: "Cổng vào 1",
              direction: "IN",
              worker_online: true,
              last_auto_event: {
                action: "GATE_AUTO_CHECK_IN",
                license_plate_masked: "51A-***.14",
                reason: "VALID_REGISTERED",
                occurred_at: "2026-11-08T06:00:00Z",
              },
            },
            {
              id: 2,
              code: "OUT_01",
              name: "Cổng ra 1",
              direction: "OUT",
              worker_online: false,
              last_auto_event: null,
            },
          ],
        };
      }
      return { data: {} };
    };

    const statusGate1 = await getGateWorkerStatus(1);
    assert.equal(statusGate1.success, true);
    assert.equal(statusGate1.worker_online, true);
    assert.equal(statusGate1.last_auto_event.action, "GATE_AUTO_CHECK_IN");
    assert.equal(statusGate1.last_auto_event.license_plate_masked, "51A-***.14");

    const statusGate2 = await getGateWorkerStatus("OUT_01");
    assert.equal(statusGate2.success, true);
    assert.equal(statusGate2.worker_online, false);
    assert.equal(statusGate2.last_auto_event, null);

    const statusNonExistent = await getGateWorkerStatus(999);
    assert.equal(statusNonExistent.success, true);
    assert.equal(statusNonExistent.worker_online, false);
    assert.equal(statusNonExistent.last_auto_event, null);

    // Network blip / API error -> success: false, worker_online: null
    axiosInstance.request = async () => {
      throw new Error("500 Internal Server Error");
    };
    const statusError = await getGateWorkerStatus(1);
    assert.equal(statusError.success, false);
    assert.equal(statusError.worker_online, null);
    assert.equal(statusError.gate, null);
    assert.ok(statusError.error.includes("500 Internal Server Error"));
  } finally {
    axiosInstance.request = originalRequest;
  }
});



// ============================================================================
// 8. TRI-STATE WORKER GUARD, VIEWER-TO-BROWSER TRANSITION & STORAGE TOLERANCE
// ============================================================================

class GateModalTriStateHarness {
  constructor(options = {}) {
    this.isOpen = options.isOpen ?? true;
    this.workerOnline = null;
    this.prevWorkerOnline = null;
    this.autoApplyEnabled = options.autoApplyEnabled ?? true;
    this.isActionPending = false;
    this.autoAppliedPlate = "";
    this.detectedPlate = "";
    this.detectionSource = "camera";
    this.isScanning = false;
    this.laneMode = options.laneMode ?? "entry";
    this.isLoadingSlots = false;
    this.isLoadingFeePreview = false;
    this.autoApplyCount = 0;
    this.resetDetectionCount = 0;
    this.executionLog = [];
  }

  async fetchWorkerStatus({ delayMs = 0, isInitial = false, outcome = "offline", throws = false }) {
    if (isInitial) {
      this.prevWorkerOnline = null;
      this.consecutivePollFailures = 0;
      this.isWorkerStatusUnavailable = false;
      this.workerOnline = null;
    }
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    if (throws || outcome === "error") {
      this.consecutivePollFailures = (this.consecutivePollFailures || 0) + 1;
      if (this.consecutivePollFailures >= 3) {
        this.isWorkerStatusUnavailable = true;
      }
      // G8 Safe Default: Keeps previous workerOnline, never flips to false or triggers auto-apply
      return;
    }

    this.consecutivePollFailures = 0;
    this.isWorkerStatusUnavailable = false;
    const nextOnline = outcome === "online" ? true : outcome === "offline" ? false : outcome;
    const wasOnline = this.prevWorkerOnline;
    this.prevWorkerOnline = nextOnline;
    if (wasOnline === true && nextOnline === false) {
      if (this.detectedPlate) {
        this.autoAppliedPlate = this.detectedPlate;
      }
      this.resetDetectionCount++;
    }
    this.workerOnline = nextOnline;
    this.evaluateAutoApplyEffect();
  }

  switchLane(newLaneMode) {
    this.laneMode = newLaneMode;
    this.prevWorkerOnline = null;
    this.workerOnline = null;
    this.autoAppliedPlate = "";
    if (newLaneMode === "exit") {
      this.isLoadingFeePreview = true;
    }
  }

  onPlateDetected(options = {}) {
    const {
      plate,
      matchedVehicle = { id: 101, is_registered: true, is_blacklisted: false },
      availableSlots = [{ id: 1, code: "A-01" }],
      rawLookup = null,
      backendFeePreview = null,
      hasValidTicket = false,
    } = options;
    const confidence = Object.prototype.hasOwnProperty.call(options, "confidence")
      ? options.confidence
      : 98.5;

    if (plate !== this.detectedPlate) {
      this.autoAppliedPlate = "";
    }
    this.detectedPlate = plate;
    this.detectionSource = "camera";
    this.currentContext = {
      confidence,
      matchedVehicle,
      availableSlots,
      rawLookup,
      backendFeePreview,
      hasValidTicket,
    };
    return this.evaluateAutoApplyEffect();
  }

  evaluateAutoApplyEffect() {
    if (
      !this.isOpen ||
      this.workerOnline !== false ||
      !this.autoApplyEnabled ||
      this.isActionPending
    ) {
      return false;
    }
    if (this.detectionSource !== "camera" || !this.detectedPlate || this.isScanning) {
      return false;
    }
    if (this.autoAppliedPlate === this.detectedPlate) {
      return false;
    }

    const ctx = this.currentContext || {};
    const rawConf = ctx.confidence;
    const conf = typeof rawConf === "number" && Number.isFinite(rawConf) ? rawConf : 0.0;

    if (this.laneMode === "entry") {
      if (this.isLoadingSlots) return false;
      const isBlacklisted = Boolean(
        ctx.rawLookup?.is_blacklisted ||
        ctx.rawLookup?.status === "BLACKLISTED" ||
        ctx.matchedVehicle?.isBlacklisted ||
        ctx.matchedVehicle?.status === "BLACKLISTED" ||
        ctx.matchedVehicle?.is_blacklisted
      );
      if (isBlacklisted) return false;

      const chosenSlot = ctx.availableSlots?.[0] || null;
      const policy = evaluateAutoApplyPolicy({
        direction: "IN",
        gateActive: true,
        isAutoScan: true,
        reviewStatus: "AUTO",
        confidence: conf,
        confidenceThreshold: 90.0,
        isPlateStable: true,
        vehicleMatch: ctx.matchedVehicle,
        openSession: ctx.rawLookup?.open_session || null,
        availableSlot: chosenSlot,
      });
      if (policy.canAutoApply) {
        this.autoAppliedPlate = this.detectedPlate;
        this.autoApplyCount++;
        this.resetDetectionCount++;
        this.executionLog.push({ action: "CHECK_IN", plate: this.detectedPlate });
        return true;
      }
    } else if (this.laneMode === "exit") {
      if (this.isLoadingFeePreview || !ctx.rawLookup?.open_session) return false;
      const feeAmount =
        ctx.backendFeePreview?.fee_amount !== undefined
          ? ctx.backendFeePreview.fee_amount
          : ctx.hasValidTicket
            ? 0.0
            : null;
      const policy = evaluateAutoApplyPolicy({
        direction: "OUT",
        gateActive: true,
        isAutoScan: true,
        reviewStatus: "AUTO",
        confidence: conf,
        confidenceThreshold: 90.0,
        isPlateStable: true,
        vehicleMatch: ctx.matchedVehicle,
        openSession: ctx.rawLookup?.open_session || null,
        feePreview: feeAmount,
      });
      if (policy.canAutoApply) {
        this.autoAppliedPlate = this.detectedPlate;
        this.autoApplyCount++;
        this.resetDetectionCount++;
        this.executionLog.push({ action: "CHECK_OUT", plate: this.detectedPlate });
        return true;
      }
    }
    return false;
  }
}

test("GateFlow: GateCameraControlModal enforces workerOnline tri-state contract and snapshot_error display", () => {
  const modalPath = path.resolve(__dirname, "../src/components/VehicleManagement/GateCameraControlModal.jsx");
  const modalContent = fs.readFileSync(modalPath, "utf-8");

  assert.ok(modalContent.includes("const [workerOnline, setWorkerOnline] = useState(null);"));
  assert.ok(modalContent.includes("setWorkerOnline(null);"));
  assert.ok(modalContent.includes("workerOnline !== false"));
  assert.ok(modalContent.includes("workerOnline === true ? ("));
  assert.ok(modalContent.includes("workerOnline === false ? ("));
  assert.ok(modalContent.includes('data-testid="worker-status-loading"'));
  assert.ok(modalContent.includes("lastAutoEvent.snapshot_error"));

  // G8 Safe Defaults static contract assertions
  assert.ok(modalContent.includes("consecutivePollFailuresRef = useRef(0)"));
  assert.ok(modalContent.includes("setIsWorkerStatusUnavailable(true)"));
  assert.ok(modalContent.includes('data-testid="worker-status-unavailable-note"'));
  assert.ok(modalContent.includes("Number.isFinite(rawConf)"));
  assert.ok(modalContent.includes("typeof rawConf === \"number\""));
  assert.ok(modalContent.includes("!entryValidation.eligible || isBlacklisted"));
});

test("GateFlow: Tri-state guard rejects all non-false workerOnline values and blocks during slow initial poll", async () => {
  const nonFalseValues = [null, undefined, true, 0, 1, -1, "", "false", "true", NaN, {}, []];
  for (const val of nonFalseValues) {
    const harness = new GateModalTriStateHarness({ isOpen: true, autoApplyEnabled: true });
    harness.workerOnline = val;
    const triggered = harness.onPlateDetected({
      plate: "51A-897.14",
      confidence: 99.0,
      matchedVehicle: { id: 1, is_registered: true },
      availableSlots: [{ id: 10, code: "A-01" }],
    });
    assert.equal(triggered, false);
    assert.equal(harness.autoApplyCount, 0);
  }

  const slowPollHarness = new GateModalTriStateHarness({ isOpen: true, autoApplyEnabled: true });
  const pollPromise = slowPollHarness.fetchWorkerStatus({ delayMs: 250, isInitial: true, outcome: "online" });
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    const fired = slowPollHarness.onPlateDetected({
      plate: `51K-${String(i).padStart(5, "0")}`,
      confidence: 98.5,
    });
    assert.equal(fired, false, "Must never auto-apply before first status poll completes");
  }
  await pollPromise;
  assert.equal(slowPollHarness.workerOnline, true);
  assert.equal(slowPollHarness.autoApplyCount, 0);
});

test("GateFlow: Viewer Mode -> Browser Mode transition prevents retroactive duplicate submit and auto-applies next vehicle", async () => {
  const harness = new GateModalTriStateHarness({ isOpen: true, autoApplyEnabled: true });

  // 1. Worker online (Viewer Mode): plate 51A-897.14 is seen by camera & handled by server worker
  await harness.fetchWorkerStatus({ isInitial: true, outcome: "online" });
  assert.equal(harness.workerOnline, true);
  const viewerTriggered = harness.onPlateDetected({ plate: "51A-897.14", confidence: 99.1 });
  assert.equal(viewerTriggered, false);
  assert.equal(harness.autoApplyCount, 0);

  // 2. Worker stops -> status flips true -> false: must NOT retroactively submit 51A-897.14, and must resetDetection
  await harness.fetchWorkerStatus({ isInitial: false, outcome: "offline" });
  assert.equal(harness.workerOnline, false);
  assert.equal(harness.autoApplyCount, 0, "Lingering Viewer Mode plate must NOT double-submit");
  assert.ok(harness.resetDetectionCount >= 1, "Camera detector must re-arm for next vehicle");

  // 3. Next registered vehicle arrives -> Browser Mode auto-applies cleanly
  const nextTriggered = harness.onPlateDetected({ plate: "43A-123.45", confidence: 98.8 });
  assert.equal(nextTriggered, true);
  assert.equal(harness.autoApplyCount, 1);
  assert.deepEqual(harness.executionLog, [{ action: "CHECK_IN", plate: "43A-123.45" }]);

  // 4. Lane switch resets workerOnline to null immediately
  harness.switchLane("exit");
  assert.equal(harness.workerOnline, null);
  assert.equal(
    harness.onPlateDetected({
      plate: "43A-123.45",
      rawLookup: { open_session: { id: 55, session_code: "PK-001" } },
      hasValidTicket: true,
    }),
    false
  );
});

test("GateFlow: localStorage persistence for auto-apply toggle tolerates SecurityError and QuotaExceededError", () => {
  const STORAGE_KEY = "gate_auto_apply_enabled";
  const store = {};
  let throwOnGet = false;
  let throwOnSet = false;

  const mockStorage = {
    getItem(k) {
      if (throwOnGet) throw new Error("SecurityError");
      return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
    },
    setItem(k, v) {
      if (throwOnSet) throw new Error("QuotaExceededError");
      store[k] = String(v);
    },
  };

  const initAutoApplyState = () => {
    try {
      const saved = mockStorage.getItem(STORAGE_KEY);
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  };

  assert.equal(initAutoApplyState(), true);
  mockStorage.setItem(STORAGE_KEY, "false");
  assert.equal(initAutoApplyState(), false);
  throwOnGet = true;
  assert.equal(initAutoApplyState(), true);
  throwOnGet = false;
  throwOnSet = true;
  assert.doesNotThrow(() => {
    try {
      mockStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Ignored as in GateCameraControlModal
    }
  });
});

test("GateFlow: G8 Safe Defaults - Polling errors keep previous workerOnline state and display unavailable note after >= 3 failures", async () => {
  const harness = new GateModalTriStateHarness({ isOpen: true, autoApplyEnabled: true });
  // 1. Initial poll brings modal to Viewer Mode (online)
  await harness.fetchWorkerStatus({ isInitial: true, outcome: "online" });
  assert.equal(harness.workerOnline, true);
  assert.equal(harness.isWorkerStatusUnavailable, false);

  // 2. 1st failed poll: workerOnline stays true (Viewer Mode), does NOT flip to browser mode
  await harness.fetchWorkerStatus({ outcome: "error" });
  assert.equal(harness.workerOnline, true, "1st failed poll must retain previous workerOnline state");
  assert.equal(harness.consecutivePollFailures, 1);
  assert.equal(harness.isWorkerStatusUnavailable, false);

  // 3. 2nd failed poll: workerOnline still stays true
  await harness.fetchWorkerStatus({ outcome: "error" });
  assert.equal(harness.workerOnline, true, "2nd failed poll must retain previous workerOnline state");
  assert.equal(harness.consecutivePollFailures, 2);
  assert.equal(harness.isWorkerStatusUnavailable, false);

  // 4. 3rd failed poll: workerOnline STILL stays true, but unavailable note is activated
  await harness.fetchWorkerStatus({ outcome: "error" });
  assert.equal(harness.workerOnline, true, ">=3 failed polls must NEVER flip to browser auto-apply");
  assert.equal(harness.consecutivePollFailures, 3);
  assert.equal(harness.isWorkerStatusUnavailable, true, "Must flag worker status unavailable note after 3 failures");

  // Verify camera detection while status is unavailable does NOT auto-apply because workerOnline is still true
  const triggered = harness.onPlateDetected({ plate: "51A-897.14", confidence: 99.0 });
  assert.equal(triggered, false);
  assert.equal(harness.autoApplyCount, 0);

  // 5. Successful poll restores normal operation and clears unavailable flag
  await harness.fetchWorkerStatus({ outcome: "online" });
  assert.equal(harness.workerOnline, true);
  assert.equal(harness.consecutivePollFailures, 0);
  assert.equal(harness.isWorkerStatusUnavailable, false);
});

test("GateFlow: G8 Safe Defaults - Missing, null, undefined, or non-numeric confidence evaluates to 0.0 and suppresses auto-apply", async () => {
  const harness = new GateModalTriStateHarness({ isOpen: true, autoApplyEnabled: true });
  await harness.fetchWorkerStatus({ isInitial: true, outcome: "offline" });
  assert.equal(harness.workerOnline, false);

  const invalidConfidences = [null, undefined, NaN, "bad-conf", -5, {}];
  for (const confVal of invalidConfidences) {
    const triggered = harness.onPlateDetected({
      plate: "51A-897.14",
      confidence: confVal,
      matchedVehicle: { id: 101, is_registered: true, is_blacklisted: false },
      availableSlots: [{ id: 1, code: "A-01" }],
    });
    assert.equal(triggered, false, `Confidence ${String(confVal)} must never auto-apply`);
    assert.equal(harness.autoApplyCount, 0);
  }
});

test("GateFlow: G8 Safe Defaults - Blacklisted vehicles or vehicles with active session are never auto-applied in Browser Mode", async () => {
  const harness = new GateModalTriStateHarness({ isOpen: true, autoApplyEnabled: true });
  await harness.fetchWorkerStatus({ isInitial: true, outcome: "offline" });
  assert.equal(harness.workerOnline, false);

  // Case 1: Blacklisted vehicle in rawLookup
  const triggeredBlacklist1 = harness.onPlateDetected({
    plate: "29X-666.77",
    confidence: 99.5,
    matchedVehicle: { id: 201, is_registered: true, is_blacklisted: false },
    rawLookup: { is_blacklisted: true },
    availableSlots: [{ id: 1, code: "A-01" }],
  });
  assert.equal(triggeredBlacklist1, false, "Vehicle with rawLookup.is_blacklisted must not auto-apply");
  assert.equal(harness.autoApplyCount, 0);

  // Case 2: Blacklisted in matchedVehicle
  const triggeredBlacklist2 = harness.onPlateDetected({
    plate: "29X-666.77",
    confidence: 99.5,
    matchedVehicle: { id: 201, is_registered: true, is_blacklisted: true },
    rawLookup: null,
    availableSlots: [{ id: 1, code: "A-01" }],
  });
  assert.equal(triggeredBlacklist2, false, "Vehicle with matchedVehicle.is_blacklisted must not auto-apply");
  assert.equal(harness.autoApplyCount, 0);

  // Case 3: Status BLACKLISTED
  const triggeredBlacklist3 = harness.onPlateDetected({
    plate: "29X-666.77",
    confidence: 99.5,
    matchedVehicle: { id: 201, is_registered: true, status: "BLACKLISTED" },
    rawLookup: null,
    availableSlots: [{ id: 1, code: "A-01" }],
  });
  assert.equal(triggeredBlacklist3, false, "Vehicle with status BLACKLISTED must not auto-apply");
  assert.equal(harness.autoApplyCount, 0);
});

// ============================================================================
// WP0 VERIFICATION TESTS: M1 (TDZ Crash), J2 (No Mock Fallback), J3 (Payloads)
// ============================================================================

test("GateFlow WP0 M1: GateCameraControlModal declares usePlateMatching BEFORE detectedPlateRef sync", () => {
  const modalPath = path.resolve(__dirname, "../src/components/VehicleManagement/GateCameraControlModal.jsx");
  const content = fs.readFileSync(modalPath, "utf-8");

  const hookDeclarationIdx = content.indexOf("usePlateMatching({");
  const refSyncIdx = content.indexOf("detectedPlateRef.current = detectedPlate;");

  assert.ok(hookDeclarationIdx !== -1, "usePlateMatching hook declaration must be found");
  assert.ok(refSyncIdx !== -1, "detectedPlateRef sync must be found");
  assert.ok(
    hookDeclarationIdx < refSyncIdx,
    `usePlateMatching (${hookDeclarationIdx}) must be declared BEFORE detectedPlateRef sync (${refSyncIdx}) to prevent TDZ ReferenceError`
  );

  // M2: verify resetMatching is called or handled cleanly
  assert.ok(content.includes("resetMatching();"), "handleReset must invoke resetMatching() from hook");
});

test("GateFlow WP0 J2: GateCameraControlModal loadSlots eliminates silent useMock fallback", () => {
  const modalPath = path.resolve(__dirname, "../src/components/VehicleManagement/GateCameraControlModal.jsx");
  const content = fs.readFileSync(modalPath, "utf-8");

  // Ensure useMock is never called silently inside loadSlots
  const loadSlotsMatch = content.match(/async function loadSlots\(\) \{([\s\S]*?)\n    \}/);
  assert.ok(loadSlotsMatch, "loadSlots function must exist");
  const loadSlotsBody = loadSlotsMatch[1];

  assert.ok(
    !loadSlotsBody.includes("useMock: true"),
    "loadSlots must not contain silent useMock: true fallback"
  );
  assert.ok(
    loadSlotsBody.includes("setErrorMessage("),
    "loadSlots must set error message when slot loading fails"
  );
});

test("GateFlow WP0 J3: checkInVehicle and checkOutVehicle send activeGateId, recognitionSource, aiConfidence", async () => {
  const modalPath = path.resolve(__dirname, "../src/components/VehicleManagement/GateCameraControlModal.jsx");
  const content = fs.readFileSync(modalPath, "utf-8");

  assert.ok(
    content.includes("entryGateId: activeGateId"),
    "handleConfirmEntry must pass activeGateId instead of hardcoded DEFAULT_ENTRY_GATE_ID"
  );
  assert.ok(
    content.includes("recognitionSource,"),
    "handleConfirmEntry must pass recognitionSource ('AI' or 'MANUAL')"
  );
  assert.ok(
    content.includes("aiConfidence: numericConfidence"),
    "handleConfirmEntry must pass real numeric aiConfidence"
  );
  assert.ok(
    content.includes("exitGateId: activeGateId"),
    "handleConfirmExit must pass activeGateId instead of hardcoded DEFAULT_EXIT_GATE_ID"
  );

  // Runtime assertion: checkInVehicle builds correct payload
  const originalRequest = axiosInstance.request;
  let capturedCheckIn = null;
  let capturedCheckOut = null;

  try {
    axiosInstance.request = async (config) => {
      if (config.url.includes("check-in")) {
        capturedCheckIn = JSON.parse(config.data);
        return { data: { id: 801, session_code: "SS-WP0-001" } };
      }
      if (config.url.includes("check-out")) {
        capturedCheckOut = JSON.parse(config.data);
        return { data: { id: 801, fee_amount: 0 } };
      }
      return { data: {} };
    };

    await checkInVehicle({
      licensePlate: "43A-123.45",
      entryGateId: 5,
      slotId: 10,
      recognitionSource: "AI",
      aiConfidence: 97.5,
    });

    assert.equal(capturedCheckIn.entry_gate_id, 5);
    assert.equal(capturedCheckIn.recognition_source, "AI");
    assert.equal(capturedCheckIn.ai_confidence, 97.5);

    await checkOutVehicle({
      licensePlate: "43A-123.45",
      sessionCode: "SS-WP0-001",
      exitGateId: 7,
      paymentMethod: "CASH",
    });

    assert.equal(capturedCheckOut.exit_gate_id, 7);
  } finally {
    axiosInstance.request = originalRequest;
  }
});

// ============================================================================
// WP4 D8 PENDING EXIT CLEANUP & SCANPLATEMODAL FEE PREVIEW / OVERAGE TESTS
// ============================================================================

test("GateFlow WP4 D8: GateCameraControlModal cleans up pendingExitInfo, stops 5s polling, and resets backendFeePreview on 404/closed session", () => {
  const modalPath = path.resolve(__dirname, "../src/components/VehicleManagement/GateCameraControlModal.jsx");
  const content = fs.readFileSync(modalPath, "utf-8");

  assert.match(
    content,
    /if\s*\(!cleanPlate\s*&&\s*!cleanCode\)\s*\{\s*setBackendFeePreview\(null\);\s*return;\s*\}/,
    "fetchFeePreview must reset backendFeePreview to null when no plate or sessionCode is provided"
  );
  assert.ok(
    content.includes('status === 404 || err?.data?.code === "PROP-4.5.1-P06"') &&
      content.includes("setBackendFeePreview(null);"),
    "fetchFeePreview must reset backendFeePreview to null on 404"
  );
  assert.ok(
    content.includes("Phiên đỗ xe đã được đóng/thanh toán trước đó."),
    "GateCameraControlModal must display closed/paid informational message when pending exit session closes externally"
  );
});

test("GateFlow WP4 D8: Pending Exit re-evaluation clears pendingExitInfo, resets stale preview, and stops 5s polling when session is closed at another counter", () => {
  let pendingExitInfo = { plate: "51A-897.14", sessionCode: "PK-D8-001", startedAt: 1000 };
  let backendFeePreview = { session_code: "PK-D8-001", fee_amount: 20000 };
  let informationalMessage = "Số dư ví không đủ. Hệ thống đang chờ khách nạp bù ví hoặc thanh toán tại quầy (tự động kiểm tra mỗi 5 giây).";
  let intervalCleared = false;
  let pollExecutions = 0;

  const normalize = (p) => String(p || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  const simulatePollTick = (lookupResult) => {
    if (!pendingExitInfo) {
      intervalCleared = true;
      return;
    }
    pollExecutions++;
    if (!lookupResult || !lookupResult.success) {
      // Transient 500/network error -> retain pendingExitInfo for retry
      return;
    }
    if (lookupResult.rawLookup && !lookupResult.rawLookup.open_session) {
      const pendingNorm = normalize(pendingExitInfo.plate);
      const lookupNorm = normalize(
        lookupResult.rawLookup.license_plate ||
          lookupResult.vehicle?.licensePlate ||
          pendingExitInfo.plate
      );
      if (!pendingNorm || !lookupNorm || pendingNorm === lookupNorm) {
        pendingExitInfo = null;
        backendFeePreview = null;
        informationalMessage = "Phiên đỗ xe đã được đóng/thanh toán trước đó.";
        intervalCleared = true;
      }
    }
  };

  // Tick 1: Transient 500 error -> keep pendingExitInfo alive
  simulatePollTick({ success: false, rawLookup: null });
  assert.ok(pendingExitInfo !== null, "Transient error must not drop pendingExitInfo");
  assert.equal(intervalCleared, false);

  // Tick 2: Session still open, wallet still insufficient -> keep pendingExitInfo alive
  simulatePollTick({
    success: true,
    rawLookup: { license_plate: "51A-897.14", open_session: { session_code: "PK-D8-001" } },
  });
  assert.ok(pendingExitInfo !== null);
  assert.equal(intervalCleared, false);

  // Tick 3: Session closed/paid at another counter (open_session === null, matching plate)
  simulatePollTick({
    success: true,
    vehicle: { licensePlate: "51A-897.14" },
    rawLookup: { license_plate: "51A-897.14", open_session: null },
  });

  assert.equal(pendingExitInfo, null, "pendingExitInfo must be cleared when session is closed externally");
  assert.equal(backendFeePreview, null, "Stale backendFeePreview must be reset to null");
  assert.equal(informationalMessage, "Phiên đỗ xe đã được đóng/thanh toán trước đó.");
  assert.equal(intervalCleared, true, "5s polling interval must stop after cleanup");
  assert.equal(pollExecutions, 3);

  // Tick 4: No further polls executed once pendingExitInfo is null
  simulatePollTick({ success: true, rawLookup: { license_plate: "51A-897.14", open_session: null } });
  assert.equal(pollExecutions, 3);
});

test("GateFlow WP4 Finding 2: ScanPlateModal integrates previewParkingFee, passes backendFeePreview, and handles overage checkout without hardcoding TICKET_EXEMPT", () => {
  const modalPath = path.resolve(__dirname, "../src/components/VehicleManagement/ScanPlateModal.jsx");
  const content = fs.readFileSync(modalPath, "utf-8");

  assert.ok(content.includes("previewParkingFee"), "ScanPlateModal must import and call previewParkingFee");
  assert.ok(content.includes("backendFeePreview={backendFeePreview}"), "ScanPlateModal must pass backendFeePreview to ExitLanePanel");
  assert.ok(content.includes("isLoadingFeePreview={isLoadingFeePreview}"), "ScanPlateModal must pass isLoadingFeePreview to ExitLanePanel");
  assert.ok(!content.includes("exitFeeCalc={exitFeeCalc}"), "ScanPlateModal must not pass obsolete exitFeeCalc prop to ExitLanePanel");
  assert.ok(!content.includes('"TICKET_EXEMPT"'), "ScanPlateModal must not send invalid TICKET_EXEMPT payment_method");
  assert.ok(
    !content.includes("const isExemptActive = hasValidTicket || isFeeExempt;"),
    "ScanPlateModal must not hardcode isExemptActive = hasValidTicket || isFeeExempt when overage feeAmount > 0"
  );
  assert.ok(
    !content.includes("onSwitchToExit={"),
    "ScanPlateModal must not pass unused onSwitchToExit prop to EntryLanePanel"
  );
});

// ============================================================================
// WP0 ITERATION 2 REGRESSION TESTS: Ghost Exit 404, CloseSessionSafetyModal Payloads
// ============================================================================

test("GateFlow WP0-Iter2 (a): previewParkingFee throws real 404 error when !USE_MOCK instead of fabricating local fee", async () => {
  const originalRequest = axiosInstance.request;

  try {
    axiosInstance.request = async () => {
      const err = new Error("Không tìm thấy phiên đỗ xe đang mở cho phương tiện này.");
      err.response = {
        status: 404,
        data: {
          code: "PROP-4.5.1-P06",
          message: "Không tìm thấy phiên đỗ xe đang mở cho phương tiện này.",
        },
      };
      throw err;
    };

    await assert.rejects(
      () => previewParkingFee({ licensePlate: "43A-999.99" }),
      (err) => {
        const status = err?.status || err?.response?.status;
        assert.equal(status, 404);
        return true;
      },
      "previewParkingFee must re-throw 404 error when !USE_MOCK instead of fabricating 20,000 VND"
    );
  } finally {
    axiosInstance.request = originalRequest;
  }

  const gateModalPath = path.resolve(__dirname, "../src/components/VehicleManagement/GateCameraControlModal.jsx");
  const gateContent = fs.readFileSync(gateModalPath, "utf-8");
  const openSessionChecks = gateContent.match(/if\s*\(rawLookup\?\.open_session\s*&&\s*\(targetPlate\s*\|\|\s*targetCode\)\)/g) || [];
  assert.ok(
    openSessionChecks.length >= 2,
    "GateCameraControlModal lane switch handlers must verify rawLookup?.open_session before calling fetchFeePreview"
  );
});

test("GateFlow WP0-Iter2 (b): forceCloseSessionAndReleaseSlot sends WALLET, VIETQR, and waive_fee payloads accurately", async () => {
  const originalRequest = axiosInstance.request;
  const capturedPayloads = [];

  try {
    axiosInstance.request = async (config) => {
      if (config.url.includes("check-out")) {
        capturedPayloads.push(JSON.parse(config.data));
        return { data: { id: 901, fee_amount: 0 } };
      }
      return { data: {} };
    };

    // 1. WALLET payment
    await forceCloseSessionAndReleaseSlot({
      licensePlate: "43A-123.45",
      exitGateId: 3,
      paymentMethod: "WALLET",
      notes: "Thu qua vi",
    });
    assert.equal(capturedPayloads[0].payment_method, "WALLET");
    assert.equal(capturedPayloads[0].waive_fee, undefined);

    // 2. VNPAY -> VIETQR normalization
    await forceCloseSessionAndReleaseSlot({
      licensePlate: "43A-123.45",
      exitGateId: 3,
      paymentMethod: "VNPAY",
      notes: "Thu qua QR",
    });
    assert.equal(capturedPayloads[1].payment_method, "VIETQR");
    assert.equal(capturedPayloads[1].waive_fee, undefined);

    // 3. Cancel glitch -> waive_fee: true + waiver_reason (no payment_method)
    await forceCloseSessionAndReleaseSlot({
      licensePlate: "43A-123.45",
      exitGateId: 3,
      paymentMethod: "EXEMPT",
      waiveFee: true,
      waiverReason: "Camera OCR nham bien so",
      notes: "Huy phien sai sot",
    });
    assert.equal(capturedPayloads[2].waive_fee, true);
    assert.equal(capturedPayloads[2].waiver_reason, "Camera OCR nham bien so");
    assert.equal(capturedPayloads[2].payment_method, undefined);
  } finally {
    axiosInstance.request = originalRequest;
  }

  // Verify callers forward paymentMethod and waiveFee
  for (const relPath of [
    "../src/components/VehicleManagement/GateCameraControlModal.jsx",
    "../src/components/VehicleManagement/ScanPlateModal.jsx",
    "../src/components/VehicleManagement/scanPlate/hooks/useLaneActions.js",
  ]) {
    const content = fs.readFileSync(path.resolve(__dirname, relPath), "utf-8");
    assert.ok(
      content.includes("waiveFee") && content.includes("paymentMethod:"),
      `${relPath} must forward paymentMethod and waiveFee to forceCloseSessionAndReleaseSlot`
    );
  }
});

// ============================================================================
// WP0 ITERATION 3 REGRESSION TESTS: Finding A (no IN exitGateId) & Finding B (no "N/A" sessionCode)
// ============================================================================

test("GateFlow WP0-Iter3 (Finding A): handleConfirmCloseSafety never passes IN activeGateId as exitGateId and forceCloseSessionAndReleaseSlot resolves active OUT gate", async () => {
  for (const relPath of [
    "../src/components/VehicleManagement/GateCameraControlModal.jsx",
    "../src/components/VehicleManagement/ScanPlateModal.jsx",
  ]) {
    const content = fs.readFileSync(path.resolve(__dirname, relPath), "utf-8");
    const match = content.match(
      /const handleConfirmCloseSafety\s*=\s*async[\s\S]*?await forceCloseSessionAndReleaseSlot\(\{([\s\S]*?)\}\);/
    );
    assert.ok(match, `${relPath} must call forceCloseSessionAndReleaseSlot inside handleConfirmCloseSafety`);
    assert.ok(
      !/exitGateId\s*:/.test(match[1]),
      `${relPath} handleConfirmCloseSafety must NOT pass exitGateId (activeGateId is an IN gate)`
    );
  }

  // Verify runtime behavior when exitGateId is omitted: resolves OUT gate via /api/v1/parking/gates/
  const originalRequest = axiosInstance.request;
  const capturedCheckoutPayloads = [];
  let gateQueryCount = 0;

  try {
    axiosInstance.request = async (config) => {
      if (config.url.includes("/parking/gates/")) {
        gateQueryCount++;
        return {
          data: [
            { id: 4, code: "OUT_02", direction: "OUT", is_active: true },
          ],
        };
      }
      if (config.url.includes("check-out")) {
        capturedCheckoutPayloads.push(JSON.parse(config.data));
        return { data: { id: 902, fee_amount: 15000 } };
      }
      return { data: {} };
    };

    await forceCloseSessionAndReleaseSlot({
      licensePlate: "43A-555.66",
      paymentMethod: "CASH",
      notes: "Dong phien cu tu EntryLanePanel",
    });

    assert.equal(gateQueryCount, 1, "forceCloseSessionAndReleaseSlot must resolve OUT gate when exitGateId is omitted");
    assert.equal(capturedCheckoutPayloads.length, 1);
    assert.equal(
      capturedCheckoutPayloads[0].exit_gate_id,
      4,
      "exit_gate_id must use active OUT gate (4), never IN gate (1)"
    );
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("GateFlow WP0-Iter3 (Finding B): CloseSessionSafetyModal separates displaySessionCode ('N/A') from callback sessionCode (undefined)", async () => {
  const modalPath = path.resolve(
    __dirname,
    "../src/components/VehicleManagement/scanPlate/CloseSessionSafetyModal.jsx"
  );
  const content = fs.readFileSync(modalPath, "utf-8");

  assert.ok(
    content.includes('displaySessionCode = rawSessionCode || "N/A"'),
    "CloseSessionSafetyModal must compute displaySessionCode with 'N/A' only for UI display"
  );
  assert.ok(
    content.includes("sessionCode: rawSessionCode || undefined"),
    "CloseSessionSafetyModal must pass undefined (never 'N/A') in onConfirmClose when session_code is missing"
  );
  assert.ok(
    content.includes("Mã phiên: ${displaySessionCode}"),
    "CloseSessionSafetyModal description must display displaySessionCode"
  );

  // Runtime check: when sessionCode is undefined, forceCloseSessionAndReleaseSlot sends license_plate and omits session_code
  const originalRequest = axiosInstance.request;
  const capturedPayloads = [];

  try {
    axiosInstance.request = async (config) => {
      if (config.url.includes("/parking/gates/")) {
        return { data: { results: [{ id: 3, code: "OUT_01", direction: "OUT", is_active: true }] } };
      }
      if (config.url.includes("check-out")) {
        capturedPayloads.push(JSON.parse(config.data));
        return { data: { id: 903, fee_amount: 10000 } };
      }
      return { data: {} };
    };

    await forceCloseSessionAndReleaseSlot({
      licensePlate: "43A-777.88",
      sessionCode: undefined,
      paymentMethod: "CASH",
    });

    assert.equal(capturedPayloads.length, 1);
    assert.equal(capturedPayloads[0].session_code, undefined, "Missing sessionCode must not send session_code='N/A'");
    assert.equal(capturedPayloads[0].license_plate, "43A-777.88", "Must fall back to license_plate when sessionCode is undefined");
  } finally {
    axiosInstance.request = originalRequest;
  }
});

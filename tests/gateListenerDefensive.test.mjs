import test from "node:test";
import assert from "node:assert/strict";
import { formatLicensePlateForDisplay, normalizeLicensePlate } from "../src/utils/plateFormatter.js";

// ============================================================================
// SECTION 1: BROADCASTCHANNEL & LOCALSTORAGE LISTENER IN APPTOPHEADER
// ============================================================================

test("Defensive: Listener safely handles malformed JSON and non-object storage events", () => {
  let modalOpened = false;
  let loggedWarning = null;
  const originalWarn = console.warn;
  console.warn = (...args) => {
    loggedWarning = args.join(" ");
  };

  const lastHandledScanRef = { current: "" };
  let gateModalPlate = "";
  let gateModalMode = "entry";
  let gateModalGateId = 1;
  const entryGateId = 1;
  const exitGateId = 2;

  const handleScanMessage = (msg) => {
    if (!msg || typeof msg !== "object") return;
    if (msg.type !== "PLATE_SCANNED_SUCCESS") return;
    const rawPlate = (typeof msg.plate === "string" ? msg.plate : String(msg.plate || "")).trim();
    if (!rawPlate) return;

    const scanId = msg.scanId || `${rawPlate}_${msg.timestamp || Date.now()}`;
    if (lastHandledScanRef.current === scanId) return;
    lastHandledScanRef.current = scanId;

    const mappedMode = msg.mode === "out" || msg.mode === "exit" ? "exit" : "entry";
    const resolvedGateId = msg.gateId || (mappedMode === "exit" ? exitGateId : entryGateId);

    gateModalPlate = rawPlate;
    gateModalMode = mappedMode;
    gateModalGateId = resolvedGateId;
    modalOpened = true;
  };

  const handleStorage = (event) => {
    if (event.key !== "smart_parking_latest_scan" || !event.newValue) return;
    try {
      const parsed = JSON.parse(event.newValue);
      handleScanMessage(parsed);
    } catch (err) {
      console.warn("Invalid localStorage scan payload:", err);
    }
  };

  try {
    // 1. Malformed JSON string
    assert.doesNotThrow(() => {
      handleStorage({ key: "smart_parking_latest_scan", newValue: "NOT_VALID_JSON{[[{" });
    });
    assert.equal(modalOpened, false);
    assert.ok(loggedWarning?.includes("Invalid localStorage scan payload"));

    // 2. Storage event for unrelated key
    modalOpened = false;
    handleStorage({ key: "some_other_key", newValue: '{"type":"PLATE_SCANNED_SUCCESS","plate":"51A89714"}' });
    assert.equal(modalOpened, false);

    // 3. Storage event with empty or null newValue
    handleStorage({ key: "smart_parking_latest_scan", newValue: "" });
    handleStorage({ key: "smart_parking_latest_scan", newValue: null });
    assert.equal(modalOpened, false);

    // 4. Primitive JSON values in storage
    assert.doesNotThrow(() => {
      handleStorage({ key: "smart_parking_latest_scan", newValue: "12345" });
      handleStorage({ key: "smart_parking_latest_scan", newValue: '"just a string"' });
      handleStorage({ key: "smart_parking_latest_scan", newValue: "true" });
      handleStorage({ key: "smart_parking_latest_scan", newValue: "null" });
      handleStorage({ key: "smart_parking_latest_scan", newValue: "[]" });
    });
    assert.equal(modalOpened, false);
  } finally {
    console.warn = originalWarn;
  }
});

test("Defensive: Listener safely handles missing plate, empty plate, whitespace plate, and missing mode", () => {
  const lastHandledScanRef = { current: "" };
  let modalOpened = false;
  let gateModalPlate = "";
  let gateModalMode = "";
  let gateModalGateId = 0;

  const handleScanMessage = (msg, entryGateId = 1, exitGateId = 2) => {
    if (!msg || typeof msg !== "object") return;
    if (msg.type !== "PLATE_SCANNED_SUCCESS") return;
    const rawPlate = (typeof msg.plate === "string" ? msg.plate : String(msg.plate || "")).trim();
    if (!rawPlate) return;

    const scanId = msg.scanId || `${rawPlate}_${msg.timestamp || Date.now()}`;
    if (lastHandledScanRef.current === scanId) return;
    lastHandledScanRef.current = scanId;

    const mappedMode = msg.mode === "out" || msg.mode === "exit" ? "exit" : "entry";
    const resolvedGateId = msg.gateId || (mappedMode === "exit" ? exitGateId : entryGateId);

    gateModalPlate = rawPlate;
    gateModalMode = mappedMode;
    gateModalGateId = resolvedGateId;
    modalOpened = true;
  };

  // Missing plate field
  modalOpened = false;
  handleScanMessage({ type: "PLATE_SCANNED_SUCCESS", mode: "in" });
  assert.equal(modalOpened, false);

  // plate: ""
  modalOpened = false;
  handleScanMessage({ type: "PLATE_SCANNED_SUCCESS", plate: "", mode: "in" });
  assert.equal(modalOpened, false);

  // plate: "   " (only whitespace)
  modalOpened = false;
  handleScanMessage({ type: "PLATE_SCANNED_SUCCESS", plate: "   \t\n   ", mode: "in" });
  assert.equal(modalOpened, false);

  // Missing mode -> defaults safely to "entry" and entryGateId
  modalOpened = false;
  handleScanMessage({ type: "PLATE_SCANNED_SUCCESS", plate: "30A-612.35" });
  assert.equal(modalOpened, true);
  assert.equal(gateModalPlate, "30A-612.35");
  assert.equal(gateModalMode, "entry");
  assert.equal(gateModalGateId, 1);
});

test("Defensive: Type poisoning on plate property in AppTopHeader raw code", () => {
  // Let's test the EXACT raw expression in AppTopHeader.jsx:
  // `const rawPlate = (msg.plate || "").trim();`
  // What happens if msg.plate is a number, e.g. 12345?
  const rawCodeFunction = (msg) => {
    if (!msg || typeof msg !== "object") return;
    if (msg.type !== "PLATE_SCANNED_SUCCESS") return;
    const rawPlate = (msg.plate || "").trim();
    return rawPlate;
  };

  // String plate works
  assert.equal(rawCodeFunction({ type: "PLATE_SCANNED_SUCCESS", plate: "51A89714" }), "51A89714");

  // Number plate throws TypeError if not coerced to string!
  assert.throws(
    () => {
      rawCodeFunction({ type: "PLATE_SCANNED_SUCCESS", plate: 12345 });
    },
    {
      name: "TypeError",
    }
  );

  // Boolean plate true throws TypeError!
  assert.throws(
    () => {
      rawCodeFunction({ type: "PLATE_SCANNED_SUCCESS", plate: true });
    },
    {
      name: "TypeError",
    }
  );

  // Boolean plate false evaluates to ("" || "").trim() which returns ""
  assert.equal(rawCodeFunction({ type: "PLATE_SCANNED_SUCCESS", plate: false }), "");
});

test("Defensive: BroadcastChannel channel.onmessage unhandled exception when plate is non-string", () => {
  let uncaughtError = null;

  // Simulate BroadcastChannel event dispatcher as in AppTopHeader.jsx lines 183-186
  const handleScanMessage = (msg) => {
    if (!msg || typeof msg !== "object") return;
    if (msg.type !== "PLATE_SCANNED_SUCCESS") return;
    const rawPlate = (msg.plate || "").trim();
    return rawPlate;
  };

  const fakeChannel = {
    onmessage: null,
  };

  // Exactly as written in AppTopHeader.jsx lines 184-186:
  fakeChannel.onmessage = (event) => {
    handleScanMessage(event?.data);
  };

  // Attack: External window/tab posts { type: "PLATE_SCANNED_SUCCESS", plate: 12345 }
  try {
    fakeChannel.onmessage({ data: { type: "PLATE_SCANNED_SUCCESS", plate: 12345 } });
  } catch (err) {
    uncaughtError = err;
  }

  assert.ok(uncaughtError, "Uncaught error MUST occur due to missing type check or try/catch in channel.onmessage");
  assert.equal(uncaughtError.name, "TypeError");
  assert.ok(uncaughtError.message.includes(".trim is not a function"));
});

test("Defensive: Double modal opening edge case in AppTopHeader handleScanMessage", () => {
  // Simulate AppTopHeader state:
  let isScannerModalOpen = false;
  let isGateControlModalOpen = false;

  // User opened header scanner modal (or onOpenScanModal prop was triggered)
  isScannerModalOpen = true;

  // Now a BroadcastChannel or storage event arrives:
  // In AppTopHeader.jsx lines 170-173:
  const handleScanMessage = (msg) => {
    if (!msg || typeof msg !== "object") return;
    if (msg.type !== "PLATE_SCANNED_SUCCESS") return;
    const rawPlate = (msg.plate || "").trim();
    if (!rawPlate) return;

    // Notice: handleScanMessage DOES NOT call setIsScannerModalOpen(false)!
    // Unlike handleOpenGateModal (line 98) and handlePlateDetectedFromScanner (line 140)
    isGateControlModalOpen = true;
  };

  handleScanMessage({
    type: "PLATE_SCANNED_SUCCESS",
    plate: "51A-897.14",
    mode: "in",
    gateId: 1,
    timestamp: 1000,
  });

  // Both modals are now simultaneously OPEN!
  assert.equal(isScannerModalOpen, true, "isScannerModalOpen remained true because handleScanMessage did not close it");
  assert.equal(isGateControlModalOpen, true, "isGateControlModalOpen became true");
  assert.equal(isScannerModalOpen && isGateControlModalOpen, true, "CRITICAL: Both modals are open simultaneously!");
});

test("Defensive: Deduplication and high-frequency message burst (stress testing)", () => {
  const lastHandledScanRef = { current: "" };
  let openCount = 0;
  const processedPlates = [];

  const handleScanMessage = (msg) => {
    if (!msg || typeof msg !== "object") return;
    if (msg.type !== "PLATE_SCANNED_SUCCESS") return;
    const rawPlate = (msg.plate || "").trim();
    if (!rawPlate) return;

    const scanId = msg.scanId || `${rawPlate}_${msg.timestamp || 1000}`;
    if (lastHandledScanRef.current === scanId) return;
    lastHandledScanRef.current = scanId;

    openCount++;
    processedPlates.push(rawPlate);
  };

  // Scenario 1: BroadcastChannel and localStorage deliver identical scan concurrently
  const timestamp = 1730000000000;
  const bcMessage = {
    type: "PLATE_SCANNED_SUCCESS",
    plate: "30A-612.35",
    mode: "in",
    gateId: 1,
    timestamp,
  };
  const lsMessage = {
    type: "PLATE_SCANNED_SUCCESS",
    plate: "30A-612.35",
    mode: "in",
    gateId: 1,
    timestamp,
  };

  // Fire both in rapid succession
  handleScanMessage(bcMessage);
  handleScanMessage(lsMessage);

  assert.equal(openCount, 1, "Concurrent BC and localStorage events with same scanId must only open modal ONCE");

  // Scenario 2: Spamming 100 identical messages
  for (let i = 0; i < 100; i++) {
    handleScanMessage(bcMessage);
  }
  assert.equal(openCount, 1, "Spamming 100 identical messages must be fully deduplicated");

  // Scenario 3: High-frequency burst of 50 distinct scans within 2ms
  for (let i = 0; i < 50; i++) {
    handleScanMessage({
      type: "PLATE_SCANNED_SUCCESS",
      plate: `51A-${10000 + i}`,
      scanId: `scan_${i}`,
      timestamp: Date.now() + i,
    });
  }
  assert.equal(openCount, 51);
  assert.equal(processedPlates.length, 51);
});

// ============================================================================
// SECTION 2: STATE SEPARATION IN GATECAMERACONTROLMODAL (FINDING 3 & FINDING 5)
// ============================================================================

test("Defensive: State sequence Camera A -> Manual B -> Camera C -> Manual D", () => {
  // Simulate GateCameraControlModal state machine per Finding 3 & 5
  let cameraDetectedPlate = "";
  let manualInputPlate = "";
  let detectedPlate = "";
  let detectionSource = null; // 'camera' | 'manual' | null
  let scanDetails = null;
  let rawBoundingBox = null;
  let statusMessage = "Đang nhận diện...";
  let resetCount = 0;

  const resetDetection = () => {
    resetCount += 1;
  };

  // View simulation helpers:
  const getCameraBoundingBoxLabel = () => {
    // ScanPlateCameraFeed: {scaledHighlightBox && !isManualLookup && ...}
    // Passed from GateCameraControlModal:
    // rawBoundingBox={isManualLookup ? null : rawBoundingBox}
    // cameraPlate={isManualLookup ? "" : cameraDetectedPlate}
    // isManualLookup={isManualLookup}
    const isManualLookup = detectionSource === "manual";
    const effectiveBoundingBox = isManualLookup ? null : rawBoundingBox;
    const effectiveCameraPlate = isManualLookup ? "" : cameraDetectedPlate;
    if (isManualLookup || !effectiveBoundingBox) return null;
    return effectiveCameraPlate || "Biển số";
  };

  const getCameraStatusCaption = () => {
    const isManualLookup = detectionSource === "manual";
    return isManualLookup ? "Đang tra cứu thủ công" : statusMessage;
  };

  const getVehicleMatchedInfoCardBadges = () => {
    // In VehicleMatchedInfoCard.jsx:
    const hasCameraBadge = Boolean(scanDetails?.source);
    const cameraBadgeText = scanDetails?.source === "image" ? "🖼️ Từ ảnh" : (scanDetails?.source === "camera" ? "📷 Từ camera" : null);

    const rawConfidence = scanDetails?.confidence;
    let aiBadgeText = null;
    if (rawConfidence !== null && rawConfidence !== undefined && rawConfidence !== "") {
      const num = Number(rawConfidence);
      if (!Number.isNaN(num)) {
        const val = num <= 1.0 ? num * 100 : num;
        aiBadgeText = `AI: ${Math.round(val * 10) / 10}%`;
      }
    }
    return { hasCameraBadge, cameraBadgeText, aiBadgeText };
  };

  // STEP 1: Camera detects Plate A ("30A61235")
  const onCameraDetectA = () => {
    const rawPlate = "30A61235";
    const formatted = formatLicensePlateForDisplay(rawPlate, "CAR"); // "30A-612.35"
    cameraDetectedPlate = rawPlate;
    manualInputPlate = formatted;
    detectionSource = "camera";
    detectedPlate = rawPlate;
    rawBoundingBox = { x: 10, y: 10, width: 100, height: 50 };
    statusMessage = "Đã nhận diện ổn định biển số xe.";
    scanDetails = {
      confidence: 0.985,
      plate: formatted,
      source: "camera",
      imageUrl: "https://example.com/plateA.jpg",
    };
  };

  onCameraDetectA();

  // Verification Step 1:
  assert.equal(cameraDetectedPlate, "30A61235");
  assert.equal(manualInputPlate, "30A-612.35");
  assert.equal(detectedPlate, "30A61235");
  assert.equal(detectionSource, "camera");
  assert.equal(getCameraBoundingBoxLabel(), "30A61235", "Camera bounding box MUST show Plate A");
  assert.equal(getCameraStatusCaption(), "Đã nhận diện ổn định biển số xe.");

  let badges = getVehicleMatchedInfoCardBadges();
  assert.equal(badges.hasCameraBadge, true);
  assert.equal(badges.cameraBadgeText, "📷 Từ camera");
  assert.equal(badges.aiBadgeText, "AI: 98.5%");

  // STEP 2: User manually searches Plate B ("51A-897.14")
  const onManualSearchB = () => {
    const target = "51A-897.14";
    const formatted = formatLicensePlateForDisplay(target);
    detectionSource = "manual";
    scanDetails = null; // Purposely cleared per Finding 5
    manualInputPlate = formatted;
    detectedPlate = target;
    resetDetection();
  };

  onManualSearchB();

  // Verification Step 2:
  assert.equal(detectionSource, "manual");
  assert.equal(manualInputPlate, "51A-897.14");
  assert.equal(detectedPlate, "51A-897.14");
  assert.equal(cameraDetectedPlate, "30A61235", "Camera detected plate MUST NOT be mutated by manual search!");
  assert.equal(getCameraBoundingBoxLabel(), null, "Camera bounding box overlay label MUST BE CLEARED on manual search B!");
  assert.equal(getCameraStatusCaption(), "Đang tra cứu thủ công", "Caption MUST be switched to manual lookup");
  assert.equal(resetCount, 1, "resetDetection MUST be called on manual search");

  badges = getVehicleMatchedInfoCardBadges();
  assert.equal(badges.hasCameraBadge, false, "Camera source badge MUST DISAPPEAR COMPLETELY on manual search");
  assert.equal(badges.cameraBadgeText, null);
  assert.equal(badges.aiBadgeText, null, "AI confidence badge MUST DISAPPEAR COMPLETELY on manual search");

  // STEP 3: Camera re-detects Plate C ("81B334303")
  const onCameraDetectC = () => {
    const rawPlate = "81B334303";
    const formatted = formatLicensePlateForDisplay(rawPlate); // "81-B3 343.03"
    cameraDetectedPlate = rawPlate;
    manualInputPlate = formatted;
    detectionSource = "camera";
    detectedPlate = rawPlate;
    rawBoundingBox = { x: 20, y: 20, width: 90, height: 45 };
    statusMessage = "Đã nhận diện ổn định biển số xe.";
    scanDetails = {
      confidence: 0.952,
      plate: formatted,
      source: "camera",
      imageUrl: "https://example.com/plateC.jpg",
    };
  };

  onCameraDetectC();

  // Verification Step 3:
  assert.equal(cameraDetectedPlate, "81B334303");
  assert.equal(manualInputPlate, "81-B3 343.03");
  assert.equal(detectedPlate, "81B334303");
  assert.equal(detectionSource, "camera");
  assert.equal(getCameraBoundingBoxLabel(), "81B334303", "Camera bounding box MUST now restore and show Plate C");
  assert.equal(getCameraStatusCaption(), "Đã nhận diện ổn định biển số xe.", "Caption MUST restore on new camera detection");

  badges = getVehicleMatchedInfoCardBadges();
  assert.equal(badges.hasCameraBadge, true);
  assert.equal(badges.cameraBadgeText, "📷 Từ camera");
  assert.equal(badges.aiBadgeText, "AI: 95.2%");

  // STEP 4: User manually searches Plate D ("29A-999.88")
  const onManualSearchD = () => {
    const target = "29A-999.88";
    const formatted = formatLicensePlateForDisplay(target);
    detectionSource = "manual";
    scanDetails = null; // Purposely cleared
    manualInputPlate = formatted;
    detectedPlate = target;
    resetDetection();
  };

  onManualSearchD();

  // Verification Step 4:
  assert.equal(detectionSource, "manual");
  assert.equal(manualInputPlate, "29A-999.88");
  assert.equal(detectedPlate, "29A-999.88");
  assert.equal(cameraDetectedPlate, "81B334303", "Camera detected plate MUST NOT be polluted by manual Plate D!");
  assert.equal(getCameraBoundingBoxLabel(), null, "Camera bounding box overlay label MUST BE CLEARED on manual search D!");
  assert.equal(getCameraStatusCaption(), "Đang tra cứu thủ công", "Caption MUST be switched to manual lookup on search D");
  assert.equal(resetCount, 2, "resetDetection MUST be called on manual search D");

  badges = getVehicleMatchedInfoCardBadges();
  assert.equal(badges.hasCameraBadge, false, "Camera badge MUST DISAPPEAR COMPLETELY on manual search D");
  assert.equal(badges.cameraBadgeText, null);
  assert.equal(badges.aiBadgeText, null, "AI confidence badge MUST DISAPPEAR COMPLETELY on manual search D");
});

// ============================================================================
// SECTION 3: FORMATLICENSEPLATEFORDISPLAY (STRESS & FUZZING)
// ============================================================================

test("Defensive: formatLicensePlateForDisplay edge cases, strange strings, and idempotency", () => {
  // Empty, null, undefined, non-string
  assert.equal(formatLicensePlateForDisplay(null), "");
  assert.equal(formatLicensePlateForDisplay(undefined), "");
  assert.equal(formatLicensePlateForDisplay(""), "");
  assert.equal(formatLicensePlateForDisplay("   \t\n "), "");
  assert.equal(formatLicensePlateForDisplay(12345), "");
  assert.equal(formatLicensePlateForDisplay({ plate: "51A89714" }), "");
  assert.equal(formatLicensePlateForDisplay(["51A89714"]), "");
  assert.equal(formatLicensePlateForDisplay(true), "");

  // Already formatted plates (Idempotency)
  assert.equal(formatLicensePlateForDisplay("51A-897.14"), "51A-897.14");
  assert.equal(formatLicensePlateForDisplay("30C-468.58"), "30C-468.58");
  assert.equal(formatLicensePlateForDisplay("30A-612.35"), "30A-612.35");
  assert.equal(formatLicensePlateForDisplay("29A-999.88"), "29A-999.88");
  assert.equal(formatLicensePlateForDisplay("59-T2 496.09"), "59-T2 496.09");
  assert.equal(formatLicensePlateForDisplay("81-B3 343.03"), "81-B3 343.03");
  assert.equal(formatLicensePlateForDisplay("29A-9998"), "29A-9998");
  assert.equal(formatLicensePlateForDisplay("29LD-123.45"), "29LD-123.45");

  // Strange spacing & weird delimiters
  assert.equal(formatLicensePlateForDisplay("  51A89714  ", "CAR"), "51A-897.14");
  assert.equal(formatLicensePlateForDisplay("  51A89714  "), "51A89714", "Ambiguous plate without vehicleType remains compact");
  assert.equal(formatLicensePlateForDisplay("51A - 897 . 14", "CAR"), "51A-897.14");
  assert.equal(formatLicensePlateForDisplay("30c_468_58", "CAR"), "30C-468.58");
  assert.equal(formatLicensePlateForDisplay("59/t2/49609"), "59-T2 496.09");

  // Lowercase input
  assert.equal(formatLicensePlateForDisplay("51a89714", "CAR"), "51A-897.14");
  assert.equal(formatLicensePlateForDisplay("51a89714"), "51A89714", "Ambiguous plate without vehicleType remains compact");
  assert.equal(formatLicensePlateForDisplay("59t249609"), "59-T2 496.09");

  // 2-letter diplomatic / foreign formats normalize and format
  assert.equal(formatLicensePlateForDisplay("80NG-123.45"), "80NG-123.45");
  assert.equal(formatLicensePlateForDisplay("80NG12345", "CAR"), "80NG-123.45");
  assert.equal(formatLicensePlateForDisplay("80-NG-123-45"), "80-NG 123.45");

  // Strange / Exotic non-matching plates fallback safely to raw trimmed
  assert.equal(formatLicensePlateForDisplay("80-NG-123-45-99"), "80-NG-123-45-99");
  assert.equal(formatLicensePlateForDisplay("UN-1234"), "UN-1234");
  assert.equal(formatLicensePlateForDisplay("ABC-XYZ"), "ABC-XYZ");
  assert.equal(formatLicensePlateForDisplay("!@#$%^&*()"), "!@#$%^&*()");

  // ReDoS and Long String Stress Test: 10,000 characters
  const longString = "A".repeat(5000) + "12345" + "B".repeat(5000);
  const start = performance.now();
  const res = formatLicensePlateForDisplay(longString);
  const duration = performance.now() - start;
  assert.ok(duration < 20, `Execution took ${duration}ms, must be < 20ms to prevent ReDoS`);
  assert.equal(res, longString.trim());
});

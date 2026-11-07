import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  lookupVehicleByPlate,
  getParkingSessions,
  mapVehicleLookupToVehicle,
} from "../../services/plateScanService";
import {
  validateVehicleEntry,
  checkInVehicle,
  checkOutVehicle,
  forceCloseSessionAndReleaseSlot,
  getAvailableSlotsForCheckIn,
  previewParkingFee,
} from "../../services/parkingSessionService";
import { mockVehicles } from "../../mocks/vehicleData";
import { usePlateAutoDetect } from "../../hooks/usePlateAutoDetect";
import { useCurrentUser } from "../../hooks/useCurrentUser";

import ScanPlateCameraFeed from "./scanPlate/ScanPlateCameraFeed";
import EntryLanePanel from "./scanPlate/EntryLanePanel";
import ExitLanePanel from "./scanPlate/ExitLanePanel";
import { formatLicensePlateForDisplay } from "../../utils/plateFormatter";

const DEFAULT_ENTRY_GATE_ID = 1;
const DEFAULT_EXIT_GATE_ID = 3;
const BARRIER_OPEN_DELAY_MS = 600;
const BARRIER_AUTO_CLOSE_DELAY_MS = 3000;

const getEntryErrorMessage = (err) => {
  const backendMsg = err?.data?.message || err?.message;
  const errorCode = err?.data?.code || err?.code;

  if (errorCode === "PROP-4.5.1-P07" || backendMsg?.includes("đang có phiên") || backendMsg?.includes("chưa kết thúc")) {
    return "Xe đang có phiên gửi chưa kết thúc tại bãi.";
  }
  if (errorCode === "PROP-4.5.1-P08" || backendMsg?.includes("danh sách đen") || backendMsg?.includes("Blacklist")) {
    return "Biển số nằm trong danh sách đen (Blacklist). Cần Quản lý phê duyệt để cho xe vào.";
  }
  if (errorCode === "PROP-4.5.1-P14") {
    return "Chỉ Quản lý mới có quyền phê duyệt xe trong danh sách đen.";
  }
  if (errorCode === "PROP-4.5.1-P18") {
    return "Chỉ Quản lý mới có quyền miễn cước phí đỗ xe.";
  }
  if (errorCode === "PROP-4.5.1-P19") {
    return "Vui lòng cung cấp lý do miễn cước đặc cách.";
  }
  if (errorCode === "PROP-4.5.1-P10") {
    return "Phiên đỗ xe này đã được kết thúc trước đó.";
  }
  if (errorCode === "MSG-4.5.2-M02" || backendMsg?.includes("đã có xe đk vé")) {
    return (
      "⚠️ Vị trí đỗ này đã có xe đăng ký vé và đang sử dụng. " +
      "Hệ thống đã tự động chọn ô trống khả dụng khác, vui lòng kiểm tra và xác nhận lại."
    );
  }
  if (errorCode === "PROP-4.5.2-P01" || backendMsg?.includes("đang bảo trì")) {
    return "⚠️ Vị trí đỗ này đang bảo trì, vui lòng chọn vị trí khác.";
  }
  if (errorCode === "PROP-4.5.2-P02") {
    return "⚠️ Vị trí đỗ này đã có xe khác đỗ, vui lòng chọn vị trí khác.";
  }
  if (errorCode === "PROP-4.5.2-P05") {
    return "⚠️ Vị trí đỗ này đã có người đặt trước, vui lòng chọn vị trí khác.";
  }
  if (errorCode === "PROP-SLOT-VEHICLE-TYPE-MISMATCH") {
    return "⚠️ Loại phương tiện không tương thích với cấu hình vị trí đỗ này.";
  }
  if (errorCode === "PROP-4.5.1-P13") {
    return "⚠️ Đường dẫn hình ảnh không hợp lệ.";
  }
  if (errorCode === "MSG-4.5.1-M01" || backendMsg?.includes("hết hạn")) {
    return "⚠️ Vé đăng ký của xe đã hết hạn, hệ thống sẽ tự động chuyển sang chế độ tính vé lượt vãng lai.";
  }
  if (errorCode === "PROP-4.5.1-P05" || backendMsg?.includes("hết chỗ")) {
    return "⚠️ Bãi đỗ xe đã đầy chỗ cho loại phương tiện này. Vui lòng hướng dẫn xe quay đầu.";
  }
  return backendMsg || "Không thể thực hiện Check-in vào bãi. Vui lòng thử lại.";
};

const getExitErrorMessage = (err) => {
  const backendMsg = err?.data?.message || err?.message;
  const errorCode = err?.data?.code || err?.code;

  if (errorCode === "PROP-4.5.1-P18") {
    return "Chỉ Quản lý mới có quyền miễn cước phí đỗ xe.";
  }
  if (errorCode === "PROP-4.5.1-P19") {
    return "Vui lòng cung cấp lý do miễn cước đặc cách.";
  }
  if (errorCode === "PROP-4.5.1-P10") {
    return "Phiên đỗ xe này đã được kết thúc trước đó.";
  }
  if (errorCode === "PROP-4.5.1-P07") {
    return "Xe đang có phiên gửi chưa kết thúc tại bãi.";
  }
  if (errorCode === "PROP-4.5.1-P08") {
    return "Biển số nằm trong danh sách đen (Blacklist). Cần Quản lý phê duyệt để cho xe vào.";
  }
  if (errorCode === "PROP-4.5.1-P14") {
    return "Chỉ Quản lý mới có quyền phê duyệt xe trong danh sách đen.";
  }
  if (errorCode === "PROP-4.5.1-P09") {
    return "Vui lòng chọn phương thức thanh toán hợp lệ (tiền mặt hoặc VietQR).";
  }
  if (errorCode === "PROP-4.5.1-P06" || backendMsg?.includes("Không tìm thấy")) {
    return "Không tìm thấy phiên đỗ đang mở cho phương tiện này.";
  }
  return backendMsg || "Không thể thực hiện Check-out xe. Vui lòng thử lại.";
};

const parseEntryTimeToDate = (entryTimeStr) => {
  if (!entryTimeStr) return null;
  const str = String(entryTimeStr).trim();
  const timeFirst = str.match(/^(\d{1,2}):(\d{1,2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (timeFirst) {
    const [, hour, min, day, month, year] = timeFirst;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const dateFirst = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
  if (dateFirst) {
    const [, day, month, year, hour = "0", min = "0"] = dateFirst;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) return d;
  return null;
};

const DEFAULT_EMPTY_VEHICLES = [];

/**
 * GateCameraControlModal
 * Màn hình Kiểm Soát Cổng: 1 Bên Camera live stream - 1 Bên Làn Vào / Làn Ra
 */
export default function GateCameraControlModal({
  isOpen,
  onClose,
  vehicles = DEFAULT_EMPTY_VEHICLES,
  onVehicleMatched,
  initialPlate = "",
  initialLane = "entry",
  gateId = null,
  onDetected = null,
  onSessionChange = null,
}) {
  const videoRef = useRef(null);
  const actionPendingRef = useRef(false);
  const barrierTimerRef = useRef(null);
  const barrierAutoCloseTimerRef = useRef(null);

  const { role: currentUserRole } = useCurrentUser();

  // State phân tách rõ ràng giữa Camera và Tra cứu thủ công (Finding 5)
  const [cameraDetectedPlate, setCameraDetectedPlate] = useState("");
  const [manualInputPlate, setManualInputPlate] = useState("");
  const [detectedPlate, setDetectedPlate] = useState("");
  const [detectionSource, setDetectionSource] = useState(null); // 'camera' | 'manual' | null
  const [matchedVehicle, setMatchedVehicle] = useState(null);
  const [scanDetails, setScanDetails] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [imageWarningMessage, setImageWarningMessage] = useState("");
  const [rawLookup, setRawLookup] = useState(null);

  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // 2 làn tách bạch: 'entry' | 'exit'
  const [laneMode, setLaneMode] = useState("entry");
  const lastInitialLaneRef = useRef("");

  // Đồng bộ làn ban đầu từ modal trigger hoặc BroadcastChannel
  useEffect(() => {
    if (isOpen && initialLane && lastInitialLaneRef.current !== initialLane) {
      lastInitialLaneRef.current = initialLane;
      const mode = (initialLane === "exit" || initialLane === "out") ? "exit" : "entry";
      queueMicrotask(() => {
        setLaneMode((prev) => (prev !== mode ? mode : prev));
      });
    } else if (!isOpen) {
      lastInitialLaneRef.current = "";
    }
  }, [isOpen, initialLane]);

  const [barrierState, setBarrierState] = useState("closed");

  const [isActionPending, setIsActionPending] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [isFeeExempt, setIsFeeExempt] = useState(false);
  const [waiverReason, setWaiverReason] = useState("");

  const [backendFeePreview, setBackendFeePreview] = useState(null);
  const [isLoadingFeePreview, setIsLoadingFeePreview] = useState(false);

  const activeGateId =
    gateId || (laneMode === "entry" ? DEFAULT_ENTRY_GATE_ID : DEFAULT_EXIT_GATE_ID);

  // Stream Camera trực tiếp
  const {
    cameraError,
    videoDevices,
    selectedDeviceId,
    changeCamera,
    statusMessage,
    detectedData,
    rawBoundingBox,
    sourceDimensions,
    resetDetection,
    applyAuthoritativeScan,
  } = usePlateAutoDetect({
    isOpen,
    videoRef,
    gateId: activeGateId,
  });

  const triggerBarrierOpen = useCallback(() => {
    setBarrierState("opening");
    if (barrierTimerRef.current) clearTimeout(barrierTimerRef.current);
    if (barrierAutoCloseTimerRef.current) clearTimeout(barrierAutoCloseTimerRef.current);

    barrierTimerRef.current = setTimeout(() => {
      setBarrierState("opened");
      barrierAutoCloseTimerRef.current = setTimeout(() => {
        setBarrierState("closed");
      }, BARRIER_AUTO_CLOSE_DELAY_MS);
    }, BARRIER_OPEN_DELAY_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (barrierTimerRef.current) {
        clearTimeout(barrierTimerRef.current);
      }
      if (barrierAutoCloseTimerRef.current) {
        clearTimeout(barrierAutoCloseTimerRef.current);
      }
    };
  }, []);

  // Nạp danh sách ô đỗ khả dụng khi ở Làn Vào
  useEffect(() => {
    if (!isOpen || laneMode !== "entry") return;
    let isCancelled = false;

    async function loadSlots() {
      setIsLoadingSlots(true);
      try {
        const vehicleType = matchedVehicle?.vehicleType || "CAR";
        const vehiclePlate = detectedPlate || matchedVehicle?.licensePlate || "";
        const slots = await getAvailableSlotsForCheckIn({
          vehicleType,
          licensePlate: vehiclePlate,
          filterReserved: true,
        });
        if (!isCancelled && Array.isArray(slots) && slots.length > 0) {
          setAvailableSlots(slots);
          const assignedId = matchedVehicle?.parkingSlot?.slotId;
          const assignedExists = slots.some((s) => s.id === assignedId);
          setSelectedSlotId(assignedExists ? assignedId : slots[0].id);
        }
      } catch (err) {
        console.warn("Không thể tải ô đỗ khả dụng:", err?.message);
      } finally {
        if (!isCancelled) setIsLoadingSlots(false);
      }
    }

    loadSlots();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, laneMode, matchedVehicle, detectedPlate]);

  const normalizePlate = (str) =>
    (str || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  const findInLocalList = useCallback(
    (norm) => {
      const list = Array.isArray(vehicles) && vehicles.length > 0 ? vehicles : mockVehicles;
      return list.find((v) => normalizePlate(v.licensePlate) === norm) || null;
    },
    [vehicles]
  );

  const resolveActiveSession = async (plate) => {
    try {
      const sessionRes = await getParkingSessions({ license_plate: plate, status: "open" });
      const active = sessionRes?.items?.[0] || sessionRes?.results?.[0];
      if (!active) return null;
      const rawIso =
        active.entryTimeRaw ||
        active.rawEntryTime ||
        active.entry_time ||
        parseEntryTimeToDate(active.entryTime)?.toISOString() ||
        active.entryTime;

      return {
        id: active.id,
        session_code: active.sessionCode || active.session_code,
        entry_time: rawIso,
        entry_image_url: active.plateImageUrl || active.entryImageUrl || active.entry_image_url,
        slot_code: active.slotCode || active.slot_code,
      };
    } catch {
      return null;
    }
  };

  const fetchFeePreview = useCallback(async (plate, sessionCode) => {
    const cleanPlate = (plate || "").trim();
    const cleanCode = (sessionCode || "").trim();
    if (!cleanPlate && !cleanCode) return;
    setIsLoadingFeePreview(true);
    try {
      const preview = await previewParkingFee({
        licensePlate: cleanPlate || undefined,
        sessionCode: cleanCode || undefined,
      });
      if (preview) {
        setBackendFeePreview(preview);
      }
    } catch (err) {
      console.warn("Could not preview parking fee from backend:", err?.message || err);
    } finally {
      setIsLoadingFeePreview(false);
    }
  }, []);

  const handleMatchPlate = useCallback(
    async (plateInput) => {
      const rawInput = (plateInput || "").trim();
      const norm = normalizePlate(rawInput);
      if (!norm) return;

      setIsScanning(true);
      setErrorMessage("");
      setImageWarningMessage("");
      setActionSuccessMessage("");
      setBarrierState("closed");

      try {
        const lookupResult = await lookupVehicleByPlate(rawInput);
        let openSession = lookupResult?.open_session || null;
        if (!openSession) {
          openSession = await resolveActiveSession(rawInput);
        }
        const consolidatedLookup = lookupResult
          ? { ...lookupResult, open_session: openSession }
          : openSession
            ? { open_session: openSession }
            : null;

        setRawLookup(consolidatedLookup);
        const vehicle = mapVehicleLookupToVehicle(consolidatedLookup);

        if (vehicle) {
          setMatchedVehicle(vehicle);
        } else {
          const found = findInLocalList(norm);
          if (found) {
            setMatchedVehicle(found);
          } else {
            setMatchedVehicle({
              id: "WALK_IN_" + Date.now(),
              licensePlate: rawInput.toUpperCase(),
              vehicleType: "CAR",
              model: "Khách vãng lai",
              status: "active",
              customer: { name: "Khách vãng lai (Vé lượt)" },
            });
          }
        }

        // Tự động tải cước phí xem trước từ Backend
        fetchFeePreview(rawInput, openSession?.session_code);
      } catch {
        const openSession = await resolveActiveSession(rawInput);
        setRawLookup(openSession ? { open_session: openSession } : null);

        const localFound = findInLocalList(norm);
        if (localFound) {
          setMatchedVehicle(localFound);
        } else {
          setMatchedVehicle({
            id: "WALK_IN_" + Date.now(),
            licensePlate: rawInput.toUpperCase(),
            vehicleType: "CAR",
            model: "Khách vãng lai",
            status: "active",
            customer: { name: "Khách vãng lai (Vé lượt)" },
          });
        }
        fetchFeePreview(rawInput, openSession?.session_code);
      } finally {
        setIsScanning(false);
      }
    },
    [findInLocalList, fetchFeePreview]
  );

  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const lastInitialPlateRef = useRef("");
  const lastDetectedPlateRef = useRef("");

  // Khởi tạo biển số ban đầu nếu được truyền từ Header Scanner modal
  useEffect(() => {
    if (isOpen && initialPlate && lastInitialPlateRef.current !== initialPlate) {
      lastInitialPlateRef.current = initialPlate;
      const clean = initialPlate.trim().toUpperCase();
      const formatted = formatLicensePlateForDisplay(clean);
      setCameraDetectedPlate(clean);
      setManualInputPlate(formatted);
      setDetectionSource("camera");
      setDetectedPlate(clean);
      handleMatchPlate(clean);
    } else if (!isOpen) {
      lastInitialPlateRef.current = "";
    }
  }, [isOpen, initialPlate, handleMatchPlate]);

  // Lắng nghe camera tự động nhận diện biển số
  useEffect(() => {
    const plate = detectedData?.plate_final;
    if (plate && plate !== lastDetectedPlateRef.current) {
      lastDetectedPlateRef.current = plate;
      const formatted = formatLicensePlateForDisplay(plate);
      setCameraDetectedPlate(plate);
      setManualInputPlate(formatted);
      setDetectionSource("camera");
      setDetectedPlate(plate);
      handleMatchPlate(plate);
      const conf =
        detectedData?.confidence ??
        detectedData?.best_candidate?.confidence ??
        null;
      setScanDetails({
        confidence: conf,
        plate: formatted,
        source: "camera",
        imageUrl: detectedData?.image_url || detectedData?.plate_image_url || null,
      });
    } else if (!isOpen) {
      lastDetectedPlateRef.current = "";
    }
  }, [detectedData, isOpen, handleMatchPlate]);

  const handleManualSearch = (e) => {
    e.preventDefault();
    const target = (manualInputPlate || detectedPlate || "").trim();
    if (!target) return;
    const formatted = formatLicensePlateForDisplay(target);
    setDetectionSource("manual");
    setScanDetails(null); // XÓA scanDetails per Finding 5 -> badge AI 98.5% biến mất hoàn toàn
    setManualInputPlate(formatted);
    setDetectedPlate(target);
    handleMatchPlate(target);
    resetDetection(); // Finding 3: Sẵn sàng cho camera state machine phát hiện biển số mới
  };

  const handleReset = () => {
    lastDetectedPlateRef.current = "";
    setCameraDetectedPlate("");
    setManualInputPlate("");
    setDetectedPlate("");
    setDetectionSource(null);
    setMatchedVehicle(null);
    setScanDetails(null);
    setErrorMessage("");
    setImageWarningMessage("");
    setRawLookup(null);
    setActionSuccessMessage("");
    setBarrierState("closed");
    if (barrierTimerRef.current) clearTimeout(barrierTimerRef.current);
    if (barrierAutoCloseTimerRef.current) clearTimeout(barrierAutoCloseTimerRef.current);
    setBackendFeePreview(null);
    setIsFeeExempt(false);
    setWaiverReason("");
    resetDetection();
  };

  const handleApplySelection = () => {
    if (matchedVehicle && onVehicleMatched) {
      onVehicleMatched(matchedVehicle);
    }
    if (onDetected && detectedPlate) {
      onDetected(detectedPlate, matchedVehicle);
    }
    onClose();
  };

  const isManualLookup = detectionSource === "manual";
  const hasOpenSession = Boolean(rawLookup?.open_session);
  const entryValidation = validateVehicleEntry({
    vehicle: matchedVehicle,
    openSession: rawLookup?.open_session,
  });
  const isBlacklisted = !entryValidation.isValid && entryValidation.isBlacklisted;
  const hasValidTicket = Boolean(
    matchedVehicle?.ticketState === "active" ||
      matchedVehicle?.ticket?.is_valid ||
      rawLookup?.active_ticket
  );

  const calculatedDurationMinutes = useMemo(() => {
    const rawEntryTime = rawLookup?.open_session?.entry_time;
    if (!rawEntryTime) return 0;
    const entryDate = parseEntryTimeToDate(rawEntryTime);
    if (!entryDate) return 0;
    const diffMs = currentTimestamp - entryDate.getTime();
    return Math.max(1, Math.floor(diffMs / 60000));
  }, [rawLookup?.open_session?.entry_time, currentTimestamp]);

  const handleForceCloseSession = async () => {
    const licensePlate = detectedPlate || matchedVehicle?.licensePlate;
    if (!licensePlate || actionPendingRef.current) return;

    actionPendingRef.current = true;
    setIsActionPending(true);
    setErrorMessage("");

    try {
      await forceCloseSessionAndReleaseSlot({
        licensePlate,
        notes: "Cưỡng chế đóng phiên cũ bị treo tại cổng",
      });
      setRawLookup((prev) => (prev ? { ...prev, open_session: null } : null));
      setActionSuccessMessage("✓ Đã đóng phiên cũ thành công. Sẵn sàng đón lượt mới!");
    } catch (err) {
      setErrorMessage(err?.data?.message || err?.message || "Không thể cưỡng chế đóng phiên.");
    } finally {
      actionPendingRef.current = false;
      setIsActionPending(false);
    }
  };

  const handleConfirmEntry = async () => {
    if (actionPendingRef.current) return;
    actionPendingRef.current = true;
    setIsActionPending(true);
    setErrorMessage("");
    setImageWarningMessage("");
    setActionSuccessMessage("");

    try {
      const chosenSlot = availableSlots.find((s) => s.id === selectedSlotId);
      const targetSlotId = chosenSlot?.id ?? 1;

      if (hasOpenSession) {
        await forceCloseSessionAndReleaseSlot({
          licensePlate: detectedPlate || matchedVehicle?.licensePlate,
          notes: "Tự động đóng phiên cũ bị treo để tạo phiên check-in mới",
        });
      }

      // Sửa lỗi nghiêm trọng G-FE-01: TUYỆT ĐỐI KHÔNG gửi chuỗi Base64 Data URL từ canvas
      let entryImageUrl = null;
      if (scanDetails?.imageUrl && scanDetails.imageUrl.startsWith("http")) {
        entryImageUrl = scanDetails.imageUrl;
      } else if (detectedData?.image_url && detectedData.image_url.startsWith("http")) {
        entryImageUrl = detectedData.image_url;
      } else if (applyAuthoritativeScan) {
        try {
          const authResult = await applyAuthoritativeScan();
          if (authResult?.success && authResult?.data?.image_url) {
            entryImageUrl = authResult.data.image_url;
          } else if (authResult?.error) {
            console.warn("Authoritative scan upload failed (502/Cloudinary):", authResult.error);
            setImageWarningMessage(
              "⚠️ Không thể tải ảnh lên máy chủ (Cloudinary). Phiên gửi vẫn được tạo thành công không kèm ảnh."
            );
          }
        } catch (authErr) {
          console.warn("Authoritative scan exception:", authErr);
          setImageWarningMessage(
            "⚠️ Không thể tải ảnh lên máy chủ (Cloudinary). Phiên gửi vẫn được tạo thành công không kèm ảnh."
          );
        }
      }

      // Đảm bảo không còn tồn dư data URL
      if (typeof entryImageUrl === "string" && entryImageUrl.startsWith("data:")) {
        entryImageUrl = null;
      }

      const checkInResult = await checkInVehicle({
        licensePlate: detectedPlate || matchedVehicle?.licensePlate,
        slotId: targetSlotId,
        entryGateId: DEFAULT_ENTRY_GATE_ID,
        imageUrl: entryImageUrl,
      });

      if (checkInResult) {
        setRawLookup((prev) => ({
          ...(prev || {}),
          open_session: {
            id: checkInResult.id,
            session_code: checkInResult.sessionCode || checkInResult.session_code,
            entry_time: checkInResult.entryTimeRaw || checkInResult.entry_time || new Date().toISOString(),
            entry_image_url: checkInResult.plateImageUrl || checkInResult.entry_image_url || entryImageUrl,
            slot_code: chosenSlot?.code || checkInResult.slotCode,
          },
        }));
      }

      // Barrier tự động mở 600ms và tự động đóng sau 3000ms (G-FE-02)
      triggerBarrierOpen();

      setActionSuccessMessage(
        `✓ Đã Check-in thành công! Mở barrier mời xe vào ô ${chosenSlot ? chosenSlot.code : "A-01"}.`
      );

      if (onSessionChange) {
        onSessionChange("check-in", checkInResult);
      }

      // Phát sự kiện đồng bộ tức thì với trang Lịch sử ra/vào (G-FE-04)
      const plate = detectedPlate || matchedVehicle?.licensePlate;
      const sessionCode = checkInResult?.sessionCode || checkInResult?.session_code;
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        window.dispatchEvent(
          new CustomEvent("parking-session-changed", {
            detail: {
              action: "check-in",
              licensePlate: plate,
              sessionCode,
            },
          })
        );
      }
    } catch (err) {
      setErrorMessage(getEntryErrorMessage(err));
    } finally {
      actionPendingRef.current = false;
      setIsActionPending(false);
    }
  };

  const handleConfirmExit = async () => {
    if (actionPendingRef.current) return;
    actionPendingRef.current = true;
    setIsActionPending(true);
    setErrorMessage("");
    setImageWarningMessage("");
    setActionSuccessMessage("");

    try {
      const isTicketActive = Boolean(
        backendFeePreview?.has_active_ticket ||
        backendFeePreview?.is_exempt ||
        hasValidTicket
      );
      const isExemptActive = isFeeExempt || isTicketActive;
      const chosenMethod = isExemptActive ? "CASH" : paymentMethod;

      let exitImageUrl = null;
      if (scanDetails?.imageUrl && scanDetails.imageUrl.startsWith("http")) {
        exitImageUrl = scanDetails.imageUrl;
      } else if (detectedData?.image_url && detectedData.image_url.startsWith("http")) {
        exitImageUrl = detectedData.image_url;
      }

      const checkOutResult = await checkOutVehicle({
        licensePlate: detectedPlate || matchedVehicle?.licensePlate,
        sessionCode: rawLookup?.open_session?.session_code,
        exitGateId: DEFAULT_EXIT_GATE_ID,
        paymentMethod: chosenMethod,
        waiveFee: isFeeExempt,
        waiverReason: waiverReason,
        exitImageUrl,
      });

      // Barrier tự động mở 600ms và tự động đóng sau 3000ms (G-FE-02)
      triggerBarrierOpen();

      const feeFormatted = isFeeExempt
        ? "0đ (Miễn cước đặc cách)"
        : isTicketActive
        ? "0đ (Vé tháng có hiệu lực)"
        : backendFeePreview?.fee_amount !== undefined
        ? `${new Intl.NumberFormat("vi-VN").format(backendFeePreview.fee_amount)}đ`
        : checkOutResult?.fee_amount !== undefined
        ? `${new Intl.NumberFormat("vi-VN").format(checkOutResult.fee_amount)}đ`
        : "0đ";

      setActionSuccessMessage(
        `✓ Check-out hoàn tất (${feeFormatted})! Mở barrier mời xe ra bãi.`
      );

      if (onSessionChange) {
        onSessionChange("check-out", checkOutResult);
      }

      // Phát sự kiện đồng bộ tức thì với trang Lịch sử ra/vào (G-FE-04)
      const plate = detectedPlate || matchedVehicle?.licensePlate;
      const sessionCode =
        rawLookup?.open_session?.session_code ||
        checkOutResult?.sessionCode ||
        checkOutResult?.session_code;
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        window.dispatchEvent(
          new CustomEvent("parking-session-changed", {
            detail: {
              action: "check-out",
              licensePlate: plate,
              sessionCode,
            },
          })
        );
      }
    } catch (err) {
      setErrorMessage(getExitErrorMessage(err));
    } finally {
      actionPendingRef.current = false;
      setIsActionPending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              📷
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Kiểm Soát Cổng Vào / Ra (Camera Live)
              </h3>
              <p className="text-3xs text-slate-500">
                1 Camera quét trực tiếp • 1 bên Làn Vào (Check-in) & 1 bên Làn Ra (Check-out)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bộ chọn làn: Làn Vào & Làn Ra */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setLaneMode("entry");
                  setErrorMessage("");
                  setImageWarningMessage("");
                  setActionSuccessMessage("");
                  setBarrierState("closed");
                  if (barrierTimerRef.current) clearTimeout(barrierTimerRef.current);
                  if (barrierAutoCloseTimerRef.current) clearTimeout(barrierAutoCloseTimerRef.current);
                }}
                className={`px-3 py-1 rounded-lg text-2xs font-semibold transition-all ${
                  laneMode === "entry"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🚗 Làn Vào
              </button>
              <button
                type="button"
                onClick={() => {
                  setLaneMode("exit");
                  setErrorMessage("");
                  setImageWarningMessage("");
                  setActionSuccessMessage("");
                  setBarrierState("closed");
                  if (barrierTimerRef.current) clearTimeout(barrierTimerRef.current);
                  if (barrierAutoCloseTimerRef.current) clearTimeout(barrierAutoCloseTimerRef.current);
                  const targetPlate = detectedPlate || matchedVehicle?.licensePlate;
                  const targetCode = rawLookup?.open_session?.session_code;
                  if (targetPlate || targetCode) {
                    fetchFeePreview(targetPlate, targetCode);
                  }
                }}
                className={`px-3 py-1 rounded-lg text-2xs font-semibold transition-all ${
                  laneMode === "exit"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🚙 Làn Ra
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body: 2 cột - 1 bên Camera, 1 bên Làn Vào / Ra */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Thanh nhập biển số thủ công / tra cứu nhanh */}
          <form onSubmit={handleManualSearch} className="flex gap-2" data-detection-source={detectionSource || undefined}>
            {detectionSource && (
              <span className="sr-only">Nguồn nhận diện: {detectionSource}</span>
            )}
            <input
              type="text"
              value={manualInputPlate}
              onChange={(e) => setManualInputPlate(e.target.value.toUpperCase())}
              placeholder="Nhập hoặc quét biển số (VD: 43A-123.45)..."
              className="flex-1 font-mono uppercase font-bold text-slate-800 tracking-wider px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
            <button
              type="submit"
              disabled={isScanning || !manualInputPlate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs rounded-xl font-semibold transition-colors"
            >
              {isScanning ? "Đang tra..." : "Tra cứu"}
            </button>
          </form>

          {/* Success / Error / Warning Alerts */}
          {actionSuccessMessage && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs">
              <span>🎉</span>
              <span className="font-semibold">{actionSuccessMessage}</span>
            </div>
          )}

          {imageWarningMessage && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-800 flex items-center gap-2 text-xs">
              <span>⚠️</span>
              <span className="font-semibold">{imageWarningMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-300 text-rose-800 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
              {errorMessage.includes("Làn Ra") && laneMode === "entry" && (
                <button
                  type="button"
                  onClick={() => {
                    setLaneMode("exit");
                    setErrorMessage("");
                    setImageWarningMessage("");
                    const targetPlate = detectedPlate || matchedVehicle?.licensePlate;
                    const targetCode = rawLookup?.open_session?.session_code;
                    if (targetPlate || targetCode) {
                      fetchFeePreview(targetPlate, targetCode);
                    }
                  }}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-3xs font-semibold"
                >
                  👉 Chuyển sang Làn Ra
                </button>
              )}
            </div>
          )}

          {/* Layout chính: Bên trái Camera (50%) - Bên phải Làn Vào/Ra (50%) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {/* Cột trái: 1 Camera Stream duy nhất */}
            <div className="h-full">
              <ScanPlateCameraFeed
                videoRef={videoRef}
                videoDevices={videoDevices}
                selectedDeviceId={selectedDeviceId}
                onChangeCamera={changeCamera}
                cameraError={cameraError}
                rawBoundingBox={isManualLookup ? null : rawBoundingBox}
                sourceDimensions={sourceDimensions}
                statusMessage={isManualLookup ? "Đang tra cứu thủ công" : statusMessage}
                isScanning={isScanning}
                detectedPlate={cameraDetectedPlate}
                cameraPlate={isManualLookup ? "" : cameraDetectedPlate}
                barrierState={barrierState}
                onReset={handleReset}
                isManualLookup={isManualLookup}
              />
            </div>

            {/* Cột phải: Panel Làn Vào hoặc Làn Ra */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between h-full shadow-2xs">
              {laneMode === "entry" ? (
                <EntryLanePanel
                  detectedPlate={detectedPlate}
                  matchedVehicle={matchedVehicle}
                  scanDetails={scanDetails}
                  availableSlots={availableSlots}
                  selectedSlotId={selectedSlotId}
                  setSelectedSlotId={setSelectedSlotId}
                  isLoadingSlots={isLoadingSlots}
                  isBlacklisted={isBlacklisted}
                  hasValidTicket={hasValidTicket}
                  hasOpenSession={hasOpenSession}
                  isActionPending={isActionPending}
                  onConfirmEntry={handleConfirmEntry}
                  onForceCloseSession={handleForceCloseSession}
                />
              ) : (
                <ExitLanePanel
                  detectedPlate={detectedPlate}
                  matchedVehicle={matchedVehicle}
                  rawLookup={rawLookup}
                  scanDetails={scanDetails}
                  hasValidTicket={hasValidTicket}
                  calculatedDurationMinutes={calculatedDurationMinutes}
                  backendFeePreview={backendFeePreview}
                  isLoadingFeePreview={isLoadingFeePreview}
                  isFeeExempt={isFeeExempt}
                  setIsFeeExempt={setIsFeeExempt}
                  waiverReason={waiverReason}
                  setWaiverReason={setWaiverReason}
                  currentUserRole={currentUserRole}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  isActionPending={isActionPending}
                  onConfirmExit={handleConfirmExit}
                />
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
          >
            Đóng
          </button>
          {matchedVehicle && (
            <button
              type="button"
              onClick={handleApplySelection}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition"
            >
              Xem hồ sơ chi tiết phương tiện →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

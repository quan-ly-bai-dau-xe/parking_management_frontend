import { useState, useRef, useEffect } from "react";
import {
  scanPlateImage,
  lookupVehicleByPlate,
  mapPlateScanToVehicle,
  mapVehicleLookupToVehicle,
} from "../../services/plateScanService";
import {
  validateVehicleEntry,
  calculateParkingFee,
  checkInVehicle,
  checkOutVehicle,
  forceCloseSessionAndReleaseSlot,
  getAvailableSlotsForCheckIn,
} from "../../services/parkingSessionService";
import { mockVehicles } from "../../mocks/vehicleData";

// Cấu hình hằng số nghiệp vụ & animation barrier
const DEFAULT_ENTRY_GATE_ID = 1;
const DEFAULT_EXIT_GATE_ID = 3;
const BARRIER_OPEN_DELAY_MS = 600;

/**
 * Trích xuất câu thông báo lỗi thân thiện khi Check-in xe vào bãi theo Backend API Contract
 */
const getEntryErrorMessage = (err) => {
  const backendMsg = err?.data?.message || err?.message;
  const errorCode = err?.data?.code;

  if (err?.status === 409 || errorCode === "PROP-4.5.1-P07") {
    return (
      backendMsg ||
      "⚠️ Xe này đã có phiên gửi đang mở chưa hoàn thành. " +
      "Vui lòng bấm nút chuyển sang Làn Ra (Check-out) để giải quyết phiên đỗ."
    );
  }
  if (errorCode === "PROP-4.5.1-P08") {
    return "⛔ Biển số xe nằm trong danh sách đen (Blacklist), không được phép vào bãi.";
  }
  if (errorCode === "PROP-4.5.2-P01") {
    return "⚠️ Vị trí đỗ này đang bảo trì, vui lòng chọn vị trí khác.";
  }
  return backendMsg || "Không thể thực hiện check-in phương tiện. Vui lòng thử lại.";
};

/**
 * ScanPlateModal component
 * Hỗ trợ toàn diện quy trình xe Vào/Ra:
 * 1. Quét biển số bằng AI OCR (Upload ảnh hoặc chụp camera).
 * 2. Tra cứu danh bạ xe, kiểm tra vé, kiểm tra danh sách đen (Blacklist).
 * 3. Tự động xác định làn Vào (Entry) hay làn Ra (Exit).
 * 4. Ghi nhận xe vào tạo Parking Session và kích hoạt mở thanh chắn (Barrier).
 * 5. Tính phí thời lượng gửi xe thực tế và xác nhận thanh toán kết thúc phiên.
 */
export default function ScanPlateModal({
  isOpen,
  onClose,
  onVehicleMatched,
  onCheckInSuccess,
  vehicles = [],
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadedCloudinaryUrl, setUploadedCloudinaryUrl] = useState(null);
  const [detectedPlate, setDetectedPlate] = useState("");
  const [matchedVehicle, setMatchedVehicle] = useState(null);
  const [scanDetails, setScanDetails] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [searchStatus, setSearchStatus] = useState("idle"); // 'idle' | 'matched' | 'not_found' | 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const [rawLookup, setRawLookup] = useState(null);

  // Slot allocation states
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Workflow states: Lane mode & Action statuses
  const [laneMode, setLaneMode] = useState("auto"); // 'auto' | 'entry' | 'exit'
  const [barrierState, setBarrierState] = useState("closed"); // 'closed' | 'opening' | 'opened'
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");
  const [isActionPending, setIsActionPending] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH"); // 'CASH' | 'VIETQR'
  const [isFeeExempt, setIsFeeExempt] = useState(false); // Miễn cước đặc cách (sự cố OCR / vé tháng chưa sync)

  const fileInputRef = useRef(null);
  // actionPendingRef: khóa đồng bộ chặn double-click tức thì trong event handler
  // isActionPending: state bất đồng bộ điều khiển trạng thái loading/disabled trên UI
  const actionPendingRef = useRef(false);
  const barrierTimerRef = useRef(null);

  // Dọn dẹp timer barrier khi component unmount
  useEffect(() => {
    return () => {
      if (barrierTimerRef.current) {
        clearTimeout(barrierTimerRef.current);
      }
    };
  }, []);

  // Tải danh sách ô đỗ khả dụng khi mở modal hoặc khi xe được nhận diện
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingSlots(true);

    const vehicleType =
      matchedVehicle?.vehicleTypeCode ||
      matchedVehicle?.vehicleType ||
      "CAR";

    getAvailableSlotsForCheckIn({ vehicleTypeCode: vehicleType })
      .then((slots) => {
        if (!isMounted) return;
        setAvailableSlots(slots);
        if (!matchedVehicle?.parkingSlot?.slotId && slots.length > 0) {
          setSelectedSlotId(slots[0].id);
        } else if (matchedVehicle?.parkingSlot?.slotId) {
          setSelectedSlotId(matchedVehicle.parkingSlot.slotId);
        }
      })
      .catch((err) => {
        console.warn("Could not load available slots for check-in:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    matchedVehicle?.id,
    matchedVehicle?.vehicleTypeCode,
    matchedVehicle?.parkingSlot?.slotId,
  ]);

  if (!isOpen) return null;

  // Clean plate string for fuzzy comparison
  const normalizePlate = (str) => {
    return (str || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  };

  // Search in fallback list (passed vehicles props or mockVehicles)
  const findInLocalList = (norm) => {
    return (
      vehicles.find((v) => normalizePlate(v.licensePlate) === norm) ||
      mockVehicles.find((v) => normalizePlate(v.licensePlate) === norm)
    );
  };

  // Perform search / matching logic via Backend API first, with fallback to local/mock list
  const handleMatchPlate = async (plateInput) => {
    const rawInput = (plateInput || "").trim();
    const norm = normalizePlate(rawInput);
    if (!norm) return;

    setIsScanning(true);
    setErrorMessage("");
    setActionSuccessMessage("");
    setBarrierState("closed");

    try {
      // 1. Call real backend API: GET /api/v1/parking/vehicle-lookup/
      const lookupResult = await lookupVehicleByPlate(rawInput);
      setRawLookup(lookupResult);
      const vehicle = mapVehicleLookupToVehicle(lookupResult);

      if (vehicle) {
        setMatchedVehicle(vehicle);
        setSearchStatus("matched");
        setIsScanning(false);
        return;
      }
    } catch (err) {
      // Check fallback list in all error cases (404, 502, network down)
      const found = findInLocalList(norm);
      if (found) {
        setMatchedVehicle(found);
        setRawLookup(null);
        setSearchStatus("matched");
        setIsScanning(false);
        return;
      }

      if (err.status === 404) {
        setMatchedVehicle(null);
        setRawLookup(null);
        setSearchStatus("not_found");
        setIsScanning(false);
        return;
      }

      setMatchedVehicle(null);
      setRawLookup(null);
      setSearchStatus("error");
      setErrorMessage(
        err.message ||
          "Không thể kết nối đến máy chủ đối soát. Vui lòng kiểm tra lại dịch vụ.",
      );
      setIsScanning(false);
      return;
    }

    const localFound = findInLocalList(norm);
    if (localFound) {
      setMatchedVehicle(localFound);
      setRawLookup(null);
      setSearchStatus("matched");
    } else {
      setMatchedVehicle(null);
      setRawLookup(null);
      setSearchStatus("not_found");
    }
    setIsScanning(false);
  };

  // Trigger OCR scan on an image file
  const runOcrScan = async (file) => {
    if (!file) return;

    setIsScanning(true);
    setSearchStatus("idle");
    setErrorMessage("");
    setScanDetails(null);
    setActionSuccessMessage("");
    setBarrierState("closed");

    try {
      const scanResult = await scanPlateImage(file);

      const extractedText =
        scanResult.best_candidate?.plate_text ||
        scanResult.plate_raw ||
        scanResult.plate_final ||
        scanResult.license_plate ||
        "";

      setScanDetails({
        plate: extractedText,
        confidence:
          scanResult.best_candidate?.confidence ??
          scanResult.confidence ??
          null,
        reviewStatus: scanResult.review_status,
        engine: scanResult.engine_name,
        latencyMs: scanResult.latency_ms,
        candidates: scanResult.candidates || [],
      });
      if (scanResult?.image_url) {
        setUploadedCloudinaryUrl(scanResult.image_url);
      } else {
        setUploadedCloudinaryUrl(null);
      }

      if (extractedText) {
        setDetectedPlate(extractedText);

        const mappedVehicle = mapPlateScanToVehicle(scanResult);
        if (mappedVehicle) {
          setMatchedVehicle(mappedVehicle);
          const openSession =
            scanResult.open_session || scanResult.vehicle_lookup?.open_session || null;
          const lookupData =
            scanResult.vehicle_lookup ||
            (openSession
              ? {
                  open_session: openSession,
                  is_blacklisted: Boolean(scanResult.is_blacklisted),
                }
              : null);
          setRawLookup(lookupData);
          setSearchStatus("matched");
        } else {
          await handleMatchPlate(extractedText);
        }
      } else {
        setSearchStatus("error");
        setErrorMessage(
          "AI không nhận diện được biển số từ ảnh chụp này. Vui lòng chọn ảnh rõ nét hơn.",
        );
      }
    } catch (err) {
      setSearchStatus("error");
      const msg =
        err.status === 401
          ? "Phiên làm việc hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại."
          : err.status === 403
            ? "Thiếu quyền thực hiện quét biển số (403 Forbidden)."
            : err.status === 502 || err.code === "ERR_BAD_RESPONSE"
              ? "Máy chủ nhận diện AI (Backend OCR) đang dừng hoặc khởi động lại (502 Bad Gateway). Bạn có thể nhập biển số thủ công bên dưới để tra cứu tiếp."
              : err.status === 405 || err.status === 500
                ? "Hệ thống AI server đang bận hoặc gặp lỗi mẫu hiển thị. Bạn có thể nhập biển số thủ công bên dưới để tra cứu tiếp."
                : err.message || "Lỗi tải ảnh lên hệ thống nhận diện AI.";
      setErrorMessage(msg);
    } finally {
      setIsScanning(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(URL.createObjectURL(file));
      runOcrScan(file);
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (detectedPlate) {
      handleMatchPlate(detectedPlate);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setUploadedCloudinaryUrl(null);
    setDetectedPlate("");
    setMatchedVehicle(null);
    setScanDetails(null);
    setSearchStatus("idle");
    setErrorMessage("");
    setActionSuccessMessage("");
    setBarrierState("closed");
    setRawLookup(null);
    setSelectedSlotId(null);
    setPaymentMethod("CASH");
    setIsFeeExempt(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleApplySelection = () => {
    if (matchedVehicle && onVehicleMatched) {
      onVehicleMatched(matchedVehicle);
    }
    onClose();
  };

  // Determine current active workflow mode: Entry vs Exit
  const hasOpenSession = Boolean(rawLookup?.open_session);
  const isVehicleCurrentlyParked = Boolean(
    hasOpenSession ||
    matchedVehicle?.status === "parked" ||
    matchedVehicle?.status === "Đang gửi",
  );

  const effectiveMode =
    laneMode === "auto"
      ? isVehicleCurrentlyParked
        ? "exit"
        : "entry"
      : laneMode;

  // Security and eligibility validation
  const entryValidation = validateVehicleEntry({
    vehicle: matchedVehicle,
    lookupResult: rawLookup,
  });

  const isBlacklisted =
    rawLookup?.is_blacklisted ||
    matchedVehicle?.note?.toLowerCase()?.includes("cảnh báo") ||
    matchedVehicle?.note?.toLowerCase()?.includes("blacklist");

  // Exit Fee Estimation: tính thời lượng thực tế từ entry_time nếu có
  const hasValidTicket =
    matchedVehicle?.ticket?.status === "active" &&
    matchedVehicle?.ticket?.type !== "Vé lượt" &&
    matchedVehicle?.ticket?.type !== "—";

  const rawEntryTime = rawLookup?.open_session?.entry_time;
  const calculatedDurationMinutes = rawEntryTime
    ? Math.max(1, Math.round((Date.now() - new Date(rawEntryTime).getTime()) / 60000))
    : 150; // Dự toán thời gian đỗ mặc định khi chưa có phiên ghi nhận

  const exitFeeCalc = calculateParkingFee({
    vehicleType: matchedVehicle?.vehicleType || "CAR",
    durationMinutes: calculatedDurationMinutes,
    hasActiveTicket: hasValidTicket,
    isExempt: isFeeExempt,
  });

  // Action: Đóng phiên đỗ cũ khẩn cấp để giải phóng chỗ hoặc sửa lỗi phiên treo
  const handleForceCloseSession = async () => {
    if (actionPendingRef.current) return;
    const licensePlate = detectedPlate || matchedVehicle?.licensePlate;
    if (!licensePlate) return;

    actionPendingRef.current = true;
    setIsActionPending(true);
    setErrorMessage("");
    setActionSuccessMessage("");

    try {
      const result = await forceCloseSessionAndReleaseSlot({
        licensePlate,
        notes: "Cưỡng chế đóng phiên đỗ cũ bị treo tại cổng barrier",
        exitGateId: DEFAULT_EXIT_GATE_ID,
      });

      setRawLookup((prev) => (prev ? { ...prev, open_session: null } : prev));
      setMatchedVehicle((prev) =>
        prev
          ? {
              ...prev,
              status: prev.ticket?.status === "active" ? "active" : "left",
              statusDisplay: prev.ticket?.status === "active" ? "Đang hoạt động" : "Đã rời bãi",
            }
          : prev
      );
      if (result?.alreadyClosed) {
        setActionSuccessMessage(
          `✓ Phiên đỗ xe ${licensePlate} đã được kết thúc trước đó trong hệ thống. Đã đồng bộ trạng thái, bây giờ bạn có thể Check-in lượt mới.`,
        );
      } else {
        setActionSuccessMessage(
          `✓ Đã đóng phiên đỗ cũ của xe ${licensePlate} thành công! Bây giờ bạn có thể Check-in lượt mới.`,
        );
      }
    } catch (err) {
      const errMsg = err?.data?.message || err?.message || "";
      const errCode = err?.data?.code || err?.code || "";
      if (
        errCode === "PROP-4.5.1-P10" ||
        errMsg.includes("đã được kết thúc trước đó") ||
        errMsg.includes("Không tìm thấy dữ liệu trùng khớp")
      ) {
        setRawLookup((prev) => (prev ? { ...prev, open_session: null } : prev));
        setMatchedVehicle((prev) =>
          prev
            ? {
                ...prev,
                status: prev.ticket?.status === "active" ? "active" : "left",
                statusDisplay: prev.ticket?.status === "active" ? "Đang hoạt động" : "Đã rời bãi",
              }
            : prev
        );
        setActionSuccessMessage(
          `✓ Phiên đỗ xe ${licensePlate} đã được kết thúc trước đó trong hệ thống. Đã đồng bộ trạng thái, bây giờ bạn có thể Check-in lượt mới.`,
        );
      } else {
        setErrorMessage(
          errMsg || "Không thể đóng phiên đỗ cũ. Vui lòng thử lại.",
        );
      }
    } finally {
      actionPendingRef.current = false;
      setIsActionPending(false);
    }
  };

  // Action: Confirm Entry (Check-in)
  const handleConfirmEntry = async () => {
    // actionPendingRef: chặn ngay lập tức nếu user click liên tục trước khi React re-render
    if (actionPendingRef.current) return;

    actionPendingRef.current = true;
    setIsActionPending(true);
    setErrorMessage(""); // Clear thông báo lỗi cũ của lần thao tác trước
    setActionSuccessMessage("");

    try {
      const isFromAI = Boolean(scanDetails?.engine || selectedImage);
      const aiConfidence = isFromAI ? scanDetails?.confidence ?? null : null;
      const parkingSlot = matchedVehicle?.parkingSlot;
      const licensePlate = detectedPlate || matchedVehicle?.licensePlate;
      const vehicleType = matchedVehicle?.vehicleType || "CAR";

      // Xác định vị trí đỗ: ưu tiên ô vé tháng cố định -> ô operator chọn -> ô trống đầu tiên -> fallback 1
      const chosenSlot =
        availableSlots.find((s) => s.id === Number(selectedSlotId)) ||
        availableSlots[0] ||
        null;

      const targetSlotId =
        parkingSlot?.slotId ||
        selectedSlotId ||
        chosenSlot?.id ||
        1;

      const targetSlotDisplay =
        chosenSlot?.display ||
        parkingSlot?.display ||
        `Khu A · Tầng B1 · Slot A-01`;

      const targetSlotCode =
        chosenSlot?.code ||
        chosenSlot?.slotCode ||
        parkingSlot?.slot ||
        "A-01";

      // Nếu xe đang có phiên đỗ cũ bị treo (hasOpenSession), tự động đóng phiên cũ trước để tránh lỗi 409
      let closedSessionNotice = "";
      if (hasOpenSession) {
        try {
          await forceCloseSessionAndReleaseSlot({
            licensePlate,
            notes: "Tự động đóng phiên cũ bị treo để tạo phiên check-in mới",
            exitGateId: DEFAULT_EXIT_GATE_ID,
          });
          closedSessionNotice = "Đã đóng phiên cũ bị treo & ";
        } catch (forceErr) {
          console.warn("Could not auto-close previous session:", forceErr);
        }
      }

      const checkInResult = await checkInVehicle({
        licensePlate,
        vehicleType,
        entryGateId: DEFAULT_ENTRY_GATE_ID,
        slotId: targetSlotId,
        recognitionSource: isFromAI ? "AI" : "MANUAL",
        aiConfidence,
        imageUrl: uploadedCloudinaryUrl,
        activeTicket: hasValidTicket,
      });

      // Cập nhật trạng thái phương tiện sang đã gửi xe để ngăn chặn bấm Check-in trùng lặp
      const entryTimeFormatted = new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const nowIso = new Date().toISOString();

      const updatedVehicle = {
        ...(matchedVehicle || {}),
        status: "parked",
        statusDisplay: "Đang đỗ",
        parkingSlot: {
          slotId: targetSlotId,
          slot: targetSlotCode,
          display: targetSlotDisplay,
          floor: chosenSlot?.floor || "Tầng B1",
          zone: chosenSlot?.zone || "Khu A",
        },
        entryTime: entryTimeFormatted,
      };

      setRawLookup((prev) => ({
        ...(prev || {}),
        open_session: {
          id: checkInResult?.id || checkInResult?.session_code || 1,
          session_code: checkInResult?.session_code || checkInResult?.id,
          entry_time: checkInResult?.entry_time || nowIso,
          slot_id: targetSlotId,
          slot_display: targetSlotDisplay,
        },
      }));
      setMatchedVehicle(updatedVehicle);

      if (onCheckInSuccess) {
        onCheckInSuccess(checkInResult, updatedVehicle);
      }

      setBarrierState("opening");
      if (barrierTimerRef.current) clearTimeout(barrierTimerRef.current);
      barrierTimerRef.current = setTimeout(() => {
        setBarrierState("opened");
      }, BARRIER_OPEN_DELAY_MS);

      const slotNotice = targetSlotDisplay
        ? ` -> Ô đỗ: ${targetSlotDisplay}`
        : "";
      setActionSuccessMessage(
        `✓ ${closedSessionNotice}Đã tạo phiên gửi xe lúc ${entryTimeFormatted}${slotNotice}. Mở thanh chắn cho xe vào bãi!`,
      );
    } catch (err) {
      setErrorMessage(getEntryErrorMessage(err));
      // Nếu lỗi 409 (xe đã có phiên mở chưa hoàn thành), cập nhật trạng thái xe thành parked
      if (err?.status === 409) {
        setMatchedVehicle((prev) => (prev ? { ...prev, status: "parked" } : prev));
      }
    } finally {
      actionPendingRef.current = false;
      setIsActionPending(false);
    }
  };

  // Action: Confirm Exit (Check-out)
  const handleConfirmExit = async () => {
    if (actionPendingRef.current) return;

    actionPendingRef.current = true;
    setIsActionPending(true);
    setErrorMessage("");
    setActionSuccessMessage("");

    try {
      const isExemptActive = hasValidTicket || isFeeExempt;
      const chosenMethod = isExemptActive ? "TICKET_EXEMPT" : paymentMethod;

      const result = await checkOutVehicle({
        sessionId:
          rawLookup?.open_session?.id || rawLookup?.open_session?.session_code,
        sessionCode: rawLookup?.open_session?.session_code,
        licensePlate: detectedPlate || matchedVehicle?.licensePlate,
        entryTimeRaw: rawLookup?.open_session?.entry_time,
        vehicleType: matchedVehicle?.vehicleType || "CAR",
        hasActiveTicket: hasValidTicket,
        isExempt: isFeeExempt,
        paymentMethod: chosenMethod,
        exitGate: DEFAULT_EXIT_GATE_ID,
      });

      // Cập nhật trạng thái kết thúc phiên đỗ
      setRawLookup((prev) => (prev ? { ...prev, open_session: null } : prev));
      setMatchedVehicle((prev) =>
        prev
          ? {
              ...prev,
              status: prev.ticket?.status === "active" ? "active" : "left",
              statusDisplay: prev.ticket?.status === "active" ? "Đang hoạt động" : "Đã rời bãi",
            }
          : prev
      );

      setBarrierState("opening");
      if (barrierTimerRef.current) clearTimeout(barrierTimerRef.current);
      barrierTimerRef.current = setTimeout(() => {
        setBarrierState("opened");
      }, BARRIER_OPEN_DELAY_MS);

      if (result?.alreadyClosed) {
        setActionSuccessMessage(
          `✓ Phiên đỗ xe này đã được kết thúc trước đó trong hệ thống. Đã đồng bộ trạng thái phương tiện đã ra bãi và mở thanh chắn!`,
        );
      } else {
        const methodLabel = isExemptActive
          ? "Miễn cước"
          : paymentMethod === "VIETQR"
          ? "VietQR"
          : "Tiền mặt";
        setActionSuccessMessage(
          `✓ Đã xác nhận thanh toán (${exitFeeCalc.feeFormatted} - ${methodLabel}) & kết thúc phiên gửi xe. Mở thanh chắn cho xe ra bãi!`,
        );
      }
    } catch (err) {
      const errMsg = err?.data?.message || err?.message || "";
      const errCode = err?.data?.code || err?.code || "";
      if (
        errCode === "PROP-4.5.1-P10" ||
        errMsg.includes("đã được kết thúc trước đó") ||
        errMsg.includes("Không tìm thấy dữ liệu trùng khớp")
      ) {
        setRawLookup((prev) => (prev ? { ...prev, open_session: null } : prev));
        setMatchedVehicle((prev) =>
          prev
            ? {
                ...prev,
                status: prev.ticket?.status === "active" ? "active" : "left",
                statusDisplay: prev.ticket?.status === "active" ? "Đang hoạt động" : "Đã rời bãi",
              }
            : prev
        );
        setBarrierState("opening");
        if (barrierTimerRef.current) clearTimeout(barrierTimerRef.current);
        barrierTimerRef.current = setTimeout(() => {
          setBarrierState("opened");
        }, BARRIER_OPEN_DELAY_MS);
        setActionSuccessMessage(
          `✓ Phiên đỗ xe này đã được kết thúc trước đó trong hệ thống. Đã đồng bộ trạng thái phương tiện đã ra bãi và mở thanh chắn!`,
        );
      } else {
        setErrorMessage(
          errMsg || "Không thể thực hiện check-out phương tiện. Vui lòng thử lại.",
        );
      }
    } finally {
      actionPendingRef.current = false;
      setIsActionPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Kiểm Soát Xe Ra / Vào & Quét Biển Số
              </h3>
              <p className="text-2xs text-slate-500">
                Quy trình Check-in / Check-out, đối soát danh sách đen & thanh
                toán mở barrier
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Mode Selector Tabs */}
          <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setLaneMode("auto");
                setActionSuccessMessage("");
                setBarrierState("closed");
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all text-center ${
                laneMode === "auto"
                  ? "bg-white text-blue-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🔄 Tự động nhận diện (
              {effectiveMode === "entry" ? "Xe Vào" : "Xe Ra"})
            </button>
            <button
              type="button"
              onClick={() => {
                setLaneMode("entry");
                setActionSuccessMessage("");
                setBarrierState("closed");
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all text-center ${
                laneMode === "entry"
                  ? "bg-emerald-600 text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🚗 Làn Vào (Check-in)
            </button>
            <button
              type="button"
              onClick={() => {
                setLaneMode("exit");
                setActionSuccessMessage("");
                setBarrierState("closed");
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all text-center ${
                laneMode === "exit"
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🚙 Làn Ra (Check-out)
            </button>
          </div>

          {/* Upload and Camera Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input file upload / preview */}
            <div className="border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
              {selectedImage ? (
                <div className="relative w-full h-40 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={selectedImage}
                    alt="Plate Scan Preview"
                    className="max-h-full max-w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleReset}
                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white p-1 rounded-md text-2xs"
                    title="Xóa ảnh"
                  >
                    Đổi ảnh
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-40 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 p-4 text-center"
                >
                  <svg
                    className="w-8 h-8 text-slate-400 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="font-semibold text-slate-700">
                    Tải ảnh camera cổng
                  </span>
                  <span className="text-slate-400 text-2xs mt-0.5">
                    Nhấp để chọn ảnh JPG, PNG
                  </span>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            {/* License plate recognition panel */}
            <div className="flex flex-col justify-between border border-slate-200 rounded-xl p-3.5 bg-white">
              <form onSubmit={handleManualSearch} className="space-y-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Biển số nhận diện được
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={detectedPlate}
                      onChange={(e) =>
                        setDetectedPlate(e.target.value.toUpperCase())
                      }
                      placeholder="VD: 43A-123.45"
                      className="flex-1 font-mono uppercase font-bold text-slate-800 tracking-wider px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={isScanning || !detectedPlate}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
                    >
                      {isScanning ? "Đang tra..." : "Tra cứu"}
                    </button>
                  </div>
                </div>

                {/* AI Confidence badge */}
                {scanDetails && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between text-2xs text-slate-600">
                    <span>Độ tin cậy AI:</span>
                    <span className="font-semibold text-emerald-700">
                      {scanDetails.confidence !== null &&
                      scanDetails.confidence !== undefined
                        ? (() => {
                            const num = Number(scanDetails.confidence);
                            if (Number.isNaN(num)) return "Khớp mẫu chuẩn";
                            const val = num <= 1.0 ? num * 100 : num;
                            return `${Math.round(val * 10) / 10}%`;
                          })()
                        : "Khớp mẫu chuẩn"}
                    </span>
                  </div>
                )}
              </form>

              {/* Barrier Status Widget */}
              <div className="mt-3 p-2.5 rounded-lg border flex items-center justify-between bg-slate-50 border-slate-200">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      barrierState === "opened"
                        ? "bg-emerald-500 animate-ping"
                        : barrierState === "opening"
                          ? "bg-amber-500 animate-pulse"
                          : "bg-slate-400"
                    }`}
                  />
                  <span className="font-medium text-slate-700">
                    Thanh chắn (Barrier):
                  </span>
                </div>
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-2xs ${
                    barrierState === "opened"
                      ? "bg-emerald-100 text-emerald-800"
                      : barrierState === "opening"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {barrierState === "opened"
                    ? "ĐÃ MỞ - MỜI XE QUA"
                    : barrierState === "opening"
                      ? "ĐANG NÂNG CẦN..."
                      : "ĐANG ĐÓNG"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Success Alert */}
          {actionSuccessMessage && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 flex items-center gap-2 animate-in fade-in duration-150">
              <span className="text-base">🎉</span>
              <span className="font-semibold">{actionSuccessMessage}</span>
            </div>
          )}

          {/* Action / Workflow Error Alert */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-300 text-rose-800 flex items-start justify-between gap-3 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <span className="text-lg leading-none mt-0.5">⚠️</span>
                <div>
                  <p className="font-semibold text-rose-900">Không thể hoàn tất thao tác:</p>
                  <p className="text-rose-700 text-xs mt-0.5 whitespace-pre-line">{errorMessage}</p>
                </div>
              </div>
              {(errorMessage.includes("phiên gửi đang mở") || errorMessage.includes("Làn Ra")) && (
                <button
                  type="button"
                  onClick={() => {
                    setLaneMode("exit");
                    setErrorMessage("");
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs whitespace-nowrap shadow-xs transition-colors shrink-0"
                >
                  👉 Sang Làn Ra (Check-out)
                </button>
              )}
            </div>
          )}

          {/* Security Alert: Blacklist Warning */}
          {isBlacklisted && (
            <div className="p-3.5 bg-rose-50 rounded-xl border-2 border-rose-400 text-rose-900 flex items-start gap-2.5 animate-bounce">
              <span className="text-xl">⛔</span>
              <div>
                <p className="font-bold text-rose-900 uppercase tracking-wide">
                  CẢNH BÁO: BIỂN SỐ NẰM TRONG DANH SÁCH ĐEN (BLACKLIST)!
                </p>
                <p className="text-rose-700 text-2xs mt-0.5">
                  Phương tiện bị hạn chế hoặc có báo cáo vi phạm an ninh. Không
                  được mở thanh chắn cho vào bãi!
                </p>
              </div>
            </div>
          )}

          {/* Vehicle & Session Details Card */}
          {searchStatus === "matched" && matchedVehicle && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold bg-white px-2.5 py-1 rounded border border-slate-300 shadow-2xs">
                    {matchedVehicle.licensePlate}
                  </span>
                  <span className="text-slate-600 font-semibold">
                    {matchedVehicle.model}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                    effectiveMode === "entry"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {effectiveMode === "entry"
                    ? "Quy trình Vào (08:00)"
                    : "Quy trình Ra (10:30)"}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-2xs">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block">Chủ phương tiện</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {matchedVehicle.customer?.name || "Vãng lai"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block">Số điện thoại</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {matchedVehicle.customer?.phone || "—"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block">Loại vé</span>
                  <span className="font-semibold text-blue-700 text-xs">
                    {matchedVehicle.ticket?.type || "Vé lượt"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Vị trí đỗ</span>
                  {effectiveMode === "entry" && !matchedVehicle.parkingSlot?.slotId && availableSlots.length > 0 ? (
                    <select
                      value={selectedSlotId || availableSlots[0]?.id || ""}
                      onChange={(e) => setSelectedSlotId(Number(e.target.value))}
                      className="w-full text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1 py-0.5 focus:outline-emerald-500 cursor-pointer"
                    >
                      {availableSlots.slice(0, 24).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.display}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-semibold text-emerald-700 text-xs">
                      {availableSlots.find((s) => s.id === Number(selectedSlotId))?.display ||
                        matchedVehicle.parkingSlot?.display ||
                        availableSlots[0]?.display ||
                        "Khu A · Tầng B1 · Slot A-01"}
                    </span>
                  )}
                </div>
              </div>

              {/* Mode Specific Workflow Content */}
              {effectiveMode === "entry" ? (
                /* ENTRY WORKFLOW BOX */
                <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between text-2xs text-slate-600">
                    <span>Thời gian xe vào:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {new Date().toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-2xs text-slate-600">
                    <span>Phân bổ ô đỗ:</span>
                    <span className="font-semibold text-emerald-600">
                      ✓ Đã xếp:{" "}
                      {availableSlots.find((s) => s.id === Number(selectedSlotId))?.display ||
                        matchedVehicle.parkingSlot?.display ||
                        availableSlots[0]?.display ||
                        "Khu A · Tầng B1 · Slot A-01"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-2xs text-slate-600">
                    <span>Điều kiện mở barrier:</span>
                    <span className="font-semibold text-slate-900">
                      {entryValidation.eligible
                        ? "✓ Đủ điều kiện vào"
                        : "⚠️ Cần kiểm tra"}
                    </span>
                  </div>

                  {/* Cảnh báo & Tùy chọn giải quyết khi xe đang có phiên gửi cũ chưa đóng */}
                  {hasOpenSession && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-2xs space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold block">
                            ⚠️ Phát hiện xe đang có phiên gửi cũ chưa đóng ({rawLookup?.open_session?.session_code || `#${rawLookup?.open_session?.id || ""}`}):
                          </span>
                          <span className="text-amber-800">
                            {rawLookup?.open_session?.entry_time
                              ? `Thời gian vào trước đó: ${new Date(rawLookup.open_session.entry_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
                              : "Phiên đỗ đang mở chưa hoàn thành."}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={isActionPending}
                            onClick={handleForceCloseSession}
                            className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-400 text-amber-900 rounded-md font-semibold text-2xs transition-colors shadow-2xs"
                            title="Đóng phiên đỗ cũ và giải phóng ô đỗ ngay"
                          >
                            Đóng phiên cũ
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLaneMode("exit");
                              setErrorMessage("");
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-2xs transition-colors shadow-2xs"
                          >
                            👉 Sang Làn Ra
                          </button>
                        </div>
                      </div>
                      <p className="text-3xs text-amber-700 italic border-t border-amber-200/60 pt-1">
                        Mẹo: Bấm nút bên dưới để hệ thống tự động kết thúc phiên cũ bị treo và ghi nhận lượt xe mới vào bãi.
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-2xs text-slate-500">
                      {hasOpenSession
                        ? "Sẵn sàng đón xe vào lượt mới"
                        : "Xác nhận mở barrier cho xe vào"}
                    </span>
                    <button
                      type="button"
                      disabled={isActionPending || isBlacklisted}
                      onClick={handleConfirmEntry}
                      className={`px-4 py-2 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 transition-colors ${
                        hasOpenSession
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      } disabled:opacity-50`}
                    >
                      <span>
                        {isActionPending
                          ? "Đang xử lý..."
                          : hasOpenSession
                            ? "⚡ Đóng phiên cũ & Check-in Vào bãi"
                            : "✓ Xác nhận Xe Vào & Mở Barrier"}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                /* EXIT WORKFLOW BOX */
                <div className="bg-white p-3 rounded-lg border border-blue-200 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-2xs bg-slate-50 p-2 rounded-md">
                    <div>
                      <span className="text-slate-400 block">
                        Thời gian vào
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {rawLookup?.open_session?.entry_time
                          ? new Date(rawLookup.open_session.entry_time).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "08:00"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Thời gian ra</span>
                      <span className="font-mono font-bold text-slate-800">
                        {new Date().toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        (Hiện tại)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">
                        Thời lượng đỗ
                      </span>
                      <span className="font-bold text-blue-700">
                        {Math.floor(calculatedDurationMinutes / 60) > 0
                          ? `${Math.floor(calculatedDurationMinutes / 60)} giờ ${calculatedDurationMinutes % 60} phút`
                          : `${calculatedDurationMinutes % 60} phút`}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-md bg-blue-50/60 border border-blue-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-slate-700 block text-2xs font-semibold">
                          Số tiền cần thanh toán
                        </span>
                        <span className="text-2xs text-slate-500">
                          {exitFeeCalc.calculationBreakdown}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-blue-700 font-mono">
                        {exitFeeCalc.feeFormatted}
                      </span>
                    </div>

                    <label className="flex items-center gap-1.5 pt-1.5 border-t border-blue-100/60 cursor-pointer select-none text-2xs text-slate-500 hover:text-slate-800">
                      <input
                        type="checkbox"
                        checked={isFeeExempt}
                        onChange={(e) => setIsFeeExempt(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>Miễn cước đặc cách (Sự cố camera / Xe vé tháng chưa cập nhật trên hệ thống)</span>
                    </label>
                  </div>

                  {exitFeeCalc.feeAmount > 0 && (
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-2xs font-medium text-slate-600">Phương thức thanh toán:</span>
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("CASH")}
                            className={`px-3 py-1 text-2xs font-semibold rounded-md transition-all ${
                              paymentMethod === "CASH"
                                ? "bg-white text-blue-700 shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            💵 Tiền mặt
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("VIETQR")}
                            className={`px-3 py-1 text-2xs font-semibold rounded-md transition-all ${
                              paymentMethod === "VIETQR"
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            📱 VietQR Napas 247
                          </button>
                        </div>
                      </div>

                      {paymentMethod === "VIETQR" && (
                        <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg flex items-center gap-3.5 animate-in fade-in duration-150">
                          <img
                            src={`https://img.vietqr.io/image/970422-0987654321-compact2.png?amount=${exitFeeCalc.feeAmount}&addInfo=${encodeURIComponent(`PK ${detectedPlate || matchedVehicle?.licensePlate || "OTO"}`)}&accountName=${encodeURIComponent("BAI XE SMART MOBILITY")}`}
                            alt="Mã VietQR thanh toán đỗ xe"
                            className="w-24 h-24 object-contain rounded-md bg-white border border-indigo-200 shadow-xs shrink-0"
                            loading="lazy"
                          />
                          <div className="text-2xs text-slate-600 space-y-1">
                            <div className="font-bold text-indigo-900 text-xs">
                              Mã QR Chuyển khoản (Napas 247)
                            </div>
                            <div>
                              Số tiền:{" "}
                              <span className="font-bold font-mono text-indigo-700 text-xs">
                                {exitFeeCalc.feeFormatted}
                              </span>
                            </div>
                            <div>
                              Nội dung:{" "}
                              <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-900">
                                PK {detectedPlate || matchedVehicle?.licensePlate || "OTO"}
                              </span>
                            </div>
                            <div className="text-slate-400">
                              Tài xế quét qua app ngân hàng hoặc ví MoMo, ZaloPay
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-2xs text-slate-500">
                      {exitFeeCalc.feeAmount === 0 ? (
                        <span className="text-emerald-600 font-semibold">✓ Đủ điều kiện miễn phí</span>
                      ) : paymentMethod === "VIETQR" ? (
                        <span className="text-indigo-600 font-semibold">Thanh toán qua VietQR</span>
                      ) : (
                        <span>Thu tiền mặt tại bốt kiểm soát</span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isActionPending}
                      onClick={handleConfirmExit}
                      className={`px-4 py-2 disabled:opacity-50 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 ${
                        exitFeeCalc.feeAmount === 0
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : paymentMethod === "VIETQR"
                          ? "bg-indigo-600 hover:bg-indigo-700"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      <span>
                        {isActionPending
                          ? "Đang xử lý..."
                          : exitFeeCalc.feeAmount === 0
                          ? "✓ Xác nhận Miễn Phí & Mở Barrier"
                          : paymentMethod === "VIETQR"
                          ? `✓ Đã Nhận VietQR (${exitFeeCalc.feeFormatted}) & Mở Barrier`
                          : `✓ Xác nhận Thu Tiền Mặt (${exitFeeCalc.feeFormatted}) & Mở Barrier`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {searchStatus === "not_found" && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
              <p className="font-semibold">
                Phương tiện chưa đăng ký trong danh bạ!
              </p>
              <p className="text-amber-700 mt-1">
                Biển số{" "}
                <span className="font-mono font-bold">{detectedPlate}</span> có
                thể là xe vãng lai gửi theo lượt. Hệ thống vẫn cho phép tạo
                phiên gửi lượt mới.
              </p>
            </div>
          )}

          {searchStatus === "error" && errorMessage && !matchedVehicle && (
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <svg
                className="w-5 h-5 text-rose-500 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="font-semibold text-rose-900">
                  Không thể thực hiện quét / đối soát:
                </p>
                <p className="text-rose-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Đóng
          </button>
          {matchedVehicle && (
            <button
              type="button"
              onClick={handleApplySelection}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <span>Xem hồ sơ chi tiết</span>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

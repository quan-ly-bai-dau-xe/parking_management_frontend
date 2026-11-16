import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { scanPlateImage } from "../../services/plateScanService";
import {
  validateVehicleEntry,
  calculateParkingFee,
  checkInVehicle,
  checkOutVehicle,
  forceCloseSessionAndReleaseSlot,
  getAvailableSlotsForCheckIn,
} from "../../services/parkingSessionService";
import { usePlateAutoDetect } from "../../hooks/usePlateAutoDetect";
import { usePlateMatching } from "./scanPlate/hooks/usePlateMatching";
import { parseEntryTimeToDate, normalizePlate } from "../../utils/parking/plateScanMapper";
import { getEntryErrorMessage } from "../../utils/parking/gateErrorMapper";

import ScanPlateCameraFeed from "./scanPlate/ScanPlateCameraFeed";
import ScanPlateImageUpload from "./scanPlate/ScanPlateImageUpload";
import EntryLanePanel from "./scanPlate/EntryLanePanel";
import ExitLanePanel from "./scanPlate/ExitLanePanel";
import CloseSessionSafetyModal from "./scanPlate/CloseSessionSafetyModal";

const DEFAULT_ENTRY_GATE_ID = 1;
const DEFAULT_EXIT_GATE_ID = 3;
const BARRIER_OPEN_DELAY_MS = 600;
const SEARCH_DEBOUNCE_MS = 450;
const MIN_SEARCH_PLATE_LENGTH = 6;

const captureVideoSnapshot = (videoEl) => {
  if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return null;
  }
};

/**
 * ScanPlateModal
 * Màn hình Kiểm soát trạm xe: 1 Bên Camera live stream - 1 Bên Làn Vào / Làn Ra
 */
export default function ScanPlateModal({
  isOpen,
  onClose,
  vehicles = [],
  onVehicleMatched,
  onCheckInSuccess,
}) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const actionPendingRef = useRef(false);
  const barrierTimerRef = useRef(null);

  const [scanSourceMode, setScanSourceMode] = useState("camera"); // 'camera' | 'image'

  const {
    detectedPlate,
    setDetectedPlate,
    matchedVehicle,
    setMatchedVehicle,
    scanDetails,
    setScanDetails,
    isScanning,
    searchStatus,
    errorMessage,
    setErrorMessage,
    rawLookup,
    setRawLookup,
    handleMatchPlate,
    handleImageScanned,
    resetMatching,
  } = usePlateMatching({
    vehicles,
    onResetBarrier: () => {
      setActionSuccessMessage("");
      setBarrierState("closed");
    },
  });

  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);

  // 2 chế độ rõ ràng: 'entry' | 'exit'
  const [laneMode, setLaneMode] = useState("entry");
  const [barrierState, setBarrierState] = useState("closed");

  const [isActionPending, setIsActionPending] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [isFeeExempt, setIsFeeExempt] = useState(false);

  const activeGateId = laneMode === "entry" ? DEFAULT_ENTRY_GATE_ID : DEFAULT_EXIT_GATE_ID;

  // Tích hợp usePlateAutoDetect để lấy stream camera thực tế
  const {
    scanState,
    cameraError,
    videoDevices,
    selectedDeviceId,
    changeCamera,
    statusMessage,
    detectedData,
    rawBoundingBox,
    sourceDimensions,
    resetDetection,
  } = usePlateAutoDetect({
    isOpen,
    videoRef,
    gateId: activeGateId,
  });

  useEffect(() => {
    return () => {
      if (barrierTimerRef.current) {
        clearTimeout(barrierTimerRef.current);
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

  // Lắng nghe camera tự động nhận diện biển số
  useEffect(() => {
    const plate = detectedData?.plate_final;
    if (plate && plate !== detectedPlate && scanSourceMode === "camera") {
      setDetectedPlate(plate);
      handleMatchPlate(plate);
      const conf =
        detectedData?.confidence ??
        detectedData?.best_candidate?.confidence ??
        null;
      setScanDetails({
        confidence: conf,
        plate,
        source: "camera",
        imageUrl: detectedData?.image_url || detectedData?.plate_image_url || null,
      });
    }
  }, [detectedData, detectedPlate, handleMatchPlate, scanSourceMode, setDetectedPlate, setScanDetails]);

  // Tự động tìm kiếm biển số khi người dùng nhập tay (Debounce Search)
  const lastAutoSearchedPlateRef = useRef("");

  useEffect(() => {
    if (!isOpen) {
      lastAutoSearchedPlateRef.current = "";
      return;
    }

    const cleanInput = (detectedPlate || "").trim();
    const normalizedInput = normalizePlate(cleanInput);

    if (normalizedInput.length >= MIN_SEARCH_PLATE_LENGTH) {
      if (normalizedInput === lastAutoSearchedPlateRef.current) return;

      const timer = setTimeout(() => {
        lastAutoSearchedPlateRef.current = normalizedInput;
        handleMatchPlate(cleanInput);
      }, SEARCH_DEBOUNCE_MS);

      return () => clearTimeout(timer);
    }
  }, [isOpen, detectedPlate, handleMatchPlate]);

  const handleManualSearch = (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    if (!detectedPlate) return;
    const cleanInput = detectedPlate.trim();
    lastAutoSearchedPlateRef.current = normalizePlate(cleanInput);
    handleMatchPlate(cleanInput);
  };

  const handleReset = () => {
    lastAutoSearchedPlateRef.current = "";
    resetMatching();
    setActionSuccessMessage("");
    setBarrierState("closed");
    resetDetection();
  };

  const handleApplySelection = () => {
    if (matchedVehicle && onVehicleMatched) {
      onVehicleMatched(matchedVehicle);
    }
    onClose();
  };

  const hasOpenSession = Boolean(rawLookup?.open_session);
  const entryValidation = validateVehicleEntry({
    vehicle: matchedVehicle,
    lookupResult: rawLookup,
  });
  const isBlacklisted = Boolean(
    rawLookup?.is_blacklisted ||
      rawLookup?.status === "BLACKLISTED" ||
      matchedVehicle?.isBlacklisted ||
      matchedVehicle?.status === "BLACKLISTED" ||
      entryValidation.reasonCode === "BLACKLISTED" ||
      (!entryValidation.eligible && entryValidation.reasonCode === "BLACKLISTED")
  );
  const hasValidTicket = Boolean(
    matchedVehicle?.ticketState === "active" ||
      matchedVehicle?.ticket?.is_valid ||
      rawLookup?.active_ticket
  );

  const rawEntryTime = rawLookup?.open_session?.entry_time;
  const calculatedDurationMinutes = (() => {
    if (!rawEntryTime) return 0;
    const entryDate = parseEntryTimeToDate(rawEntryTime);
    if (!entryDate) return 0;
    const diffMs = Date.now() - entryDate.getTime();
    return Math.max(1, Math.floor(diffMs / 60000));
  })();

  const exitFeeCalc = calculateParkingFee({
    vehicleType: matchedVehicle?.vehicleType || "CAR",
    durationMinutes: calculatedDurationMinutes,
    hasActiveTicket: hasValidTicket,
    hasValidTicket,
    isExempt: isFeeExempt,
  });

  const handleOpenSafetyModal = () => {
    setIsSafetyModalOpen(true);
  };

  const handleConfirmCloseSafety = async (options = {}) => {
    const licensePlate = options.licensePlate || detectedPlate || matchedVehicle?.licensePlate;
    if (!licensePlate || actionPendingRef.current) return;

    actionPendingRef.current = true;
    setIsActionPending(true);
    setErrorMessage("");

    try {
      const isGlitch = options.actionType === "cancel_glitch";
      const notes = isGlitch
        ? `Hủy phiên do quét sai/nhầm: ${options.reason || "Ngoại lệ"}`
        : options.reason || "Đóng phiên cũ có thu tiền tại làn kiểm soát";

      await forceCloseSessionAndReleaseSlot({
        licensePlate,
        sessionCode: options.sessionCode,
        notes,
      });
      setRawLookup((prev) => (prev ? { ...prev, open_session: null } : null));
      setIsSafetyModalOpen(false);
      setActionSuccessMessage(
        isGlitch
          ? "✓ Đã hủy phiên cũ do quét nhầm thành công (0đ)."
          : "✓ Đã thu tiền & đóng phiên cũ thành công. Sẵn sàng đón lượt mới!"
      );
    } catch (err) {
      setErrorMessage(err?.data?.message || err?.message || "Không thể cưỡng chế đóng phiên.");
    } finally {
      actionPendingRef.current = false;
      setIsActionPending(false);
    }
  };

  const handleConfirmEntry = async () => {
    if (actionPendingRef.current) return;
    if (hasOpenSession) {
      setErrorMessage("⛔ Xe đang có phiên gửi cũ chưa đóng. Vui lòng đối soát và đóng phiên cũ trước.");
      return;
    }

    actionPendingRef.current = true;
    setIsActionPending(true);
    setErrorMessage("");
    setActionSuccessMessage("");

    try {
      const chosenSlot = availableSlots.find((s) => s.id === selectedSlotId);
      const targetSlotId = chosenSlot?.id ?? 1;

      const entryImageUrl =
        scanDetails?.imageUrl ||
        matchedVehicle?.imageUrl ||
        detectedData?.image_url ||
        detectedData?.plate_image_url ||
        (videoRef?.current ? captureVideoSnapshot(videoRef.current) : null);

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

      if (onCheckInSuccess) {
        onCheckInSuccess(checkInResult);
      }

      setBarrierState("opening");
      if (barrierTimerRef.current) clearTimeout(barrierTimerRef.current);
      barrierTimerRef.current = setTimeout(() => {
        setBarrierState("opened");
      }, BARRIER_OPEN_DELAY_MS);

      setActionSuccessMessage(
        `✓ Đã Check-in thành công! Mở barrier mời xe vào ô ${chosenSlot ? chosenSlot.code : "A-01"}.`
      );
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
    setActionSuccessMessage("");

    try {
      const isExemptActive = hasValidTicket || isFeeExempt;
      const chosenMethod = isExemptActive ? "TICKET_EXEMPT" : paymentMethod;

      await checkOutVehicle({
        licensePlate: detectedPlate || matchedVehicle?.licensePlate,
        exitGateId: DEFAULT_EXIT_GATE_ID,
        paymentMethod: chosenMethod,
        feePaid: isExemptActive ? 0 : exitFeeCalc.feeAmount,
      });

      setBarrierState("opening");
      if (barrierTimerRef.current) clearTimeout(barrierTimerRef.current);
      barrierTimerRef.current = setTimeout(() => {
        setBarrierState("opened");
      }, BARRIER_OPEN_DELAY_MS);

      setActionSuccessMessage(
        `✓ Check-out hoàn tất (${exitFeeCalc.feeFormatted})! Mở barrier mời xe ra bãi.`
      );
    } catch (err) {
      setErrorMessage(err?.data?.message || err?.message || "Không thể thực hiện Check-out xe.");
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
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              📷
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Kiểm Soát Cổng Ra / Vào & Camera Biển Số
              </h3>
              <p className="text-3xs text-slate-500">
                Camera nhận diện trực tiếp • Làn Vào (Check-in) & Làn Ra (Check-out)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bộ chọn 2 làn rõ ràng: Làn Vào & Làn Ra */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setLaneMode("entry");
                  setErrorMessage("");
                  setActionSuccessMessage("");
                  setBarrierState("closed");
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
                  setActionSuccessMessage("");
                  setBarrierState("closed");
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
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <input
              type="text"
              value={detectedPlate}
              onChange={(e) => setDetectedPlate(e.target.value.toUpperCase())}
              placeholder="Nhập hoặc quét biển số (VD: 43A-123.45)..."
              className="flex-1 font-mono uppercase font-bold text-slate-800 tracking-wider px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
            <button
              type="submit"
              disabled={isScanning || !detectedPlate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs rounded-xl font-semibold transition-colors"
            >
              {isScanning ? "Đang tra..." : "Tra cứu"}
            </button>
          </form>

          {/* Success / Error Alerts */}
          {actionSuccessMessage && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span>🎉</span>
                <span className="font-semibold">{actionSuccessMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const plateParam = detectedPlate || matchedVehicle?.licensePlate || "";
                  navigate(`/history?license_plate=${encodeURIComponent(plateParam)}`);
                  onClose();
                }}
                className="px-2.5 py-1 text-2xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition shrink-0 cursor-pointer"
              >
                Xem lịch sử đối soát →
              </button>
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
                  }}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-3xs font-semibold"
                >
                  👉 Chuyển sang Làn Ra
                </button>
              )}
            </div>
          )}

          {/* Layout chính: Bên trái Camera / Upload ảnh (50%) - Bên phải Làn Vào/Ra (50%) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {/* Cột trái: Quét Camera hoặc Tải ảnh từ file */}
            <div className="h-full flex flex-col space-y-2">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setScanSourceMode("camera")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-2xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    scanSourceMode === "camera"
                      ? "bg-white text-slate-800 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>📷</span>
                  <span>Quét Camera trực tiếp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScanSourceMode("image")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-2xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    scanSourceMode === "image"
                      ? "bg-white text-slate-800 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>🖼️</span>
                  <span>Tải ảnh từ file</span>
                </button>
              </div>

              {scanSourceMode === "camera" ? (
                <ScanPlateCameraFeed
                  videoRef={videoRef}
                  videoDevices={videoDevices}
                  selectedDeviceId={selectedDeviceId}
                  onChangeCamera={changeCamera}
                  cameraError={cameraError}
                  rawBoundingBox={rawBoundingBox}
                  sourceDimensions={sourceDimensions}
                  statusMessage={statusMessage}
                  isScanning={isScanning}
                  detectedPlate={detectedPlate}
                  barrierState={barrierState}
                  onReset={handleReset}
                />
              ) : (
                <ScanPlateImageUpload
                  gateId={activeGateId}
                  onImageScanned={handleImageScanned}
                  disabled={isActionPending}
                />
              )}
            </div>

            {/* Cột phải: Panel Làn Vào hoặc Làn Ra */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between h-full shadow-2xs">
              {laneMode === "entry" ? (
                <EntryLanePanel
                  detectedPlate={detectedPlate}
                  setDetectedPlate={setDetectedPlate}
                  matchedVehicle={matchedVehicle}
                  rawLookup={rawLookup}
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
                  onForceCloseSession={handleOpenSafetyModal}
                  onSwitchToExit={() => setLaneMode("exit")}
                />
              ) : (
                <ExitLanePanel
                  detectedPlate={detectedPlate}
                  matchedVehicle={matchedVehicle}
                  rawLookup={rawLookup}
                  scanDetails={scanDetails}
                  hasValidTicket={hasValidTicket}
                  exitFeeCalc={exitFeeCalc}
                  calculatedDurationMinutes={calculatedDurationMinutes}
                  isFeeExempt={isFeeExempt}
                  setIsFeeExempt={setIsFeeExempt}
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
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
          <div className="flex items-center gap-2">
            {(detectedPlate || matchedVehicle) && (
              <button
                type="button"
                onClick={() => {
                  const plateParam = detectedPlate || matchedVehicle?.licensePlate || "";
                  navigate(`/history?license_plate=${encodeURIComponent(plateParam)}`);
                  onClose();
                }}
                className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer"
              >
                Xem lịch sử đối soát →
              </button>
            )}
            {matchedVehicle && (
              <button
                type="button"
                onClick={handleApplySelection}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition cursor-pointer"
              >
                Xem hồ sơ chi tiết phương tiện →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal bảo vệ đối soát an toàn phiên gửi cũ */}
      <CloseSessionSafetyModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
        licensePlate={detectedPlate || matchedVehicle?.licensePlate}
        openSession={rawLookup?.open_session}
        onConfirmClose={handleConfirmCloseSafety}
        isLoading={isActionPending}
      />
    </div>
  );
}

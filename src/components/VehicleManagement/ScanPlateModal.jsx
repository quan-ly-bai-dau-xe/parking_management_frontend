import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  scanPlateImage,
  lookupVehicleByPlate,
  getParkingSessions,
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
import { usePlateAutoDetect } from "../../hooks/usePlateAutoDetect";

import ScanPlateCameraFeed from "./scanPlate/ScanPlateCameraFeed";
import ScanPlateImageUpload from "./scanPlate/ScanPlateImageUpload";
import EntryLanePanel from "./scanPlate/EntryLanePanel";
import ExitLanePanel from "./scanPlate/ExitLanePanel";

const DEFAULT_ENTRY_GATE_ID = 1;
const DEFAULT_EXIT_GATE_ID = 3;
const BARRIER_OPEN_DELAY_MS = 600;

const getEntryErrorMessage = (err) => {
  const backendMsg = err?.data?.message || err?.message;
  const errorCode = err?.data?.code;

  if (errorCode === "MSG-4.5.2-M02" || backendMsg?.includes("đã có xe đk vé")) {
    return (
      "⚠️ Vị trí đỗ này đã có xe đăng ký vé và đang sử dụng. " +
      "Hệ thống đã tự động chọn ô trống khả dụng khác, vui lòng kiểm tra và xác nhận lại."
    );
  }
  if (errorCode === "PROP-4.5.2-P01" || backendMsg?.includes("đang bảo trì")) {
    return "⚠️ Vị trí đỗ này đang bảo trì, vui lòng chọn vị trí khác.";
  }
  if (errorCode === "PROP-4.5.1-P08") {
    return "⛔ Biển số xe nằm trong danh sách đen (Blacklist), không được phép vào bãi.";
  }
  if (errorCode === "MSG-4.5.1-M01" || backendMsg?.includes("hết hạn")) {
    return "⚠️ Vé đăng ký của xe đã hết hạn, hệ thống sẽ tự động chuyển sang chế độ tính vé lượt vãng lai.";
  }
  if (errorCode === "PROP-4.5.1-P05" || backendMsg?.includes("hết chỗ")) {
    return "⚠️ Bãi đỗ xe đã đầy chỗ cho loại phương tiện này. Vui lòng hướng dẫn xe quay đầu.";
  }
  if (errorCode === "PROP-4.5.1-P09" || backendMsg?.includes("đang có phiên")) {
    return "⚠️ Xe đang có phiên gửi chưa kết thúc. Vui lòng bấm nút 'Đóng phiên cũ' hoặc sang Làn Ra.";
  }
  return backendMsg || "Không thể thực hiện Check-in vào bãi. Vui lòng thử lại.";
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
  const [detectedPlate, setDetectedPlate] = useState("");
  const [matchedVehicle, setMatchedVehicle] = useState(null);
  const [scanDetails, setScanDetails] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [searchStatus, setSearchStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [rawLookup, setRawLookup] = useState(null);

  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

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

  const handleMatchPlate = useCallback(
    async (plateInput) => {
      const rawInput = (plateInput || "").trim();
      const norm = normalizePlate(rawInput);
      if (!norm) return;

      setIsScanning(true);
      setSearchStatus("idle");
      setErrorMessage("");
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
          setSearchStatus("matched");
        } else {
          const found = findInLocalList(norm);
          if (found) {
            setMatchedVehicle(found);
            setSearchStatus("matched");
          } else {
            setMatchedVehicle({
              id: "WALK_IN_" + Date.now(),
              licensePlate: rawInput.toUpperCase(),
              vehicleType: "CAR",
              model: "Khách vãng lai",
              status: "active",
              customer: { name: "Khách vãng lai (Vé lượt)" },
            });
            setSearchStatus("matched");
          }
        }
      } catch {
        const openSession = await resolveActiveSession(rawInput);
        setRawLookup(openSession ? { open_session: openSession } : null);

        const localFound = findInLocalList(norm);
        if (localFound) {
          setMatchedVehicle(localFound);
          setSearchStatus("matched");
        } else {
          setMatchedVehicle({
            id: "WALK_IN_" + Date.now(),
            licensePlate: rawInput.toUpperCase(),
            vehicleType: "CAR",
            model: "Khách vãng lai",
            status: "active",
            customer: { name: "Khách vãng lai (Vé lượt)" },
          });
          setSearchStatus("matched");
        }
      } finally {
        setIsScanning(false);
      }
    },
    [findInLocalList]
  );

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
  }, [detectedData, detectedPlate, handleMatchPlate, scanSourceMode]);

  // Xử lý kết quả quét từ ảnh tải lên
  const handleImageScanned = (scanResult, previewUrl) => {
    if (!scanResult) return;
    const extractedPlate =
      scanResult.plate_final ||
      scanResult.best_candidate?.plate_text ||
      scanResult.plate_raw ||
      scanResult.license_plate ||
      "";

    if (extractedPlate) {
      setDetectedPlate(extractedPlate);
      const conf =
        scanResult.best_candidate?.confidence ??
        scanResult.confidence ??
        null;
      setScanDetails({
        confidence: conf,
        plate: extractedPlate,
        imageUrl: scanResult.image_url || previewUrl,
        source: "image",
      });

      const mapped = mapPlateScanToVehicle(scanResult);
      if (mapped && mapped.isRecognized) {
        setMatchedVehicle(mapped);
        setSearchStatus("matched");
        setRawLookup(scanResult.vehicle_lookup || null);
      } else {
        handleMatchPlate(extractedPlate);
      }
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!detectedPlate) return;
    handleMatchPlate(detectedPlate);
  };

  const handleReset = () => {
    setDetectedPlate("");
    setMatchedVehicle(null);
    setScanDetails(null);
    setSearchStatus("idle");
    setErrorMessage("");
    setRawLookup(null);
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
                  onForceCloseSession={handleForceCloseSession}
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
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import {
  SCAN_STATES,
  extractScanConfidence,
  formatReviewReasons,
  scaleBoundingBox,
} from "../utils/plateAutoDetect";
import { usePlateAutoDetect } from "../hooks/usePlateAutoDetect";

export default function PlateScannerModal({
  isOpen,
  onClose,
  onDetected,
  gateId = null,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [layoutMetrics, setLayoutMetrics] = useState({
    width: 0,
    height: 0,
    fitMode: "cover",
  });
  const [userEditedPlate, setUserEditedPlate] = useState(null);
  const [prevDetectedPlate, setPrevDetectedPlate] = useState(null);
  const [applyError, setApplyError] = useState("");

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
    applyAuthoritativeScan,
  } = usePlateAutoDetect({
    isOpen,
    videoRef,
    gateId,
  });

  // Track video container box and computed CSS object-fit for accurate highlight scaling
  useEffect(() => {
    if (!isOpen || !containerRef.current) return undefined;

    const containerEl = containerRef.current;
    const updateMetrics = () => {
      let computedFit = "cover";
      if (videoRef.current && typeof window !== "undefined" && window.getComputedStyle) {
        const rawFit = window.getComputedStyle(videoRef.current).objectFit;
        if (rawFit === "contain" || rawFit === "cover") {
          computedFit = rawFit;
        }
      }
      setLayoutMetrics({
        width: containerEl.clientWidth,
        height: containerEl.clientHeight,
        fitMode: computedFit,
      });
    };

    updateMetrics();

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateMetrics);
      resizeObserver.observe(containerEl);
    }

    window.addEventListener("resize", updateMetrics);
    return () => {
      window.removeEventListener("resize", updateMetrics);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [isOpen]);

  // Reset manual edit buffer whenever a new preview/authoritative plate_final arrives
  const currentDetectedPlate = detectedData?.plate_final || null;
  if (currentDetectedPlate !== prevDetectedPlate) {
    setPrevDetectedPlate(currentDetectedPlate);
    setUserEditedPlate(null);
    if (!currentDetectedPlate) {
      setApplyError("");
    }
  }

  const effectivePlate =
    userEditedPlate !== null ? userEditedPlate : currentDetectedPlate || "";

  const scaledHighlightBox = useMemo(() => {
    if (!rawBoundingBox || layoutMetrics.width <= 0 || layoutMetrics.height <= 0) {
      return null;
    }
    return scaleBoundingBox({
      box: rawBoundingBox,
      sourceWidth: sourceDimensions.width || 1280,
      sourceHeight: sourceDimensions.height || 720,
      containerWidth: layoutMetrics.width,
      containerHeight: layoutMetrics.height,
      fitMode: layoutMetrics.fitMode,
    });
  }, [rawBoundingBox, layoutMetrics, sourceDimensions]);

  const handleClose = () => {
    setApplyError("");
    onClose();
  };

  const handleReset = () => {
    setApplyError("");
    setUserEditedPlate(null);
    setPrevDetectedPlate(null);
    resetDetection();
  };

  const handleApply = async () => {
    const plateToApply = effectivePlate.trim();
    if (!plateToApply) return;

    setApplyError("");
    const result = await applyAuthoritativeScan();
    if (result.aborted) return;

    if (result.success && result.data) {
      if (onDetected) {
        onDetected(plateToApply, result.data);
      }
      handleClose();
      return;
    }

    setApplyError(
      result.error || "Không thể lưu kết quả quét biển số lên hệ thống. Vui lòng thử lại."
    );
  };

  if (!isOpen) return null;

  const isResultVisible =
    (scanState === SCAN_STATES.DETECTED || scanState === SCAN_STATES.APPLYING) &&
    Boolean(detectedData);
  const isApplying = scanState === SCAN_STATES.APPLYING;
  const isReviewMode = detectedData?.review_status === "NEEDS_REVIEW";
  const reviewReasons = formatReviewReasons(detectedData?.review_reasons);
  const confidencePercent = extractScanConfidence(detectedData);
  const vehicleLookup = detectedData?.vehicle_lookup || null;
  const registeredVehicle = vehicleLookup?.vehicle || null;
  const registeredCustomer = vehicleLookup?.customer || null;
  const activeTicket = vehicleLookup?.active_ticket || null;
  const parkingPosition = vehicleLookup?.parking_position || null;
  const isBlacklisted = Boolean(
    detectedData?.is_blacklisted || vehicleLookup?.is_blacklisted
  );
  const openSession =
    detectedData?.open_session || vehicleLookup?.open_session || null;

  const formattedSessionCode = openSession
    ? openSession.session_code || `#${openSession.id}`
    : "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plate-scanner-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn font-sans"
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                scanState === SCAN_STATES.ERROR
                  ? "bg-rose-500"
                  : isResultVisible
                  ? "bg-emerald-500"
                  : "bg-blue-600 animate-pulse"
              }`}
            />
            <h3
              id="plate-scanner-modal-title"
              className="font-bold text-slate-900 text-sm sm:text-base truncate"
            >
              Quét biển số qua Camera Laptop
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {videoDevices.length > 1 && (
              <select
                aria-label="Chọn thiết bị camera"
                value={selectedDeviceId}
                onChange={(e) => changeCamera(e.target.value)}
                className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 max-w-48 truncate"
              >
                {videoDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-sm transition"
              aria-label="Đóng cửa sổ quét biển số"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Full-frame unmirrored video & live scaled bounding box */}
        <div
          ref={containerRef}
          data-testid="plate-camera-viewport"
          className="relative bg-slate-950 w-full aspect-video flex items-center justify-center overflow-hidden shrink-0 select-none"
        >
          {cameraError ? (
            <div
              role="alert"
              className="p-6 text-center text-rose-300 text-xs sm:text-sm max-w-md space-y-2"
            >
              <p className="font-semibold text-rose-200 text-sm">
                Không thể sử dụng tính năng quét camera
              </p>
              <p className="text-slate-300 text-xs leading-relaxed">
                {cameraError}
              </p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {scaledHighlightBox && (
                <div
                  data-testid="plate-highlight-box"
                  className="absolute border-2 border-emerald-400 bg-emerald-400/15 rounded-lg shadow-[0_0_16px_rgba(16,185,129,0.75)] pointer-events-none transition-all duration-100"
                  style={{
                    left: `${scaledHighlightBox.left}px`,
                    top: `${scaledHighlightBox.top}px`,
                    width: `${scaledHighlightBox.width}px`,
                    height: `${scaledHighlightBox.height}px`,
                  }}
                >
                  <span className="absolute -top-5 left-0 bg-emerald-600 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                    {detectedData?.plate_final || "Vùng biển số"}
                  </span>
                </div>
              )}

              <div className="absolute bottom-3 inset-x-4 flex justify-center pointer-events-none">
                <div
                  data-testid="plate-scan-status-pill"
                  className="bg-slate-900/80 backdrop-blur-md text-white text-xs px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow flex items-center gap-2"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isResultVisible
                        ? "bg-emerald-400"
                        : "bg-emerald-400 animate-ping"
                    }`}
                  />
                  <span>{statusMessage}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Result card & action footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 overflow-y-auto space-y-3.5">
          {applyError && (
            <div
              role="alert"
              data-testid="plate-apply-error"
              className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2"
            >
              <span className="font-bold text-rose-600 shrink-0">Lỗi:</span>
              <span>{applyError}</span>
            </div>
          )}

          {isResultVisible && detectedData ? (
            <div data-testid="plate-result-card" className="space-y-3">
              {/* Recognized plate + review status chip + confidence */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Biển số nhận diện được
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {isReviewMode ? (
                      <input
                        type="text"
                        aria-label="Chỉnh sửa biển số trước khi áp dụng"
                        value={effectivePlate}
                        onChange={(e) =>
                          setUserEditedPlate(e.target.value.toUpperCase())
                        }
                        className="font-mono text-xl font-extrabold text-blue-700 bg-amber-50/60 px-3 py-1 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                      />
                    ) : (
                      <span
                        data-testid="plate-final-value"
                        className="font-mono text-2xl font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200 tracking-wider"
                      >
                        {detectedData.plate_final}
                      </span>
                    )}

                    {isReviewMode ? (
                      <span
                        data-testid="plate-status-chip"
                        className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-300"
                      >
                        NEEDS_REVIEW — Cần kiểm tra
                      </span>
                    ) : (
                      <span
                        data-testid="plate-status-chip"
                        className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300"
                      >
                        AUTO — Tự động duyệt
                      </span>
                    )}
                  </div>

                  {isReviewMode && reviewReasons.length > 0 && (
                    <div className="mt-2 text-xs text-amber-800 flex flex-wrap gap-1.5 items-center">
                      <span className="font-semibold">Lý do cần kiểm tra:</span>
                      {reviewReasons.map((reason, idx) => (
                        <span
                          key={`${reason}-${idx}`}
                          className="bg-amber-100/80 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="sm:text-right sm:self-center">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                    Độ tin cậy OCR
                  </span>
                  <span className="text-sm font-bold text-slate-700 font-mono">
                    {confidencePercent !== null
                      ? `${confidencePercent.toFixed(1)}%`
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Red blacklist alert */}
              {isBlacklisted && (
                <div
                  role="alert"
                  data-testid="plate-blacklist-warning"
                  className="p-3 bg-rose-600 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs"
                >
                  <span>
                    CẢNH BÁO DANH SÁCH ĐEN: Biển số này đang nằm trong danh sách
                    cảnh báo hạn chế ra/vào bãi!
                  </span>
                </div>
              )}

              {/* Open session hint (means check-out) */}
              {openSession && (
                <div
                  data-testid="plate-open-session-hint"
                  className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-xl space-y-0.5"
                >
                  <p className="font-semibold">
                    Phiên đỗ đang mở ({formattedSessionCode}) — Gợi ý luồng trả
                    xe ra bãi (Check-out)
                  </p>
                  <p className="text-blue-700">
                    Cổng vào: {openSession.entry_gate_name || "Chưa ghi nhận"}
                  </p>
                </div>
              )}

              {/* Registered vehicle & owner details */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Thông tin phương tiện & chủ sở hữu
                </span>
                {registeredVehicle ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        Phương tiện đăng ký ({registeredVehicle.code})
                      </span>
                      <span className="font-semibold text-slate-800">
                        {[registeredVehicle.brand, registeredVehicle.model_name]
                          .filter(Boolean)
                          .join(" ") || "—"}
                        {" • "}
                        {[
                          registeredVehicle.vehicle_type,
                          registeredVehicle.color,
                        ]
                          .filter(Boolean)
                          .join(" / ") || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        Chủ sở hữu
                      </span>
                      <span className="font-semibold text-slate-800">
                        {registeredCustomer?.full_name || "—"}
                        {registeredCustomer?.phone
                          ? ` (${registeredCustomer.phone})`
                          : ""}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        Vé đăng ký
                      </span>
                      <span className="font-semibold text-emerald-700">
                        {activeTicket
                          ? `${activeTicket.ticket_type_name} (${activeTicket.code})`
                          : "Không có vé định kỳ hiệu lực"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        Vị trí đỗ
                      </span>
                      <span className="font-semibold text-slate-800">
                        {parkingPosition?.display_text || "Chưa gán ô cố định"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">
                    Phương tiện chưa đăng ký trong hệ thống (Khách vãng lai).
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-2 text-xs text-slate-500 flex items-center justify-center gap-2">
              {!cameraError && (
                <span className="inline-block w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              )}
              <span>
                {cameraError
                  ? "Đã dừng vòng lặp quét tự động."
                  : "Đưa biển số vào bất kỳ vùng nào của khung hình camera — hệ thống tự động nhận diện."}
              </span>
            </div>
          )}
        </div>

        {/* Pinned action buttons: only "Quét lại" and "Áp dụng" */}
        <div className="px-4 py-3 sm:px-5 bg-white border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            disabled={isApplying || Boolean(cameraError)}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 disabled:opacity-50 text-slate-700 text-xs font-semibold transition"
          >
            Quét lại
          </button>

          <button
            type="button"
            disabled={!isResultVisible || !effectivePlate.trim() || isApplying}
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
          >
            {isApplying ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang lưu kết quả…</span>
              </>
            ) : (
              "Áp dụng"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

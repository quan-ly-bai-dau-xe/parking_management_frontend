import { useEffect, useRef, useState } from "react";
import { scaleBoundingBox } from "../../../utils/plateAutoDetect";

/**
 * ScanPlateCameraFeed
 * Component hiển thị màn hình Camera soi biển số (Webcam/Live Stream):
 * - Hỗ trợ chọn thiết bị camera (nếu có nhiều webcam)
 * - Khung hình video live với Bounding box AI nhận diện biển số
 * - Widget trạng thái thanh chắn Barrier
 */
export default function ScanPlateCameraFeed({
  videoRef,
  videoDevices = [],
  selectedDeviceId,
  onChangeCamera,
  cameraError,
  rawBoundingBox,
  sourceDimensions,
  statusMessage,
  isScanning,
  detectedPlate,
  cameraPlate,
  barrierState,
  onReset,
  isManualLookup = false,
}) {
  const containerRef = useRef(null);
  const [layoutMetrics, setLayoutMetrics] = useState({
    width: 0,
    height: 0,
    fitMode: "cover",
  });

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const updateMetrics = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let computedFit = "cover";
      if (videoRef?.current && typeof window !== "undefined" && window.getComputedStyle) {
        const rawFit = window.getComputedStyle(videoRef.current).objectFit;
        if (rawFit === "contain" || rawFit === "cover") {
          computedFit = rawFit;
        }
      }
      setLayoutMetrics({
        width: rect.width,
        height: rect.height,
        fitMode: computedFit,
      });
    };

    updateMetrics();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateMetrics) : null;
    if (ro && containerRef.current) {
      ro.observe(containerRef.current);
    }
    window.addEventListener("resize", updateMetrics);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", updateMetrics);
    };
  }, [videoRef]);

  const scaledHighlightBox = (() => {
    if (isManualLookup || !rawBoundingBox || layoutMetrics.width <= 0 || layoutMetrics.height <= 0) {
      return null;
    }
    return scaleBoundingBox({
      box: rawBoundingBox,
      sourceWidth: sourceDimensions?.width || 1280,
      sourceHeight: sourceDimensions?.height || 720,
      containerWidth: layoutMetrics.width,
      containerHeight: layoutMetrics.height,
      fitMode: layoutMetrics.fitMode,
    });
  })();

  return (
    <div className="flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-inner h-full">
      {/* Header Camera Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950/80 border-b border-slate-800 text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-xs tracking-wide text-white">
            Camera Soi Biển Số
          </span>
        </div>

        <div className="flex items-center gap-2">
          {videoDevices.length > 1 && (
            <select
              aria-label="Chọn thiết bị camera"
              value={selectedDeviceId}
              onChange={(e) => onChangeCamera?.(e.target.value)}
              className="text-2xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 max-w-40 truncate"
            >
              {videoDevices.map((dev, idx) => (
                <option key={dev.deviceId || idx} value={dev.deviceId}>
                  {dev.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          )}

          {detectedPlate && (
            <button
              type="button"
              onClick={onReset}
              className="text-2xs px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Quét lại biển số mới"
            >
              Quét lại
            </button>
          )}
        </div>
      </div>

      {/* Viewport Live Video */}
      <div
        ref={containerRef}
        className="relative flex-1 min-h-[260px] max-h-[380px] bg-black flex items-center justify-center overflow-hidden select-none"
      >
        {cameraError ? (
          <div className="p-6 text-center text-rose-300 text-xs max-w-sm space-y-1.5">
            <p className="font-bold text-rose-200 text-sm">Không thể kết nối Camera</p>
            <p className="text-slate-400 text-2xs leading-relaxed">{cameraError}</p>
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

            {/* Bounding Box AI */}
            {scaledHighlightBox && !isManualLookup && (
              <div
                className="absolute border-2 border-emerald-400 bg-emerald-400/20 rounded shadow-[0_0_12px_rgba(16,185,129,0.8)] pointer-events-none transition-all duration-100"
                style={{
                  left: `${scaledHighlightBox.left}px`,
                  top: `${scaledHighlightBox.top}px`,
                  width: `${scaledHighlightBox.width}px`,
                  height: `${scaledHighlightBox.height}px`,
                }}
              >
                <span className="absolute -top-5 left-0 bg-emerald-600 text-white font-mono text-3xs font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                  {cameraPlate || detectedPlate || "Biển số"}
                </span>
              </div>
            )}

            {/* Status Pill Indicator */}
            <div className="absolute bottom-2.5 inset-x-3 flex justify-center pointer-events-none">
              <div className="bg-slate-900/85 backdrop-blur-xs text-white text-2xs px-3 py-1 rounded-full border border-slate-700/80 shadow flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isManualLookup
                      ? "bg-blue-400"
                      : isScanning
                        ? "bg-amber-400 animate-ping"
                        : "bg-emerald-400"
                  }`}
                />
                <span className="font-medium">
                  {isManualLookup
                    ? (statusMessage && statusMessage !== "Đã nhận diện ổn định biển số xe."
                        ? statusMessage
                        : "Đang tra cứu thủ công")
                    : (statusMessage || "Đang nhận diện...")}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Barrier Status Bar at bottom of camera feed */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-2xs">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              barrierState === "opened"
                ? "bg-emerald-400 animate-ping"
                : barrierState === "opening"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-slate-500"
            }`}
          />
          <span className="text-slate-300 font-medium">Thanh chắn (Barrier):</span>
        </div>
        <span
          className={`font-semibold px-2 py-0.5 rounded text-3xs ${
            barrierState === "opened"
              ? "bg-emerald-950 text-emerald-300 border border-emerald-700/60"
              : barrierState === "opening"
                ? "bg-amber-950 text-amber-300 border border-amber-700/60"
                : "bg-slate-800 text-slate-300 border border-slate-700"
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
  );
}

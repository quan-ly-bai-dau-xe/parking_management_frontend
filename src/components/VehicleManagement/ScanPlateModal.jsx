import { useState, useRef } from "react";
import {
  scanPlateImage,
  lookupVehicleByPlate,
  mapPlateScanToVehicle,
  mapVehicleLookupToVehicle,
} from "../../features/plateScanService";
import {
  validateVehicleEntry,
  calculateParkingFee,
  checkInVehicle,
  checkOutVehicle,
} from "../../features/parkingSessionService";
import { mockVehicles } from "../../mocks/vehicleData";

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
  vehicles = [],
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [detectedPlate, setDetectedPlate] = useState("");
  const [matchedVehicle, setMatchedVehicle] = useState(null);
  const [scanDetails, setScanDetails] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [searchStatus, setSearchStatus] = useState("idle"); // 'idle' | 'matched' | 'not_found' | 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const [rawLookup, setRawLookup] = useState(null);

  // Workflow states: Lane mode & Action statuses
  const [laneMode, setLaneMode] = useState("auto"); // 'auto' | 'entry' | 'exit'
  const [barrierState, setBarrierState] = useState("closed"); // 'closed' | 'opening' | 'opened'
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");
  const [isActionPending, setIsActionPending] = useState(false);

  const fileInputRef = useRef(null);

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
        err.message || "Không thể kết nối đến máy chủ đối soát. Vui lòng kiểm tra lại dịch vụ."
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
        confidence: scanResult.best_candidate?.confidence ?? scanResult.confidence ?? null,
        reviewStatus: scanResult.review_status,
        engine: scanResult.engine_name,
        latencyMs: scanResult.latency_ms,
        candidates: scanResult.candidates || [],
      });

      if (extractedText) {
        setDetectedPlate(extractedText);

        const mappedVehicle = mapPlateScanToVehicle(scanResult);
        if (mappedVehicle) {
          setMatchedVehicle(mappedVehicle);
          setRawLookup(scanResult.vehicle_lookup || null);
          setSearchStatus("matched");
        } else {
          await handleMatchPlate(extractedText);
        }
      } else {
        setSearchStatus("error");
        setErrorMessage("AI không nhận diện được biển số từ ảnh chụp này. Vui lòng chọn ảnh rõ nét hơn.");
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
    setDetectedPlate("");
    setMatchedVehicle(null);
    setScanDetails(null);
    setSearchStatus("idle");
    setErrorMessage("");
    setActionSuccessMessage("");
    setBarrierState("closed");
    setRawLookup(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleApplySelection = () => {
    if (matchedVehicle && onVehicleMatched) {
      onVehicleMatched(matchedVehicle);
    }
    onClose();
  };

  // Determine current active workflow mode: Entry vs Exit
  const isVehicleCurrentlyParked = Boolean(
    rawLookup?.open_session ||
    matchedVehicle?.status === "parked" ||
    matchedVehicle?.status === "Đang gửi"
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

  // Exit Fee Estimation (Mock 2h30m entry = 08:00 exit = 10:30)
  const hasValidTicket =
    matchedVehicle?.ticket?.status === "active" &&
    matchedVehicle?.ticket?.type !== "Vé lượt" &&
    matchedVehicle?.ticket?.type !== "—";

  const exitFeeCalc = calculateParkingFee({
    vehicleType: matchedVehicle?.vehicleType || "CAR",
    durationMinutes: 150, // 2h30m
    hasActiveTicket: hasValidTicket,
  });

  // Action: Confirm Entry (Check-in)
  const handleConfirmEntry = async () => {
    setIsActionPending(true);
    setActionSuccessMessage("");

    try {
      await checkInVehicle({
        licensePlate: detectedPlate || matchedVehicle?.licensePlate,
        vehicleType: matchedVehicle?.vehicleType || "CAR",
        entryGate: "Cổng vào A1",
        slotCode: matchedVehicle?.parkingSlot?.display || "A1-01",
        imageUrl: selectedImage,
        activeTicket: hasValidTicket,
      });

      setBarrierState("opening");
      setTimeout(() => setBarrierState("opened"), 600);
      setActionSuccessMessage(
        `✓ Đã tạo phiên gửi xe lúc ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}. Mở thanh chắn cho xe vào bãi!`
      );
    } finally {
      setIsActionPending(false);
    }
  };

  // Action: Confirm Exit (Check-out)
  const handleConfirmExit = async () => {
    setIsActionPending(true);
    setActionSuccessMessage("");

    try {
      await checkOutVehicle({
        sessionId: rawLookup?.open_session?.id,
        licensePlate: detectedPlate || matchedVehicle?.licensePlate,
        entryTimeRaw: rawLookup?.open_session?.entry_time,
        vehicleType: matchedVehicle?.vehicleType || "CAR",
        hasActiveTicket: hasValidTicket,
        paymentMethod: hasValidTicket ? "TICKET_EXEMPT" : "CASH",
        exitGate: "Cổng ra B1",
      });

      setBarrierState("opening");
      setTimeout(() => setBarrierState("opened"), 600);
      setActionSuccessMessage(
        `✓ Đã xác nhận thanh toán (${exitFeeCalc.feeFormatted}) & kết thúc phiên gửi xe. Mở thanh chắn cho xe ra bãi!`
      );
    } finally {
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Kiểm Soát Xe Ra / Vào & Quét Biển Số
              </h3>
              <p className="text-2xs text-slate-500">
                Quy trình Check-in / Check-out, đối soát danh sách đen & thanh toán mở barrier
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
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
              🔄 Tự động nhận diện ({effectiveMode === "entry" ? "Xe Vào" : "Xe Ra"})
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
                  <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-semibold text-slate-700">Tải ảnh camera cổng</span>
                  <span className="text-slate-400 text-2xs mt-0.5">Nhấp để chọn ảnh JPG, PNG</span>
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
                      onChange={(e) => setDetectedPlate(e.target.value.toUpperCase())}
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
                      {scanDetails.confidence
                        ? `${Math.round(scanDetails.confidence * 100)}%`
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
                  <span className="font-medium text-slate-700">Thanh chắn (Barrier):</span>
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
                  {barrierState === "opened" ? "ĐÃ MỞ - MỜI XE QUA" : barrierState === "opening" ? "ĐANG NÂNG CẦN..." : "ĐANG ĐÓNG"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Success Alert */}
          {actionSuccessMessage && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 flex items-center gap-2">
              <span className="text-base">🎉</span>
              <span className="font-semibold">{actionSuccessMessage}</span>
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
                  Phương tiện bị hạn chế hoặc có báo cáo vi phạm an ninh. Không được mở thanh chắn cho vào bãi!
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
                  <span className="text-slate-600 font-semibold">{matchedVehicle.model}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                    effectiveMode === "entry"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {effectiveMode === "entry" ? "Quy trình Vào (08:00)" : "Quy trình Ra (10:30)"}
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
                  <span className="text-slate-400 block">Vị trí đỗ</span>
                  <span className="font-semibold text-emerald-700 text-xs">
                    {matchedVehicle.parkingSlot?.display || "Khu A - Tầng 1"}
                  </span>
                </div>
              </div>

              {/* Mode Specific Workflow Content */}
              {effectiveMode === "entry" ? (
                /* ENTRY WORKFLOW BOX */
                <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between text-2xs text-slate-600">
                    <span>Thời gian xe vào:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-2xs text-slate-600">
                    <span>Kiểm tra chỗ trống:</span>
                    <span className="font-semibold text-emerald-600">✓ Còn vị trí đỗ trống (Tầng 1)</span>
                  </div>
                  <div className="flex items-center justify-between text-2xs text-slate-600">
                    <span>Điều kiện mở barrier:</span>
                    <span className="font-semibold text-slate-900">
                      {entryValidation.eligible ? "✓ Đủ điều kiện vào" : "⚠️ Cần kiểm tra"}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      disabled={isActionPending || isBlacklisted}
                      onClick={handleConfirmEntry}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      <span>{isActionPending ? "Đang xử lý..." : "✓ Xác nhận Xe Vào & Mở Barrier"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* EXIT WORKFLOW BOX */
                <div className="bg-white p-3 rounded-lg border border-blue-200 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-2xs bg-slate-50 p-2 rounded-md">
                    <div>
                      <span className="text-slate-400 block">Thời gian vào</span>
                      <span className="font-mono font-bold text-slate-800">08:00</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Thời gian ra</span>
                      <span className="font-mono font-bold text-slate-800">10:30 (Hiện tại)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Thời lượng đỗ</span>
                      <span className="font-bold text-blue-700">2 giờ 30 phút</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-md bg-blue-50/60 border border-blue-100">
                    <div>
                      <span className="text-slate-600 block text-2xs">Số tiền cần thanh toán</span>
                      <span className="text-2xs text-slate-400">{exitFeeCalc.calculationBreakdown}</span>
                    </div>
                    <span className="text-base font-bold text-blue-700 font-mono">
                      {exitFeeCalc.feeFormatted}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-2xs text-slate-500">
                      Phương thức: <span className="font-semibold text-slate-700">Tiền mặt / VietQR</span>
                    </div>
                    <button
                      type="button"
                      disabled={isActionPending}
                      onClick={handleConfirmExit}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      <span>{isActionPending ? "Đang xử lý..." : "✓ Xác nhận Thanh Toán & Mở Barrier"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {searchStatus === "not_found" && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
              <p className="font-semibold">Phương tiện chưa đăng ký trong danh bạ!</p>
              <p className="text-amber-700 mt-1">
                Biển số <span className="font-mono font-bold">{detectedPlate}</span> có thể là xe vãng lai gửi theo lượt. Hệ thống vẫn cho phép tạo phiên gửi lượt mới.
              </p>
            </div>
          )}

          {searchStatus === "error" && errorMessage && (
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold text-rose-900">Không thể thực hiện quét / đối soát:</p>
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
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

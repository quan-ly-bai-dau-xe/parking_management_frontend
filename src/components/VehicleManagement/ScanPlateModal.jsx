import { useState, useRef } from "react";
import {
  scanPlateImage,
  lookupVehicleByPlate,
  mapPlateScanToVehicle,
  mapVehicleLookupToVehicle,
} from "../../features/plateScanService";
import { mockVehicles } from "../../mocks/vehicleData";

/**
 * ScanPlateModal component
 * Allows scanning vehicle license plates from image files or camera capture.
 * Connects to backend API:
 * - scanPlateImage: POST /api/v1/parking/plate-scans/
 * - lookupVehicleByPlate: GET /api/v1/parking/vehicle-lookup/
 * Automatically looks up vehicle information in the system and displays matched details:
 * - Tên xe, Hãng xe, Tên khách hàng, Số điện thoại, Vị trí đỗ
 */
export default function ScanPlateModal({
  isOpen,
  onClose,
  onVehicleMatched,
  vehicles = [],
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [detectedPlate, setDetectedPlate] = useState("");
  const [matchedVehicle, setMatchedVehicle] = useState(null);
  const [scanDetails, setScanDetails] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [searchStatus, setSearchStatus] = useState("idle"); // 'idle' | 'matched' | 'not_found' | 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Clean plate string for fuzzy comparison
  const normalizePlate = (str) => {
    return (str || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  };

  const sampleVehicleList = vehicles.length > 0 ? vehicles : mockVehicles;

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

    try {
      // 1. Call real backend API: GET /api/v1/parking/vehicle-lookup/
      const lookupResult = await lookupVehicleByPlate(rawInput);
      const vehicle = mapVehicleLookupToVehicle(lookupResult);

      if (vehicle) {
        setMatchedVehicle(vehicle);
        setSearchStatus("matched");
        setIsScanning(false);
        return;
      }
    } catch (err) {
      // If error is 404 (not found), mark as not_found directly
      if (err.status === 404) {
        setMatchedVehicle(null);
        setSearchStatus("not_found");
        setIsScanning(false);
        return;
      }

      // Check fallback list before displaying network error
      const found = findInLocalList(norm);
      if (found) {
        setMatchedVehicle(found);
        setSearchStatus("matched");
        setIsScanning(false);
        return;
      }

      // If backend failed due to auth/server/network, show clear message
      setMatchedVehicle(null);
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
      setSearchStatus("matched");
    } else {
      setMatchedVehicle(null);
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

    try {
      // 1. Send file to real backend OCR API: POST /api/v1/parking/plate-scans/
      const scanResult = await scanPlateImage(file);

      // Extract recognized plate text from backend schema (PlateScanResponseSerializer)
      const extractedText =
        scanResult.best_candidate?.plate_text ||
        scanResult.plate_raw ||
        scanResult.plate_final ||
        scanResult.license_plate ||
        "";

      // Save raw AI recognition details to display to user
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

        // Map vehicle directly if vehicle_lookup is returned in scan response
        const mappedVehicle = mapPlateScanToVehicle(scanResult);
        if (mappedVehicle) {
          setMatchedVehicle(mappedVehicle);
          setSearchStatus("matched");
        } else {
          // If scan succeeded but vehicle wasn't auto-resolved, lookup vehicle by plate
          await handleMatchPlate(extractedText);
        }
      } else {
        setSearchStatus("error");
        setErrorMessage("AI không nhận diện được biển số từ ảnh chụp này. Vui lòng chọn ảnh rõ nét hơn.");
      }
    } catch (err) {
      setSearchStatus("error");
      const msg =
        err.status === 403
          ? "Phiên làm việc hết hạn hoặc thiếu quyền thực hiện quét biển số (403 Forbidden)."
          : err.status === 400
          ? `Tệp hình ảnh không hợp lệ: ${err.message}`
          : err.message || "Lỗi kết nối tới máy chủ khi gửi ảnh quét OCR.";
      setErrorMessage(msg);
    } finally {
      setIsScanning(false);
    }
  };

  // Handle file selection and call real scan API
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    runOcrScan(file);
  };

  // Quick preset sample buttons for easy live testing
  const handleSelectSample = (plate) => {
    setDetectedPlate(plate);
    handleMatchPlate(plate);
  };

  const handleApplySelection = () => {
    if (matchedVehicle && onVehicleMatched) {
      onVehicleMatched(matchedVehicle);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
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
                Scan Biển Số Xe Từ Hình Ảnh
              </h3>
              <p className="text-xs text-slate-500">
                Tự động nhận diện biển số và đối soát thông tin xe vào/ra
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Upload Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Tải ảnh xe hoặc camera vào/ra
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-200 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/60 transition-all rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer text-center group"
            >
              {selectedImage ? (
                <div className="relative w-full max-h-48 flex justify-center items-center overflow-hidden rounded-lg">
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="max-h-48 object-contain rounded-lg"
                  />
                  <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-white/90 text-xs font-medium text-slate-800 px-3 py-1.5 rounded-md shadow-xs">
                      Bấm để chọn ảnh khác
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-blue-100/80 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-800">
                    Nhấp vào đây để tải ảnh biển số xe
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hỗ trợ định dạng JPG, PNG, WEBP từ camera giám sát
                  </p>
                </>
              )}
            </div>

            {/* Quick Demo Samples */}
            <div className="mt-3 flex items-center flex-wrap gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-600">Thử mẫu nhanh:</span>
              {sampleVehicleList.slice(0, 4).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleSelectSample(v.licensePlate)}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 border border-slate-200 text-slate-700 font-mono transition-colors"
                >
                  {v.licensePlate} ({v.brand})
                </button>
              ))}
            </div>
          </div>

          {/* OCR Input & Recognition Status */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Biển số nhận diện được:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={detectedPlate}
                    onChange={(e) => {
                      setDetectedPlate(e.target.value);
                      handleMatchPlate(e.target.value);
                    }}
                    placeholder="VD: 51K-992.14"
                    className="font-mono text-base font-bold tracking-wider px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => handleMatchPlate(detectedPlate)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shrink-0 transition-colors"
                  >
                    Đối soát
                  </button>
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => runOcrScan(selectedFile)}
                      disabled={isScanning}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg shrink-0 transition-colors flex items-center gap-1.5"
                      title="Chạy lại mô hình OCR để nhận diện biển số từ ảnh"
                    >
                      <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Quét lại AI</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className="sm:text-right shrink-0">
                <span className="block text-xs text-slate-400 mb-1">
                  Trạng thái hệ thống
                </span>
                {isScanning ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    Đang quét AI OCR...
                  </span>
                ) : searchStatus === "matched" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Đã tìm thấy trong hệ thống
                  </span>
                ) : searchStatus === "not_found" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Chưa có trong hệ thống
                  </span>
                ) : searchStatus === "error" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Lỗi kết nối / xác thực
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    Chờ tải ảnh...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* AI Recognition Details Banner */}
          {scanDetails && (
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3.5 text-xs text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <span className="font-semibold">Kết quả AI OCR:</span>
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-700">
                  {scanDetails.plate || "Không xác định"}
                </span>
                {scanDetails.confidence != null && (
                  <span className="text-2xs text-indigo-600 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                    Độ tin cậy: {Number(scanDetails.confidence).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-2xs text-indigo-600">
                {scanDetails.reviewStatus && (
                  <span className="px-2 py-0.5 rounded bg-white border border-indigo-200 font-medium">
                    Chính sách: {scanDetails.reviewStatus}
                  </span>
                )}
                {scanDetails.latencyMs != null && (
                  <span>Tốc độ: {scanDetails.latencyMs}ms</span>
                )}
              </div>
            </div>
          )}

          {/* Matched Details Panel (Requirement: Tên xe, Hãng xe, Tên khách hàng, Số điện thoại, Vị trí đỗ) */}
          {matchedVehicle && (
            <div className="border border-emerald-200 bg-emerald-50/30 rounded-xl p-4.5 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Thông tin phương tiện khớp tự động
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                  Mã xe: {matchedVehicle.id}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                {/* Tên xe & Model */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-slate-400 block mb-0.5">
                    Tên xe / Dòng xe
                  </span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {matchedVehicle.model} ({matchedVehicle.vehicleType})
                  </span>
                </div>

                {/* Hãng xe */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-slate-400 block mb-0.5">Hãng xe</span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {matchedVehicle.brand}
                  </span>
                </div>

                {/* Tên khách hàng */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-slate-400 block mb-0.5">
                    Tên khách hàng
                  </span>
                  <span className="font-semibold text-blue-700 text-sm">
                    {matchedVehicle.customer.name}
                  </span>
                  <span className="text-slate-400 text-2xs block">
                    Mã KH: {matchedVehicle.customer.id}
                  </span>
                </div>

                {/* Số điện thoại */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-slate-400 block mb-0.5">
                    Số điện thoại
                  </span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {matchedVehicle.customer.phone}
                  </span>
                </div>

                {/* Vị trí đỗ */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs sm:col-span-2">
                  <span className="text-slate-400 block mb-0.5">
                    Vị trí đỗ quy định
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-700 text-sm">
                      {matchedVehicle.parkingSlot.display}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {matchedVehicle.status === "parked"
                        ? "Đang đỗ"
                        : "Đang hoạt động"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {searchStatus === "not_found" && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
              <p className="font-semibold">
                Phương tiện chưa đăng ký trong danh bạ!
              </p>
              <p className="text-amber-700 mt-1">
                Biển số{" "}
                <span className="font-mono font-bold">{detectedPlate}</span>{" "}
                không tìm thấy trong dữ liệu hiện tại. Bạn có thể bấm Thêm xe
                mới hoặc kiểm tra lại ảnh chụp.
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
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-100 bg-slate-50/50">
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
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>Xem chi tiết phương tiện</span>
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

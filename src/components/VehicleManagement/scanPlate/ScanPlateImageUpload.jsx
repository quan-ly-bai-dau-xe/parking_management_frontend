import { useState, useRef, useEffect } from "react";
import { scanPlateImage } from "../../../services/plateScanService";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * ScanPlateImageUpload
 * Tải file ảnh biển số xe (kéo thả hoặc chọn tệp) và gọi OCR nhận diện
 */
export default function ScanPlateImageUpload({
  gateId = 1,
  onImageScanned,
  disabled = false,
}) {
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleProcessFile = async (file) => {
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setErrorMessage("Định dạng file không hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WEBP.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage("Kích thước file vượt quá 10MB. Vui lòng chọn ảnh nhỏ hơn.");
      return;
    }

    setErrorMessage("");
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setIsUploading(true);

    try {
      const scanResult = await scanPlateImage(file, gateId);
      if (onImageScanned) {
        onImageScanned(scanResult, localUrl);
      }
    } catch (err) {
      const backendMsg = err?.data?.message || err?.message;
      setErrorMessage(
        backendMsg || "Không thể nhận diện biển số từ ảnh. Vui lòng kiểm tra lại chất lượng ảnh."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    // Reset file input so user can re-select same file if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleResetImage = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {previewUrl ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/90 aspect-video flex items-center justify-center group shadow-inner">
          <img
            src={previewUrl}
            alt="Biển số đã tải lên"
            className="w-full h-full object-contain"
          />

          {isUploading && (
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2 z-10">
              <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold tracking-wide">Đang nhận diện biển số xe...</p>
            </div>
          )}

          {!isUploading && (
            <div className="absolute bottom-3 right-3 z-10">
              <button
                type="button"
                onClick={handleResetImage}
                className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white text-2xs font-semibold rounded-lg backdrop-blur-xs border border-white/20 transition-all shadow-md flex items-center gap-1.5"
              >
                🔄 Chọn ảnh khác
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all aspect-video ${
            isDragging
              ? "border-blue-500 bg-blue-50/60 scale-[1.01]"
              : "border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl mb-3 shadow-2xs">
            📤
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-800">
            Kéo thả ảnh biển số vào đây hoặc{" "}
            <span className="text-blue-600 underline">chọn từ thiết bị</span>
          </p>
          <p className="text-3xs text-slate-500 mt-1">
            Hỗ trợ PNG, JPG, WEBP (tối đa 10MB)
          </p>
          <p className="text-3xs text-slate-400 mt-2">
            Hệ thống AI sẽ tự động phân tích và trích xuất biển số xe
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-2xs rounded-xl flex items-center gap-2">
          <span>⚠️</span>
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="text-rose-500 hover:text-rose-700 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

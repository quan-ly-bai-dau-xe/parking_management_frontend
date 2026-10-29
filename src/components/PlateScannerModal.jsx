import { useEffect, useRef, useState } from "react";
import { createWorker } from "tesseract.js";

export default function PlateScannerModal({ isOpen, onClose, onDetected }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrStatus, setOcrStatus] = useState("");
  const [detectedPlate, setDetectedPlate] = useState("");

  // 1. Khởi động Webcam laptop khi mở modal
  useEffect(() => {
    if (isOpen) {
      setCameraError("");
      setDetectedPlate("");
      setOcrStatus("");

      navigator.mediaDevices
        ?.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user", // Camera trước của laptop
          },
          audio: false,
        })
        .then((mediaStream) => {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        })
        .catch((err) => {
          console.error("Camera access error:", err);
          setCameraError(
            "Không thể truy cập camera laptop. Hãy kiểm tra quyền truy cập camera trên trình duyệt."
          );
        });
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isOpen]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  // 2. Hàm tiền xử lý ảnh và trích xuất OCR
  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      setOcrStatus("Đang chụp và xử lý ảnh...");

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Cắt riêng vùng khung ngắm (chiếm 60% ngang, 35% dọc ở giữa)
      const vWidth = video.videoWidth || 640;
      const vHeight = video.videoHeight || 480;

      const cropWidth = vWidth * 0.6;
      const cropHeight = vHeight * 0.35;
      const startX = (vWidth - cropWidth) / 2;
      const startY = (vHeight - cropHeight) / 2;

      canvas.width = cropWidth;
      canvas.height = cropHeight;

      // Vẽ vùng cắt vào canvas
      ctx.drawImage(
        video,
        startX,
        startY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      // Tăng tương phản & chuyển grayscale giúp OCR đọc chuẩn hơn
      const imgData = ctx.getImageData(0, 0, cropWidth, cropHeight);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        // Gray = 0.299R + 0.587G + 0.114B
        const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Ngưỡng tương phản cao (Thresholding)
        const threshold = avg > 120 ? 255 : 0;
        data[i] = threshold;
        data[i + 1] = threshold;
        data[i + 2] = threshold;
      }
      ctx.putImageData(imgData, 0, 0);

      setOcrStatus("AI đang nhận diện ký tự...");

      // Khởi chạy Tesseract Worker
      const worker = await createWorker("eng");
      // Cấu hình chỉ nhận diện chữ in hoa, số và dấu gạch/chấm của biển số
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-.",
      });

      const ret = await worker.recognize(canvas);
      await worker.terminate();

      const rawText = ret.data.text.replace(/\s+/g, "").toUpperCase();

      // Regex nhận diện biển số Việt Nam cơ bản:
      // Ô tô: 51K-992.14, 30A-123.45, 29C-333.66 hoặc dạng không dấu gạch
      // Xe máy: 59P1-678.90
      const plateRegex = /([0-9]{2}[A-Z]{1,2}[0-9]{0,1})[-.]?([0-9]{3,5}[.]?[0-9]{0,2})/;
      const match = rawText.match(plateRegex);

      if (match) {
        const cleanedPlate = `${match[1]}-${match[2]}`;
        setDetectedPlate(cleanedPlate);
        setOcrStatus("Nhận diện thành công!");
      } else if (rawText.length >= 6) {
        // Fallback lấy chuỗi thô nếu gần giống
        setDetectedPlate(rawText);
        setOcrStatus("Đã đọc được ký tự (Vui lòng kiểm tra lại)!");
      } else {
        setOcrStatus("Chưa nhận diện rõ. Hãy giữ chắc biển số và thử lại!");
      }
    } catch (err) {
      console.error("OCR Error:", err);
      setOcrStatus("Lỗi trong quá trình nhận diện.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (detectedPlate && onDetected) {
      onDetected(detectedPlate);
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="font-bold text-slate-900 text-base">
              Quét biển số qua Camera Laptop
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Khung Camera */}
        <div className="relative bg-slate-950 w-full aspect-video flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-rose-400 text-xs sm:text-sm max-w-xs space-y-2">
              <span className="text-3xl block">📷⚠️</span>
              <p>{cameraError}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100" // Lật gương camera trước cho tự nhiên
              />

              {/* Khung căn biển số */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[60%] h-[35%] border-2 border-dashed border-emerald-400/90 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center">
                  <span className="text-[0.68rem] text-emerald-200 tracking-wider font-mono uppercase bg-black/40 px-2 py-0.5 rounded">
                    CĂN BIỂN SỐ VÀO ĐÂY
                  </span>

                  {isProcessing && (
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10b981] animate-bounce" />
                  )}
                </div>
              </div>
            </>
          )}

          {/* Canvas ẩn để trích xuất ảnh */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Kết quả & Thao tác */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-[0.7rem] text-slate-400 block font-semibold uppercase tracking-wider">
                Kết quả nhận diện:
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                {detectedPlate ? (
                  <span className="font-mono text-xl font-extrabold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                    {detectedPlate}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    Chưa có kết quả
                  </span>
                )}
              </div>
              {ocrStatus && (
                <span className="text-[0.7rem] text-slate-500 mt-1 block">
                  {ocrStatus}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                disabled={isProcessing || !!cameraError}
                onClick={captureAndRecognize}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5"
              >
                {isProcessing ? "Đang đọc..." : "📸 Chụp & Quét"}
              </button>

              <button
                type="button"
                disabled={!detectedPlate}
                onClick={handleApply}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold shadow-sm transition"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
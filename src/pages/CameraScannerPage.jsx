import PlateScannerModal from "../components/PlateScannerModal"; // Điều chỉnh đường dẫn import phù hợp

export default function CameraScanPage() {
  // Lấy mode và gateId từ query URL (ví dụ: /camera-scanner?mode=in&gateId=1)
  const searchParams = new URLSearchParams(window.location.search);
  const mode = searchParams.get("mode") || "in";
  const gateId = Number(searchParams.get("gateId")) || (mode === "out" ? 2 : 1);

  // Lắng nghe và gửi kết quả về tab chính qua BroadcastChannel và localStorage
  const handleDetected = (plate, resultData) => {
    const scanPayload = {
      type: "PLATE_SCANNED_SUCCESS",
      plate,
      resultData,
      mode,
      gateId,
      timestamp: Date.now(),
    };

    try {
      const channel = new BroadcastChannel("smart_parking_plate_scan");
      channel.postMessage(scanPayload);
      channel.close();
    } catch (err) {
      console.warn("BroadcastChannel error:", err);
    }

    try {
      localStorage.setItem(
        "smart_parking_latest_scan",
        JSON.stringify(scanPayload)
      );
    } catch (err) {
      console.warn("localStorage fallback error:", err);
    }

    // Đóng tab quét sau khi đã áp dụng kết quả
    window.close();
  };

  const handleClose = () => {
    window.close();
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-2 sm:p-4 font-sans">
      <PlateScannerModal
        isOpen={true}
        onClose={handleClose}
        onDetected={handleDetected}
        gateId={gateId}
      />
    </div>
  );
}
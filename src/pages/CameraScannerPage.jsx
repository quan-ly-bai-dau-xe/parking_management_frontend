import PlateScannerModal from "../components/PlateScannerModal"; // Điều chỉnh đường dẫn import phù hợp

export default function CameraScanPage() {
  // Lấy gateId từ query URL (ví dụ: /camera-scanner?gateId=1)
  const searchParams = new URLSearchParams(window.location.search);
  const gateId = Number(searchParams.get("gateId")) || 1;

  // Lắng nghe và gửi kết quả về tab chính qua BroadcastChannel
  const handleDetected = (plate, resultData) => {
    try {
      const channel = new BroadcastChannel("smart_parking_plate_scan");
      channel.postMessage({
        type: "PLATE_SCANNED_SUCCESS",
        plate,
        resultData,
      });
      channel.close();
    } catch (err) {
      console.warn("BroadcastChannel not supported, fallback to localStorage:", err);
      localStorage.setItem(
        "smart_parking_latest_scan",
        JSON.stringify({ plate, resultData, timestamp: Date.now() })
      );
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
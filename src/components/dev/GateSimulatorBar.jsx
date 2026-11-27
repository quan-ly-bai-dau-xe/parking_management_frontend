import { useState } from "react";

/**
 * GateSimulatorBar
 * Thanh công cụ giả lập & kịch bản kiểm thử (Dev & QA Scenario Bar)
 * Dành riêng cho môi trường development (VITE_BYPASS_AUTH hoặc localhost)
 * Cho phép giả lập nhanh các case:
 * 1. OCR Mismatch (30F-557.75 vs 30F-557.76)
 * 2. Vé tháng / Khách VIP vào ra
 * 3. Xe trong Blacklist (Danh sách đen)
 * 4. Xe bị kẹt phiên gửi cũ (Treo phiên)
 */
export default function GateSimulatorBar({
  laneMode = "entry",
  onSimulateScan,
  onSimulateManualInput,
  currentScannedPlate = "",
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Chỉ hiển thị trong dev mode hoặc localhost
  const isDev = import.meta.env.DEV || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (!isDev) return null;

  return (
    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-2.5 text-3xs border border-indigo-800/50 shadow-sm transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 bg-indigo-500/30 text-indigo-300 rounded font-bold uppercase tracking-wider text-[10px]">
            Dev / QA Toolbar
          </span>
          <span className="text-slate-300">
            {currentScannedPlate ? (
              <span>
                Ảnh quét: <strong className="font-mono text-amber-300">{currentScannedPlate}</strong>
              </span>
            ) : (
              "Chưa nạp ảnh quét giả lập"
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="text-slate-400 hover:text-white underline cursor-pointer"
        >
          {isExpanded ? "Thu gọn ▲" : "Mở kịch bản giả lập ▼"}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-2.5 pt-2 border-t border-slate-700/60 space-y-2">
          <div className="text-slate-400 font-semibold">Chọn kịch bản kiểm thử nhanh:</div>
          <div className="flex flex-wrap gap-2">
            {/* Kịch bản 1: Lệch biển số OCR */}
            <button
              type="button"
              onClick={() => {
                if (onSimulateScan) onSimulateScan("30F-557.75", 96.5);
                if (onSimulateManualInput) onSimulateManualInput("30F-557.76");
              }}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg font-medium cursor-pointer transition flex items-center gap-1"
            >
              <span>⚠️</span>
              <span>Lệch OCR: Quét [..75] ➔ Nhập [..76]</span>
            </button>

            {/* Kịch bản 2: Xe vé tháng chuẩn */}
            <button
              type="button"
              onClick={() => {
                if (onSimulateScan) onSimulateScan("51K-992.14", 99.2);
                if (onSimulateManualInput) onSimulateManualInput("51K-992.14");
              }}
              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 rounded-lg font-medium cursor-pointer transition flex items-center gap-1"
            >
              <span>✓</span>
              <span>Vé tháng VIP: [51K-992.14]</span>
            </button>

            {/* Kịch bản 3: Xe dính Blacklist */}
            <button
              type="button"
              onClick={() => {
                if (onSimulateScan) onSimulateScan("51C-882.54", 94.0);
                if (onSimulateManualInput) onSimulateManualInput("51C-882.54");
              }}
              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 rounded-lg font-medium cursor-pointer transition flex items-center gap-1"
            >
              <span>⛔</span>
              <span>Xe Blacklist: [51C-882.54]</span>
            </button>

            {/* Nút reset giả lập */}
            <button
              type="button"
              onClick={() => {
                if (onSimulateScan) onSimulateScan("", null);
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer transition"
            >
              Xóa ảnh quét
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { LoadingSpinner, EmptyState } from "../common";
import {
  PARKING_HISTORY_MESSAGES,
  PARKING_HISTORY_DEFAULTS,
  getParkingSessionStatus,
} from "../../constants/parkingHistoryConstants";
import ParkingSessionThumbnail from "./ParkingSessionThumbnail";

export default function ParkingHistoryTable({
  items,
  isLoading,
  loadError,
  onOpenCloseSessionModal,
  onPreviewImage,
}) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[980px]">
        {/* Table Header */}
        <div className="bg-[#F1F5F9]/80 rounded-xl px-4 py-3 grid grid-cols-7 gap-4 text-xs font-semibold text-slate-600 items-center">
          <div className="col-span-1">Mã phiên đỗ xe</div>
          <div className="col-span-1">Biển số xe</div>
          <div className="col-span-1">Thời gian vào</div>
          <div className="col-span-1">Thời gian ra</div>
          <div className="col-span-1">Tổng thời gian đỗ</div>
          <div className="col-span-1">Tình trạng</div>
          <div className="col-span-1 flex justify-between items-center">
            <span>Cước phí</span>
            <span>Hình ảnh</span>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <LoadingSpinner label={PARKING_HISTORY_MESSAGES.LOADING_TEXT} />
          </div>
        ) : loadError ? (
          <div className="rounded-xl bg-red-50 px-4 py-8 text-center text-sm text-red-700">
            {loadError}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={PARKING_HISTORY_MESSAGES.EMPTY_TITLE}
            description={PARKING_HISTORY_MESSAGES.EMPTY_DESC}
          />
        ) : (
          <div className="divide-y divide-slate-100 mt-1">
            {items.map((item) => {
              const statusInfo = getParkingSessionStatus(item);
              const isOngoing = statusInfo.key === "in_progress";
              const formattedExitTime =
                item.exitTime && item.exitTime !== PARKING_HISTORY_DEFAULTS.PLACEHOLDER_TEXT
                  ? item.exitTime
                  : PARKING_HISTORY_DEFAULTS.PLACEHOLDER_TEXT;

              return (
                <div
                  key={item.id}
                  className="px-4 py-3.5 grid grid-cols-7 gap-4 items-center text-xs text-slate-700 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="col-span-1 font-medium text-slate-900">{item.sessionCode}</div>
                  <div className="col-span-1 font-semibold text-blue-600 font-mono tracking-wide">
                    {item.licensePlate}
                  </div>
                  <div className="col-span-1 text-slate-600">
                    {item.entryTime || PARKING_HISTORY_DEFAULTS.PLACEHOLDER_TEXT}
                  </div>
                  <div className="col-span-1 text-slate-600">{formattedExitTime}</div>
                  <div className="col-span-1 text-slate-600">
                    {item.duration || PARKING_HISTORY_DEFAULTS.PLACEHOLDER_TEXT}
                  </div>
                  <div className="col-span-1">
                    {isOngoing ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${statusInfo.badgeClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusInfo.dotClass} animate-pulse`}
                            aria-hidden="true"
                          />
                          {statusInfo.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenCloseSessionModal(item)}
                          className="px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 cursor-pointer transition-colors shadow-2xs"
                          title="Đóng hoặc đồng bộ kết thúc phiên đỗ này"
                        >
                          Kết thúc
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${statusInfo.badgeClass}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusInfo.dotClass}`}
                          aria-hidden="true"
                        />
                        {statusInfo.label}
                      </span>
                    )}
                  </div>
                  <div className="col-span-1 flex justify-between items-center">
                    <span className="font-semibold text-emerald-600">{item.fee || "0đ"}</span>
                    <ParkingSessionThumbnail item={item} onPreview={onPreviewImage} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

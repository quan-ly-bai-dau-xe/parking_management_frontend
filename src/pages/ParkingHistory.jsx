import { useEffect } from "react";
import { Pagination } from "../components/common";
import { useParkingHistory } from "../hooks/useParkingHistory";
import { PARKING_HISTORY_MESSAGES } from "../constants/parkingHistoryConstants";
import ParkingHistoryFilters from "../components/ParkingHistory/ParkingHistoryFilters";
import ParkingHistoryTable from "../components/ParkingHistory/ParkingHistoryTable";
import ParkingImageModal from "../components/ParkingHistory/ParkingImageModal";
import CloseSessionModal from "../components/ParkingHistory/CloseSessionModal";

export default function ParkingHistory() {
  const { filters, table, modals } = useParkingHistory();

  // Đồng bộ tức thì giữa GateCameraControlModal và trang Lịch sử ra/vào (G-FE-04, Mục 7)
  const fetchSessions = table.onRefresh;

  useEffect(() => {
    const handleSessionChanged = () => {
      fetchSessions();
    };

    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("parking-session-changed", handleSessionChanged);
    }

    return () => {
      if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
        window.removeEventListener("parking-session-changed", handleSessionChanged);
      }
    };
  }, [fetchSessions]);

  return (
    <div>
      {/* Header & Data Sync Toolbar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {PARKING_HISTORY_MESSAGES.PAGE_TITLE}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {PARKING_HISTORY_MESSAGES.PAGE_SUBTITLE}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={table.onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-100/70 transition-colors cursor-pointer"
            title={PARKING_HISTORY_MESSAGES.RELOAD_TOOLTIP}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Tải lại dữ liệu
          </button>
          <button
            type="button"
            onClick={table.onClearDisplay}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Xóa hiển thị
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <ParkingHistoryFilters {...filters} />

      {/* Main Table Card */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 mb-8 flex flex-col min-h-[420px]">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Lịch sử ra vào bãi</h2>

        <ParkingHistoryTable
          items={table.items}
          isLoading={table.isLoading}
          loadError={table.loadError}
          onOpenCloseSessionModal={modals.setSessionActionModal}
          onPreviewImage={modals.setPreviewSession}
        />

        {/* Pagination Controls */}
        <Pagination
          currentPage={table.currentPage}
          totalPages={table.totalPages}
          onPageChange={table.setCurrentPage}
          totalItems={table.totalItems}
          itemsPerPage={table.itemsPerPage}
          onItemsPerPageChange={table.setItemsPerPage}
          className="mt-auto pt-8"
        />
      </section>

      {/* Footer Branding */}
      <footer className="w-full py-4">
        <p className="text-sm font-semibold text-slate-400 tracking-tight">
          {PARKING_HISTORY_MESSAGES.FOOTER_BRANDING}
        </p>
      </footer>

      {/* Camera Image Comparison Modal */}
      <ParkingImageModal
        previewSession={modals.previewSession}
        onClose={() => modals.setPreviewSession(null)}
      />

      {/* Close Session Business Scenarios Modal */}
      <CloseSessionModal
        isOpen={Boolean(modals.sessionActionModal)}
        onClose={() => modals.setSessionActionModal(null)}
        session={modals.sessionActionModal}
        onSubmitAction={modals.onConfirmCloseSession}
        isLoading={modals.isActionSubmitting}
      />
    </div>
  );
}

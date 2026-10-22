import { useState, useMemo } from "react";
import {
  EmptyState,
  ConfirmModal,
  FilterSelect,
  Pagination,
} from "../components/common";
import AppTopHeader from "../components/AppTopHeader";
import { mockParkingHistory } from "../mocks/parkingHistoryData";

export default function ParkingHistory({ onNavigateTab }) {
  // Filter form states matching UI: Mã phiên đỗ, Biển số xe, Thời gian vào đậu, Thời gian ra bãi, Cước phí
  const [sessionCode, setSessionCode] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [entryTime, setEntryTime] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [feeFilter, setFeeFilter] = useState("");

  // History list state, preloaded with mock data so the table is populated on first render
  const [historyList, setHistoryList] = useState(mockParkingHistory);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Selected image preview modal
  const [previewImage, setPreviewImage] = useState(null);

  // Filter logic
  const filteredList = useMemo(() => {
    return historyList.filter((item) => {
      if (
        sessionCode.trim() &&
        !item.sessionCode
          .toLowerCase()
          .includes(sessionCode.toLowerCase().trim())
      ) {
        return false;
      }
      if (
        licensePlate.trim() &&
        !item.licensePlate
          .toLowerCase()
          .includes(licensePlate.toLowerCase().trim())
      ) {
        return false;
      }
      if (entryTime && !item.entryTime.includes(entryTime)) {
        return false;
      }
      if (exitTime && !item.exitTime.includes(exitTime)) {
        return false;
      }
      if (feeFilter && item.fee !== feeFilter) {
        return false;
      }
      return true;
    });
  }, [historyList, sessionCode, licensePlate, entryTime, exitTime, feeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  const handleResetFilters = () => {
    setSessionCode("");
    setLicensePlate("");
    setEntryTime("");
    setExitTime("");
    setFeeFilter("");
    setCurrentPage(1);
  };

  const handleLoadDemoData = () => {
    setHistoryList(mockParkingHistory);
    setCurrentPage(1);
  };

  const handleClearData = () => {
    setHistoryList([]);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] text-slate-800 font-sans flex flex-col justify-between">
      {/* Top Header matching AppTopHeader */}
      <div>
        <AppTopHeader
          activeTabHref="#history"
          brandName="LOGO"
          adminName="Admin"
          onTabClick={onNavigateTab}
        />

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
          {/* Page Title */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Lịch sử ra/vào
            </h1>

            {/* Quick action buttons for convenience / demo */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadDemoData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-100/70 transition-colors cursor-pointer"
              >
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Tải dữ liệu mẫu
              </button>
              <button
                type="button"
                onClick={handleClearData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              >
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Xem trạng thái trống
              </button>
            </div>
          </div>

          {/* Card: Bộ lọc nhanh */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">
              Bộ lọc nhanh
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
              {/* Mã phiên đỗ */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Mã phiên đỗ
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={sessionCode}
                    onChange={(e) => {
                      setSessionCode(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Nhập mã phiên đỗ..."
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                  />
                </div>
              </div>

              {/* Biển số xe */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Biển số xe
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => {
                      setLicensePlate(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Nhập biển số xe..."
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                  />
                </div>
              </div>

              {/* Thời gian vào đậu */}
              <FilterSelect
                label="Thời gian vào đậu"
                value={entryTime}
                onChange={(e) => {
                  setEntryTime(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="00:00"
                options={["07:30", "08:15", "09:00", "10:20", "13:00"]}
                className="rounded-xl border-slate-200"
                containerClassName="flex flex-col gap-1.5"
              />

              {/* Thời gian ra bãi */}
              <FilterSelect
                label="Thời gian ra bãi"
                value={exitTime}
                onChange={(e) => {
                  setExitTime(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="00:00"
                options={["11:45", "12:15", "14:20", "15:30", "17:45"]}
                className="rounded-xl border-slate-200"
                containerClassName="flex flex-col gap-1.5"
              />

              {/* Cước phí */}
              <FilterSelect
                label="Cước phí"
                value={feeFilter}
                onChange={(e) => {
                  setFeeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="0đ"
                options={["15.000đ", "25.000đ", "35.000đ", "50.000đ"]}
                className="rounded-xl border-slate-200"
                containerClassName="flex flex-col gap-1.5"
              />
            </div>

            {(sessionCode ||
              licensePlate ||
              entryTime ||
              exitTime ||
              feeFilter) && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer"
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </section>

          {/* Card: Lịch sử ra vào bãi */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 mb-8 flex flex-col min-h-[420px]">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">
              Lịch sử ra vào bãi
            </h2>

            {/* Table Header Row */}
            <div className="w-full overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="bg-[#F1F5F9]/80 rounded-xl px-4 py-3 grid grid-cols-6 gap-4 text-xs font-semibold text-slate-600">
                  <div className="col-span-1">Mã phiên đỗ xe</div>
                  <div className="col-span-1">Biển số xe</div>
                  <div className="col-span-1">Thời gian vào</div>
                  <div className="col-span-1">Thời gian ra</div>
                  <div className="col-span-1">Tổng thời gian đỗ</div>
                  <div className="col-span-1 flex justify-between items-center">
                    <span>Cước phí</span>
                    <span>Hình ảnh đối soát</span>
                  </div>
                </div>

                {/* Table Body or Empty State */}
                {filteredList.length === 0 ? (
                  <EmptyState title="Chưa có dữ liệu" />
                ) : (
                  <div className="divide-y divide-slate-100 mt-1">
                    {paginatedList.map((item) => (
                      <div
                        key={item.id}
                        className="px-4 py-3.5 grid grid-cols-6 gap-4 items-center text-xs text-slate-700 hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="col-span-1 font-medium text-slate-900">
                          {item.sessionCode}
                        </div>
                        <div className="col-span-1 font-semibold text-blue-600 font-mono tracking-wide">
                          {item.licensePlate}
                        </div>
                        <div className="col-span-1 text-slate-600">
                          {item.entryTime}
                        </div>
                        <div className="col-span-1 text-slate-600">
                          {item.exitTime}
                        </div>
                        <div className="col-span-1 text-slate-600">
                          {item.duration}
                        </div>
                        <div className="col-span-1 flex justify-between items-center">
                          <span className="font-semibold text-emerald-600">
                            {item.fee}
                          </span>
                          {item.plateImageUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage(item.plateImageUrl)
                              }
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium underline cursor-pointer"
                            >
                              Xem ảnh
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredList.length}
              itemsPerPage={itemsPerPage}
              className="mt-auto pt-8"
            />
          </section>
        </main>
      </div>

      {/* Footer Branding from Design System */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 w-full">
        <p className="text-sm font-semibold text-slate-400 tracking-tight">
          Sơ đồ bãi đậu xe — Smart Mobility
        </p>
      </footer>

      {/* Image Preview Modal */}
      <ConfirmModal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title="Hình ảnh đối soát camera"
        size="lg"
        showFooter={false}
      >
        <div className="mt-1 overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center p-2">
          <img
            src={previewImage}
            alt="Hình ảnh đối soát"
            className="w-full max-h-[400px] object-contain"
          />
        </div>
      </ConfirmModal>
    </div>
  );
}

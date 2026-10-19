import React, { useState, useMemo } from "react";
import AppTopHeader from "../components/AppTopHeader";
import { mockParkingHistory } from "../mocks/parkingHistoryData";

export default function ParkingHistory({ onNavigateTab }) {
  // Filter form states matching UI: Mã phiên đỗ, Biển số xe, Thời gian vào đậu, Thời gian ra bãi, Cước phí
  const [sessionCode, setSessionCode] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [entryTime, setEntryTime] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [feeFilter, setFeeFilter] = useState("");

  // History list state (allows testing both populated and empty state)
  const [historyList, setHistoryList] = useState([]);
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
              {historyList.length === 0 ? (
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
              ) : (
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
              )}
            </div>
          </div>

          {/* Card: Bộ lọc nhanh */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">
              Bộ lọc nhanh
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Thời gian vào đậu
                </label>
                <div className="relative">
                  <select
                    value={entryTime}
                    onChange={(e) => {
                      setEntryTime(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white appearance-none cursor-pointer pr-8 transition-all"
                  >
                    <option value="">00:00</option>
                    <option value="07:30">07:30</option>
                    <option value="08:15">08:15</option>
                    <option value="09:00">09:00</option>
                    <option value="10:20">10:20</option>
                    <option value="13:00">13:00</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
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
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Thời gian ra bãi */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Thời gian ra bãi
                </label>
                <div className="relative">
                  <select
                    value={exitTime}
                    onChange={(e) => {
                      setExitTime(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white appearance-none cursor-pointer pr-8 transition-all"
                  >
                    <option value="">00:00</option>
                    <option value="11:45">11:45</option>
                    <option value="12:15">12:15</option>
                    <option value="14:20">14:20</option>
                    <option value="15:30">15:30</option>
                    <option value="17:45">17:45</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
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
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Cước phí */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Cước phí
                </label>
                <div className="relative">
                  <select
                    value={feeFilter}
                    onChange={(e) => {
                      setFeeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white appearance-none cursor-pointer pr-8 transition-all"
                  >
                    <option value="">0đ</option>
                    <option value="15.000đ">15.000đ</option>
                    <option value="25.000đ">25.000đ</option>
                    <option value="35.000đ">35.000đ</option>
                    <option value="50.000đ">50.000đ</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
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
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
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
                  <div className="py-24 flex flex-col items-center justify-center text-center">
                    {/* Empty box icon as seen in screenshot */}
                    <div className="w-14 h-14 mb-3 rounded-2xl flex items-center justify-center text-slate-300">
                      <svg
                        className="w-10 h-10 stroke-[1.5]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                    </div>
                    <p className="text-xs font-normal text-slate-400">
                      Chưa có dữ liệu
                    </p>
                  </div>
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
            <div className="mt-auto pt-8 flex items-center justify-center gap-2">
              {/* Prev Button */}
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                  currentPage <= 1
                    ? "border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50/50"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                }`}
                title="Trang trước"
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              {/* Active Page Indicator */}
              <button
                type="button"
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold cursor-default"
              >
                {currentPage}
              </button>

              {/* Next Button */}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                  currentPage >= totalPages
                    ? "border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50/50"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                }`}
                title="Trang sau"
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
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
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-2xl p-4 max-w-lg w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">
                Hình ảnh đối soát camera
              </h3>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center">
              <img
                src={previewImage}
                alt="Hình ảnh đối soát"
                className="w-full max-h-[400px] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

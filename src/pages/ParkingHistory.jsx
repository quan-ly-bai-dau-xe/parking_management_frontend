import { useEffect, useState, useMemo } from "react";
import { EmptyState, ConfirmModal, LoadingSpinner, Pagination } from "../components/common";
import { getParkingSessions, mapSessionToFrontend } from "../features/plateScanService";
import usePagination from "../hooks/usePagination";

export default function ParkingHistory() {
  // Filter form states matching UI: Mã phiên đỗ, Biển số xe, Thời gian vào đậu, Thời gian ra bãi, Cước phí
  const [sessionCode, setSessionCode] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [entryTimeFrom, setEntryTimeFrom] = useState("");
  const [entryTimeTo, setEntryTimeTo] = useState("");
  const [exitTimeFrom, setExitTimeFrom] = useState("");
  const [exitTimeTo, setExitTimeTo] = useState("");
  const [feeMin, setFeeMin] = useState("");
  const [feeMax, setFeeMax] = useState("");
  const [filterByTime, setFilterByTime] = useState(false);
  // Date range filters for Vietnamese format (dd/mm/yyyy)
  const toISODate = (date) => date.toISOString().slice(0, 10);
  const today = new Date();
  const todayISO = toISODate(today);
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - 29);
  const minDateISO = toISODate(minDate);
  const [dateFrom, setDateFrom] = useState(minDateISO);
  const [dateTo, setDateTo] = useState(todayISO);
  const [activeQuickFilter, setActiveQuickFilter] = useState("30days");

  // Apply a preset date range to the entry date filters (quick filters)
  const handleQuickFilter = (fromDate, toDate, key) => {
    setDateFrom(toISODate(fromDate));
    setDateTo(toISODate(toDate));
    setActiveQuickFilter(key);
    setCurrentPage(1);
  };
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const last7Days = new Date(today);
  last7Days.setDate(today.getDate() - 6);
  const last30Days = new Date(today);
  last30Days.setDate(today.getDate() - 29);

  const [historyList, setHistoryList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Selected image preview modal
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const loadHistory = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const response = await getParkingSessions({
          session_code: sessionCode.trim(),
          license_plate: licensePlate.trim(),
          entry_time_from: dateFrom ? `${dateFrom}T00:00:00` : "",
          entry_time_to: dateTo ? `${dateTo}T23:59:59` : "",
          exit_time_from: filterByTime ? exitTimeFrom : "",
          exit_time_to: filterByTime ? exitTimeTo : "",
          min_fee: feeMin,
          max_fee: feeMax,
          page_size: 100,
        });
        const sessions = Array.isArray(response) ? response : response.results || response.data || [];
        if (!cancelled) setHistoryList(sessions.map(mapSessionToFrontend));
      } catch (error) {
        if (!cancelled) {
          setHistoryList([]);
          setLoadError(error.message || "Không thể tải lịch sử ra/vào.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadHistory();
    return () => { cancelled = true; };
  }, [sessionCode, licensePlate, dateFrom, dateTo, filterByTime, exitTimeFrom, exitTimeTo, feeMin, feeMax]);

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
      if (feeMin && item.feeNumber < Number(feeMin)) {
        return false;
      }
      if (feeMax && item.feeNumber > Number(feeMax)) return false;
      
      // Date and server-supported filters are applied by the sessions API.
      if (filterByTime) {
        const entryClock = item.entryTime.split(" ")[1];
        const exitClock = item.exitTime.split(" ")[1] || "";
        if (entryTimeFrom && entryClock < entryTimeFrom) return false;
        if (entryTimeTo && entryClock > entryTimeTo) return false;
        if (exitTimeFrom && (!exitClock || exitClock < exitTimeFrom)) return false;
        if (exitTimeTo && (!exitClock || exitClock > exitTimeTo)) return false;
      }
      return true;
    });
  }, [historyList, sessionCode, licensePlate, filterByTime, entryTimeFrom, entryTimeTo, exitTimeFrom, exitTimeTo, feeMin, feeMax]);

  const { totalPages, paginatedList } = usePagination(
    filteredList,
    currentPage,
    itemsPerPage,
  );

  const handleResetFilters = () => {
    setSessionCode("");
    setLicensePlate("");
    setEntryTimeFrom(""); setEntryTimeTo(""); setExitTimeFrom(""); setExitTimeTo("");
    setFeeMin(""); setFeeMax(""); setFilterByTime(false);
    setDateFrom(minDateISO); setDateTo(todayISO); setActiveQuickFilter("30days");
    setCurrentPage(1);
  };

  return (
    <>
      <div>
        {/* Page Title */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Lịch sử ra/vào
            </h1>

            {/* Backend data source */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
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
                Tải lại dữ liệu
              </button>
              <button
                type="button"
                onClick={() => setHistoryList([])}
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
                Xóa dữ liệu hiển thị
              </button>
            </div>
          </div>

          {/* Card: Bộ lọc nhanh */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">
              Bộ lọc nhanh
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-x-5 gap-y-4 items-start">
              {/* Mã phiên đỗ */}
              <div className="flex flex-col gap-1.5 lg:col-span-2">
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
              <div className="flex flex-col gap-1.5 lg:col-span-2">
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

              <div className="sm:col-span-2 lg:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Cước phí (từ - đến)</label>
                <div className="flex items-center gap-1">
                  <input type="number" min="0" value={feeMin} onChange={(e) => setFeeMin(e.target.value)} placeholder="0đ" className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2" />
                  <span className="text-slate-400">–</span>
                  <input type="number" min="0" value={feeMax} onChange={(e) => setFeeMax(e.target.value)} placeholder="200.000đ" className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2" />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickFilter(today, today, "today")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${activeQuickFilter === "today" ? "border-blue-600 bg-blue-600 text-white" : "border-blue-200 text-blue-600 bg-blue-50/50"}`}
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => handleQuickFilter(yesterday, yesterday, "yesterday")}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-100/70 transition-colors cursor-pointer"
              >
                Hôm qua
              </button>
              <button
                type="button"
                onClick={() => handleQuickFilter(last7Days, today, "7days")}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-100/70 transition-colors cursor-pointer"
              >
                7 ngày qua
              </button>
              <button
                type="button"
                onClick={() => handleQuickFilter(last30Days, today, "30days")}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-100/70 transition-colors cursor-pointer"
              >
                30 ngày qua
              </button>
              <button type="button" onClick={() => setActiveQuickFilter(activeQuickFilter === "custom" ? "today" : "custom")} className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${activeQuickFilter === "custom" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-600 bg-white"}`}>
                Tùy chỉnh
                <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
              </button>
              <label className="ml-1 flex items-center gap-2 text-xs text-slate-600 cursor-pointer"><input type="checkbox" checked={filterByTime} onChange={(e) => setFilterByTime(e.target.checked)} /> Lọc theo giờ</label>
              {(sessionCode || licensePlate || entryTimeFrom || entryTimeTo || exitTimeFrom || exitTimeTo || feeMin || feeMax || activeQuickFilter !== "today") && <button type="button" onClick={handleResetFilters} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600 cursor-pointer"><span aria-hidden="true">×</span> Xóa bộ lọc</button>}
            </div>

            {activeQuickFilter === "custom" && <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="text-xs font-semibold text-slate-700 sm:min-w-fit">Khoảng ngày <span className="font-normal text-slate-400">(DD/MM/YYYY)</span></label>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input aria-label="Từ ngày" type="date" min={minDateISO} max={todayISO} value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" />
                  <span className="text-slate-400">→</span>
                  <input aria-label="Đến ngày" type="date" min={minDateISO} max={todayISO} value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs" />
                </div>
              </div>
            </div>}

            {filterByTime && <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-xs text-slate-600">Giờ vào từ <input type="text" inputMode="numeric" pattern="[0-9]{2}:[0-9]{2}" placeholder="HH:mm" value={entryTimeFrom} onChange={(e) => setEntryTimeFrom(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1" /> <span>đến</span> <input type="text" inputMode="numeric" pattern="[0-9]{2}:[0-9]{2}" placeholder="HH:mm" value={entryTimeTo} onChange={(e) => setEntryTimeTo(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1" /></label>
              <label className="flex items-center gap-2 text-xs text-slate-600">Giờ ra từ <input type="text" inputMode="numeric" pattern="[0-9]{2}:[0-9]{2}" placeholder="HH:mm" value={exitTimeFrom} onChange={(e) => setExitTimeFrom(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1" /> <span>đến</span> <input type="text" inputMode="numeric" pattern="[0-9]{2}:[0-9]{2}" placeholder="HH:mm" value={exitTimeTo} onChange={(e) => setExitTimeTo(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1" /></label>
            </div>}

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
                {isLoading ? (
                  <div className="flex min-h-48 items-center justify-center"><LoadingSpinner label="Đang tải lịch sử..." /></div>
                ) : loadError ? (
                  <div className="rounded-xl bg-red-50 px-4 py-8 text-center text-sm text-red-700">{loadError}</div>
                ) : filteredList.length === 0 ? (
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
                              className="group relative block h-10 w-14 overflow-hidden rounded-md border border-slate-200 cursor-pointer"
                              aria-label={`Xem ảnh đối soát ${item.licensePlate}`}
                            >
                              <img src={item.plateImageUrl} alt="Ảnh biển số" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
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
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPage(1);
              }}
              className="mt-auto pt-8"
            />
          </section>
      </div>

      {/* Footer Branding from Design System */}
      <footer className="w-full py-4">
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
    </>
  );
}



import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldAlert, BarChart3, PieChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/common/PageHeader.jsx";
import LoadingSpinner from "../components/common/LoadingSpinner.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import Button from "../components/common/button/Button.jsx";
import { useCurrentUser } from "../hooks/useCurrentUser.js";
import { ROUTES } from "../config/navigation.js";
import {
  PAYMENT_METHOD_META,
  TICKET_TYPE_META,
  extractApiErrorInfo,
  getStatisticsSummary,
} from "../services/reportService.js";
import {
  getDatePresetRange,
  validateDateRange,
} from "../utils/statisticsChartHelpers.js";
import {
  OccupancyGaugeCard,
  StatisticsBarChart,
  StatisticsBreakdownTables,
  StatisticsDonutChart,
  StatisticsFilterBar,
  StatisticsKpiGrid,
} from "../components/Statistics/index.js";

function ChartModeToggle({ mode, onChange, label }) {
  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => onChange("donut")}
        aria-pressed={mode === "donut"}
        className={`min-h-[44px] inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
          mode === "donut"
            ? "bg-white text-blue-600 shadow-2xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        <PieChart className="w-3.5 h-3.5" aria-hidden="true" />
        Biểu đồ Tròn
      </button>
      <button
        type="button"
        onClick={() => onChange("bar")}
        aria-pressed={mode === "bar"}
        className={`min-h-[44px] inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
          mode === "bar"
            ? "bg-white text-blue-600 shadow-2xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
        Biểu đồ Cột
      </button>
    </div>
  );
}

export default function StatisticsPage() {
  const navigate = useNavigate();
  const { isManager, role } = useCurrentUser();

  const initialRange = useMemo(() => getDatePresetRange("thisMonth"), []);
  const [draftStartDate, setDraftStartDate] = useState(initialRange.startDate);
  const [draftEndDate, setDraftEndDate] = useState(initialRange.endDate);
  const [appliedRange, setAppliedRange] = useState(initialRange);
  const [activePreset, setActivePreset] = useState("thisMonth");
  const [validationError, setValidationError] = useState(null);

  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(isManager);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const [ticketChartMode, setTicketChartMode] = useState("donut");
  const [methodChartMode, setMethodChartMode] = useState("donut");

  useEffect(() => {
    if (!isManager) {
      return undefined;
    }

    const controller = new AbortController();
    let isCancelled = false;

    async function loadStatistics() {
      try {
        const data = await getStatisticsSummary({
          startDate: appliedRange.startDate,
          endDate: appliedRange.endDate,
          signal: controller.signal,
        });
        if (!isCancelled) {
          setSummary(data);
          setErrorInfo(null);
        }
      } catch (err) {
        if (err?.name === "AbortError" || isCancelled) {
          return;
        }
        const parsed = extractApiErrorInfo(
          err,
          "Lỗi kết nối hệ thống khi tạo biểu đồ thống kê.",
        );
        if (parsed.status === 403) {
          parsed.message = "Bạn không có quyền truy cập chức năng thống kê này.";
        }
        setErrorInfo(parsed);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    loadStatistics();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [isManager, appliedRange.startDate, appliedRange.endDate, reloadNonce]);

  if (!isManager) {
    const fallbackPath =
      role === "CUSTOMER" ? ROUTES.CUSTOMER_OVERVIEW : ROUTES.HOME;
    return (
      <div className="bg-white rounded-xl border border-rose-200 shadow-2xs p-8 text-center max-w-lg mx-auto my-10">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">
          403 - Không có quyền truy cập
        </h1>
        <p className="text-sm text-slate-600 mt-1.5">
          Chức năng Thống kê tổng hợp chỉ dành cho tài khoản Quản lý (Manager).
        </p>
        <button
          type="button"
          onClick={() => navigate(fallbackPath, { replace: true })}
          className="mt-5 min-h-[44px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
        >
          Quay lại trang chính
        </button>
      </div>
    );
  }

  const handleSelectPreset = (presetKey) => {
    const nextRange = getDatePresetRange(presetKey);
    setDraftStartDate(nextRange.startDate);
    setDraftEndDate(nextRange.endDate);
    setActivePreset(presetKey);
    setValidationError(null);
    setErrorInfo(null);
    if (summary) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setAppliedRange(nextRange);
    setReloadNonce((n) => n + 1);
  };

  const handleStartDateChange = (value) => {
    setDraftStartDate(value);
    setActivePreset("custom");
    setValidationError(null);
  };

  const handleEndDateChange = (value) => {
    setDraftEndDate(value);
    setActivePreset("custom");
    setValidationError(null);
  };

  const handleApplyFilter = () => {
    const check = validateDateRange(draftStartDate, draftEndDate);
    if (!check.valid) {
      setValidationError(check);
      return;
    }
    setValidationError(null);
    setErrorInfo(null);
    if (summary) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setAppliedRange({
      startDate: draftStartDate,
      endDate: draftEndDate,
    });
    setReloadNonce((n) => n + 1);
  };

  const handleRefresh = () => {
    const check = validateDateRange(appliedRange.startDate, appliedRange.endDate);
    if (!check.valid) {
      setValidationError(check);
      return;
    }
    setDraftStartDate(appliedRange.startDate);
    setDraftEndDate(appliedRange.endDate);
    setValidationError(null);
    setErrorInfo(null);
    if (summary) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setReloadNonce((n) => n + 1);
  };

  const ticketItems = summary
    ? TICKET_TYPE_META.map((meta) => ({
        key: meta.key,
        label: meta.label,
        color: meta.color,
        value: summary.revenueByTicketType[meta.key] ?? 0,
      }))
    : [];

  const methodItems = summary
    ? PAYMENT_METHOD_META.map((meta) => ({
        key: meta.key,
        label: meta.label,
        color: meta.color,
        value: summary.revenueByPaymentMethod[meta.key] ?? 0,
      }))
    : [];

  const trafficItems = summary
    ? [
        {
          key: "entries",
          label: "Lượt xe vào",
          color: "#2563EB",
          value: summary.traffic.totalEntries,
        },
        {
          key: "exits",
          label: "Lượt xe ra",
          color: "#10B981",
          value: summary.traffic.totalExits,
        },
        {
          key: "parked",
          label: "Đang đỗ hiện tại",
          color: "#475569",
          value: summary.traffic.currentlyParked,
        },
      ]
    : [];

  const isPeriodEmpty =
    summary !== null &&
    summary.totalRevenue === 0 &&
    summary.nonRevenue.walletTopupTotal === 0 &&
    summary.traffic.totalEntries === 0 &&
    summary.traffic.totalExits === 0;

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Thống kê tổng hợp"
        description="Báo cáo doanh thu theo loại vé, phương thức thanh toán, tiền nạp ví Non-Revenue và lưu lượng bãi xe."
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="min-h-[44px]"
            icon={
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
                aria-hidden="true"
              />
            }
          >
            {isRefreshing ? "Đang cập nhật..." : "Làm mới"}
          </Button>
        }
      />

      <StatisticsFilterBar
        startDate={draftStartDate}
        endDate={draftEndDate}
        activePreset={activePreset}
        validationError={validationError}
        isBusy={isLoading || isRefreshing}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        onSelectPreset={handleSelectPreset}
        onApply={handleApplyFilter}
      />

      {/* Trạng thái Loading lần đầu */}
      {isLoading && !summary && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs py-16 flex items-center justify-center">
          <LoadingSpinner size="lg" label="Đang tải dữ liệu thống kê..." />
        </div>
      )}

      {/* Trạng thái Lỗi */}
      {errorInfo && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="text-sm text-rose-800">
            <p className="font-bold">Không thể tải dữ liệu thống kê</p>
            <p className="text-xs mt-0.5">{errorInfo.message}</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Nội dung Dashboard 4.7.1 */}
      {summary && (
        <div
          className={`space-y-5 transition-opacity duration-200 ${
            isRefreshing ? "opacity-70" : "opacity-100"
          }`}
        >
          <StatisticsKpiGrid summary={summary} />

          {isPeriodEmpty ? (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs">
                <EmptyState
                  title="Dữ liệu không tìm thấy"
                  description="Không có giao dịch doanh thu, nạp ví hay lượt xe vào/ra nào trong khoảng thời gian đã chọn. Vui lòng thử khoảng thời gian khác."
                />
              </div>
              <OccupancyGaugeCard occupancy={summary.occupancy} />
            </div>
          ) : (
            <>
              {/* Khu vực 4 biểu đồ SVG/CSS */}
              <section
                aria-label="Biểu đồ trực quan thống kê tổng hợp"
                className="grid grid-cols-1 lg:grid-cols-2 gap-4"
              >
                {/* Khối 1: Doanh thu theo loại vé */}
                <article className="min-w-0 bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Doanh thu theo loại vé
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        HOURLY, DAILY, MONTHLY, QUARTERLY, YEARLY
                      </p>
                    </div>
                    <ChartModeToggle
                      mode={ticketChartMode}
                      onChange={setTicketChartMode}
                      label="Chọn dạng biểu đồ doanh thu theo loại vé"
                    />
                  </div>
                  {ticketChartMode === "donut" ? (
                    <StatisticsDonutChart
                      title="Biểu đồ cơ cấu doanh thu theo loại vé"
                      items={ticketItems}
                    />
                  ) : (
                    <StatisticsBarChart
                      title="Biểu đồ cột doanh thu theo loại vé"
                      items={ticketItems}
                      isCurrency
                    />
                  )}
                </article>

                {/* Khối 2: Doanh thu theo phương thức thanh toán */}
                <article className="min-w-0 bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Doanh thu theo phương thức thanh toán
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tiền mặt (CASH), VietQR và Ví điện tử (WALLET)
                      </p>
                    </div>
                    <ChartModeToggle
                      mode={methodChartMode}
                      onChange={setMethodChartMode}
                      label="Chọn dạng biểu đồ doanh thu theo phương thức thanh toán"
                    />
                  </div>
                  {methodChartMode === "donut" ? (
                    <StatisticsDonutChart
                      title="Biểu đồ cơ cấu doanh thu theo phương thức thanh toán"
                      items={methodItems}
                    />
                  ) : (
                    <StatisticsBarChart
                      title="Biểu đồ cột doanh thu theo phương thức thanh toán"
                      items={methodItems}
                      isCurrency
                    />
                  )}
                </article>

                {/* Khối 3: Lưu lượng xe */}
                <article className="min-w-0 bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-900">
                      Lưu lượng phương tiện vào / ra
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      So sánh lượt xe vào, lượt xe ra trong kỳ và số xe đang đỗ
                    </p>
                  </div>
                  <StatisticsBarChart
                    title="Biểu đồ cột lưu lượng xe vào ra và đang đỗ"
                    items={trafficItems}
                    isCurrency={false}
                    unitLabel="lượt"
                  />
                </article>

                {/* Khối 4: Công suất & Tỷ lệ lấp đầy */}
                <OccupancyGaugeCard occupancy={summary.occupancy} />
              </section>

              {/* Bảng đối soát accessible */}
              <StatisticsBreakdownTables summary={summary} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

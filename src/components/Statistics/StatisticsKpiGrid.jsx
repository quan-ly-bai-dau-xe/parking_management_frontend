import {
  Banknote,
  Ticket,
  CreditCard,
  Wallet,
  ArrowLeftRight,
  ParkingCircle,
  AlertTriangle,
} from "lucide-react";
import { formatCurrencyVND } from "../../constants/paymentConstants.js";
import { formatIsoDateToDisplay } from "../../utils/formatDateTime.js";
import { TICKET_TYPE_META } from "../../services/reportService.js";
import { computeGaugeArc } from "../../utils/statisticsChartHelpers.js";

export default function StatisticsKpiGrid({ summary }) {
  const {
    period,
    totalRevenue,
    revenueByTicketType,
    revenueByPaymentMethod,
    nonRevenue,
    traffic,
    occupancy,
  } = summary;

  // Tìm loại vé có doanh thu cao nhất để hiển thị tóm tắt trên thẻ KPI
  const topTicket = TICKET_TYPE_META.reduce(
    (best, meta) => {
      const amount = revenueByTicketType[meta.key] ?? 0;
      if (amount > best.amount) {
        return { label: meta.label, amount };
      }
      return best;
    },
    { label: "Chưa phát sinh", amount: 0 },
  );

  const topTicketShare =
    totalRevenue > 0 ? ((topTicket.amount / totalRevenue) * 100).toFixed(1) : "0.0";

  const gauge = computeGaugeArc(occupancy.occupancyRate);
  const periodLabel =
    period.startDate && period.endDate
      ? `Kỳ: ${formatIsoDateToDisplay(period.startDate)} - ${formatIsoDateToDisplay(period.endDate)}`
      : "Kỳ hiện tại";

  const toneBadgeMap = {
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <section aria-label="Các chỉ số tổng hợp" className="space-y-4">
      {/* Hàng 1: 4 thẻ KPI tài chính & Non-Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 1. Tổng doanh thu */}
        <article className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Tổng doanh thu
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {formatCurrencyVND(totalRevenue)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{periodLabel}</p>
          </div>
        </article>

        {/* 2. Doanh thu theo loại vé */}
        <article className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Doanh thu theo loại vé
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-lg font-bold text-slate-900 truncate" title={topTicket.label}>
              {topTicket.amount > 0 ? topTicket.label : "Chưa có doanh thu"}
            </p>
            <p className="text-xs text-slate-600 mt-1 tabular-nums">
              {topTicket.amount > 0
                ? `${formatCurrencyVND(topTicket.amount)} (${topTicketShare}% tổng thu)`
                : "Tổng hợp 5 nhóm: Lượt, Ngày, Tháng, Quý, Năm"}
            </p>
          </div>
        </article>

        {/* 3. Doanh thu theo phương thức thanh toán */}
        <article className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Theo phương thức TT
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <dl className="mt-3 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Tiền mặt (CASH):</dt>
              <dd className="font-semibold text-slate-800 tabular-nums">
                {formatCurrencyVND(revenueByPaymentMethod.CASH)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">VietQR:</dt>
              <dd className="font-semibold text-slate-800 tabular-nums">
                {formatCurrencyVND(revenueByPaymentMethod.VIETQR)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Ví điện tử (WALLET):</dt>
              <dd className="font-semibold text-blue-700 tabular-nums">
                {formatCurrencyVND(revenueByPaymentMethod.WALLET)}
              </dd>
            </div>
          </dl>
        </article>

        {/* 4. Tiền nạp ví — Non-Revenue (tách biệt hoàn toàn khỏi doanh thu) */}
        <article className="bg-amber-50/70 rounded-xl border border-amber-300 shadow-2xs p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                Non-Revenue · Nợ phải trả
              </span>
              <p className="text-xs font-semibold text-amber-900 mt-1.5">
                Tiền nạp ví khách hàng
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-bold text-amber-900 tabular-nums">
              {formatCurrencyVND(nonRevenue.walletTopupTotal)}
            </p>
            <p className="text-[11px] text-amber-800 mt-1 leading-snug">
              Không cộng vào doanh thu dịch vụ bãi xe (chỉ tính khi khách thanh toán vé/phí đỗ).
            </p>
          </div>
        </article>
      </div>

      {/* Hàng 2: 2 thẻ vận hành (Lưu lượng xe & Tỷ lệ lấp đầy) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 5. Lưu lượng xe */}
        <article className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Lưu lượng xe trong kỳ</h2>
              <p className="text-xs text-slate-500">Tổng lượt vào/ra theo kỳ và số xe đang đỗ</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-xs text-slate-500">Lượt xe vào</p>
              <p className="text-xl font-bold text-blue-700 tabular-nums mt-0.5">
                {traffic.totalEntries.toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-xs text-slate-500">Lượt xe ra</p>
              <p className="text-xl font-bold text-emerald-700 tabular-nums mt-0.5">
                {traffic.totalExits.toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-xs text-slate-500">Đang đỗ hiện tại</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                {traffic.currentlyParked.toLocaleString("vi-VN")}
              </p>
            </div>
          </div>
        </article>

        {/* 6. Tỷ lệ lấp đầy ô đỗ */}
        <article className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Tỷ lệ lấp đầy bãi xe</h2>
              <p className="text-xs text-slate-500">Trạng thái vị trí đỗ theo thời gian thực</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  toneBadgeMap[gauge.tone] || toneBadgeMap.emerald
                }`}
              >
                {gauge.statusText}
              </span>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ParkingCircle className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-xs text-slate-500">Tỷ lệ lấp đầy</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                {gauge.rate.toFixed(2)}%
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-xs text-slate-500">Đang có xe</p>
              <p className="text-xl font-bold text-blue-700 tabular-nums mt-0.5">
                {occupancy.occupiedSlots.toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-xs text-slate-500">Ô vận hành / Tổng</p>
              <p className="text-xl font-bold text-slate-800 tabular-nums mt-0.5">
                {occupancy.operationalSlots}/{occupancy.totalSlots}
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

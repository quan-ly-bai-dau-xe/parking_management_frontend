import { Wallet } from "lucide-react";
import { formatCurrencyVND } from "../../constants/paymentConstants.js";
import {
  PAYMENT_METHOD_META,
  TICKET_TYPE_META,
} from "../../services/reportService.js";

function computeSharePct(amount, total) {
  if (!total || total <= 0) {
    return "0.0%";
  }
  return `${((amount / total) * 100).toFixed(1)}%`;
}

export default function StatisticsBreakdownTables({ summary }) {
  const {
    totalRevenue,
    revenueByTicketType,
    revenueByPaymentMethod,
    nonRevenue,
  } = summary;

  return (
    <section aria-label="Bảng chi tiết đối soát doanh thu và nạp ví" className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bảng 1: Doanh thu theo loại vé */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Bảng đối soát doanh thu theo loại vé
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Bao gồm phí gửi xe theo lượt/quá giờ và tiền mua/gia hạn vé gói
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">
                Bảng chi tiết doanh thu theo loại vé
              </caption>
              <thead className="bg-slate-50/75 border-b border-slate-200 text-2xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    Loại vé
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Doanh thu (VND)
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Tỷ trọng
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {TICKET_TYPE_META.map((meta) => {
                  const amount = revenueByTicketType[meta.key] ?? 0;
                  return (
                    <tr key={meta.key} className="hover:bg-slate-50/70">
                      <th
                        scope="row"
                        className="px-5 py-3 font-medium text-slate-800"
                      >
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: meta.color }}
                            aria-hidden="true"
                          />
                          <span>{meta.label}</span>
                          <span className="text-[11px] font-mono text-slate-400">
                            ({meta.key})
                          </span>
                        </span>
                      </th>
                      <td className="px-5 py-3 text-right font-semibold text-slate-900 tabular-nums">
                        {formatCurrencyVND(amount)}
                      </td>
                      <td className="px-5 py-3 text-right text-xs font-medium text-slate-500 tabular-nums">
                        {computeSharePct(amount, totalRevenue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50/60 border-t border-slate-200 text-sm font-bold text-slate-900">
                  <th scope="row" className="px-5 py-3">
                    Tổng doanh thu
                  </th>
                  <td className="px-5 py-3 text-right text-blue-700 tabular-nums">
                    {formatCurrencyVND(totalRevenue)}
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-blue-700 tabular-nums">
                    {totalRevenue > 0 ? "100.0%" : "0.0%"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Bảng 2: Doanh thu theo phương thức thanh toán */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Bảng đối soát theo phương thức thanh toán
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân tách thanh toán Tiền mặt, VietQR và trừ từ Ví điện tử (WALLET)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">
                Bảng chi tiết doanh thu theo phương thức thanh toán
              </caption>
              <thead className="bg-slate-50/75 border-b border-slate-200 text-2xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    Phương thức thanh toán
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Doanh thu (VND)
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Tỷ trọng
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {PAYMENT_METHOD_META.map((meta) => {
                  const amount = revenueByPaymentMethod[meta.key] ?? 0;
                  return (
                    <tr key={meta.key} className="hover:bg-slate-50/70">
                      <th
                        scope="row"
                        className="px-5 py-3 font-medium text-slate-800"
                      >
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: meta.color }}
                            aria-hidden="true"
                          />
                          <span>{meta.label}</span>
                        </span>
                      </th>
                      <td className="px-5 py-3 text-right font-semibold text-slate-900 tabular-nums">
                        {formatCurrencyVND(amount)}
                      </td>
                      <td className="px-5 py-3 text-right text-xs font-medium text-slate-500 tabular-nums">
                        {computeSharePct(amount, totalRevenue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50/60 border-t border-slate-200 text-sm font-bold text-slate-900">
                  <th scope="row" className="px-5 py-3">
                    Tổng doanh thu
                  </th>
                  <td className="px-5 py-3 text-right text-blue-700 tabular-nums">
                    {formatCurrencyVND(totalRevenue)}
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-blue-700 tabular-nums">
                    {totalRevenue > 0 ? "100.0%" : "0.0%"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Khối tách biệt Non-Revenue: Tiền nạp ví (Nằm ngoài tổng doanh thu) */}
      <div className="bg-amber-50/60 rounded-xl border border-amber-300 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-amber-900">
                Khoản thu hộ / Nạp ví khách hàng (Non-Revenue)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                Không tính vào tổng doanh thu bãi xe
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-1">{nonRevenue.description}</p>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-amber-900">
              <span>
                Nạp tiền mặt tại quầy:{" "}
                <strong className="tabular-nums">
                  {formatCurrencyVND(nonRevenue.topupCashTotal)}
                </strong>
              </span>
              <span>
                Nạp qua VietQR:{" "}
                <strong className="tabular-nums">
                  {formatCurrencyVND(nonRevenue.topupVietqrTotal)}
                </strong>
              </span>
              <span>
                Nạp qua VNPAY:{" "}
                <strong className="tabular-nums">
                  {formatCurrencyVND(nonRevenue.topupVnpayTotal)}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="text-left md:text-right shrink-0">
          <p className="text-xs font-medium text-amber-800">Tổng tiền nạp ví trong kỳ</p>
          <p className="text-2xl font-bold text-amber-900 tabular-nums mt-0.5">
            {formatCurrencyVND(nonRevenue.walletTopupTotal)}
          </p>
        </div>
      </div>
    </section>
  );
}

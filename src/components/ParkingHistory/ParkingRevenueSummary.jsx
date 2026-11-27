const formatCurrencyVND = (amount) => `${Math.round(Number(amount) || 0).toLocaleString("vi-VN")}đ`;

const BANK_METHODS = new Set(["CARD", "VNPAY", "VIETQR"]);

function parseFeeAmount(item) {
  if (typeof item.fee_amount === "number" && !Number.isNaN(item.fee_amount)) {
    return item.fee_amount;
  }
  if (typeof item.feeAmount === "number" && !Number.isNaN(item.feeAmount)) {
    return item.feeAmount;
  }
  const raw = item.fee_amount ?? item.feeAmount;
  if (raw !== undefined && raw !== null) {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (typeof item.fee === "string") {
    const digits = item.fee.replace(/[^\d]/g, "");
    return digits ? Number(digits) : 0;
  }
  return 0;
}

export default function ParkingRevenueSummary({ items = [] }) {
  const completedItems = items.filter((item) => item.status !== "ACTIVE" && !item.estimatedFee);

  let cashTotal = 0;
  let bankTotal = 0;
  let walletTotal = 0;
  const cashByStaff = new Map();

  for (const item of completedItems) {
    const amount = parseFeeAmount(item);
    const method = item.paymentMethod || item.payment_method;

    if (method === "WALLET") {
      walletTotal += amount;
    } else if (BANK_METHODS.has(method)) {
      bankTotal += amount;
    } else {
      cashTotal += amount;
      const staffName = item.exitHandledByName || item.exit_handled_by_name;
      if (staffName) {
        const staffCode = item.exitHandledByCode || item.exit_handled_by_code;
        const label = staffCode ? `${staffName} (${staffCode})` : staffName;
        cashByStaff.set(label, (cashByStaff.get(label) || 0) + amount);
      }
    }
  }

  const grandTotal = cashTotal + bankTotal + walletTotal;
  const staffEntries = Array.from(cashByStaff.entries());

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Doanh thu & Đối soát ca</h2>
          <p className="text-xs text-slate-500">
            Tổng hợp theo phương thức thanh toán trên {completedItems.length} lượt đã ra bãi (trang hiện tại)
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 mr-2">Tổng cộng:</span>
          <span className="text-base font-bold text-emerald-600">{formatCurrencyVND(grandTotal)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5">
          <div className="text-xs font-medium text-emerald-800">Tiền mặt (CASH)</div>
          <div className="text-lg font-bold text-emerald-700 mt-0.5">{formatCurrencyVND(cashTotal)}</div>
          <div className="text-[11px] text-emerald-700/80 mt-1">Nhân viên thu trực tiếp, cần nộp cuối ca</div>
          {staffEntries.length > 0 && (
            <div className="mt-2 pt-2 border-t border-emerald-200/60 space-y-1">
              {staffEntries.map(([staffLabel, amount]) => (
                <div key={staffLabel} className="flex items-center justify-between text-[11px] text-slate-700">
                  <span className="truncate pr-2">{staffLabel}</span>
                  <span className="font-semibold text-slate-900">{formatCurrencyVND(amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-3.5">
          <div className="text-xs font-medium text-blue-800">Quẹt thẻ / VNPAY / VietQR</div>
          <div className="text-lg font-bold text-blue-700 mt-0.5">{formatCurrencyVND(bankTotal)}</div>
          <div className="text-[11px] text-blue-700/80 mt-1">Chuyển thẳng vào tài khoản ngân hàng bãi xe</div>
        </div>

        <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 p-3.5">
          <div className="text-xs font-medium text-violet-800">Ví điện tử (WALLET)</div>
          <div className="text-lg font-bold text-violet-700 mt-0.5">{formatCurrencyVND(walletTotal)}</div>
          <div className="text-[11px] text-violet-700/80 mt-1">Trừ ví khách hàng tự động</div>
        </div>
      </div>
    </section>
  );
}

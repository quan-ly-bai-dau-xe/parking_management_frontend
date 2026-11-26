import { useState, useEffect, useRef } from "react";
import { BaseModal } from "../common/modal";
import { Button, Pagination, EmptyState } from "../common";
import { WALLET_CONFIG, formatCurrencyVND } from "../../constants/paymentConstants";
import { customerService } from "../../services/customerService";
import {
  walletService,
  generateIdempotencyKey,
  extractApiErrorInfo,
} from "../../services/walletService";
import { useToast } from "../../context/ToastContext";
import { formatDateTimeVN } from "../../utils/formatDateTime";

function formatDateTime(iso) {
  return formatDateTimeVN(iso, "—");
}

function CustomerDetailContent({ customer, onClose, onWalletUpdated, onTopupBusyChange }) {
  const toast = useToast();

  const [detail, setDetail] = useState(null);
  const [wallet, setWallet] = useState(() => ({
    balance: customer.walletBalance ?? 0,
    currency: "VND",
    status: customer.walletStatus || "ACTIVE",
    statusDisplay: customer.walletStatus === "LOCKED" ? "Tạm khóa" : "Đang hoạt động",
  }));
  const [txData, setTxData] = useState({ count: 0, totalPages: 1, currentPage: 1, results: [] });
  const [txPage, setTxPage] = useState(1);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Staff cash top-up state
  const [topupAmount, setTopupAmount] = useState(String(WALLET_CONFIG.DEFAULT_DEPOSIT_AMOUNT_VND));
  const [topupNote, setTopupNote] = useState("");
  const [isTopupSubmitting, setIsTopupSubmitting] = useState(false);
  const [topupError, setTopupError] = useState("");
  const idempotencyKeyRef = useRef(generateIdempotencyKey("cash-topup"));

  useEffect(() => {
    let isSubscribed = true;
    Promise.all([
      customerService.getCustomerById(customer.id),
      walletService.getCustomerWallet(customer.id),
      walletService.getCustomerTransactions(customer.id, { page: txPage, pageSize: 6 }),
    ])
      .then(([detailRes, walletRes, txRes]) => {
        if (!isSubscribed) return;
        setDetail(detailRes);
        setWallet(walletRes);
        setTxData(txRes);
        setLoadError("");
      })
      .catch((err) => {
        if (!isSubscribed) return;
        const info = extractApiErrorInfo(err, "Không thể tải chi tiết ví và khách hàng.");
        setLoadError(info.message);
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [customer.id, txPage, refreshNonce]);

  const handleCashTopup = async (e) => {
    e.preventDefault();
    const numericAmount = Number(topupAmount);
    if (!Number.isFinite(numericAmount) || numericAmount < 1000) {
      setTopupError("Số tiền nạp tiền mặt tối thiểu là 1.000đ.");
      return;
    }

    setIsTopupSubmitting(true);
    onTopupBusyChange?.(true);
    setTopupError("");
    try {
      const result = await walletService.staffTopupCustomerWallet(customer.id, {
        amount: numericAmount,
        idempotencyKey: idempotencyKeyRef.current,
        note: topupNote || "Nạp tiền mặt tại quầy",
      });
      idempotencyKeyRef.current = generateIdempotencyKey("cash-topup");
      setWallet(result.wallet);
      setTopupNote("");
      toast.success(
        `Đã nạp ${formatCurrencyVND(numericAmount)} tiền mặt vào ví khách hàng ${customer.name}.`,
      );
      if (onWalletUpdated) {
        onWalletUpdated(customer.id, result.wallet);
      }
      setRefreshNonce((n) => n + 1);
    } catch (err) {
      const info = extractApiErrorInfo(err, "Nạp tiền mặt vào ví thất bại.");
      setTopupError(info.message);
      toast.error(info.message);
      if (info.status && info.status >= 400 && info.status < 500) {
        idempotencyKeyRef.current = generateIdempotencyKey("cash-topup");
      }
    } finally {
      setIsTopupSubmitting(false);
      onTopupBusyChange?.(false);
    }
  };

  const vehiclesList = detail?.vehicles?.length ? detail.vehicles : customer.vehicles || [];

  return (
    <div className="space-y-5">
      {loadError && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      {/* Customer Identity Info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs">
        <div>
          <p className="text-2xs text-slate-500">Mã khách hàng</p>
          <p className="font-mono font-bold text-slate-900">{customer.customerCode}</p>
        </div>
        <div>
          <p className="text-2xs text-slate-500">Họ tên</p>
          <p className="font-semibold text-slate-900">{detail?.full_name || customer.name}</p>
        </div>
        <div>
          <p className="text-2xs text-slate-500">Số điện thoại</p>
          <p className="font-semibold text-blue-700">{detail?.phone || customer.phone || "—"}</p>
        </div>
        <div>
          <p className="text-2xs text-slate-500">Số CCCD</p>
          <p className="font-medium text-slate-800">
            {detail?.identity_card_number || customer.idNumber || "—"}
          </p>
        </div>
      </div>

      {/* Wallet + Cash Topup panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-900">Số dư Ví hiện tại</span>
              <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-white text-blue-700 border border-blue-200">
                {wallet?.statusDisplay || wallet?.status || "ACTIVE"}
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-800 mt-1">
              {formatCurrencyVND(wallet?.balance ?? 0)}
            </p>
            <p className="text-2xs text-blue-700 mt-1">
              Phương tiện sở hữu: <strong>{vehiclesList.length}</strong> xe
            </p>
          </div>

          {vehiclesList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-blue-200">
              {vehiclesList.map((v) => (
                <span
                  key={v.id || v.license_plate || v.licensePlate}
                  className="px-2 py-0.5 rounded bg-white border border-blue-200 font-mono text-2xs font-semibold text-slate-800"
                >
                  {v.license_plate || v.licensePlate}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Cash Top-up Form */}
        <form
          onSubmit={handleCashTopup}
          className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900">Nạp tiền mặt tại quầy (CASH)</h4>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Ghi có ngay lập tức
            </span>
          </div>

          {topupError && (
            <div className="p-2 rounded bg-rose-50 border border-rose-200 text-2xs text-rose-700">
              {topupError}
            </div>
          )}

          <div className="grid grid-cols-3 gap-1.5">
            {WALLET_CONFIG.DEPOSIT_PRESET_AMOUNTS_VND.slice(0, 6).map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => {
                  setTopupAmount(String(amt));
                  setTopupError("");
                }}
                className={`min-h-[44px] py-1.5 px-2 rounded border text-2xs font-semibold cursor-pointer transition-colors ${
                  Number(topupAmount) === amt
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {formatCurrencyVND(amt)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="number"
              min={1000}
              step={1000}
              required
              value={topupAmount}
              onChange={(e) => {
                setTopupAmount(e.target.value);
                setTopupError("");
              }}
              placeholder="Số tiền nạp (VNĐ)"
              className="min-h-[44px] rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={topupNote}
              onChange={(e) => setTopupNote(e.target.value)}
              placeholder="Ghi chú quầy thu ngân..."
              className="min-h-[44px] rounded-xl border border-slate-200 px-3 text-xs text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="w-full min-h-[44px]"
            disabled={isTopupSubmitting}
          >
            {isTopupSubmitting
              ? "Đang ghi nhận..."
              : `Xác nhận thu tiền mặt ${formatCurrencyVND(topupAmount)}`}
          </Button>
        </form>
      </div>

      {/* Ledger History */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-slate-800">
          Lịch sử biến động ví ({txData.count} giao dịch)
        </h4>
        {isLoading ? (
          <p className="text-xs text-slate-500 py-4 text-center">Đang tải lịch sử ví...</p>
        ) : txData.results.length === 0 ? (
          <EmptyState
            title="Chưa có giao dịch ví"
            description="Thực hiện nạp tiền mặt ở biểu mẫu phía trên để tạo giao dịch đầu tiên."
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-2xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="py-2 px-3">Thời gian</th>
                    <th className="py-2 px-3">Loại GD</th>
                    <th className="py-2 px-3">Ghi chú</th>
                    <th className="py-2 px-3 text-right">Số tiền</th>
                    <th className="py-2 px-3 text-right">Số dư sau</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {txData.results.map((tx) => {
                    const isCredit = tx.transactionType === "CREDIT" || tx.amount > 0;
                    return (
                      <tr key={tx.id}>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-500">
                          {formatDateTime(tx.createdAt)}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          {tx.kindDisplay}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{tx.note || "—"}</td>
                        <td
                          className={`py-2 px-3 text-right font-bold whitespace-nowrap ${
                            isCredit ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isCredit ? "+" : ""}
                          {formatCurrencyVND(tx.amount)}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                          {formatCurrencyVND(tx.balanceAfter)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {txData.totalPages > 1 && (
              <Pagination
                currentPage={txData.currentPage}
                totalPages={txData.totalPages}
                totalItems={txData.count}
                itemsPerPage={6}
                onPageChange={setTxPage}
              />
            )}
          </>
        )}
      </div>

      <div className="flex justify-end pt-2 border-t border-slate-100">
        <Button variant="outline" size="sm" className="min-h-[44px]" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </div>
  );
}

export default function CustomerDetailModal({
  isOpen,
  onClose,
  customer,
  onWalletUpdated,
}) {
  const [isTopupBusy, setIsTopupBusy] = useState(false);

  const handleClose = () => {
    setIsTopupBusy(false);
    onClose?.();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      isBusy={isTopupBusy}
      title={
        customer
          ? `Chi tiết & Ví khách hàng: ${customer.name} (${customer.customerCode})`
          : "Chi tiết khách hàng"
      }
      size="xl"
    >
      {isOpen && customer && (
        <CustomerDetailContent
          key={customer.id}
          customer={customer}
          onClose={handleClose}
          onWalletUpdated={onWalletUpdated}
          onTopupBusyChange={setIsTopupBusy}
        />
      )}
    </BaseModal>
  );
}

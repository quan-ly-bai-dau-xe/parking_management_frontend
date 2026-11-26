import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import AppTopHeader from "../components/layout/AppTopHeader";
import { BaseModal } from "../components/common/modal";
import { Button, Pagination } from "../components/common";
import { ROUTES } from "../config/navigation";
import {
  SIMULATED_TOPUP_DISCLAIMER,
  VNPAY_DISABLED_MESSAGE,
  VNPAY_SANDBOX_DISCLAIMER,
  VNPAY_TOPUP_LIMITS,
  WALLET_CONFIG,
  formatCurrencyVND,
  parseTopupAmountParam,
} from "../constants/paymentConstants";
import { useToast } from "../context/ToastContext";
import {
  walletService,
  generateIdempotencyKey,
  extractApiErrorInfo,
} from "../services/walletService";
import { formatDateTimeVN } from "../utils/formatDateTime";

function formatDateTimeDisplay(isoStr) {
  return formatDateTimeVN(isoStr, "—");
}

function getInitials(fullName) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "KH";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function ProfileEditForm({ profile, onSaved }) {
  const toast = useToast();
  const [formData, setFormData] = useState(() => ({
    full_name: profile?.full_name || "",
    date_of_birth: profile?.date_of_birth || "",
    gender: profile?.gender || "Nam",
    identity_card_number: profile?.identity_card_number || "",
    email: profile?.email || "",
    address: profile?.address || "",
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!formData.full_name.trim()) {
      setErrorMsg("Vui lòng nhập họ và tên.");
      return;
    }
    if (!formData.identity_card_number.trim()) {
      setErrorMsg("Vui lòng nhập số CCCD.");
      return;
    }
    setIsSaving(true);
    setErrorMsg("");
    setSaveSuccess(false);
    try {
      const updated = await walletService.updateMyProfile({
        row_version: profile?.row_version ?? 1,
        full_name: formData.full_name.trim(),
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender || null,
        identity_card_number: formData.identity_card_number.trim(),
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
      });
      toast.success("Cập nhật hồ sơ cá nhân thành công.");
      setSaveSuccess(true);
      onSaved(updated);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const info = extractApiErrorInfo(err, "Không thể cập nhật hồ sơ. Vui lòng thử lại.");
      setErrorMsg(info.message);
      toast.error(info.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pt-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="full_name"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Họ và tên
          </label>
          <input
            type="text"
            id="full_name"
            required
            value={formData.full_name}
            onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Số điện thoại
          </label>
          <input
            type="text"
            id="phone"
            disabled
            value={profile?.phone || ""}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-600 font-mono cursor-not-allowed"
          />
        </div>

        <div>
          <label
            htmlFor="identity_card_number"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Số CCCD
          </label>
          <input
            type="text"
            id="identity_card_number"
            required
            value={formData.identity_card_number}
            onChange={(e) =>
              setFormData((p) => ({ ...p, identity_card_number: e.target.value }))
            }
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
          />
        </div>

        <div>
          <label
            htmlFor="date_of_birth"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Ngày sinh
          </label>
          <input
            type="date"
            id="date_of_birth"
            value={formData.date_of_birth}
            onChange={(e) => setFormData((p) => ({ ...p, date_of_birth: e.target.value }))}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <label
            htmlFor="gender"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Giới tính
          </label>
          <select
            id="gender"
            value={formData.gender}
            onChange={(e) => setFormData((p) => ({ ...p, gender: e.target.value }))}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="address"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Địa chỉ liên hệ
          </label>
          <input
            type="text"
            id="address"
            value={formData.address}
            onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
            placeholder="Nhập địa chỉ liên hệ của bạn..."
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {saveSuccess && (
        <p className="text-xs text-emerald-600 font-medium">
          ✓ Cập nhật hồ sơ thành công!
        </p>
      )}
      {errorMsg && (
        <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <span className="text-[11px] text-slate-400">
          Thông tin cá nhân của bạn luôn được bảo mật.
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer self-end sm:self-auto"
        >
          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </div>
  );
}

function TopupVietQrForm({ walletBalance, onClose, onTopupSuccess, onBusyChange }) {
  const [amount, setAmount] = useState(String(WALLET_CONFIG.DEFAULT_DEPOSIT_AMOUNT_VND));
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [receipt, setReceipt] = useState(null);

  const idempotencyKeyRef = useRef(generateIdempotencyKey("topup-qr"));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 10000) {
      setErrorMsg("Số tiền nạp qua VietQR tối thiểu là 10.000đ.");
      return;
    }
    if (numericAmount > 50000000) {
      setErrorMsg("Số tiền nạp qua VietQR tối đa là 50.000.000đ.");
      return;
    }

    setIsSubmitting(true);
    onBusyChange?.(true);
    setErrorMsg("");
    try {
      const result = await walletService.topupMyWallet({
        amount: numericAmount,
        idempotencyKey: idempotencyKeyRef.current,
        note,
      });
      setReceipt(result);
      await onTopupSuccess(result);
    } catch (err) {
      const info = extractApiErrorInfo(err, "Nạp tiền vào ví thất bại.");
      setErrorMsg(info.message);
      if (info.status && info.status >= 400 && info.status < 500) {
        idempotencyKeyRef.current = generateIdempotencyKey("topup-qr");
      }
    } finally {
      setIsSubmitting(false);
      onBusyChange?.(false);
    }
  };

  if (receipt) {
    return (
      <div className="space-y-4">
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
          <p className="font-bold">
            {receipt.replayed
              ? "Giao dịch đã được ghi nhận trước đó (Idempotent)"
              : "Nạp tiền vào ví thành công!"}
          </p>
          <p>
            Số tiền nạp:{" "}
            <strong className="font-bold">{formatCurrencyVND(receipt.transaction?.amount)}</strong>
          </p>
          <p>
            Số dư ví mới:{" "}
            <strong className="font-bold">{formatCurrencyVND(receipt.wallet?.balance)}</strong>
          </p>
        </div>

        {receipt.simulatedQr && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
            <p className="font-semibold">
              {receipt.simulatedQr.disclaimer || SIMULATED_TOPUP_DISCLAIMER}
            </p>
            {receipt.simulatedQr.qr_payload && (
              <p className="font-mono break-all bg-white/80 p-2 rounded border border-amber-200">
                QR Payload: {receipt.simulatedQr.qr_payload}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="primary" size="sm" className="min-h-[44px]" onClick={onClose}>
            Hoàn tất
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
        {SIMULATED_TOPUP_DISCLAIMER} Để nạp tiền mặt trực tiếp, vui lòng liên hệ nhân viên hoặc quản
        lý bãi xe tại quầy.
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center justify-between text-xs bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200">
        <span className="text-slate-600">Số dư ví hiện tại</span>
        <span className="font-bold text-slate-900 font-mono">{formatCurrencyVND(walletBalance)}</span>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 block">Chọn nhanh mệnh giá</label>
        <div className="grid grid-cols-3 gap-2">
          {WALLET_CONFIG.DEPOSIT_PRESET_AMOUNTS_VND.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => {
                setAmount(String(amt));
                setErrorMsg("");
              }}
              className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                Number(amount) === amt
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {formatCurrencyVND(amt)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-700">
          Hoặc nhập số tiền (VNĐ) <span className="text-rose-500">*</span>
        </label>
        <input
          type="number"
          min={10000}
          max={50000000}
          step={1000}
          required
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setErrorMsg("");
          }}
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-700">Ghi chú giao dịch</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ví dụ: Nạp tiền mua vé tháng..."
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-[44px] min-w-[44px]"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Hủy
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="min-h-[44px]"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Đang xử lý..." : `Xác nhận nạp ${formatCurrencyVND(amount)}`}
        </Button>
      </div>
    </form>
  );
}

function TopupVnpayForm({
  walletBalance,
  initialAmount,
  requestedMissingAmount,
  minAmount = VNPAY_TOPUP_LIMITS.MIN_VND,
  maxAmount = VNPAY_TOPUP_LIMITS.MAX_VND,
  isVnpayAvailable = true,
  onVnpayDisabled,
  onRedirect,
  onClose,
  onBusyChange,
}) {
  const defaultValue = String(initialAmount || WALLET_CONFIG.DEFAULT_DEPOSIT_AMOUNT_VND);
  const [amount, setAmount] = useState(defaultValue);
  const [orderInfo, setOrderInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const submitLockRef = useRef(false);

  const presetAmounts =
    requestedMissingAmount &&
    requestedMissingAmount >= minAmount &&
    requestedMissingAmount <= maxAmount &&
    !WALLET_CONFIG.DEPOSIT_PRESET_AMOUNTS_VND.includes(requestedMissingAmount)
      ? [requestedMissingAmount, ...WALLET_CONFIG.DEPOSIT_PRESET_AMOUNTS_VND]
      : WALLET_CONFIG.DEPOSIT_PRESET_AMOUNTS_VND;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isVnpayAvailable) {
      setErrorMsg(VNPAY_DISABLED_MESSAGE);
      return;
    }
    if (submitLockRef.current || isSubmitting) {
      return;
    }

    const trimmed = String(amount).trim();
    if (!/^\d+$/.test(trimmed)) {
      setErrorMsg("Số tiền nạp qua VNPAY phải là số nguyên VND hợp lệ.");
      return;
    }
    const numericAmount = Number(trimmed);
    if (!Number.isSafeInteger(numericAmount) || numericAmount < minAmount) {
      setErrorMsg(`Số tiền nạp qua VNPAY tối thiểu là ${formatCurrencyVND(minAmount)}.`);
      return;
    }
    if (numericAmount > maxAmount) {
      setErrorMsg(`Số tiền nạp qua VNPAY tối đa là ${formatCurrencyVND(maxAmount)}.`);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    onBusyChange?.(true);
    setErrorMsg("");
    try {
      const res = await walletService.createVnpayTopup({
        amount: numericAmount,
        orderInfo,
        locale: "vn",
      });
      if (!/^https?:\/\/\S+/i.test(res?.paymentUrl || "")) {
        setErrorMsg("Liên kết thanh toán VNPAY trả về không hợp lệ.");
        return;
      }
      try {
        if (typeof globalThis.sessionStorage !== "undefined") {
          globalThis.sessionStorage.setItem(
            "sp_vnpay_pending_txn",
            JSON.stringify({
              txnRef: res.txnRef,
              amount: res.amount,
              balanceBefore: Number(walletBalance || 0),
              createdAt: Date.now(),
            }),
          );
        }
      } catch {
        // Ignore storage errors in restricted contexts
      }
      if (typeof onRedirect === "function") {
        onRedirect(res.paymentUrl, res);
      } else if (typeof window !== "undefined") {
        window.location.assign(res.paymentUrl);
      }
    } catch (err) {
      const info = extractApiErrorInfo(err, "Không thể khởi tạo giao dịch VNPAY.");
      if (info.status === 503 || info.code === "PROP-VNPAY-DISABLED") {
        onVnpayDisabled?.();
        setErrorMsg(info.message || VNPAY_DISABLED_MESSAGE);
      } else {
        setErrorMsg(info.message);
      }
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
      onBusyChange?.(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        data-testid="vnpay-sandbox-disclaimer"
        className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1"
      >
        <p className="font-bold">VNPAY SANDBOX</p>
        <p>{VNPAY_SANDBOX_DISCLAIMER}</p>
      </div>

      {!isVnpayAvailable && (
        <div
          data-testid="vnpay-disabled-notice"
          className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-xs text-slate-700"
        >
          {VNPAY_DISABLED_MESSAGE}
        </div>
      )}

      {requestedMissingAmount !== null && requestedMissingAmount < minAmount && (
        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
          Số tiền còn thiếu là {formatCurrencyVND(requestedMissingAmount)}, mức nạp tối thiểu qua VNPAY là{" "}
          {formatCurrencyVND(minAmount)}.
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center justify-between text-xs bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200">
        <span className="text-slate-600">Số dư ví hiện tại</span>
        <span className="font-bold text-slate-900 font-mono">{formatCurrencyVND(walletBalance)}</span>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 block">Chọn nhanh mệnh giá</label>
        <div className="grid grid-cols-3 gap-2">
          {presetAmounts.map((amt) => (
            <button
              key={amt}
              type="button"
              disabled={!isVnpayAvailable || isSubmitting}
              onClick={() => {
                setAmount(String(amt));
                setErrorMsg("");
              }}
              className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer disabled:opacity-50 ${
                Number(amount) === amt
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {formatCurrencyVND(amt)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="vnpay-topup-amount" className="text-xs font-semibold text-slate-700">
          Số tiền nạp (VNĐ, số nguyên) <span className="text-rose-500">*</span>
        </label>
        <input
          id="vnpay-topup-amount"
          type="text"
          inputMode="numeric"
          disabled={!isVnpayAvailable || isSubmitting}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setErrorMsg("");
          }}
          placeholder="100000"
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="vnpay-order-info" className="text-xs font-semibold text-slate-700">
          Nội dung thanh toán (tùy chọn)
        </label>
        <input
          id="vnpay-order-info"
          type="text"
          disabled={!isVnpayAvailable || isSubmitting}
          value={orderInfo}
          onChange={(e) => setOrderInfo(e.target.value)}
          placeholder="Ví dụ: Nap tien vi Smart Parking"
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-[44px] min-w-[44px]"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Hủy
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="min-h-[44px]"
          disabled={!isVnpayAvailable || isSubmitting}
        >
          {isSubmitting
            ? "Đang chuyển sang VNPAY..."
            : `Thanh toán VNPAY ${/^\d+$/.test(String(amount).trim()) ? formatCurrencyVND(amount) : ""}`}
        </Button>
      </div>
    </form>
  );
}

export default function CustomerProfilePage({ onRedirect = null } = {}) {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [txData, setTxData] = useState({ count: 0, totalPages: 1, currentPage: 1, results: [] });

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [isTopupSubmitting, setIsTopupSubmitting] = useState(false);
  const [vnpayRuntimeDisabled, setVnpayRuntimeDisabled] = useState(false);
  const [selectedTopupMethod, setSelectedTopupMethod] = useState(null);

  const [txPage, setTxPage] = useState(1);
  const [txDirection, setTxDirection] = useState("");
  const [txKind, setTxKind] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);

  const topupParam = String(
    searchParams.get("topup") || location.state?.topupMethod || "",
  ).toLowerCase();
  const hasQueryOpen = Boolean(
    searchParams.get("topup") || searchParams.get("amount") || location.state?.openTopup,
  );
  const effectiveTopupModalOpen = isTopupModalOpen || hasQueryOpen;

  const isVnpayAvailable = wallet?.vnpayEnabled !== false && !vnpayRuntimeDisabled;
  const isSimulatedAvailable = wallet?.simulatedTopupEnabled === true;

  const activeTopupMethod =
    selectedTopupMethod === "vietqr" && isSimulatedAvailable
      ? "vietqr"
      : selectedTopupMethod === "vnpay"
        ? "vnpay"
        : topupParam === "vietqr" && isSimulatedAvailable
          ? "vietqr"
          : isVnpayAvailable
            ? "vnpay"
            : isSimulatedAvailable
              ? "vietqr"
              : "vnpay";

  const minVnd = wallet?.vnpayMinAmount || VNPAY_TOPUP_LIMITS.MIN_VND;
  const maxVnd = wallet?.vnpayMaxAmount || VNPAY_TOPUP_LIMITS.MAX_VND;
  const requestedMissingAmount =
    parseTopupAmountParam(searchParams.get("amount")) ??
    parseTopupAmountParam(location.state?.topupAmount);
  const prefillAmount = requestedMissingAmount
    ? Math.min(maxVnd, Math.max(minVnd, requestedMissingAmount))
    : null;

  const handleCloseTopupModal = () => {
    setIsTopupModalOpen(false);
    setSelectedTopupMethod(null);
    if (hasQueryOpen) {
      navigate(ROUTES.CUSTOMER_PROFILE, { replace: true, state: null });
    }
  };

  useEffect(() => {
    let isSubscribed = true;
    Promise.all([
      walletService.getMyProfile(),
      walletService.getMyWallet(),
      walletService.getMyTransactions({
        page: txPage,
        pageSize: 8,
        direction: txDirection,
        kind: txKind,
      }),
    ])
      .then(([profileRes, walletRes, transactionsRes]) => {
        if (!isSubscribed) return;
        setProfile(profileRes);
        setWallet(walletRes);
        setTxData(transactionsRes);
        setLoadError("");
      })
      .catch((err) => {
        if (!isSubscribed) return;
        const info = extractApiErrorInfo(err, "Không thể tải hồ sơ cá nhân và ví.");
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
  }, [txPage, txDirection, txKind, refreshNonce]);

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshNonce((n) => n + 1);
  };

  const handleTopupSuccess = () => {
    toast.success("Nạp tiền vào ví thành công.");
    setRefreshNonce((n) => n + 1);
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-between font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* 1. Header biến thể Customer */}
      <AppTopHeader
        variant="customer"
        activePath={ROUTES.CUSTOMER_PROFILE}
        showHelp={true}
        showCamera={false}
      />

      {/* 2. Nội dung chính */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Tiêu đề trang */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Thông tin cá nhân
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý hồ sơ, bảo mật tài khoản và ví Smart Parking của bạn.
          </p>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center text-xs text-slate-500 shadow-xs">
            Đang tải dữ liệu hồ sơ và ví...
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-3xl border border-rose-200 p-6 text-center space-y-3 shadow-xs">
            <p className="text-xs text-rose-600">{loadError}</p>
            <Button variant="outline" size="sm" className="min-h-[44px]" onClick={handleRefresh}>
              Thử lại
            </Button>
          </div>
        ) : (
          <>
            {/* Lưới 2 cột */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* CỘT TRÁI (8 CỘT) */}
              <div className="lg:col-span-8 space-y-6">
                {/* Card Hồ sơ cá nhân */}
                <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
                  <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-900">
                      Hồ sơ cá nhân
                    </h2>
                    <span className="text-xs font-semibold text-blue-600">
                      {profile?.status_display || profile?.status || "Đã xác minh"}
                    </span>
                  </div>

                  {/* Avatar & Tên hiển thị */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-5 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-slate-100 shrink-0 bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                        {getInitials(profile?.full_name)}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-900">
                          {profile?.full_name || "Khách hàng"}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">
                          Mã khách hàng: {profile?.code || wallet?.customerCode || "—"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toast.info("Tính năng cập nhật ảnh đại diện đang được phát triển.")}
                      className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
                    >
                      Đổi ảnh đại diện
                    </button>
                  </div>

                  <ProfileEditForm
                    key={`${profile?.id ?? "me"}-${profile?.row_version ?? 1}`}
                    profile={profile}
                    onSaved={(updated) => setProfile(updated)}
                  />
                </section>

                {/* Card Bảo mật tài khoản */}
                <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Bảo mật tài khoản
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Thay đổi mật khẩu định kỳ để bảo vệ tài khoản.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.info("Tính năng đổi mật khẩu khách hàng đang được phát triển.")}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors shrink-0 cursor-pointer"
                  >
                    Đổi mật khẩu
                  </button>
                </section>
              </div>

              {/* CỘT PHẢI (4 CỘT) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Card Ví Smart Parking */}
                <section className="bg-gradient-to-tr from-[#0F172A] to-[#1E293B] text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-900/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.68rem] font-bold tracking-widest text-slate-300 uppercase block">
                      VÍ SMART PARKING ({wallet?.currency || "VND"})
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-semibold">
                      {wallet?.statusDisplay || "Đang hoạt động"}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block mb-1">
                      Số dư khả dụng
                    </span>
                    <div className="text-3xl font-extrabold tracking-tight font-mono">
                      {formatCurrencyVND(wallet?.balance ?? 0)}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    Dùng để mua vé và thanh toán phí đỗ xe tự động tại các cổng ra vào.
                  </p>

                  {isVnpayAvailable ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTopupMethod("vnpay");
                          setIsTopupModalOpen(true);
                        }}
                        className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span className="text-base font-bold leading-none">+</span>
                        <span>Nạp tiền vào ví qua VNPAY</span>
                      </button>

                      <p className="text-[11px] text-slate-400 text-center pt-1">
                        {VNPAY_SANDBOX_DISCLAIMER}
                      </p>

                      {isSimulatedAvailable && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTopupMethod("vietqr");
                            setIsTopupModalOpen(true);
                          }}
                          className="w-full min-h-[44px] inline-flex items-center justify-center text-[11px] text-slate-300 underline hover:text-white cursor-pointer text-center"
                        >
                          Hoặc nạp qua VietQR (Mô phỏng)
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div
                        data-testid="vnpay-card-disabled"
                        className="rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2.5 text-[11px] text-slate-200"
                      >
                        {VNPAY_DISABLED_MESSAGE}
                      </div>
                      {isSimulatedAvailable && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTopupMethod("vietqr");
                            setIsTopupModalOpen(true);
                          }}
                          className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span className="text-base font-bold leading-none">+</span>
                          <span>Nạp tiền qua VietQR (Mô phỏng)</span>
                        </button>
                      )}
                    </div>
                  )}
                </section>

                {/* Card Thanh toán thuận tiện */}
                <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-2">
                  <h3 className="font-bold text-sm text-slate-900">
                    Thanh toán thuận tiện
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Nạp tiền qua cổng VNPAY hoặc chuyển khoản tại quầy. Theo dõi mọi
                    khoản thu, chi ngay bên dưới.
                  </p>
                  <p className="text-[11px] text-slate-400 pt-1">
                    Cần hỗ trợ giao dịch? Liên hệ <strong>1900 1234</strong>.
                  </p>
                </section>
              </div>
            </div>

            {/* 3. Bảng Lịch sử giao dịch */}
            <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Lịch sử giao dịch
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sổ cái giao dịch bất biến (Tổng {txData.count} giao dịch).
                  </p>
                </div>
                <select
                  value={txKind}
                  onChange={(e) => {
                    setTxKind(e.target.value);
                    setTxPage(1);
                  }}
                  aria-label="Lọc theo nghiệp vụ giao dịch"
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 outline-none focus:border-blue-500 self-start sm:self-auto"
                >
                  <option value="">Tất cả nghiệp vụ</option>
                  <option value="TOPUP_VNPAY">Nạp tiền qua VNPAY</option>
                  <option value="TOPUP_VIETQR">Nạp ví VietQR</option>
                  <option value="TOPUP_CASH">Nạp tiền mặt</option>
                  <option value="PARKING_FEE">Thanh toán phí gửi xe</option>
                  <option value="TICKET_PURCHASE">Mua vé gửi xe</option>
                  <option value="TICKET_RENEWAL">Gia hạn vé</option>
                  <option value="REFUND">Hoàn tiền</option>
                  <option value="ADJUSTMENT">Điều chỉnh ví</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="inline-flex p-1 bg-slate-100/80 rounded-xl gap-1">
                  {[
                    { key: "", label: "Tất cả" },
                    { key: "CREDIT", label: "Nạp tiền" },
                    { key: "DEBIT", label: "Thanh toán" },
                  ].map((tab) => (
                    <button
                      key={tab.key || "ALL"}
                      type="button"
                      onClick={() => {
                        setTxDirection(tab.key);
                        setTxPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        txDirection === tab.key
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <span className="text-xs text-slate-400">
                  Trang {txData.currentPage} / {txData.totalPages}
                </span>
              </div>

              {txData.results.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Chưa có giao dịch ví nào được ghi nhận.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                        <th className="py-3 px-3">Thời gian</th>
                        <th className="py-3 px-3">Nội dung giao dịch</th>
                        <th className="py-3 px-3">Ghi chú</th>
                        <th className="py-3 px-3 text-right">Số tiền</th>
                        <th className="py-3 px-3 text-right">Số dư sau GD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {txData.results.map((tx) => {
                        const isCredit = tx.transactionType === "CREDIT" || tx.amount > 0;
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                              {formatDateTimeDisplay(tx.createdAt)}
                            </td>
                            <td className="py-3.5 px-3">
                              <p className="font-semibold text-slate-800">{tx.kindDisplay}</p>
                            </td>
                            <td className="py-3.5 px-3 text-slate-500">
                              {tx.note || (tx.referenceType ? `${tx.referenceType} #${tx.referenceId}` : "—")}
                            </td>
                            <td
                              className={`py-3.5 px-3 text-right font-mono font-semibold whitespace-nowrap ${
                                isCredit ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {isCredit ? "+" : ""}
                              {formatCurrencyVND(tx.amount)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                              {formatCurrencyVND(tx.balanceAfter)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {txData.totalPages > 1 && (
                <div className="pt-3 border-t border-slate-100">
                  <Pagination
                    currentPage={txData.currentPage}
                    totalPages={txData.totalPages}
                    totalItems={txData.count}
                    itemsPerPage={8}
                    onPageChange={setTxPage}
                  />
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* 4. Footer */}
      <footer className="w-full bg-white border-t border-slate-200/80 px-6 sm:px-10 lg:px-14 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
        <div>© 2026 Smart Mobility · Smart Parking</div>
        <div className="flex items-center gap-6">
          <a
            href="#privacy"
            onClick={(e) => e.preventDefault()}
            className="hover:text-slate-600 transition-colors"
          >
            Chính sách bảo mật
          </a>
          <span>
            Hỗ trợ: <strong className="text-slate-700 font-normal">1900 1234</strong>
          </span>
        </div>
      </footer>

      <BaseModal
        isOpen={effectiveTopupModalOpen}
        onClose={handleCloseTopupModal}
        isBusy={isTopupSubmitting}
        title={
          activeTopupMethod === "vietqr"
            ? "Nạp tiền vào Ví Smart Parking (VietQR)"
            : "Nạp tiền bằng VNPAY (Sandbox)"
        }
        size="md"
      >
        {effectiveTopupModalOpen && (
          <div className="space-y-4">
            {isVnpayAvailable && isSimulatedAvailable && (
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <button
                  type="button"
                  onClick={() => setSelectedTopupMethod("vnpay")}
                  className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    activeTopupMethod === "vnpay"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  VNPAY (Sandbox)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTopupMethod("vietqr")}
                  className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    activeTopupMethod === "vietqr"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  VietQR (Mô phỏng)
                </button>
              </div>
            )}

            {activeTopupMethod === "vietqr" && isSimulatedAvailable ? (
              <TopupVietQrForm
                key="vietqr-topup"
                walletBalance={wallet?.balance ?? 0}
                onClose={handleCloseTopupModal}
                onTopupSuccess={handleTopupSuccess}
                onBusyChange={setIsTopupSubmitting}
              />
            ) : (
              <TopupVnpayForm
                key={`vnpay-${prefillAmount ?? "default"}`}
                walletBalance={wallet?.balance ?? 0}
                initialAmount={prefillAmount}
                requestedMissingAmount={requestedMissingAmount}
                minAmount={minVnd}
                maxAmount={maxVnd}
                isVnpayAvailable={isVnpayAvailable}
                onVnpayDisabled={() => setVnpayRuntimeDisabled(true)}
                onRedirect={onRedirect}
                onClose={handleCloseTopupModal}
                onBusyChange={setIsTopupSubmitting}
              />
            )}
          </div>
        )}
      </BaseModal>
    </div>
  );
}

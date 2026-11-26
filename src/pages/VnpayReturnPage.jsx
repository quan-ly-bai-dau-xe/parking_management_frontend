import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppTopHeader from "../components/layout/AppTopHeader";
import { Button } from "../components/common";
import { ROUTES } from "../config/navigation";
import { formatCurrencyVND } from "../constants/paymentConstants";
import { walletService, extractApiErrorInfo } from "../services/walletService";

const MAX_POLL_ATTEMPTS = 8;
const DEFAULT_POLL_INTERVAL_MS = 2000;

export default function VnpayReturnPage({
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  maxPollAttempts = MAX_POLL_ATTEMPTS,
} = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const statusParam = String(searchParams.get("status") || "").toLowerCase();
  const txnRef = String(searchParams.get("txn_ref") || "").trim();
  const codeParam = String(searchParams.get("code") || "").trim();

  const initialMode =
    statusParam === "invalid_signature"
      ? "INVALID_SIGNATURE"
      : statusParam === "failed"
        ? "FAILED"
        : txnRef
          ? "POLLING"
          : "INVALID_SIGNATURE";

  const [viewState, setViewState] = useState(initialMode);
  const [confirmedAmount, setConfirmedAmount] = useState(0);
  const [confirmedBalance, setConfirmedBalance] = useState(null);
  const [statusError, setStatusError] = useState("");
  const [manualCheckNonce, setManualCheckNonce] = useState(0);

  const checkTopupOnce = useCallback(async () => {
    if (!txnRef) {
      return { credited: false, amount: 0, balance: null };
    }
    const statusRes = await walletService.getVnpayTopupStatus(txnRef);
    if (statusRes.status === "CREDITED") {
      return {
        credited: true,
        amount: statusRes.amount,
        balance: statusRes.balance,
      };
    }
    // Cross-check wallet & ledger in case caller environment only mocks wallet/transactions
    const [walletRes, txRes] = await Promise.all([
      walletService.getMyWallet(),
      walletService.getMyTransactions({ page: 1, pageSize: 10, direction: "CREDIT" }),
    ]);
    const matchedTx = (txRes?.results || []).find(
      (tx) => tx?.idempotencyKey === `vnpay-${txnRef}`,
    );
    if (matchedTx) {
      return {
        credited: true,
        amount: matchedTx.amount,
        balance: walletRes.balance,
      };
    }
    return {
      credited: false,
      amount: statusRes.amount,
      balance: walletRes.balance,
    };
  }, [txnRef]);

  useEffect(() => {
    if (initialMode !== "POLLING" || !txnRef) {
      return undefined;
    }

    let isMounted = true;
    let timerId = null;

    const runPoll = async (attempt) => {
      try {
        const result = await checkTopupOnce();
        if (!isMounted) return;
        if (result.credited) {
          setConfirmedAmount(result.amount);
          setConfirmedBalance(result.balance);
          setStatusError("");
          setViewState("CREDITED");
          return;
        }
        if (attempt + 1 >= maxPollAttempts) {
          setConfirmedAmount(result.amount);
          setConfirmedBalance(result.balance);
          setViewState("TIMEOUT");
          return;
        }
        timerId = setTimeout(() => {
          void runPoll(attempt + 1);
        }, pollIntervalMs);
      } catch (err) {
        if (!isMounted) return;
        const info = extractApiErrorInfo(err, "Không thể kiểm tra trạng thái giao dịch VNPAY.");
        setStatusError(info.message);
        if (attempt + 1 >= maxPollAttempts) {
          setViewState("TIMEOUT");
          return;
        }
        timerId = setTimeout(() => {
          void runPoll(attempt + 1);
        }, pollIntervalMs);
      }
    };

    void runPoll(0);

    return () => {
      isMounted = false;
      if (timerId !== null) {
        clearTimeout(timerId);
      }
    };
  }, [initialMode, txnRef, checkTopupOnce, maxPollAttempts, pollIntervalMs, manualCheckNonce]);

  return (
    <div className="min-h-screen bg-[#FAF8FF] text-slate-800 flex flex-col justify-between font-sans">
      <AppTopHeader variant="customer" activePath={ROUTES.CUSTOMER_PROFILE} />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-slate-900">Kết quả nạp tiền VNPAY (Sandbox)</h1>
            {txnRef && (
              <p className="text-2xs text-slate-500 font-mono break-all">
                Mã tham chiếu: {txnRef}
              </p>
            )}
          </div>

          {viewState === "INVALID_SIGNATURE" && (
            <div
              data-testid="vnpay-return-invalid"
              role="alert"
              className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2"
            >
              <p className="font-bold">Chữ ký giao dịch VNPAY không hợp lệ.</p>
              <p>
                Hệ thống không xác nhận giao dịch này và không cộng tiền vào ví. Nếu cần hỗ trợ,
                vui lòng kiểm tra lại lịch sử giao dịch ví của bạn.
              </p>
            </div>
          )}

          {viewState === "FAILED" && (
            <div
              data-testid="vnpay-return-failed"
              role="alert"
              className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2"
            >
              <p className="font-bold">Giao dịch VNPAY không thành công hoặc đã bị hủy.</p>
              <p>
                Mã phản hồi cổng thanh toán: <strong className="font-mono">{codeParam || "99"}</strong>.
                Số dư ví của bạn không thay đổi.
              </p>
            </div>
          )}

          {viewState === "POLLING" && (
            <div
              data-testid="vnpay-return-pending"
              className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-2"
            >
              <p className="font-bold">Đang chờ hệ thống xác nhận ghi có vào ví...</p>
              <p>
                Vui lòng giữ nguyên trang trong giây lát để hệ thống đối soát kết quả IPN từ VNPAY.
              </p>
            </div>
          )}

          {viewState === "CREDITED" && (
            <div
              data-testid="vnpay-return-credited"
              className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1.5"
            >
              <p className="font-bold text-sm">Nạp tiền vào ví thành công!</p>
              <p>
                Số tiền đã ghi có: <strong>{formatCurrencyVND(confirmedAmount)}</strong>
              </p>
              {confirmedBalance !== null && (
                <p>
                  Số dư ví mới: <strong>{formatCurrencyVND(confirmedBalance)}</strong>
                </p>
              )}
            </div>
          )}

          {viewState === "TIMEOUT" && (
            <div
              data-testid="vnpay-return-timeout"
              className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2"
            >
              <p className="font-bold">Giao dịch đang chờ cổng VNPAY xác nhận (IPN chưa phản hồi).</p>
              <p>
                Hệ thống chỉ cộng tiền vào ví sau khi nhận được xác nhận hợp lệ từ VNPAY. Bạn có
                thể kiểm tra lại hoặc xem lịch sử ví sau ít phút.
              </p>
              {statusError && <p className="text-rose-700">{statusError}</p>}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
            {(viewState === "TIMEOUT" || viewState === "POLLING") && txnRef && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px]"
                onClick={() => {
                  setViewState("POLLING");
                  setManualCheckNonce((n) => n + 1);
                }}
              >
                Kiểm tra lại ngay
              </Button>
            )}
            {(viewState === "FAILED" || viewState === "INVALID_SIGNATURE") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px]"
                onClick={() => navigate(`${ROUTES.CUSTOMER_PROFILE}?topup=vnpay`)}
              >
                Thử nạp lại
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="min-h-[44px]"
              onClick={() => navigate(ROUTES.CUSTOMER_PROFILE)}
            >
              Về trang Ví của tôi
            </Button>
          </div>
        </div>
      </main>

      <footer className="w-full bg-white border-t border-slate-200/80 px-4 sm:px-6 lg:px-10 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 mt-6">
        <div>© 2026 Smart Mobility · Smart Parking</div>
        <div className="flex items-center gap-6">
          <a href="#privacy" onClick={(e) => e.preventDefault()} className="hover:text-slate-600 transition-colors">
            Chính sách bảo mật
          </a>
          <span>Hỗ trợ: <strong className="text-slate-700 font-normal">1900 1234</strong></span>
        </div>
      </footer>
    </div>
  );
}

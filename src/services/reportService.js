import { apiClient } from "./apiClient.js";
import { extractApiErrorInfo } from "./walletService.js";

export const NON_REVENUE_DEFAULT_DESCRIPTION =
  "Tổng tiền nạp vào ví khách hàng (tiền trả trước, ghi nhận nợ phải trả, không tính vào doanh thu dịch vụ bãi xe)";

export const TICKET_TYPE_META = [
  { key: "HOURLY", label: "Vé lượt / Quá giờ", color: "#3B82F6" },
  { key: "DAILY", label: "Vé ngày", color: "#1E40AF" },
  { key: "MONTHLY", label: "Vé tháng", color: "#10B981" },
  { key: "QUARTERLY", label: "Vé quý", color: "#9333EA" },
  { key: "YEARLY", label: "Vé năm", color: "#F59E0B" },
];

export const PAYMENT_METHOD_META = [
  { key: "CASH", label: "Tiền mặt (CASH)", color: "#10B981" },
  { key: "VIETQR", label: "Chuyển khoản VietQR", color: "#3B82F6" },
  { key: "WALLET", label: "Ví điện tử (WALLET)", color: "#475569" },
];

function toSafeMoneyNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return 0;
  }
  return Math.round(num);
}

function toSafeInt(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return 0;
  }
  return Math.trunc(num);
}

function toSafeRate(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(num * 100) / 100));
}

function unwrapPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return {};
  }
  if (
    payload.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data) &&
    payload.total_revenue === undefined &&
    payload.revenue_by_ticket_type === undefined
  ) {
    return payload.data;
  }
  return payload;
}

/**
 * Chuẩn hóa payload API thống kê tổng hợp 4.7.1 (hỗ trợ cả JSON phẳng và envelope { data }).
 */
export function normalizeStatisticsSummary(payload) {
  const raw = unwrapPayload(payload);
  const rawPeriod = raw.period && typeof raw.period === "object" ? raw.period : {};
  const rawByType =
    raw.revenue_by_ticket_type && typeof raw.revenue_by_ticket_type === "object"
      ? raw.revenue_by_ticket_type
      : {};
  const rawByMethod =
    raw.revenue_by_payment_method && typeof raw.revenue_by_payment_method === "object"
      ? raw.revenue_by_payment_method
      : {};
  const rawNonRevenue =
    raw.non_revenue && typeof raw.non_revenue === "object" ? raw.non_revenue : {};
  const rawTraffic = raw.traffic && typeof raw.traffic === "object" ? raw.traffic : {};
  const rawOccupancy =
    raw.occupancy && typeof raw.occupancy === "object" ? raw.occupancy : {};

  const totalSlots = toSafeInt(rawOccupancy.total_slots ?? rawOccupancy.totalSlots);
  const operationalSlots = toSafeInt(
    rawOccupancy.operational_slots ?? rawOccupancy.operationalSlots ?? totalSlots,
  );
  const occupiedSlots = toSafeInt(
    rawOccupancy.occupied_slots ?? rawOccupancy.occupiedSlots,
  );

  return {
    period: {
      startDate: String(rawPeriod.start_date ?? rawPeriod.startDate ?? ""),
      endDate: String(rawPeriod.end_date ?? rawPeriod.endDate ?? ""),
    },
    totalRevenue: toSafeMoneyNumber(raw.total_revenue ?? raw.totalRevenue),
    totalRevenueRaw: String(raw.total_revenue ?? raw.totalRevenue ?? "0.00"),
    revenueByTicketType: {
      HOURLY: toSafeMoneyNumber(rawByType.HOURLY),
      DAILY: toSafeMoneyNumber(rawByType.DAILY),
      MONTHLY: toSafeMoneyNumber(rawByType.MONTHLY),
      QUARTERLY: toSafeMoneyNumber(rawByType.QUARTERLY),
      YEARLY: toSafeMoneyNumber(rawByType.YEARLY),
    },
    revenueByPaymentMethod: {
      CASH: toSafeMoneyNumber(rawByMethod.CASH),
      VIETQR: toSafeMoneyNumber(rawByMethod.VIETQR),
      WALLET: toSafeMoneyNumber(rawByMethod.WALLET),
    },
    nonRevenue: {
      walletTopupTotal: toSafeMoneyNumber(
        rawNonRevenue.wallet_topup_total ?? rawNonRevenue.walletTopupTotal,
      ),
      topupCashTotal: toSafeMoneyNumber(
        rawNonRevenue.topup_cash_total ?? rawNonRevenue.topupCashTotal,
      ),
      topupVietqrTotal: toSafeMoneyNumber(
        rawNonRevenue.topup_vietqr_total ?? rawNonRevenue.topupVietqrTotal,
      ),
      topupVnpayTotal: toSafeMoneyNumber(
        rawNonRevenue.topup_vnpay_total ?? rawNonRevenue.topupVnpayTotal,
      ),
      description:
        typeof rawNonRevenue.description === "string" && rawNonRevenue.description.trim()
          ? rawNonRevenue.description.trim()
          : NON_REVENUE_DEFAULT_DESCRIPTION,
    },
    traffic: {
      totalEntries: toSafeInt(rawTraffic.total_entries ?? rawTraffic.totalEntries),
      totalExits: toSafeInt(rawTraffic.total_exits ?? rawTraffic.totalExits),
      currentlyParked: toSafeInt(
        rawTraffic.currently_parked ?? rawTraffic.currentlyParked,
      ),
    },
    occupancy: {
      totalSlots,
      operationalSlots,
      occupiedSlots,
      availableSlots: toSafeInt(
        rawOccupancy.available_slots ?? rawOccupancy.availableSlots,
      ),
      reservedSlots: toSafeInt(
        rawOccupancy.reserved_slots ?? rawOccupancy.reservedSlots,
      ),
      chargingSlots: toSafeInt(
        rawOccupancy.charging_slots ?? rawOccupancy.chargingSlots,
      ),
      maintenanceSlots: toSafeInt(
        rawOccupancy.maintenance_slots ?? rawOccupancy.maintenanceSlots,
      ),
      occupancyRate: toSafeRate(
        rawOccupancy.occupancy_rate ?? rawOccupancy.occupancyRate,
      ),
    },
  };
}

export async function getStatisticsSummary({ startDate = "", endDate = "", signal } = {}) {
  const params = {};
  if (startDate) {
    params.start_date = startDate;
  }
  if (endDate) {
    params.end_date = endDate;
  }

  const res = await apiClient("/api/v1/reports/statistics/summary/", {
    method: "GET",
    params,
    signal,
  });

  return normalizeStatisticsSummary(res);
}

export { extractApiErrorInfo };

export const reportService = {
  getStatisticsSummary,
  normalizeStatisticsSummary,
  extractApiErrorInfo,
};

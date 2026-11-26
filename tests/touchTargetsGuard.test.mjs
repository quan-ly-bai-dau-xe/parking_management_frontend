import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(FRONTEND_ROOT, "src");

function readSrc(relPath) {
  return fs.readFileSync(path.join(SRC_ROOT, relPath), "utf8");
}

function assertMin44Near(src, anchor, label, { requireWidth = false, fromEnd = false } = {}) {
  const idx = fromEnd ? src.lastIndexOf(anchor) : src.indexOf(anchor);
  assert.notEqual(idx, -1, `${label}: anchor ${JSON.stringify(anchor)} not found`);
  const start = Math.max(0, idx - 520);
  const end = Math.min(src.length, idx + 480);
  const snippet = src.slice(start, end);
  assert.match(
    snippet,
    /(min-h-\[44px\]|h-11|h-12)/,
    `${label}: missing >= 44px height class near ${JSON.stringify(anchor)}`,
  );
  if (requireWidth) {
    assert.match(
      snippet,
      /(min-w-\[44px\]|w-11|w-12|w-full)/,
      `${label}: missing >= 44px width class near ${JSON.stringify(anchor)}`,
    );
  }
}

function assertNoMin44Near(src, anchor, label, { before = 260, after = 120, fromEnd = false } = {}) {
  const idx = fromEnd ? src.lastIndexOf(anchor) : src.indexOf(anchor);
  assert.notEqual(idx, -1, `${label}: anchor ${JSON.stringify(anchor)} not found`);
  const start = Math.max(0, idx - before);
  const end = Math.min(src.length, idx + after);
  const snippet = src.slice(start, end);
  assert.doesNotMatch(
    snippet,
    /(min-h-\[44px\]|min-w-\[44px\]|h-11|h-12)/,
    `${label}: R7 violation — origin/main element must NOT be enlarged near ${JSON.stringify(anchor)}`,
  );
}

test("L3-GUARD-01: AppSidebar mobile drawer close button and nav items satisfy >= 44px touch targets", () => {
  const src = readSrc("components/layout/AppSidebar.jsx");
  assertMin44Near(src, 'aria-label="Đóng menu"', "AppSidebar mobile close button", {
    requireWidth: true,
  });
  const mobileDrawerStart = src.indexOf("{isMobileOpen && (");
  assert.notEqual(mobileDrawerStart, -1, "AppSidebar mobile drawer block missing");
  const drawerSrc = src.slice(mobileDrawerStart);
  assert.match(
    drawerSrc,
    /min-h-\[44px\].*item\.label|min-h-\[44px\]/s,
    "AppSidebar mobile nav buttons must include min-h-[44px]",
  );
  assert.match(
    src.slice(0, mobileDrawerStart),
    /min-h-\[44px\]/,
    "AppSidebar desktop nav/collapse buttons must include min-h-[44px]",
  );
});

test("L3-GUARD-02: Team-added table actions (CustomerTableColumns 'Ví & Chi tiết', TicketTable 'Sửa') satisfy >= 44px", () => {
  const customerCols = readSrc("components/CustomerManagement/CustomerTableColumns.jsx");
  assertMin44Near(customerCols, 'label: "Ví & Chi tiết"', "CustomerTableColumns Ví & Chi tiết", {
    requireWidth: true,
  });

  const ticketTable = readSrc("components/TicketManagement/TicketTable.jsx");
  assertMin44Near(ticketTable, 'label: "Sửa"', "TicketTable Sửa", {
    requireWidth: true,
  });
});

test("L3-GUARD-03: Statistics (NEW FEATURE UI) controls satisfy >= 44px touch targets", () => {
  const filterBar = readSrc("components/Statistics/StatisticsFilterBar.jsx");
  assertMin44Near(filterBar, "onSelectPreset?.(preset.key)", "StatisticsFilterBar preset buttons");
  assertMin44Near(filterBar, 'id="stats-start-date"', "StatisticsFilterBar start date input");
  assertMin44Near(filterBar, 'id="stats-end-date"', "StatisticsFilterBar end date input");
  assertMin44Near(filterBar, "Áp dụng", "StatisticsFilterBar submit button");

  const statsPage = readSrc("pages/StatisticsPage.jsx");
  assertMin44Near(statsPage, "Biểu đồ Tròn", "StatisticsPage ChartModeToggle donut");
  assertMin44Near(statsPage, "Biểu đồ Cột", "StatisticsPage ChartModeToggle bar");
  assertMin44Near(statsPage, "onClick={handleRefresh}", "StatisticsPage refresh button");
  assertMin44Near(statsPage, "Thử lại", "StatisticsPage retry button");

  const donut = readSrc("components/Statistics/StatisticsDonutChart.jsx");
  assertMin44Near(donut, "setActiveKey(seg.key)", "StatisticsDonutChart legend button", {
    fromEnd: true,
  });

  const bar = readSrc("components/Statistics/StatisticsBarChart.jsx");
  assert.match(
    bar,
    /fill="transparent"/,
    "StatisticsBarChart bar group must render a >=44px transparent SVG hit-target rect",
  );
});

test("L3-GUARD-04: GateCameraControlModal and EntryLanePanel team-added controls satisfy >= 44px", () => {
  const gateModal = readSrc("components/VehicleManagement/GateCameraControlModal.jsx");
  assertMin44Near(gateModal, 'data-testid="auto-apply-toggle-label"', "GateCameraControlModal auto-apply toggle label");
  assertMin44Near(gateModal, "setAutoApplyBannerMessage(\"\")", "GateCameraControlModal auto-apply banner close", {
    requireWidth: true,
    fromEnd: true,
  });
  assertMin44Near(gateModal, "workerInfoBannerActiveRef.current = false;", "GateCameraControlModal info banner close", {
    requireWidth: true,
    fromEnd: true,
  });

  const entryPanel = readSrc("components/VehicleManagement/scanPlate/EntryLanePanel.jsx");
  assertMin44Near(entryPanel, "Mở trang đăng ký ↗", "EntryLanePanel quick register link");
});

test("L3-GUARD-05: CustomerProfilePage topup modal, CustomerTicketPage tabs/pill & ParkingLotFilters wrap cleanly >= 44px", () => {
  const profileSrc = readSrc("pages/CustomerProfilePage.jsx");
  assertMin44Near(profileSrc, 'id="date_of_birth"', "CustomerProfilePage date_of_birth input");
  assertMin44Near(profileSrc, 'id="gender"', "CustomerProfilePage gender select");
  assertMin44Near(profileSrc, 'id="address"', "CustomerProfilePage address input");
  assertMin44Near(profileSrc, 'aria-label="Lọc theo nghiệp vụ giao dịch"', "CustomerProfilePage txKind select");
  assertMin44Near(profileSrc, "Hoặc nạp qua VietQR (Mô phỏng)", "CustomerProfilePage fallback VietQR button");
  assertMin44Near(profileSrc, "Nạp tiền qua VietQR (Mô phỏng)", "CustomerProfilePage fallback main VietQR button");
  assertMin44Near(profileSrc, 'setSelectedTopupMethod("vnpay")', "CustomerProfilePage topup modal VNPAY tab", {
    fromEnd: true,
  });
  assertMin44Near(profileSrc, 'setSelectedTopupMethod("vietqr")', "CustomerProfilePage topup modal VietQR tab", {
    fromEnd: true,
  });
  assertMin44Near(profileSrc, 'id="vnpay-topup-amount"', "CustomerProfilePage VNPAY amount input");
  assertMin44Near(profileSrc, 'id="vnpay-order-info"', "CustomerProfilePage VNPAY orderInfo input");
  assertMin44Near(profileSrc, "Hoàn tất", "CustomerProfilePage SimulatedVietqrTopupForm Hoàn tất button");

  const ticketSrc = readSrc("pages/CustomerTicketPage.jsx");
  assertMin44Near(ticketSrc, "openTopup: true, topupMethod: \"vnpay\"", "CustomerTicketPage wallet pill Nạp tiền button", {
    requireWidth: true,
  });
  assertMin44Near(ticketSrc, 'label: "Đã hết hạn"', "CustomerTicketPage Đã hết hạn tab");
  const filterWrapperIdx = ticketSrc.indexOf("{/* Bộ lọc trạng thái vé */}");
  assert.notEqual(filterWrapperIdx, -1, "CustomerTicketPage filter tabs comment missing");
  const filterWrapperSnippet = ticketSrc.slice(filterWrapperIdx, filterWrapperIdx + 240);
  assert.match(
    filterWrapperSnippet,
    /flex-wrap/,
    "CustomerTicketPage filter tabs container must use flex-wrap to prevent 375px horizontal overflow",
  );

  const lotFiltersSrc = readSrc("components/ParkingLotManagement/ParkingLotFilters.jsx");
  const modeIdx = lotFiltersSrc.indexOf("View mode toggle buttons");
  assert.notEqual(modeIdx, -1, "ParkingLotFilters view mode comment missing");
  const modeSnippet = lotFiltersSrc.slice(Math.max(0, modeIdx - 120), modeIdx + 40);
  assert.match(
    modeSnippet,
    /flex-wrap/,
    "ParkingLotFilters right-side button group must use flex-wrap to prevent 375px horizontal overflow",
  );
});

test("L3-GUARD-06: Team-added modals and customer/staff actions satisfy >= 44px touch targets", () => {
  const vnpayReturn = readSrc("pages/VnpayReturnPage.jsx");
  assertMin44Near(vnpayReturn, "Kiểm tra lại ngay", "VnpayReturnPage re-check button");
  assertMin44Near(vnpayReturn, "Thử nạp lại", "VnpayReturnPage retry button");
  assertMin44Near(vnpayReturn, "Về trang Ví của tôi", "VnpayReturnPage back to profile button");

  const detailModal = readSrc("components/CustomerManagement/CustomerDetailModal.jsx");
  assertMin44Near(detailModal, "WALLET_CONFIG.DEPOSIT_PRESET_AMOUNTS_VND.slice(0, 6)", "CustomerDetailModal preset buttons");
  assertMin44Near(detailModal, 'placeholder="Số tiền nạp (VNĐ)"', "CustomerDetailModal amount input");
  assertMin44Near(detailModal, 'placeholder="Ghi chú quầy thu ngân..."', "CustomerDetailModal note input");

  const reserveModal = readSrc("components/ParkingLotManagement/ReserveSlotModal.jsx");
  assertMin44Near(reserveModal, 'id="reserve-vehicle-select"', "ReserveSlotModal vehicle select");
  assertMin44Near(reserveModal, 'id="reserved-from"', "ReserveSlotModal reserved-from input");
  assertMin44Near(reserveModal, 'id="reserved-until"', "ReserveSlotModal reserved-until input");
  assertMin44Near(reserveModal, "Xác nhận đặt chỗ", "ReserveSlotModal submit button");

  const editTicketModal = readSrc("components/TicketManagement/EditTicketModal.jsx");
  assertMin44Near(editTicketModal, "Lưu thay đổi", "EditTicketModal submit button");

  const customerOverview = readSrc("pages/CustomerOverviewPage.jsx");
  assertMin44Near(customerOverview, "Nạp tiền ví", "CustomerOverviewPage Nạp tiền ví button");
  assertMin44Near(customerOverview, "Nạp tiền / Lịch sử ví →", "CustomerOverviewPage Nạp tiền / Lịch sử ví button");

  const customerVehicle = readSrc("pages/CustomerVehiclePage.jsx");
  assertMin44Near(customerVehicle, "setActionError(\"\")", "CustomerVehiclePage Đóng banner button", {
    requireWidth: true,
    fromEnd: true,
  });
  assertMin44Near(customerVehicle, "preselectedVehicleCode: v.code", "CustomerVehiclePage footer Mua vé button", {
    fromEnd: true,
  });

  const notifications = readSrc("pages/NotificationsPage.jsx");
  assertMin44Near(notifications, 'setFilterType("PAYMENT")', "NotificationsPage Thanh toán tab");
  assertMin44Near(notifications, "Nạp {formatCurrencyVND(notification.missingAmount)}", "NotificationsPage Nạp shortfall button");

  const slotMatrix = readSrc("components/ParkingLotManagement/ParkingSlotMatrix.jsx");
  assertMin44Near(slotMatrix, "Xem thông tin phương tiện", "ParkingSlotMatrix context menu view vehicle");
  assertMin44Near(slotMatrix, "Đăng ký đỗ xe", "ParkingSlotMatrix context menu reserve slot");
});

test("L3-GUARD-07: R7 Regression Guard — origin/main teammate controls must NEVER be enlarged", () => {
  const entryPanel = readSrc("components/VehicleManagement/scanPlate/EntryLanePanel.jsx");
  assertNoMin44Near(entryPanel, "onClick={onForceCloseSession}", "EntryLanePanel force close session button (origin/main)", {
    before: 140,
    after: 280,
  });
  assertNoMin44Near(entryPanel, "onClick={onConfirmEntry}", "EntryLanePanel confirm entry button (origin/main)", {
    before: 200,
    after: 300,
  });

  const exitPanel = readSrc("components/VehicleManagement/scanPlate/ExitLanePanel.jsx");
  assertNoMin44Near(exitPanel, "Miễn cước đặc cách (Sự cố camera / Xe vé tháng)", "ExitLanePanel fee-exempt label (origin/main)", {
    before: 520,
    after: 40,
  });
  assertNoMin44Near(exitPanel, "setPaymentMethod(PAYMENT_METHODS.WALLET)", "ExitLanePanel WALLET button (origin/main)", {
    before: 120,
    after: 460,
  });
  assertNoMin44Near(exitPanel, "setPaymentMethod(PAYMENT_METHODS.VNPAY)", "ExitLanePanel VNPAY button (origin/main)", {
    before: 120,
    after: 490,
  });
  assertNoMin44Near(exitPanel, "setPaymentMethod(PAYMENT_METHODS.CASH)", "ExitLanePanel CASH button (origin/main)", {
    before: 120,
    after: 420,
  });
  assertNoMin44Near(exitPanel, "onClick={onConfirmExit}", "ExitLanePanel confirm exit button (origin/main)", {
    before: 120,
    after: 880,
  });

  const onboard = readSrc("pages/OnBoardProfile.jsx");
  assertNoMin44Near(onboard, 'id="agreePolicy"', "OnBoardProfile #agreePolicy wrapper (origin/main)", {
    before: 180,
    after: 460,
  });

  const customerOverview = readSrc("pages/CustomerOverviewPage.jsx");
  assertNoMin44Near(customerOverview, "Xem sơ đồ bãi →", "CustomerOverviewPage Xem sơ đồ bãi button (origin/main)", {
    before: 300,
    after: 40,
  });

  const untouchedOriginMainFiles = [
    "components/CustomerManagement/CustomerFilters.jsx",
    "components/CustomerManagement/CustomerDataTable.jsx",
    "components/VehicleManagement/VehicleFilters.jsx",
    "components/TicketManagement/TicketFilters.jsx",
    "components/ParkingHistory/ParkingHistoryFilters.jsx",
    "pages/EmployeeManagement.jsx",
    "pages/LoginPage.jsx",
  ];
  for (const relPath of untouchedOriginMainFiles) {
    assert.doesNotMatch(
      readSrc(relPath),
      /(min-h-\[44px\]|min-w-\[44px\])/,
      `${relPath}: origin/main file must have 0 touch-target resize classes`,
    );
  }
});

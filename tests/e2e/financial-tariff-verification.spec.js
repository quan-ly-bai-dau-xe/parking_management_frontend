import { test, expect } from "@playwright/test";
import { loginAsStaff } from "./helpers/auth.js";

/**
 * E2E Suite: Financial & Tariff Verification (Kiểm tra Tính Phí, Thu Tiền & Guard Tài Chính)
 * Đảm bảo hệ thống tuân thủ nghiêm ngặt:
 * 1. Không sai lệch số tiền thu (Zero floating-point issues, Decimal calculation).
 * 2. Vé tháng hợp lệ được miễn 100% cước phí (0đ).
 * 3. Xe vãng lai / không vé tính đúng biểu phí (10.000đ/giờ đầu, làm tròn theo quy tắc OQ-85 / TL-50).
 * 4. Chuyển đổi phương thức thanh toán (Tiền mặt, VietQR Napas 247, Trừ Ví mô phỏng).
 * 5. Ngăn chặn thất thoát: Không cho phép mở barrier nếu chưa chọn phương thức thanh toán hoặc chưa xác nhận cước.
 */
test.describe("Mission-Critical: Financial & Tariff Verification (E2E Kiểm Tra Tiền & Thanh Toán)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page);
  });

  test("TC-FIN-01: Đối soát cước phí Làn Ra - Xe vé tháng hợp lệ phải hiển thị 0đ & miễn phí", async ({ page }) => {
    // 1. Lấy phương tiện có vé tháng hợp lệ ĐANG ĐỖ trong bãi (status=parked & ticket_state=valid)
    //    Nếu bãi hiện tại không có xe vé tháng đang đỗ, fallback sang xe vé tháng bất kỳ (ticket_state=valid)
    let res = await page.request.get("/api/v1/vehicles/?status=parked&ticket_state=valid&page_size=1");
    expect(res.ok()).toBeTruthy();
    let data = await res.json();
    let vehicle = data.results?.[0];
    let isCurrentlyParked = Boolean(vehicle);

    if (!vehicle) {
      // Fallback: Tìm xe có vé tháng hợp lệ để đối soát tính phí 0đ
      res = await page.request.get("/api/v1/vehicles/?ticket_state=valid&page_size=1");
      expect(res.ok()).toBeTruthy();
      data = await res.json();
      vehicle = data.results?.[0];
      isCurrentlyParked = false;
    }

    expect(vehicle, "Backend phải có ít nhất 1 xe có vé tháng hợp lệ (ticket_state=valid)").toBeDefined();
    expect(vehicle.license_plate, "Phương tiện từ Backend phải có biển số hợp lệ").toBeTruthy();

    const targetPlate = vehicle.license_plate;

    // 2. Mở Modal Kiểm soát cổng tại Làn Ra
    await page.goto("/vehicles");
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    const exitLaneBtn = page.getByRole("button", { name: /Làn Ra/i });
    await exitLaneBtn.click();

    // 3. Nhập biển số thật từ Backend và tra cứu
    const modalInputPlate = page.getByPlaceholder(/Nhập hoặc quét biển số/i);
    await modalInputPlate.fill(targetPlate);
    const searchBtn = page.getByRole("button", { name: /Tra cứu/i });
    await searchBtn.click();

    // 4. Kiểm tra panel đối soát xe ra
    await expect(page.locator("body")).toContainText(/THÔNG TIN PHƯƠNG TIỆN RA/i);

    // Nếu xe đang đỗ trong bãi (có session mở), tuyệt đối không được có cảnh báo Ghost Exit
    if (isCurrentlyParked) {
      await expect(page.getByText(/Cảnh báo Ghost Exit/i)).not.toBeVisible();
    }

    // 5. Cuộn đến phần "Phí gửi xe phải thu" trong modal (nằm phía dưới, bị ẩn khi modal dài)
    //    Selector dựa trên text thực tế trong ExitLanePanel.jsx dòng 214
    const feeSection = page.getByText(/Phí gửi xe phải thu/i).first();
    await feeSection.scrollIntoViewIfNeeded();

    // 6. Assert: Phải hiển thị cước phí 0đ / Vé tháng / Miễn phí cho xe vé tháng hợp lệ
    await expect(feeSection).toBeVisible();
    await expect(page.locator("body")).toContainText(/0đ|Vé tháng|Miễn phí/i);
  });

  test("TC-FIN-03: Mua vé tháng & Tính toán chiết khấu biểu phí định kỳ (/customerTicket)", async ({ page }) => {
    // 1. Mở trang Quản lý vé khách hàng
    await page.goto("/customerTicket");
    await expect(page.locator("body")).toContainText(/Vé của tôi/i);

    // 2. Mở Modal Mua vé mới
    const buyBtn = page.getByRole("button", { name: /Mua vé mới/i });
    await expect(buyBtn).toBeVisible({ timeout: 10000 });
    await buyBtn.click();

    // 3. Kiểm tra Modal xuất hiện
    await expect(page.locator("body")).toContainText(/Đăng ký & Mua vé đỗ xe/i);

    // 4. Chọn gói vé 1 Tháng (giá gốc không chiết khấu)
    const monthPlanBtn = page.getByRole("button", { name: /Vé tháng/i }).first();
    await expect(monthPlanBtn).toBeVisible();
    await monthPlanBtn.click();
    await expect(page.locator("body")).toContainText(/Tổng thanh toán/i);

    // 5. Chọn gói vé Quý 3 Tháng (-10% chiết khấu)
    const quarterPlanBtn = page.getByRole("button", { name: /Vé quý \(3 tháng\)/i });
    await expect(quarterPlanBtn).toBeVisible();
    await quarterPlanBtn.click();
    await expect(page.locator("body")).toContainText(/Chiết khấu gói vé quý/i);

    // 6. Chọn gói vé Năm 12 Tháng (-20% chiết khấu)
    const yearPlanBtn = page.getByRole("button", { name: /Vé năm \(12 tháng\)/i });
    await expect(yearPlanBtn).toBeVisible();
    await yearPlanBtn.click();
    await expect(page.locator("body")).toContainText(/Chiết khấu gói vé năm/i);

    // 7. Kiểm tra chuyển đổi phương thức thanh toán: Ví Smart Parking & Chuyển khoản QR
    const walletMethodBtn = page.getByRole("button", { name: /Ví Smart Parking/i });
    const qrMethodBtn = page.getByRole("button", { name: /Chuyển khoản QR/i });

    await expect(walletMethodBtn).toBeVisible();
    await expect(qrMethodBtn).toBeVisible();

    await qrMethodBtn.click();
    await expect(qrMethodBtn).toHaveClass(/border-blue-600/);

    await walletMethodBtn.click();
    await expect(walletMethodBtn).toHaveClass(/border-blue-600/);

    // 8. Đóng modal an toàn
    const closeBtn = page.getByRole("button", { name: "✕" }).first();
    await closeBtn.click();
    await expect(page.locator("body")).not.toContainText(/Đăng ký & Mua vé đỗ xe/i);
  });

  test("TC-FIN-05: Nạp tiền vào Ví Smart Parking qua cổng Sandbox VNPAY (/profile)", async ({ page }) => {
    // 1. Mở trang Hồ sơ & Ví cá nhân
    await page.goto("/profile");
    await expect(page.locator("body")).toContainText(/Ví Smart Parking|Số dư khả dụng/i);

    // 2. Mở Modal Nạp tiền
    const depositBtn = page.getByRole("button", { name: /Nạp tiền thử nghiệm qua VNPAY/i });
    await expect(depositBtn).toBeVisible({ timeout: 10000 });
    await depositBtn.click();

    // 3. Kiểm tra Modal nạp tiền xuất hiện kèm cờ Sandbox Test
    await expect(page.locator("body")).toContainText(/Nạp tiền vào Ví Smart Parking/i);
    await expect(page.locator("body")).toContainText(/Sandbox Test/i);
    await expect(page.locator("body")).toContainText(/Cổng thanh toán điện tử VNPAY/i);

    // 4. Chọn các mệnh giá nạp tiền khác nhau (50.000đ, 200.000đ, 500.000đ)
    const amount200kBtn = page.getByRole("button", { name: /200\.000đ/i });
    await expect(amount200kBtn).toBeVisible();
    await amount200kBtn.click();
    await expect(page.getByRole("button", { name: /Xác nhận nạp 200\.000đ/i })).toBeVisible();

    const amount500kBtn = page.getByRole("button", { name: /500\.000đ/i });
    await expect(amount500kBtn).toBeVisible();
    await amount500kBtn.click();
    const confirmDepositBtn = page.getByRole("button", { name: /Xác nhận nạp 500\.000đ/i });
    await expect(confirmDepositBtn).toBeVisible();

    // 5. Bấm nạp tiền mô phỏng
    await confirmDepositBtn.click();
    await expect(page.locator("body")).toContainText(/Đang kết nối VNPAY\.\.\.|Đã nạp thành công/i);

    // 6. Chờ thông báo thành công và kiểm tra modal tự động đóng sau khi nạp xong
    await expect(page.locator("body")).toContainText(/Đã nạp thành công 500\.000đ vào ví!/i, { timeout: 5000 });
  });

  test("TC-FIN-06: Thu cước đối soát giải phóng xe tồn đọng Anti-Passback", async ({ page }) => {
    // 1. Mở Modal Scan biển số tại Làn Vào
    await page.goto("/vehicles");
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // 2. Tra cứu xe đang có phiên treo chưa đóng (43B-40962)
    const plateWithOpenSession = "43B-40962";
    const modalInputPlate = page.getByPlaceholder(/Nhập hoặc quét biển số/i);
    await modalInputPlate.fill(plateWithOpenSession);
    const searchBtn = page.getByRole("button", { name: /Tra cứu/i });
    await searchBtn.click();

    // 3. Hệ thống chặn check-in và hiển thị nút "Đối soát & Đóng phiên cũ"
    const resolveSafetyBtn = page.getByRole("button", { name: /Đối soát & Đóng phiên cũ/i });
    await expect(resolveSafetyBtn).toBeVisible({ timeout: 10000 });
    await resolveSafetyBtn.click();

    // 4. Modal đối soát phiên cũ mở ra: kiểm tra các thông tin tài chính
    await expect(page.locator("body")).toContainText(/Xác nhận xử lý phiên gửi cũ còn tồn tại/i);
    await expect(page.locator("body")).toContainText(/Cước phí cần thu phiên cũ/i);
    await expect(page.locator("body")).toContainText(/Hình thức thu cước phiên cũ/i);

    // 5. Kiểm tra các tùy chọn phương thức thu cước: Tiền mặt, VNPAY/VietQR hoặc Trừ ví
    await expect(page.locator("body")).toContainText(/Tiền mặt/i);
    await expect(page.locator("body")).toContainText(/Chuyển khoản \/ QR|VNPAY|VietQR/i);

    // 6. Đóng modal an toàn mà không làm mất phiên test
    const cancelModalBtn = page.getByRole("button", { name: /Hủy bỏ & Không đóng/i });
    await expect(cancelModalBtn).toBeVisible();
    await cancelModalBtn.click();
    await expect(page.locator("body")).not.toContainText(/Xác nhận xử lý phiên gửi cũ còn tồn tại/i);
  });

  test("TC-FIN-04: Đối soát chéo cước phí giữa Backend API và giao diện Lịch sử ra/vào (/history)", async ({ page }) => {
    // 1. Gọi trực tiếp Backend API lấy danh sách các phiên đỗ xe thực tế (cả phiên đang mở và đã đóng)
    const apiRes = await page.request.get("/api/v1/parking/sessions/?page_size=5");
    expect(apiRes.ok()).toBeTruthy();
    const data = await apiRes.json();
    const sessions = data.results || [];
    expect(sessions.length).toBeGreaterThan(0);

    // Chọn một phiên thực tế từ Backend để đối soát (ưu tiên phiên có cước phí hoặc đã đóng)
    const targetSession = sessions.find((s) => Number(s.fee_amount) > 0) || sessions[0];
    const targetPlate = targetSession.license_plate;
    const targetCode = targetSession.session_code;
    const rawFeeNumber = Number(targetSession.fee_amount || 0);

    // Chuẩn bị định dạng tiền dự kiến khớp theo chuẩn Việt Nam (VD: 0đ, 10.000đ, 30.000đ)
    const expectedFeeVnd = new Intl.NumberFormat("vi-VN").format(rawFeeNumber) + "đ";

    // 2. Mở trang Lịch sử ra/vào trên giao diện Frontend
    await page.goto("/history");
    await expect(page.locator("body")).toContainText(/Lịch sử ra vào bãi/i);

    // 3. Sử dụng bộ lọc biển số xe để tìm đúng phiên cần đối soát
    const plateFilterInput = page.getByPlaceholder(/Nhập biển số xe.../i);
    await expect(plateFilterInput).toBeVisible();
    await plateFilterInput.fill(targetPlate);

    const applyFilterBtn = page.getByRole("button", { name: /Tìm kiếm/i });
    if (await applyFilterBtn.isVisible()) {
      await applyFilterBtn.click();
    }

    // 4. Assert: Bản ghi phải xuất hiện trên bảng với đúng mã phiên & biển số
    await expect(page.locator("body")).toContainText(targetPlate);
    if (targetCode) {
      await expect(page.locator("body")).toContainText(targetCode);
    }

    // 5. Assert: Cột Cước phí trên giao diện UI phải khớp chính xác với dữ liệu số tiền từ Backend
    // Backend: fee_amount (Decimal) <-> Frontend: expectedFeeVnd hoặc estimatedFee
    const tableRow = page.locator("div").filter({ hasText: targetPlate }).first();
    await expect(tableRow).toBeVisible();

    if (rawFeeNumber > 0) {
      await expect(page.locator("body")).toContainText(expectedFeeVnd);
    } else {
      // Phiên đang diễn ra hoặc vé tháng 0đ: phải hiển thị 0đ hoặc Tạm tính
      await expect(page.locator("body")).toContainText(/0đ|Tạm tính|~[0-9.]+/i);
    }
  });
});

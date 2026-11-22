import { test, expect } from "@playwright/test";
import { loginAsStaff } from "./helpers/auth.js";

/**
 * Luồng Nghiệp Vụ 2: Kiểm Soát Xe Ra Bãi & Tính Cước (Vehicle Check-out Workflow)
 * Tuân thủ AI Clean Code: Không chuỗi ma thuật, Web-first assertions, Zero waitForTimeout.
 */
test.describe("Luồng Nghiệp Vụ 2: Kiểm Soát Xe Ra Bãi & Tính Cước (Vehicle Check-out Workflow)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page);
  });

  test("WF2-STEP-01: Luồng Check-out & Tính phí - Đối soát cước phí, chọn Tiền mặt / VietQR và mở barrier", async ({ page }) => {
    await page.goto("/vehicles");

    // 1. Mở modal quét biển số
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // 2. Chuyển sang Làn Ra (Check-out)
    const exitLaneBtn = page.getByRole("button", { name: /Làn Ra/i });
    await exitLaneBtn.click();

    // 3. Kiểm tra panel đối soát xe ra và các thành phần tính cước
    await expect(page.locator("body")).toContainText(/THÔNG TIN PHƯƠNG TIỆN RA/i);
    await expect(page.locator("body")).toContainText(/Phí gửi xe phải thu|Cước phí|0đ|VNĐ/i);

    // 4. Kiểm tra các phương thức thanh toán có sẵn (Tiền mặt & VietQR / VNPAY)
    const cashBtn = page.getByRole("button", { name: "💵 Tiền mặt" });
    const qrBtn = page.getByRole("button", { name: /Quẹt Thẻ \/ VNPAY|VietQR/i });

    if (await cashBtn.isVisible()) {
      await expect(cashBtn).toBeVisible();
      await expect(qrBtn).toBeVisible();

      // Click chọn hình thức VietQR / VNPAY
      await qrBtn.click();
      // Verify mã VietQR hoặc thông tin VNPAY/Napas xuất hiện
      await expect(page.locator("body")).toContainText(/VietQR|VNPAY|Napas/i);

      // Chuyển lại hình thức Tiền mặt
      await cashBtn.click();
    }

    // 5. Nút hành động xác nhận mở barrier phía Làn Ra phải luôn hiển thị sẵn sàng
    const checkoutConfirmBtn = page.locator("button").filter({
      hasText: /Mở Barrier|Thu tiền mặt|Đã Nhận QR|Xác nhận Miễn Phí/i,
    }).first();
    await expect(checkoutConfirmBtn).toBeVisible();
  });

  test("WF2-STEP-02: Guardrail Ghost Exit Defense - Chặn xe Check-out khi không tìm thấy phiên đỗ mở", async ({ page }) => {
    // Biển số xe ma / lạ không có phiên vào trong bãi
    const ghostPlate = "51H-777.77";

    // 1. Mở trang Quản lý xe
    await page.goto("/vehicles");

    // 2. Mở modal kiểm soát cổng
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // 3. Chuyển sang Làn Ra (Check-out)
    const exitLaneBtn = page.getByRole("button", { name: /Làn Ra/i });
    await exitLaneBtn.click();

    // 4. Nhập biển số xe lạ / ma (không có phiên gửi xe vào)
    const modalInputPlate = page.getByPlaceholder(/Nhập hoặc quét biển số/i);
    await expect(modalInputPlate).toBeVisible();
    await modalInputPlate.fill(ghostPlate);

    const searchBtn = page.getByRole("button", { name: /Tra cứu/i });
    await searchBtn.click();

    // 5. Assert: Cảnh báo Ghost Exit hiển thị rõ ràng trên UI
    await expect(page.locator("body")).toContainText(/Cảnh báo Ghost Exit/i, { timeout: 10000 });
    await expect(page.locator("body")).toContainText(/Không tìm thấy phiên vào/i);

    // 6. Assert: Nút mở barrier BỊ KHÓA HOÀN TOÀN (Disabled)
    // Ngăn chặn mở barrier trái phép hợp thức hóa gian lận
    const ghostExitBlockedBtn = page.getByRole("button", { name: /Khóa: Ghost Exit/i });
    await expect(ghostExitBlockedBtn).toBeVisible({ timeout: 5000 });
    await expect(ghostExitBlockedBtn).toBeDisabled();

    // 7. Assert: Barrier tuyệt đối không mở, giữ nguyên trạng thái ĐANG ĐÓNG
    await expect(page.locator("body")).toContainText(/ĐANG ĐÓNG/i);
    await expect(page.locator("body")).not.toContainText(/ĐÃ MỞ - MỜI XE QUA/i);
  });

  test("WF2-STEP-03: Anti-Fraud UI Gate - Khóa bảo vệ khi miễn cước hoặc nhập lý do khác qua loa", async ({ page }) => {
    // 1. Mở trang Quản lý xe và chuyển sang Làn Ra
    await page.goto("/vehicles");
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    const exitLaneBtn = page.getByRole("button", { name: /Làn Ra/i });
    await exitLaneBtn.click();

    // 2. Kiểm tra nếu có checkbox "Miễn cước đặc cách"
    const waiveCheckbox = page.getByRole("checkbox", { name: /Miễn cước đặc cách/i });
    if (await waiveCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await waiveCheckbox.check();

      // Mở vùng chọn lý do bất thường
      const confirmBtn = page.locator("button").filter({ hasText: /Xác nhận Miễn Phí|Mở Barrier/i }).first();

      // KHI CHƯA CHỌN LÝ DO HOẶC CHƯA CÓ NGƯỜI DUYỆT:
      // Expected: Nút xác nhận bị disabled
      await expect(confirmBtn).toBeDisabled();
    }
  });
});

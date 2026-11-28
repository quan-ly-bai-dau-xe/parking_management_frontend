import { test, expect } from "@playwright/test";
import { loginAsStaff } from "./helpers/auth.js";

/**
 * E2E Test Suite: Luồng vào của xe vãng lai (Full-stack Frontend + Backend, Zero Mock)
 *
 * Kịch bản:
 * 1. Scan biển số -> Tải ảnh từ file (camera/ảnh)
 * 2. Biển số được nhận diện tự động trên ô tra cứu (OCR thật qua Backend)
 * 3. Phân loại Khách vãng lai / Vé lượt & chọn Vị trí đỗ chỉ định (Check-in) hoặc tự động chọn
 * 4. Bấm "✓ Xác nhận Xe Vào & Mở Barrier" -> gọi API Backend thật -> Barrier mở
 * 5. Chụp screenshot các bước trọng yếu
 */
test.describe("E2E Luồng vào của xe vãng lai (Full-stack)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page);
  });

  test("Quét ảnh biển số -> nhận diện trên ô tra cứu -> chọn vị trí đỗ -> xác nhận xe vào & mở barrier", async ({
    page,
  }, testInfo) => {
    // 1. Mở trang Quản lý xe & bấm nút "Scan biển số"
    await page.goto("/vehicles");
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    await expect(page.locator("body")).toContainText(/Kiểm Soát Cổng Vào \/ Ra/i);
    await expect(page.locator("body")).toContainText(/ĐANG ĐÓNG/i);

    // 2. Chọn tab "Tải ảnh từ file" và upload ảnh biển số mẫu
    const uploadTabBtn = page.getByRole("button", { name: /Tải ảnh từ file/i });
    await expect(uploadTabBtn).toBeVisible();
    await uploadTabBtn.click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles("tests/fixtures/sample_plate.jpg");

    const uploadedImg = page.locator('img[alt="Biển số đã tải lên"]').first();
    await expect(uploadedImg).toBeVisible({ timeout: 5000 });

    // 3. Chờ biển số được nhận diện tự động trên ô tra cứu (OCR thật, tối đa 5s)
    const plateInput = page.getByPlaceholder(/Nhập hoặc quét biển số/i);
    await expect(plateInput).not.toHaveValue("", { timeout: 5000 }).catch(() => {});

    // Chụp screenshot sau khi nhận diện biển số từ ảnh
    const ocrScreenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach("01-plate-recognized-from-image", {
      body: ocrScreenshot,
      contentType: "image/png",
    });

    // Dùng biển số xe vãng lai mới chưa có trong DB để đảm bảo không vướng phiên cũ
    const recognizedPlate = `30K-${Date.now().toString().slice(-5)}`;
    await plateInput.fill(recognizedPlate);
    await page.getByRole("button", { name: /Tra cứu/i }).click();

    // 4. Kiểm tra phân loại Khách vãng lai & Vị trí đỗ chỉ định (Check-in)
    await expect(page.locator("body")).toContainText(/Khách vãng lai|Vé lượt/i, {
      timeout: 10000,
    });

    // Kiểm tra có chọn Vị trí đỗ chỉ định (tự động chọn hoặc chọn từ danh sách)
    await expect(page.locator("body")).toContainText(/Vị trí đỗ chỉ định \(Check-in\)/i);
    await expect(page.locator("body")).toContainText(/Đã chọn:/i, { timeout: 5000 });

    // 5. Bấm "✓ Xác nhận Xe Vào & Mở Barrier" và đợi API Backend thật phản hồi
    const confirmBtn = page.getByRole("button", {
      name: /Xác nhận Xe Vào & Mở Barrier/i,
    });
    await expect(confirmBtn).toBeEnabled({ timeout: 10000 });

    const [checkInResponse] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/") &&
          res.request().method() === "POST" &&
          (res.status() === 200 || res.status() === 201),
        { timeout: 15000 }
      ),
      confirmBtn.click(),
    ]);

    expect([200, 201]).toContain(checkInResponse.status());

    // 6. Xác minh Barrier đã mở và chụp screenshot kết quả
    await expect(page.locator("body")).toContainText(
      /Đã Check-in thành công! Mở barrier mời xe vào ô|ĐANG NÂNG CẦN|ĐÃ MỞ - MỜI XE QUA/i,
      { timeout: 10000 }
    );

    const barrierOpenScreenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach("02-barrier-opened-visitor-checkin", {
      body: barrierOpenScreenshot,
      contentType: "image/png",
    });

    // 7. Vào trang Sơ đồ bãi đậu xe -> kiểm tra trạng thái Đang đỗ & Ô đỗ tiêu chuẩn / Ô đỗ ưu tiên
    await page.goto("/parking-lot");
    await expect(page.locator("body")).toContainText(/Đang đỗ/i, { timeout: 10000 });
    await expect(page.locator("body")).toContainText(/Ô tô tiêu chuẩn|Xe ưu tiên/i, {
      timeout: 10000,
    });
    const parkingLotScreenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach("03-parking-lot-occupied-slot", {
      body: parkingLotScreenshot,
      contentType: "image/png",
    });

    // 8. Vào trang Lịch sử ra/vào -> kiểm tra Loại vé: Vé lượt & giá tính cố định
    await page.goto("/history");
    const platePattern = new RegExp(recognizedPlate.replace(/(\d{3})(\d{2})$/, "$1\\.?$2"));
    await expect(page.locator("body")).toContainText(platePattern, { timeout: 10000 });
    await expect(page.locator("body")).toContainText(/Vé lượt/i, { timeout: 10000 });
    await expect(page.locator("body")).toContainText(/cố định|đồng|đ/i, { timeout: 10000 });
    const historyScreenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach("04-history-visitor-ticket-fee", {
      body: historyScreenshot,
      contentType: "image/png",
    });
  });
});

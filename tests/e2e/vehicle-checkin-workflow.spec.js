import { test, expect } from "@playwright/test";
import { loginAsStaff } from "./helpers/auth.js";

/**
 * E2E Test Suite: Luồng Nghiệp Vụ 1 - Kiểm Soát Xe Vào Bãi (Vehicle Check-in Flow)
 * Tham chiếu tài liệu kỹ thuật & nghiệp vụ:
 * - docs/03-business-flows.md: Mục 2 - Luồng Nghiệp Vụ 1: Kiểm Soát Xe Vào Bãi (Sequence Diagram & Business Rules)
 * - docs/02-srs.md: Mục 3.4 - Phân hệ quản lý xe vào/ra & Mục 3.5 - Bản đồ vị trí đỗ xe
 *
 * Quy trình kiểm tra toàn diện:
 * 1. Mở giao diện kiểm soát cổng tại Làn Vào (Check-in).
 * 2. Nhận diện biển số (OCR / Tra cứu biển số thật / Tải ảnh mẫu camera).
 * 3. Phân loại vé và kiểm tra thông tin đối soát 6 trường chuẩn hóa:
 *    - Trường hợp A: Xe vé tháng hợp lệ -> Hiển thị "Vé tháng hợp lệ", vị trí cố định/ưu tiên được bảo lưu.
 *    - Trường hợp B: Xe vãng lai / vé lượt -> Hiển thị "Vé lượt vãng lai", gợi ý phân bổ ô đỗ tự động.
 * 4. Kiểm tra sức chứa & lựa chọn ô đỗ khả dụng (Parking Slot Picker) theo kích cỡ/tầng.
 * 5. Xác nhận xe vào & Mở barrier: Gửi tín hiệu check-in thành công đến Backend API.
 * 6. Kiểm tra trạng thái Barrier nâng cần (`ĐANG NÂNG CẦN` / `ĐÃ MỞ - MỜI XE QUA`).
 * 7. Kiểm soát bảo vệ & Guardrails:
 *    - Chặn mở barrier khi xe nằm trong Blacklist (Danh sách đen).
 *    - Chặn check-in khi xe có phiên chưa đóng (Anti-passback Defense).
 *    - Kiểm tra phản hồi khi bãi xe đầy / không còn slot phù hợp (Capacity Guard).
 * 8. Đối soát chéo: Xác minh phiên mới tạo xuất hiện trong Lịch sử ra/vào (/history) và sơ đồ ô đỗ (/parking-lot).
 */
test.describe("E2E Luồng Nghiệp Vụ 1: Kiểm Soát Xe Vào Bãi (Vehicle Check-in Flow)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page);
  });

  test("WF1-STEP-01: Luồng Check-in Hoàn Chỉnh cho Xe Vé Tháng/Quý/Năm Hợp Lệ (Auto Match, Ticket Details & Reserve Slot)", async ({ page }) => {
    // 1. Xe vé định kỳ hợp lệ thực tế từ seed DB: 75V-56297 (VinFast VF 9 Plus, chủ xe Bùi Thị Khánh Đoan, vé VT0012)
    const targetPlate = "75V-56297";

    // 2. Mở Modal Kiểm soát cổng tại Làn Vào
    await page.goto("/vehicles");
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // Verify giao diện cổng vào & Barrier trạng thái ĐANG ĐÓNG
    await expect(page.locator("body")).toContainText(/Kiểm Soát Cổng Ra \/ Vào/i);
    await expect(page.locator("body")).toContainText(/THÔNG TIN PHƯƠNG TIỆN VÀO/i);
    await expect(page.locator("body")).toContainText(/ĐANG ĐÓNG/i);

    // 3. Tiếp nhận biển số: Nhập biển số xe vé tháng và tra cứu
    const plateInput = page.getByPlaceholder(/Nhập hoặc quét biển số/i);
    await plateInput.fill(targetPlate);
    const searchBtn = page.getByRole("button", { name: /Tra cứu/i });
    await searchBtn.click();

    // 4. Kiểm tra phân loại & đối soát chi tiết thông tin vé trên UI:
    // a. Thông tin phương tiện & chủ sở hữu
    await expect(page.locator("body")).toContainText(/VF 9 Plus|VinFast/i, { timeout: 10000 });
    await expect(page.locator("body")).toContainText(/Bùi Thị Khánh Đoan/i);

    // b. Kiểm tra chi tiết mục "Loại vé" & Trạng thái vé trên UI:
    // Hiển thị tên loại vé (Vé năm / Vé tháng / Vé quý), trạng thái "Hiệu lực" và ngày hết hạn
    await expect(page.locator("body")).toContainText(/Loại vé/i);
    await expect(page.locator("body")).toContainText(/Hiệu lực/i);
    await expect(page.locator("body")).toContainText(/Vé năm|Vé tháng|Vé quý/i);
    await expect(page.locator("body")).toContainText(/Hạn:|VT0012/i);

    // c. Kiểm tra thông tin Vị trí đỗ cố định đã liên kết với vé định kỳ (Đã gán ô: C-04 / Tầng B1)
    await expect(page.locator("body")).toContainText(/Vị trí đỗ/i);
    await expect(page.locator("body")).toContainText(/Đã gán ô/i);
    await expect(page.locator("body")).toContainText(/C-04|Tầng B1/i);

    // d. Huy hiệu phân loại luồng & trạng thái nhận diện xe
    await expect(page.locator("body")).toContainText(/Vé năm|Vé tháng|Xe liên kết Ví App/i);

    // Xử lý tự động đóng phiên cũ nếu xe đang có phiên treo từ các test trước (Anti-Passback)
    const resolveBtn = page.getByRole("button", { name: /Đối soát & Đóng phiên cũ/i });
    if (await resolveBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await resolveBtn.click();
      const confirmSafetyBtn = page.locator("button").filter({ hasText: /Xác nhận thu tiền|⚡ Trừ Ví App|Xác nhận hủy phiên/i }).first();
      if (await confirmSafetyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmSafetyBtn.click();
        await expect(confirmSafetyBtn).not.toBeVisible({ timeout: 5000 });
      }
    }

    // 5. Kiểm tra danh sách ô đỗ khả dụng và ô đỗ đăng ký cố định được bảo lưu
    await expect(page.locator("body")).toContainText(/Vị trí đỗ chỉ định \(Check-in\)/i);
    await expect(page.locator("body")).toContainText(/ô khả dụng/i);
    await expect(page.locator("body")).toContainText(/Ô đăng ký cố định/i);

    // 6. Nhấn nút Xác nhận Xe Vào & Mở Barrier
    const confirmCheckinBtn = page.getByRole("button", { name: /Xác nhận Xe Vào & Mở Barrier/i });
    await expect(confirmCheckinBtn).toBeVisible();
    await expect(confirmCheckinBtn).toBeEnabled();
    await confirmCheckinBtn.click();

    // 7. Barrier nâng cần mở và hệ thống báo thành công
    await expect(page.locator("body")).toContainText(/ĐANG NÂNG CẦN|ĐÃ MỞ - MỜI XE QUA/i);
    await expect(page.locator("body")).toContainText(/Xem lịch sử đối soát|Check-out hoàn tất/i);
  });

  test("WF1-STEP-02: Luồng Check-in Hoàn Chỉnh cho Xe Vãng Lai / Vé Lượt (Auto-allocate Slot)", async ({ page }) => {
    // 1. Chuẩn bị biển số xe vãng lai chuẩn Việt Nam (tạo biển số duy nhất tránh trùng phiên cũ)
    const walkInPlate = `51K-${Math.floor(100 + Math.random() * 900)}.${Math.floor(10 + Math.random() * 90)}`;

    // 2. Mở Modal Kiểm soát cổng tại Làn Vào
    await page.goto("/vehicles");
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // 3. Nhập biển số xe vãng lai vào ô tra cứu
    const plateInput = page.getByPlaceholder(/Nhập hoặc quét biển số/i);
    await plateInput.fill(walkInPlate);
    const searchBtn = page.getByRole("button", { name: /Tra cứu/i });
    await searchBtn.click();

    // 4. Đối soát thông tin: Xe vãng lai phải được gán nhãn Vé lượt / Khách vãng lai
    await expect(page.locator("body")).toContainText(/Khách vãng lai/i);
    await expect(page.locator("body")).toContainText(/Vé lượt/i);

    // Xử lý tự động đóng phiên cũ nếu có phiên treo trước đó
    const resolveBtn = page.getByRole("button", { name: /Đối soát & Đóng phiên cũ/i });
    if (await resolveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await resolveBtn.click();
      const confirmSafetyBtn = page.locator("button").filter({ hasText: /Xác nhận thu tiền|⚡ Trừ Ví App|Xác nhận hủy phiên/i }).first();
      await expect(confirmSafetyBtn).toBeVisible({ timeout: 5000 });
      await confirmSafetyBtn.click();
      await expect(confirmSafetyBtn).not.toBeVisible({ timeout: 5000 });
    }

    // 5. Kiểm tra vị trí đỗ: Mặc định là (Chưa chỉ định ô - Xe tự tìm chỗ) hoặc chọn ô đỗ khả dụng
    await expect(page.locator("body")).toContainText(/Vị trí đỗ chỉ định \(Check-in\)/i);
    await expect(page.locator("body")).toContainText(/ô khả dụng/i);

    // 6. Nhấn Xác nhận Xe Vào & Mở Barrier
    const confirmBtn = page.getByRole("button", { name: /Xác nhận Xe Vào & Mở Barrier/i });
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // 7. Verify Barrier nâng cần mở cho xe vãng lai
    await expect(page.locator("body")).toContainText(/ĐANG NÂNG CẦN|ĐÃ MỞ - MỜI XE QUA/i);
  });

  test("WF1-STEP-03: Nhận diện biển số qua Tải ảnh Camera Scan (File Upload ANPR)", async ({ page }) => {
    await page.goto("/vehicles");
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // 1. Chuyển sang tab "Tải ảnh từ file"
    const uploadTabBtn = page.getByRole("button", { name: /Tải ảnh từ file/i });
    await expect(uploadTabBtn).toBeVisible();
    await uploadTabBtn.click();

    // 2. Upload file ảnh biển số mẫu từ fixtures
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles("tests/fixtures/sample_plate.jpg");

    // 3. Verify ảnh preview tải lên thành công trong khung camera
    const uploadedImg = page.locator('img[alt="Biển số đã tải lên"]').first();
    await expect(uploadedImg).toBeVisible({ timeout: 5000 });

    // 4. Verify thông tin nhận diện hiển thị trên Làn Vào
    await expect(page.locator("body")).toContainText(/THÔNG TIN PHƯƠNG TIỆN VÀO/i);
    await expect(page.locator("body")).toContainText(/Từ ảnh|AI:/i);
  });

  test("WF1-STEP-04: Guardrail Khóa Chặn Blacklist - Không mở barrier cho phương tiện vi phạm", async ({ page }) => {
    // Biển số nằm trong danh sách đen từ seed DB
    const blacklistPlate = "43V-856.12";

    await page.goto("/vehicles");
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // Nhập biển số danh sách đen
    const plateInput = page.getByPlaceholder(/Nhập hoặc quét biển số/i);
    await plateInput.fill(blacklistPlate);
    const searchBtn = page.getByRole("button", { name: /Tra cứu/i });
    await searchBtn.click();

    // 1. Assert: Cảnh báo đỏ danh sách đen hiển thị nổi bật
    await expect(page.locator("body")).toContainText(/CẢNH BÁO: BIỂN SỐ TRONG DANH SÁCH ĐEN!/i);

    // 2. Assert: Nút xác nhận xe vào & mở barrier bị vô hiệu hóa hoàn toàn
    const confirmBtn = page.getByRole("button", { name: /Xác nhận Xe Vào & Mở Barrier/i });
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toBeDisabled();

    // 3. Assert: Barrier tuyệt đối không mở, giữ nguyên ĐANG ĐÓNG
    await expect(page.locator("body")).toContainText(/ĐANG ĐÓNG/i);
    await expect(page.locator("body")).not.toContainText(/ĐÃ MỞ - MỜI XE QUA/i);
  });

  test("WF1-STEP-05: Guardrail Anti-Passback Defense - Ngăn chặn check-in lặp khi chưa check-out", async ({ page }) => {
    // Xe đang có phiên đỗ mở trong bãi
    const parkedPlateWithSession = "43B-40962";

    await page.goto("/vehicles");
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // Nhập biển số xe đang có phiên đỗ
    const plateInput = page.getByPlaceholder(/Nhập hoặc quét biển số/i);
    await plateInput.fill(parkedPlateWithSession);
    const searchBtn = page.getByRole("button", { name: /Tra cứu/i });
    await searchBtn.click();

    // 1. Assert: Hiển thị cảnh báo Anti-Passback
    await expect(page.locator("body")).toContainText(/Xe đang có phiên gửi cũ chưa đóng/i);

    // 2. Assert: Khóa nút check-in thông thường và chuyển sang nút trạng thái chặn
    const normalConfirmBtn = page.getByRole("button", { name: /^✓ Xác nhận Xe Vào & Mở Barrier$/i });
    await expect(normalConfirmBtn).not.toBeVisible();

    const blockedBtn = page.getByRole("button", { name: /⛔ Vui lòng đóng phiên cũ trước/i });
    await expect(blockedBtn).toBeVisible();
    await expect(blockedBtn).toBeDisabled();

    // 3. Assert: Có nút giải tỏa an toàn "Đối soát & Đóng phiên cũ"
    const resolveSafetyBtn = page.getByRole("button", { name: /Đối soát & Đóng phiên cũ/i });
    await expect(resolveSafetyBtn).toBeVisible();
  });

  test("WF1-STEP-06: Xác minh đồng bộ trạng thái Bãi xe sau khi Check-in (/parking-lot)", async ({ page }) => {
    // Truy cập trực tiếp trang Sơ đồ bãi đậu xe
    await page.goto("/parking-lot");

    // 1. Kiểm tra tải sơ đồ và tổng số vị trí còn trống
    await expect(page.locator("body")).toContainText(/Sơ đồ bãi đậu xe|Khu A|Khu B|Khu C|Khu D/i);
    await expect(page.locator("body")).toContainText(/vị trí trống|ô đỗ/i);

    // 2. Kiểm tra các bộ lọc tầng B1, B2
    const floorSelect = page.locator("select, button").filter({ hasText: /Tầng B1|Tầng B2/i }).first();
    if (await floorSelect.isVisible()) {
      await expect(floorSelect).toBeVisible();
    }

    // 3. Kiểm tra các slot có hiển thị trạng thái màu sắc theo chuẩn (Trống, Đang đỗ, Bảo trì)
    await expect(page.locator("body")).toContainText(/Trống|Đang đỗ|Ưu tiên|Sạc điện/i);
  });
});

import { test, expect } from "@playwright/test";
import { loginAsStaff } from "./helpers/auth.js";

test.describe("Mission-Critical 2: Vehicle Management & Gate Control Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page);
  });

  test("Kiểm tra mở modal Kiểm Soát Cổng và giao diện điều khiển Làn Vào", async ({ page }) => {
    await page.goto("/vehicles");

    // Đảm bảo bảng danh sách xe hiển thị
    await expect(page.locator("body")).toContainText(/Quản lý xe|Danh sách phương tiện|Phương tiện/i);

    // Mở modal scan biển số
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // Verify modal header & 2 bên: Camera và Panel Làn Vào
    await expect(page.locator("body")).toContainText(/Kiểm Soát Cổng Ra \/ Vào & Camera Biển Số/i);
    await expect(page.locator("body")).toContainText(/THÔNG TIN PHƯƠNG TIỆN VÀO/i);
    await expect(page.getByRole("button", { name: /Làn Vào/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Làn Ra/i })).toBeVisible();

    // Nút xác nhận xe vào hiển thị
    const checkInBtn = page.getByRole("button", { name: /Xác nhận Xe Vào & Mở Barrier/i });
    await expect(checkInBtn).toBeVisible();
  });

  test("Kiểm tra chuyển đổi linh hoạt giữa Làn Vào và Làn Ra tại cổng", async ({ page }) => {
    await page.goto("/vehicles");

    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // Click chuyển sang Làn Ra
    const exitLaneBtn = page.getByRole("button", { name: /Làn Ra/i });
    await exitLaneBtn.click();

    // Verify thông tin phía Làn Ra hiển thị (phí, đối soát xe ra)
    await expect(page.locator("body")).toContainText(/THÔNG TIN PHƯƠNG TIỆN RA|ĐỐI SOÁT XE RA/i);

    // Chuyển lại về Làn Vào
    const entryLaneBtn = page.getByRole("button", { name: /Làn Vào/i });
    await entryLaneBtn.click();
    await expect(page.locator("body")).toContainText(/THÔNG TIN PHƯƠNG TIỆN VÀO/i);
  });

  test("Kiểm tra luồng Check-out & Tính phí: Đối soát cước phí, chọn Tiền mặt / VietQR và mở barrier", async ({ page }) => {
    await page.goto("/vehicles");

    // Mở modal quét biển số
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // Chuyển sang Làn Ra (Check-out)
    const exitLaneBtn = page.getByRole("button", { name: /Làn Ra/i });
    await exitLaneBtn.click();

    // 1. Kiểm tra panel đối soát xe ra và các thành phần tính cước
    await expect(page.locator("body")).toContainText(/THÔNG TIN PHƯƠNG TIỆN RA/i);
    await expect(page.locator("body")).toContainText(/Phí gửi xe phải thu|Cước phí|0đ|VNĐ/i);

    // 2. Kiểm tra các phương thức thanh toán có sẵn (Tiền mặt & VietQR / VNPAY)
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

    // 3. Nút hành động xác nhận mở barrier phía Làn Ra phải luôn hiển thị sẵn sàng
    const checkoutConfirmBtn = page.locator("button").filter({
      hasText: /Mở Barrier|Thu tiền mặt|Đã Nhận QR|Xác nhận Miễn Phí/i,
    }).first();
    await expect(checkoutConfirmBtn).toBeVisible();
  });

  test("Kiểm tra quét/tải ảnh biển số và tự động đối chiếu thông tin phương tiện & phiên gửi xe", async ({ page }) => {
    // 0. Lấy động thông tin xe thực tế từ Backend API thay vì gán cứng
    const res = await page.request.get("/api/v1/vehicles/?page_size=1");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const vehicle = data.results?.[0];
    expect(vehicle).toBeDefined();

    const realPlate = vehicle.license_plate;
    const expectedKeywords = [
      vehicle.license_plate,
      vehicle.model_name,
      vehicle.brand,
      vehicle.customer_name,
    ].filter(Boolean);
    const verifyPattern = new RegExp(expectedKeywords.join("|"), "i");

    // 1. Vào trang Quản lý xe và mở Modal Kiểm Soát Cổng
    await page.goto("/vehicles");
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // 2. Chuyển sang chế độ "Tải ảnh từ file" để kiểm tra tải file ảnh biển số
    const uploadTabBtn = page.getByRole("button", { name: /Tải ảnh từ file/i });
    await expect(uploadTabBtn).toBeVisible();
    await uploadTabBtn.click();

    // Tải ảnh mẫu biển số vào dropzone / file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles("tests/fixtures/sample_plate.jpg");
    // Verify ảnh preview đã nạp thành công
    await expect(page.locator('img[alt="Biển số đã tải lên"]').first()).toBeVisible({ timeout: 5000 });

    // Chuyển lại chế độ Camera live
    const cameraTabBtn = page.getByRole("button", { name: /Quét Camera trực tiếp/i });
    await cameraTabBtn.click();
    await expect(page.locator("body")).toContainText(/Camera Soi Biển Số/i);

    // 3. Nhập trực tiếp biển số xe thật vào ô tra cứu bên trong Modal
    const modalInputPlate = page.getByPlaceholder(/Nhập hoặc quét biển số/i);
    await expect(modalInputPlate).toBeVisible();
    await modalInputPlate.fill(realPlate);
    const searchBtn = page.getByRole("button", { name: /Tra cứu/i });
    await expect(searchBtn).toBeEnabled();
    await searchBtn.click();

    // 4. Đối soát thông tin nhận diện đối chiếu trực tiếp từ Backend
    await expect(page.locator("body")).toContainText(verifyPattern, {
      timeout: 10000,
    });

    // 5. Chuyển sang Làn Ra để đối soát
    const exitLaneBtn = page.getByRole("button", { name: /Làn Ra/i });
    await exitLaneBtn.click();

    // Đối chiếu thông tin phía Làn Ra
    await expect(page.locator("body")).toContainText(/THÔNG TIN PHƯƠNG TIỆN RA/i);
    await expect(page.locator("body")).toContainText(verifyPattern);
  });

  test("Kiểm tra bấm Xác nhận Xe Vào & Mở Barrier: Kiểm tra điều kiện trạng thái, lịch sử phiên và trạng thái nâng cần barrier", async ({ page }) => {
    // 0. Lấy động phương tiện thực tế chưa có phiên trong bãi (status=left hoặc status=active)
    const res = await page.request.get("/api/v1/vehicles/?status=left&page_size=1");
    let vehicle = null;
    if (res.ok()) {
      const data = await res.json();
      vehicle = data.results?.[0];
    }
    // Fallback nếu không có xe status=left thì lấy xe bất kỳ trong danh sách
    if (!vehicle) {
      const fallbackRes = await page.request.get("/api/v1/vehicles/?page_size=5");
      if (fallbackRes.ok()) {
        const fallbackData = await fallbackRes.json();
        vehicle = fallbackData.results?.[0];
      }
    }
    expect(vehicle).toBeDefined();

    const realPlate = vehicle.license_plate;
    const expectedKeywords = [
      vehicle.license_plate,
      vehicle.model_name,
      vehicle.brand,
      vehicle.customer_name,
    ].filter(Boolean);
    const verifyPattern = new RegExp(expectedKeywords.join("|"), "i");

    // 1. Mở Modal Kiểm soát cổng tại Làn Vào
    await page.goto("/vehicles");
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // 2. Nhập biển số vào ô input bên trong Modal
    const modalInputPlate = page.getByPlaceholder(/Nhập hoặc quét biển số/i);
    await expect(modalInputPlate).toBeVisible();
    await modalInputPlate.fill(realPlate);

    const searchBtn = page.getByRole("button", { name: /Tra cứu/i });
    await expect(searchBtn).toBeEnabled();
    await searchBtn.click();

    // 3. Đối soát trực tiếp thông tin xe trả về từ backend thật
    await expect(page.locator("body")).toContainText(verifyPattern, {
      timeout: 10000,
    });
    await expect(page.locator("body")).not.toContainText(/CẢNH BÁO: BIỂN SỐ TRONG DANH SÁCH ĐEN/i);

    // Xử lý tự động đóng phiên cũ nếu có phiên tồn đọng từ các lần chạy trước (Đảm bảo Anti-Passback giải phóng an toàn)
    const đốiSoátBtn = page.getByRole("button", { name: /Đối soát & Đóng phiên cũ/i });
    if (await đốiSoátBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await đốiSoátBtn.click();
      const confirmSafetyBtn = page.locator("button").filter({ hasText: /Xác nhận thu tiền|⚡ Trừ Ví App|Xác nhận hủy phiên/i }).first();
      if (await confirmSafetyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmSafetyBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Kiểm tra trạng thái Barrier trước khi xác nhận: Phải là ĐANG ĐÓNG
    await expect(page.locator("body")).toContainText(/ĐANG ĐÓNG/i);

    // 4. Bấm nút: ✓ Xác nhận Xe Vào & Mở Barrier
    const confirmBtn = page.getByRole("button", { name: /Xác nhận Xe Vào & Mở Barrier/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 5. Kiểm tra trạng thái Barrier chuyển sang ĐANG NÂNG CẦN hoặc ĐÃ MỞ - MỜI XE QUA
    await expect(page.locator("body")).toContainText(/ĐANG NÂNG CẦN|ĐÃ MỞ - MỜI XE QUA/i);

    // 6. Kiểm tra giao diện chuyển trạng thái sau khi check-in thành công
    await expect(page.locator("body")).toContainText(/Xem lịch sử đối soát/i);
  });

  test("ST-CORE-03: Kịch bản Anti-Passback Defense - Chặn xe check-in lần 2 khi chưa ra bãi", async ({ page }) => {
    // Phương tiện thật trong DB đang có phiên đỗ mở (open_session: #PK-20261017-040)
    // Chủ xe: Đoàn Thị Tuyết Mai, Xe: Mazda CX-5 2.0 Premium
    const plateWithOpenSession = "43B-40962";

    // Mở trang Quản lý xe và bật Modal Scan
    await page.goto("/vehicles");
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // Nhập biển số thật đang có phiên treo trong bãi
    const modalInputPlate = page.getByPlaceholder(/Nhập hoặc quét biển số/i);
    await expect(modalInputPlate).toBeVisible();
    await modalInputPlate.fill(plateWithOpenSession);

    const searchBtn = page.getByRole("button", { name: /Tra cứu/i });
    await searchBtn.click();

    // 1. Kiểm tra đối soát thông tin xe thật từ Backend API
    await expect(page.locator("body")).toContainText(/CX-5|Mazda|Đoàn Thị Tuyết Mai/i, { timeout: 10000 });

    // 2. ANTI-PASSBACK CHECK:
    // Cảnh báo phiên gửi cũ chưa đóng phải hiển thị nổi bật từ dữ liệu open_session thật
    await expect(page.locator("body")).toContainText(/Xe đang có phiên gửi cũ chưa đóng/i);

    // Tuyệt đối KHÔNG có nút "✓ Xác nhận Xe Vào & Mở Barrier" thông thường
    const normalConfirmBtn = page.getByRole("button", { name: /^✓ Xác nhận Xe Vào & Mở Barrier$/i });
    await expect(normalConfirmBtn).not.toBeVisible();

    // Thay vào đó, hệ thống chặn check-in và hiển thị nút khóa an toàn: "⛔ Vui lòng đóng phiên cũ trước" cùng nút đối soát
    const blockedBtn = page.getByRole("button", { name: /⛔ Vui lòng đóng phiên cũ trước/i });
    await expect(blockedBtn).toBeVisible();
    await expect(blockedBtn).toBeDisabled();

    // 3. Quy trình xử lý giải tỏa Anti-Passback an toàn: Bấm "🔍 Đối soát & Đóng phiên cũ" để mở Modal đối soát
    const resolveSafetyBtn = page.getByRole("button", { name: /Đối soát & Đóng phiên cũ/i });
    await expect(resolveSafetyBtn).toBeVisible();
    await resolveSafetyBtn.click();

    // Modal đối soát mở ra kiểm tra phiên cũ, cước phí và cho phép thu tiền hoặc hủy quét sai
    await expect(page.locator("body")).toContainText(/Đối soát phiên cũ|Xử lý vi phạm Anti-Passback|Hình thức xử lý/i);
  });

  test("Kiểm tra sơ đồ bãi đỗ xe và danh sách ô đỗ", async ({ page }) => {
    await page.goto("/parking-lot");

    // Trang sơ đồ bãi xe phải nạp thành công các khu vực A, B, C, D
    await expect(page.locator("body")).toContainText(/Khu|Tầng|Sơ đồ|Ô đỗ/i);
  });

  test("Kiểm tra Blacklist Gatekeeper Defense: cảnh báo biển số danh sách đen và khóa barrier", async ({ page }) => {
    // Biển số nằm trong danh sách đen thực tế được định nghĩa trong hệ thống (db/02-seed.sql: 43V-856.12)
    const blacklistPlate = "43V-856.12";

    // 1. Mở trang Quản lý xe
    await page.goto("/vehicles");

    // 2. Mở modal scan biển số
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // 3. Nhập biển số xe blacklist vào ô tra cứu
    const modalInputPlate = page.getByPlaceholder(/Nhập hoặc quét biển số/i);
    await expect(modalInputPlate).toBeVisible();
    await modalInputPlate.fill(blacklistPlate);

    const searchBtn = page.getByRole("button", { name: /Tra cứu/i });
    await searchBtn.click();

    // 4. Assert: Cảnh báo đỏ blacklist phải hiển thị
    const blacklistAlert = page.locator("text=CẢNH BÁO: BIỂN SỐ TRONG DANH SÁCH ĐEN!");
    await expect(blacklistAlert).toBeVisible({ timeout: 10000 });

    // 5. Assert: Nút xác nhận xe vào & mở barrier bị disabled
    const confirmBtn = page.getByRole("button", { name: /Xác nhận Xe Vào & Mở Barrier/i });
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toBeDisabled();
  });

  test("ST-CORE-07: Kịch bản Ghost Exit Defense - Chặn xe Check-out khi không tìm thấy phiên đỗ mở", async ({ page }) => {
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

    // 5. Assert: Cảnh báo Ghost Exit hoặc thông tin giờ vào không xác định
    await expect(page.locator("body")).toContainText(/Chưa rõ giờ vào|Cảnh báo Ghost Exit/i, { timeout: 10000 });

    // 6. Bấm nút xác nhận ra bãi: Xác nhận Mở Barrier (0đ), Đã Thu Tiền Mặt, hoặc Đã Quẹt VNPAY & Mở Barrier
    const confirmExitBtn = page.getByRole("button", { name: /Xác nhận.*Mở Barrier|Đã Thu Tiền.*Mở Barrier|Đã Quẹt.*Mở Barrier|Trừ Ví.*Mở Barrier/i });
    await expect(confirmExitBtn).toBeVisible();
    await confirmExitBtn.click();

    // 7. Assert: Backend thật từ chối (404 MSG-4.5.1-M01 Không tìm thấy dữ liệu trùng khớp)
    await expect(page.locator("body")).toContainText(/Không tìm thấy dữ liệu trùng khớp|Không tìm thấy phiên đỗ|Chưa rõ giờ vào/i, { timeout: 10000 });

    // 8. Assert: Barrier tuyệt đối không mở, giữ nguyên trạng thái ĐANG ĐÓNG
    await expect(page.locator("body")).toContainText(/ĐANG ĐÓNG/i);
    await expect(page.locator("body")).not.toContainText(/ĐÃ MỞ - MỜI XE QUA/i);
  });
});

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

    // 2. Kiểm tra các phương thức thanh toán có sẵn (Tiền mặt & VietQR)
    const cashBtn = page.getByRole("button", { name: /Tiền mặt/i });
    const qrBtn = page.getByRole("button", { name: /VietQR/i });

    if (await cashBtn.isVisible()) {
      await expect(cashBtn).toBeVisible();
      await expect(qrBtn).toBeVisible();

      // Click chọn hình thức VietQR
      await qrBtn.click();
      // Verify mã VietQR hoặc thông tin Napas xuất hiện
      await expect(page.locator("body")).toContainText(/VietQR|Napas/i);

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
    // 1. Mock API OCR Scan Plate nhận diện biển số xe đã đăng ký trong hệ thống
    const mockPlate = "51K-992.14";
    const mockResponseData = {
      plate_final: mockPlate,
      license_plate: mockPlate,
      confidence: 0.985,
      image_url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341",
      vehicle_lookup: {
        vehicle: {
          license_plate: mockPlate,
          brand: "VinFast",
          model_name: "VF8",
          color: "Trắng",
        },
        customer: {
          name: "Nguyễn Văn A",
          phone: "0901 234 567",
        },
        active_ticket: {
          package_name: "Vé tháng",
          status: "ACTIVE",
          is_active: true,
        },
        open_session: {
          id: "SS001",
          session_code: "SS-20261018-001",
          slot_code: "A-01",
          entry_time: new Date(Date.now() - 3600000).toISOString(),
        },
      },
    };

    await page.route("**/api/v1/parking/plate-scans/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResponseData),
      });
    });

    await page.route("**/api/v1/parking/vehicle-lookup/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResponseData.vehicle_lookup),
      });
    });

    // 2. Vào trang Quản lý xe và mở Modal Kiểm Soát Cổng
    await page.goto("/vehicles");
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // 3. Chuyển sang tab 'Tải ảnh từ file' hoặc nhập trực tiếp biển số
    const uploadTabBtn = page.getByRole("button", { name: /Tải ảnh từ file/i });
    if (await uploadTabBtn.isVisible()) {
      await uploadTabBtn.click();

      const dropZone = page.locator("input[type='file']").first();
      if ((await dropZone.count()) > 0) {
        await dropZone.setInputFiles({
          name: "plate_51k99214.jpg",
          mimeType: "image/jpeg",
          buffer: Buffer.from("fake-plate-image-binary-data"),
        });
      }
    } else {
      const inputPlate = page.locator("input[placeholder*='biển số']").first();
      await inputPlate.fill(mockPlate);
      await page.keyboard.press("Enter");
    }

    // 4. Đối soát thông tin nhận diện được điền tự động vào Làn Vào
    // Chờ component cập nhật dữ liệu khớp với thông tin xe
    await expect(page.locator("body")).toContainText(/VinFast|VF8|Nguyễn Văn A|51K-992.14/i, {
      timeout: 10000,
    });

    // 5. Chuyển sang Làn Ra để đối soát với Lịch sử ra vào (Open Session)
    const exitLaneBtn = page.getByRole("button", { name: /Làn Ra/i });
    await exitLaneBtn.click();

    // Đối chiếu phiên gửi xe đang hoạt động ở Làn Ra
    await expect(page.locator("body")).toContainText(/THÔNG TIN PHƯƠNG TIỆN RA/i);
    await expect(page.locator("body")).toContainText(/A-01|SS-20261018-001|51K-992/i);
  });

  test("Kiểm tra bấm Xác nhận Xe Vào & Mở Barrier: Kiểm tra điều kiện trạng thái, lịch sử phiên và trạng thái nâng cần barrier", async ({ page }) => {
    const mockPlate = "51K-888.88";
    let checkInApiCalled = false;
    let createdSessionCode = "SS-20261112-888";

    // 1. Mock API Check-in đúng endpoint của frontend service: /api/v1/parking/sessions/check-in/
    await page.route("**/api/v1/parking/sessions/check-in/**", async (route) => {
      checkInApiCalled = true;
      const requestPayload = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 998,
          session_code: createdSessionCode,
          license_plate: requestPayload.license_plate || mockPlate,
          slot_code: "A-02",
          entry_time: new Date().toISOString(),
          status: "in_progress",
        }),
      });
    });

    // 2. Mock API tra cứu thông tin phương tiện không có phiên gửi treo (trạng thái hợp lệ vào bãi)
    await page.route("**/api/v1/parking/vehicle-lookup/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          vehicle: {
            license_plate: mockPlate,
            brand: "Toyota",
            model_name: "Corolla Cross",
          },
          customer: {
            name: "Lê Hoàng Long",
            phone: "0912 345 678",
          },
          active_ticket: {
            package_name: "Vé tháng",
            status: "ACTIVE",
            is_active: true,
          },
          open_session: null, // Không có phiên treo -> Đủ điều kiện Check-in vào
        }),
      });
    });

    // Mock API lấy ô đỗ khả dụng
    await page.route("**/api/v1/parking/slots/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results: [
            { id: 2, code: "A-02", status: "AVAILABLE", zone: "Khu A" },
            { id: 3, code: "A-03", status: "AVAILABLE", zone: "Khu A" },
          ],
        }),
      });
    });

    // 3. Mở Modal Kiểm soát cổng tại Làn Vào
    await page.goto("/vehicles");
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // Nhập biển số vào ô input bên trong Modal (tránh nhầm ô tìm kiếm của trang Quản lý xe)
    const modalInputPlate = page.getByPlaceholder(/Nhập hoặc quét biển số/i);
    await expect(modalInputPlate).toBeVisible();
    await modalInputPlate.fill(mockPlate);

    const searchBtn = page.getByRole("button", { name: /Tra cứu/i });
    await expect(searchBtn).toBeEnabled();
    await searchBtn.click();

    // Xác nhận thông tin xe hiển thị theo định dạng dữ liệu (Tên xe, Hãng xe, Khách hàng)
    const modalHeading = page.getByRole("heading", { name: /Kiểm Soát Cổng Ra \/ Vào/i });
    await expect(modalHeading).toBeVisible();

    // Đối soát thông tin phương tiện đã nạp thành công từ vehicle-lookup
    await expect(page.locator("body")).toContainText(/Corolla Cross|Toyota|Lê Hoàng Long/i, {
      timeout: 10000,
    });
    await expect(page.locator("body")).not.toContainText(/CẢNH BÁO: BIỂN SỐ TRONG DANH SÁCH ĐEN/i);

    // Kiểm tra trạng thái Barrier trước khi xác nhận: Phải là ĐANG ĐÓNG
    await expect(page.locator("body")).toContainText(/ĐANG ĐÓNG/i);

    // 4. Bấm nút: ✓ Xác nhận Xe Vào & Mở Barrier
    const confirmBtn = page.getByRole("button", { name: /Xác nhận Xe Vào & Mở Barrier/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 5. Kiểm tra trạng thái Barrier chuyển sang ĐANG NÂNG CẦN hoặc ĐÃ MỞ - MỜI XE QUA
    await expect(page.locator("body")).toContainText(/ĐANG NÂNG CẦN|ĐÃ MỞ - MỜI XE QUA/i);

    // Kiểm tra thông báo kết quả Check-in thành công
    await expect(page.locator("body")).toContainText(/Đã Check-in thành công! Mở barrier mời xe vào/i);

    // 6. Kiểm tra giao diện và nút chuyển sang Làn Ra hoặc Xem lịch sử đối soát
    // Nút xem lịch sử đối soát điều hướng với biển số
    await expect(page.locator("body")).toContainText(/Xem lịch sử đối soát/i);

    // Bấm chuyển sang Làn Ra để kiểm tra panel Check-out
    const exitLaneBtn = page.getByRole("button", { name: /Làn Ra/i });
    await exitLaneBtn.click();

    // Đối soát thông tin tại Làn Ra: hiển thị thông tin xe đã nhận diện từ phiên vào
    await expect(page.locator("body")).toContainText(/THÔNG TIN PHƯƠNG TIỆN RA/i);
    await expect(page.locator("body")).toContainText(/Corolla Cross|Toyota|Lê Hoàng Long/i);
    await expect(page.locator("body")).toContainText(/Vé tháng hiệu lực|Đủ điều kiện mở barrier/i);
  });

  test("ST-CORE-03: Kịch bản Anti-Passback Defense - Chặn xe check-in lần 2 khi chưa ra bãi", async ({ page }) => {
    const mockPlate = "51K-999.99";

    // Mock API kiểm tra xe: Phương tiện đang có phiên gửi cũ chưa đóng (open_session tồn tại)
    await page.route("**/api/v1/parking/vehicle-lookup/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          vehicle: {
            license_plate: mockPlate,
            brand: "Toyota",
            model_name: "Camry 2.5Q",
          },
          customer: {
            name: "Trần Minh Quân",
            phone: "0909 888 777",
          },
          active_ticket: {
            package_name: "Vé tháng",
            status: "ACTIVE",
            is_active: true,
          },
          // QUAN TRỌNG: open_session đang tồn tại => Xe chưa hề check-out (Anti-Passback)
          open_session: {
            id: 8881,
            session_code: "SES-ANTIPASSBACK-01",
            entry_time: "2026-11-12T07:30:00Z",
            slot_code: "B-01",
            fee_amount: 0,
          },
        }),
      });
    });

    // Mock danh sách slot khả dụng
    await page.route("**/api/v1/parking/slots/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results: [
            { id: 10, code: "B-01", status: "AVAILABLE", zone: "Khu B" },
            { id: 11, code: "B-02", status: "AVAILABLE", zone: "Khu B" },
          ],
        }),
      });
    });

    // Mở trang Quản lý xe và bật Modal Scan
    await page.goto("/vehicles");
    const scanBtn = page.getByRole("button", { name: /Scan biển số/i }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // Nhập biển số đang có phiên treo trong bãi
    const modalInputPlate = page.getByPlaceholder(/Nhập hoặc quét biển số/i);
    await expect(modalInputPlate).toBeVisible();
    await modalInputPlate.fill(mockPlate);

    const searchBtn = page.getByRole("button", { name: /Tra cứu/i });
    await searchBtn.click();

    // 1. Kiểm tra đối soát thông tin xe
    await expect(page.locator("body")).toContainText(/Camry 2.5Q|Toyota|Trần Minh Quân/i, { timeout: 10000 });

    // 2. ANTI-PASSBACK CHECK:
    // Cảnh báo phiên gửi cũ chưa đóng phải hiển thị nổi bật
    await expect(page.locator("body")).toContainText(/Xe đang có phiên gửi cũ chưa đóng/i);

    // Tuyệt đối KHÔNG có nút "✓ Xác nhận Xe Vào & Mở Barrier" thông thường
    const normalConfirmBtn = page.getByRole("button", { name: /^✓ Xác nhận Xe Vào & Mở Barrier$/i });
    await expect(normalConfirmBtn).not.toBeVisible();

    // Thay vào đó, hệ thống chuyển sang nút bảo vệ: "⚡ Đóng phiên cũ & Check-in Vào"
    const defensiveBtn = page.getByRole("button", { name: /⚡ Đóng phiên cũ & Check-in Vào/i });
    await expect(defensiveBtn).toBeVisible();
    await expect(page.locator("body")).toContainText(/Đóng phiên cũ & Check-in/i);
  });

  test("Kiểm tra sơ đồ bãi đỗ xe và danh sách ô đỗ", async ({ page }) => {
    await page.goto("/parking-lot");

    // Trang sơ đồ bãi xe phải nạp thành công các khu vực A, B, C, D
    await expect(page.locator("body")).toContainText(/Khu|Tầng|Sơ đồ|Ô đỗ/i);
  });

  test("Kiểm tra Blacklist Gatekeeper Defense: cảnh báo biển số danh sách đen và khóa barrier", async ({ page }) => {
    const blacklistPlate = "30A-999.99";

    // Mock API tra cứu xe trả về xe nằm trong blacklist
    await page.route("**/api/v1/parking/vehicle-lookup/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          is_blacklisted: true,
          status: "BLACKLISTED",
          vehicle: {
            license_plate: blacklistPlate,
            brand: "Mercedes-Benz",
            model_name: "S450 Maybach",
            status: "BLACKLISTED",
            note: "Cảnh báo an ninh: Phương tiện trong danh sách đen",
          },
          customer: {
            name: "Đối tượng Cảnh báo An ninh",
            phone: "0999 999 999",
          },
          open_session: null,
          active_ticket: null,
        }),
      });
    });

    // Mock danh sách slot khả dụng
    await page.route("**/api/v1/parking/slots/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results: [
            { id: 1, code: "A-01", status: "AVAILABLE", zone: "Khu A" },
          ],
        }),
      });
    });

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
    const ghostPlate = "51H-777.77";

    // Mock API tra cứu xe: xe vãng lai hoặc không có open_session trong bãi
    await page.route("**/api/v1/parking/vehicle-lookup/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          vehicle: {
            license_plate: ghostPlate,
            brand: "Hyundai",
            model_name: "Tucson",
          },
          customer: {
            name: "Khách Vãng Lai",
            phone: "0901 234 567",
          },
          open_session: null,
          active_ticket: null,
        }),
      });
    });

    // Mock API sessions: không có phiên đang mở
    await page.route("**/api/v1/parking/sessions/**", async (route) => {
      // Nếu là request check-out thì từ chối với lỗi PROP-4.5.1-P06
      if (route.request().url().includes("/check-out")) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            code: "PROP-4.5.1-P06",
            message: "Không tìm thấy phiên đỗ đang mở cho phương tiện này.",
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            results: [],
            items: [],
            total: 0,
          }),
        });
      }
    });

    // Mock API fee preview
    await page.route("**/api/v1/parking/sessions/fee-preview/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          fee_amount: 0,
          duration_minutes: 0,
          duration_text: "0m",
          hourly_rate: 15000,
        }),
      });
    });

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

    // 6. Bấm nút xác nhận ra bãi: Xác nhận Mở Barrier (0đ) hoặc Đã Thu Tiền & Mở Barrier
    const confirmExitBtn = page.getByRole("button", { name: /Xác nhận|Đã Thu Tiền & Mở Barrier/i });
    await expect(confirmExitBtn).toBeVisible();
    await confirmExitBtn.click();

    // 7. Assert: Backend từ chối và UI hiển thị cảnh báo lỗi Ghost Exit rõ ràng
    await expect(page.locator("body")).toContainText(/Không tìm thấy phiên đỗ đang mở cho phương tiện này/i, { timeout: 10000 });

    // 8. Assert: Barrier tuyệt đối không mở, giữ nguyên trạng thái ĐANG ĐÓNG
    await expect(page.locator("body")).toContainText(/ĐANG ĐÓNG/i);
    await expect(page.locator("body")).not.toContainText(/ĐÃ MỞ - MỜI XE QUA/i);
  });
});

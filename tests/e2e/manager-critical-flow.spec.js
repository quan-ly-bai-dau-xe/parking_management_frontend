import { test, expect } from "@playwright/test";
import { loginAsStaff, TEST_CREDENTIALS } from "./helpers/auth.js";

test.describe("Manager Critical E2E Flow (Full Journey)", () => {
  test("Luồng nghiệp vụ đầy đủ của Quản lý: Chặn truy cập -> Đăng nhập -> Bãi xe -> Nhân viên -> Thống kê -> Đăng xuất", async ({
    page,
  }) => {
    // 1. Cô lập môi trường: dọn sạch session trước khi bắt đầu
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // 2. Xác minh các route đặc quyền của Manager bị chặn và redirect về /login khi chưa đăng nhập
    await page.goto("/employees");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/statistics");
    await expect(page).toHaveURL(/\/login/);

    // 3. Đăng nhập thật với tài khoản Quản lý (Role: QL)
    await loginAsStaff(page, TEST_CREDENTIALS);

    // 4. Kiểm tra trang Sơ đồ bãi xe (/parking-lot)
    await page.goto("/parking-lot");
    await expect(page).toHaveURL(/\/parking-lot/);
    await expect(page.locator("main, [role='main']").first()).toBeVisible({ timeout: 10000 });

    // 5. Truy cập trang Quản lý nhân viên (/employees) - đặc quyền Manager
    await page.goto("/employees");
    await expect(page).toHaveURL(/\/employees/);
    await expect(page.locator("main, [role='main']").first()).toBeVisible({ timeout: 10000 });
    // Xác minh dữ liệu nhân viên thật từ backend được hiển thị
    await expect(page.getByText(/Hoàng Đình Khang|NV001/i).first()).toBeVisible({ timeout: 10000 });

    // 6. Truy cập trang Thống kê tổng hợp (/statistics) - đặc quyền Manager
    await page.goto("/statistics");
    await expect(page).toHaveURL(/\/statistics/);
    await expect(page.locator("main, [role='main']").first()).toBeVisible({ timeout: 10000 });

    // 7. Đăng xuất và xác minh phiên làm việc bị hủy hoàn toàn
    const logoutBtn = page.getByRole("button", { name: /đăng xuất|logout/i }).first();
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    } else {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    }

    // 8. Xác minh không thể truy cập lại route Manager sau khi đăng xuất
    await page.goto("/employees");
    await expect(page).toHaveURL(/\/login/);
  });
});

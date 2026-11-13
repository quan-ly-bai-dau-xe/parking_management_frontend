import { test, expect } from "@playwright/test";
import { loginAsStaff } from "./helpers/auth.js";

test.describe("Mission-Critical 1: Authentication & Route Protection Guard", () => {
  test("Chặn truy cập trái phép và redirect về Login khi chưa đăng nhập", async ({ page }) => {
    // 1. Dọn sạch storage để đảm bảo chưa có session
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // 2. Thử truy cập trực tiếp route nội bộ được bảo vệ
    await page.goto("/parking-lot");

    // 3. Phải tự động điều hướng về /login
    await expect(page).toHaveURL(/\/login/);

    // 4. Phải hiển thị form đăng nhập với các trường cần thiết
    await expect(page.locator('input[type="text"], input[name="username"], input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("Đăng nhập thành công với tài khoản nhân viên và truy cập các trang nội bộ", async ({ page }) => {
    await loginAsStaff(page);
  });
});

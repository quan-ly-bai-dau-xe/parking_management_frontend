import { expect } from "@playwright/test";

export const TEST_CREDENTIALS = {
  email: "hoang.dinh.khang@example.com",
  password: "testpass123",
};

/**
 * Đăng nhập thật 100% qua Backend Django API
 * Tự động đồng bộ Cookie, Session và LocalStorage cho trình duyệt Playwright
 * @param {import("@playwright/test").Page} page
 * @param {object} [credentials]
 */
export async function loginAsStaff(page, credentials = TEST_CREDENTIALS) {
  // 1. Điều hướng đến trang login
  await page.goto("/login");

  // 2. Điền form đăng nhập thật
  const userInput = page.locator('input[type="text"], input[name="username"], input[name="account"], input[type="email"]').first();
  const passInput = page.locator('input[type="password"]').first();

  await userInput.fill(credentials.email);
  await passInput.fill(credentials.password);

  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();

  // 3. Chờ điều hướng vào trang quản lý sau khi Backend xác thực thành công
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
}

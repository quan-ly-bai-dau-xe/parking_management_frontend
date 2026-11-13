import { expect } from "@playwright/test";

export const TEST_CREDENTIALS = {
  email: "hoang.dinh.khang@example.com",
  password: "testpass123",
};

/**
 * Helper thực hiện luồng đăng nhập chuẩn qua form E2E
 * @param {import("@playwright/test").Page} page
 * @param {object} [credentials]
 */
export async function loginAsStaff(page, credentials = TEST_CREDENTIALS) {
  await page.goto("/login");

  const userInput = page.locator('input[type="text"], input[name="username"], input[name="account"], input[type="email"]').first();
  const passInput = page.locator('input[type="password"]').first();

  await userInput.fill(credentials.email);
  await passInput.fill(credentials.password);

  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();

  // Chờ điều hướng ra khỏi trang login
  await expect(page).not.toHaveURL(/\/login/);
}

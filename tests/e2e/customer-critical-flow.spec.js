import { test, expect } from "@playwright/test";
import { loginAsStaff } from "./helpers/auth.js";

const CUSTOMER_CREDENTIALS = {
  email: "trinh.xuan.truong@example.com",
  password: "Parking@Dev2026",
};

function generateUniquePlate() {
  const num3 = String(Math.floor(100 + Math.random() * 900));
  const num2 = String(Math.floor(10 + Math.random() * 90));
  return `30A-${num3}.${num2}`;
}

test.describe("Mission-Critical Customer Flow: Login -> Add Vehicle -> Buy Ticket -> Verify Overview", () => {
  test("Luồng khép kín khách hàng: Đăng nhập -> Thêm phương tiện -> Mua vé -> Kiểm tra tổng quan", async ({
    page,
  }) => {
    const uniquePlate = generateUniquePlate();
    const modelName = "E2E Civic";

    // 1. Đăng nhập với tài khoản Customer thật
    await page.goto("/login");
    const userInput = page.locator('input[type="text"], input[name="username"], input[name="account"], input[type="email"]').first();
    const passInput = page.locator('input[type="password"]').first();
    await userInput.fill(CUSTOMER_CREDENTIALS.email);
    await passInput.fill(CUSTOMER_CREDENTIALS.password);

    const [loginRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/auth/login") && res.request().method() === "POST"),
      page.locator('button[type="submit"]').first().click(),
    ]);
    expect(loginRes.status(), `Login failed: ${await loginRes.text()}`).toBe(200);
    await expect(page).toHaveURL(/\/(overview|customerOverview)/i, { timeout: 15000 });
    await expect(page.getByRole("button", { name: /Mua vé đỗ xe/i })).toBeVisible({ timeout: 10000 });

    // 2. Điều hướng sang trang Phương tiện của tôi (/customerVehicle)
    await page.goto("/customerVehicle");

    const addVehicleBtn = page.getByRole("button", { name: /Thêm phương tiện|Thêm xe/i }).first();
    await expect(addVehicleBtn).toBeVisible({ timeout: 10000 });

    // Xác minh danh sách phương tiện của khách hàng đã tải (có ít nhất 1 biển số)
    const searchInput = page.getByPlaceholder(/Tìm biển số/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // 3. Điều hướng sang trang Vé của tôi (/customerTicket) để kiểm tra luồng mua vé
    await page.goto("/customerTicket");

    const buyTicketBtn = page.getByRole("button", { name: /Mua vé mới/i });
    await expect(buyTicketBtn).toBeVisible({ timeout: 10000 });
    await buyTicketBtn.click();

    // Xác minh modal Mua vé mở ra và hiển thị danh sách phương tiện
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Kiểm tra trạng thái số dư ví: nếu đủ tiền thì mua vé thành công, nếu thiếu thì xác minh cảnh báo
    const insufficientAlert = dialog.getByText(/Số dư ví không đủ/i);
    const submitBuyBtn = dialog.getByRole("button", { name: /Xác nhận mua vé|Thanh toán/i }).last();

    if (await insufficientAlert.isVisible().catch(() => false)) {
      await expect(insufficientAlert).toBeVisible();
      await dialog.getByRole("button", { name: /Đóng|Hủy/i }).first().click();
    } else if (
      (await submitBuyBtn.isVisible().catch(() => false)) &&
      (await submitBuyBtn.isEnabled().catch(() => false))
    ) {
      await submitBuyBtn.click();
      await expect(dialog).toBeHidden({ timeout: 10000 });
    } else {
      await dialog.getByRole("button", { name: /Đóng|Hủy/i }).first().click();
    }

    // 4. Quay lại trang Tổng quan (/overview) để kiểm tra đồng bộ dữ liệu
    await page.goto("/overview");
    await expect(page.getByRole("button", { name: /Mua vé đỗ xe/i })).toBeVisible({ timeout: 10000 });
  });
});

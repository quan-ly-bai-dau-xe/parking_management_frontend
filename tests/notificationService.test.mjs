import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { axiosInstance } from "../src/services/apiClient.js";
import * as notificationService from "../src/services/notificationService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("WP3-NOTIF-01: notificationService exposes getMyNotifications, markNotificationRead, markAllNotificationsRead against /api/v1/me/notifications/", async () => {
  assert.equal(typeof notificationService.getMyNotifications, "function");
  assert.equal(typeof notificationService.markNotificationRead, "function");
  assert.equal(typeof notificationService.markAllNotificationsRead, "function");

  const originalRequest = axiosInstance.request;
  const calls = [];

  try {
    axiosInstance.request = async (config) => {
      calls.push({ method: (config.method || "GET").toUpperCase(), url: config.url, params: config.params });
      if (config.url === "/api/v1/me/notifications/") {
        return {
          data: {
            count: 1,
            unread_count: 1,
            results: [
              {
                id: 77,
                title: "Số dư ví không đủ tại cổng ra (OUT_01)",
                content: "Xe 30A-612.** cần thanh toán 20,000 VND nhưng số dư ví hiện tại là 5,000 VND (còn thiếu 15,000 VND).",
                notification_type: "PAYMENT",
                is_read: false,
                read_at: null,
                created_at: "2026-11-22T10:00:00Z",
                missing_amount: "15000.00",
              },
            ],
          },
        };
      }
      if (config.url === "/api/v1/me/notifications/77/read/") {
        return {
          data: {
            unread_count: 0,
            notification: { id: 77, is_read: true, read_at: "2026-11-22T10:01:00Z" },
          },
        };
      }
      if (config.url === "/api/v1/me/notifications/read-all/") {
        return { data: { updated_count: 1, unread_count: 0 } };
      }
      throw new Error(`Unexpected URL ${config.url}`);
    };

    const res = await notificationService.getMyNotifications({ pageSize: 10 });
    assert.equal(res.unreadCount, 1);
    assert.equal(res.results.length, 1);
    assert.equal(res.results[0].id, 77);
    assert.equal(res.results[0].unread, true);
    assert.equal(res.results[0].missingAmount, "15000.00");

    const single = await notificationService.markNotificationRead(77);
    assert.equal(single.unread_count, 0);

    const all = await notificationService.markAllNotificationsRead();
    assert.equal(all.unread_count, 0);

    assert.deepEqual(
      calls.map((c) => `${c.method} ${c.url}`),
      [
        "GET /api/v1/me/notifications/",
        "POST /api/v1/me/notifications/77/read/",
        "POST /api/v1/me/notifications/read-all/",
      ]
    );
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("WP3-NOTIF-02: AppTopHeader removes hardcoded INITIAL_NOTIFICATIONS and removes /history from CUSTOMER_NAVIGATION_TABS", () => {
  const headerPath = path.resolve(__dirname, "../src/components/layout/AppTopHeader.jsx");
  const headerCode = fs.readFileSync(headerPath, "utf-8");

  assert.equal(
    headerCode.includes("INITIAL_NOTIFICATIONS"),
    false,
    "AppTopHeader must NOT contain hardcoded INITIAL_NOTIFICATIONS"
  );
  assert.equal(
    headerCode.includes("51A-12345"),
    false,
    "AppTopHeader must NOT contain fake hardcoded plate 51A-12345"
  );
  assert.ok(
    headerCode.includes("getMyNotifications"),
    "AppTopHeader must fetch real notifications via notificationService"
  );
  assert.ok(
    headerCode.includes("ROUTES.NOTIFICATIONS") || headerCode.includes('"/notifications"'),
    "AppTopHeader dropdown must include Xem tất cả link to /notifications"
  );

  const custTabsMatch = headerCode.match(/const CUSTOMER_NAVIGATION_TABS = \[([\s\S]*?)\];/);
  assert.ok(custTabsMatch, "CUSTOMER_NAVIGATION_TABS must exist");
  assert.equal(
    custTabsMatch[1].includes('"/history"'),
    false,
    "CUSTOMER_NAVIGATION_TABS must NOT point to staff-only /history (403)"
  );
});

test("WP3-NOTIF-03: NotificationsPage removes static NOTIFICATIONS mock and receives layout variant via App.jsx wrapper", () => {
  const pagePath = path.resolve(__dirname, "../src/pages/NotificationsPage.jsx");
  const pageCode = fs.readFileSync(pagePath, "utf-8");
  const appPath = path.resolve(__dirname, "../src/App.jsx");
  const appCode = fs.readFileSync(appPath, "utf-8");

  assert.equal(
    pageCode.includes("const NOTIFICATIONS = ["),
    false,
    "NotificationsPage must NOT contain static mock NOTIFICATIONS array"
  );
  assert.equal(
    pageCode.includes("51A-12345"),
    false,
    "NotificationsPage must NOT contain fake hardcoded plate 51A-12345"
  );
  assert.ok(
    pageCode.includes("useCurrentUser"),
    "NotificationsPage must read user role from useCurrentUser"
  );
  assert.equal(
    pageCode.includes("<AppTopHeader"),
    false,
    "NotificationsPage must NOT render a duplicate AppTopHeader directly (wrapped by NotificationsLayoutWrapper in App.jsx)"
  );
  assert.ok(
    appCode.includes("NotificationsLayoutWrapper") && appCode.includes('variant: "customer"'),
    "App.jsx NotificationsLayoutWrapper must pass customer variant to AppLayout when role is CUSTOMER"
  );
  assert.ok(
    pageCode.includes("getMyNotifications") && pageCode.includes("markNotificationRead"),
    "NotificationsPage must use real notificationService endpoints"
  );
});

test("WP3-NOTIF-04: fetchNotificationsForRole only calls /api/v1/me/notifications/ for CUSTOMER, never for STAFF/ANON", async () => {
  const originalRequest = axiosInstance.request;
  const calledUrls = [];

  try {
    axiosInstance.request = async (config) => {
      calledUrls.push(config.url);
      if (config.url === "/api/v1/me/notifications/") {
        return { data: { count: 0, unread_count: 0, results: [] } };
      }
      if (config.url.includes("/parking/sessions")) {
        return { data: { results: [] } };
      }
      if (config.url.includes("/parking/slots")) {
        return { data: { results: [] } };
      }
      return { data: {} };
    };

    await notificationService.fetchNotificationsForRole("EMPLOYEE");
    assert.equal(
      calledUrls.includes("/api/v1/me/notifications/"),
      false,
      "EMPLOYEE must NEVER trigger /api/v1/me/notifications/ (would cause 403)"
    );

    await notificationService.fetchNotificationsForRole(null);
    assert.equal(calledUrls.includes("/api/v1/me/notifications/"), false);

    await notificationService.fetchNotificationsForRole("CUSTOMER");
    assert.equal(calledUrls.includes("/api/v1/me/notifications/"), true);
  } finally {
    axiosInstance.request = originalRequest;
  }
});

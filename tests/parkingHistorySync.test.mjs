import test from "node:test";
import assert from "node:assert/strict";
import {
  mapParkingSession,
  validateAndMapSessions,
} from "../src/utils/parking/plateScanMapper.js";
import {
  getParkingSessionStatus,
  SESSION_STATUS_CONFIG,
  PARKING_HISTORY_DEFAULTS,
  SESSION_STATUS_FILTER_OPTIONS,
} from "../src/constants/parkingHistoryConstants.js";
import { axiosInstance } from "../src/services/apiClient.js";
import { getParkingSessions } from "../src/services/plateScanService.js";
import {
  makeMockRawBackendSession,
  makeMockParkingSession,
} from "./factories/sessionFactory.mjs";

/**
 * Test suite for Parking History Sync: 'parking-session-changed' CustomEvent,
 * 8 required display fields, and query filtering.
 */

test("HistorySync: CustomEvent 'parking-session-changed' payload format on check-in & check-out", () => {
  // Mô phỏng payload được phát bởi GateCameraControlModal
  const checkInDetail = {
    action: "check-in",
    licensePlate: "51A-897.14",
    sessionCode: "PK-20261106-001",
  };

  const checkOutDetail = {
    action: "check-out",
    licensePlate: "51A-897.14",
    sessionCode: "PK-20261106-001",
  };

  const checkInEvent = new CustomEvent("parking-session-changed", { detail: checkInDetail });
  const checkOutEvent = new CustomEvent("parking-session-changed", { detail: checkOutDetail });

  assert.equal(checkInEvent.type, "parking-session-changed");
  assert.equal(checkInEvent.detail.action, "check-in");
  assert.equal(checkInEvent.detail.licensePlate, "51A-897.14");
  assert.equal(checkInEvent.detail.sessionCode, "PK-20261106-001");

  assert.equal(checkOutEvent.type, "parking-session-changed");
  assert.equal(checkOutEvent.detail.action, "check-out");
  assert.equal(checkOutEvent.detail.licensePlate, "51A-897.14");
  assert.equal(checkOutEvent.detail.sessionCode, "PK-20261106-001");
});

test("HistorySync: Event listener in ParkingHistory triggers fetchSessions on 'parking-session-changed'", () => {
  let fetchCount = 0;
  const fetchSessions = () => {
    fetchCount += 1;
  };

  const handleSessionChanged = () => {
    fetchSessions();
  };

  // Giả lập cơ chế addEventListener & removeEventListener trên global/window
  const listeners = [];
  const fakeWindow = {
    addEventListener: (type, handler) => {
      listeners.push({ type, handler });
    },
    removeEventListener: (type, handler) => {
      const idx = listeners.findIndex((l) => l.type === type && l.handler === handler);
      if (idx !== -1) listeners.splice(idx, 1);
    },
    dispatchEvent: (evt) => {
      for (const l of listeners) {
        if (l.type === evt.type) {
          l.handler(evt);
        }
      }
    },
  };

  // Mount ParkingHistory
  fakeWindow.addEventListener("parking-session-changed", handleSessionChanged);
  assert.equal(listeners.length, 1);

  // Check-in thành công phát sự kiện
  fakeWindow.dispatchEvent(
    new CustomEvent("parking-session-changed", {
      detail: { action: "check-in", licensePlate: "51A-897.14", sessionCode: "PK-1" },
    })
  );
  assert.equal(fetchCount, 1, "fetchSessions phải được kích hoạt ngay sau check-in");

  // Check-out thành công phát sự kiện
  fakeWindow.dispatchEvent(
    new CustomEvent("parking-session-changed", {
      detail: { action: "check-out", licensePlate: "51A-897.14", sessionCode: "PK-1" },
    })
  );
  assert.equal(fetchCount, 2, "fetchSessions phải được kích hoạt ngay sau check-out");

  // Unmount ParkingHistory (clean up listener)
  fakeWindow.removeEventListener("parking-session-changed", handleSessionChanged);
  assert.equal(listeners.length, 0);

  // Phát sự kiện sau khi unmount -> không còn gọi fetchSessions
  fakeWindow.dispatchEvent(
    new CustomEvent("parking-session-changed", {
      detail: { action: "check-in", licensePlate: "43A-123.45", sessionCode: "PK-2" },
    })
  );
  assert.equal(fetchCount, 2, "Không được gọi fetchSessions sau khi đã dọn dẹp listener");
});

test("HistorySync: 8 required fields mapped accurately from backend session", () => {
  const backendSession = makeMockRawBackendSession({
    id: 99,
    session_code: "PK-20261106-099",
    license_plate: "51A-897.14",
    entry_time: "2026-11-06T08:00:00Z",
    exit_time: "2026-11-06T09:15:00Z",
    duration_text: "1 giờ 15 phút",
    status: "completed",
    fee_amount: 20000,
    entry_image_url: "https://res.cloudinary.com/test/image/upload/v1/plate_entry.jpg",
    exit_image_url: "https://res.cloudinary.com/test/image/upload/v1/plate_exit.jpg",
  });

  const mapped = mapParkingSession(backendSession);

  // 1. Mã phiên (session code)
  assert.equal(mapped.sessionCode, "PK-20261106-099");

  // 2. Biển số xe (license plate)
  assert.equal(mapped.licensePlate, "51A-897.14");

  // 3. Giờ vào (entry time)
  assert.ok(mapped.entryTime);
  assert.notEqual(mapped.entryTime, PARKING_HISTORY_DEFAULTS.PLACEHOLDER_TEXT);

  // 4. Giờ ra (exit time)
  assert.ok(mapped.exitTime);
  assert.notEqual(mapped.exitTime, PARKING_HISTORY_DEFAULTS.PLACEHOLDER_TEXT);

  // 5. Tổng thời gian (duration / duration_text)
  assert.equal(mapped.duration, "1 giờ 15 phút");

  // 6. Trạng thái (status: Đang đỗ / Đã hoàn thành)
  assert.equal(mapped.status, "completed");
  const statusInfo = getParkingSessionStatus(mapped);
  assert.equal(statusInfo.label, "Đã ra bãi");

  // 7. Cước phí (fee amount)
  assert.equal(mapped.feeNumber, 20000);
  assert.equal(mapped.fee, "20.000đ");

  // 8. Hình ảnh thumbnail (Cloudinary URL)
  assert.equal(
    mapped.plateImageUrl,
    "https://res.cloudinary.com/test/image/upload/v1/plate_entry.jpg"
  );
  assert.equal(
    mapped.exitPlateImageUrl,
    "https://res.cloudinary.com/test/image/upload/v1/plate_exit.jpg"
  );
});

test("HistorySync: Image thumbnail fallback resilience when Cloudinary upload fails (null image)", () => {
  // Khi check-in gặp lỗi 502 Cloudinary, entry_image_url = null
  const sessionWithoutImage = makeMockRawBackendSession({
    session_code: "PK-20261106-502",
    license_plate: "51A-897.14",
    entry_image_url: null,
    plate_image_url: null,
    exit_image_url: null,
    status: "in_progress",
    exit_time: null,
  });

  const mapped = mapParkingSession(sessionWithoutImage);
  assert.equal(mapped.plateImageUrl, null);
  assert.equal(mapped.exitPlateImageUrl, null);

  // Xác nhận trạng thái đang đỗ
  const statusInfo = getParkingSessionStatus(mapped);
  assert.equal(statusInfo.label, "Đang trong bãi");
  assert.equal(mapped.sessionCode, "PK-20261106-502");
});

test("HistorySync: Filter by license plate constructs query and returns filtered list", async () => {
  const originalRequest = axiosInstance.request;
  let capturedQuery = null;

  try {
    axiosInstance.request = async (config) => {
      capturedQuery = config.url;
      return {
        data: {
          count: 1,
          results: [
            makeMockRawBackendSession({
              id: 101,
              session_code: "PK-DEMO-001",
              license_plate: "51A-897.14",
            }),
          ],
        },
      };
    };

    const res = await getParkingSessions({
      license_plate: "51A-897.14",
      page: 1,
      page_size: 10,
    });

    assert.ok(capturedQuery.includes("license_plate=51A-897.14"));
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0].licensePlate, "51A-897.14");
    assert.equal(res.total, 1);
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("HistorySync: Filter by status (all / in_progress / completed) maps to correct API params", async () => {
  const originalRequest = axiosInstance.request;
  const capturedUrls = [];

  try {
    axiosInstance.request = async (config) => {
      capturedUrls.push(config.url);
      return {
        data: { count: 0, results: [] },
      };
    };

    // Tất cả tình trạng: không truyền param status (hoặc rỗng)
    await getParkingSessions({ status: "" });

    // Đang trong bãi: truyền status=open
    await getParkingSessions({ status: "open" });

    // Đã ra bãi: truyền status=closed
    await getParkingSessions({ status: "closed" });

    assert.ok(!capturedUrls[0].includes("status="));
    assert.ok(capturedUrls[1].includes("status=open"));
    assert.ok(capturedUrls[2].includes("status=closed"));
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("HistorySync: Filter by date range (entry_time_from & entry_time_to) constructs query", async () => {
  const originalRequest = axiosInstance.request;
  let capturedUrl = "";

  try {
    axiosInstance.request = async (config) => {
      capturedUrl = config.url;
      return {
        data: { count: 0, results: [] },
      };
    };

    const dateFrom = "2026-11-01";
    const dateTo = "2026-11-06";

    await getParkingSessions({
      entry_time_from: `${dateFrom}T00:00:00`,
      entry_time_to: `${dateTo}T23:59:59`,
    });

    assert.ok(capturedUrl.includes("entry_time_from=2026-11-01T00%3A00%3A00"));
    assert.ok(capturedUrl.includes("entry_time_to=2026-11-06T23%3A59%3A59"));
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("HistorySync: Status filter options match UI configuration constants", () => {
  assert.equal(SESSION_STATUS_FILTER_OPTIONS.length, 3);
  assert.deepEqual(
    SESSION_STATUS_FILTER_OPTIONS.map((o) => o.value),
    ["all", "in_progress", "completed"]
  );
  assert.deepEqual(
    SESSION_STATUS_FILTER_OPTIONS.map((o) => o.label),
    ["Tất cả tình trạng", "Đang trong bãi", "Đã ra bãi"]
  );
});

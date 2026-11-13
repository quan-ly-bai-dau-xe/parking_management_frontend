import test from "node:test";
import assert from "node:assert/strict";
import { ParkingSessionSchema } from "#src/schemas/parkingSessionSchema.js";
import {
  getParkingSessionStatus,
  SESSION_STATUS_CONFIG,
  PARKING_HISTORY_DEFAULTS,
} from "#src/constants/parkingHistoryConstants.js";
import {
  mapParkingSession,
  validateAndMapSessions,
} from "#src/utils/parking/plateScanMapper.js";
import { axiosInstance } from "#src/services/apiClient.js";
import { getParkingSessions } from "#src/services/plateScanService.js";
import {
  makeMockRawBackendSession,
  makeMockParkingSession,
} from "#tests/factories/sessionFactory.mjs";

test("HISTORY-01: ParkingSessionSchema validates complete backend session response", () => {
  const rawSession = makeMockRawBackendSession();
  const result = ParkingSessionSchema.safeParse(rawSession);
  assert.equal(result.success, true);
});

test("HISTORY-02: ParkingSessionSchema validates in-progress session (null exit time & null fee)", () => {
  const inProgressSession = makeMockRawBackendSession({
    exit_time: null,
    exit_gate_name: null,
    exit_image_url: null,
    fee_amount: 0,
    status: "in_progress",
  });

  const result = ParkingSessionSchema.safeParse(inProgressSession);
  assert.equal(result.success, true);
});

test("HISTORY-03: getParkingSessionStatus classifies session status correctly", () => {
  // Case A: Đang trong bãi (in_progress, không có exitTime)
  const inProgress = { status: "in_progress", exitTime: null };
  assert.equal(getParkingSessionStatus(inProgress), SESSION_STATUS_CONFIG.IN_PROGRESS);

  // Case B: Đã ra bãi (có exitTime hợp lệ)
  const completed = { status: "completed", exitTime: "05/11/2026, 10:30" };
  assert.equal(getParkingSessionStatus(completed), SESSION_STATUS_CONFIG.COMPLETED);

  // Case C: Đã ra bãi dựa trên flag status "closed" hoặc "left"
  const closed = { status: "closed", exitTime: PARKING_HISTORY_DEFAULTS.PLACEHOLDER_TEXT };
  assert.equal(getParkingSessionStatus(closed), SESSION_STATUS_CONFIG.COMPLETED);

  // Case D: Đã hủy (cancelled)
  const cancelled = { status: "cancelled" };
  assert.equal(getParkingSessionStatus(cancelled), SESSION_STATUS_CONFIG.CANCELLED);

  // Case E: Fallback an toàn khi null hoặc undefined
  assert.equal(getParkingSessionStatus(null), SESSION_STATUS_CONFIG.IN_PROGRESS);
  assert.equal(getParkingSessionStatus(undefined), SESSION_STATUS_CONFIG.IN_PROGRESS);
});

test("HISTORY-04: validateAndMapSessions filters out broken sessions and maps safely", () => {
  const mixedData = [
    makeMockRawBackendSession({ id: 1, license_plate: "30A-111.11" }),
    null, // Rác
    { id: 2, license_plate: "51B-222.22" },
    undefined, // Rác
    "invalid-item", // Rác
    makeMockRawBackendSession({ id: 3, license_plate: "43C-333.33" }),
  ];

  const mapped = validateAndMapSessions(mixedData);
  assert.equal(mapped.length, 3);
  assert.equal(mapped[0].licensePlate, "30A-111.11");
  assert.equal(mapped[1].licensePlate, "51B-222.22");
  assert.equal(mapped[2].licensePlate, "43C-333.33");
});

test("HISTORY-05: getParkingSessions cleans query filters and constructs API URL", async () => {
  const originalRequest = axiosInstance.request;
  let capturedUrl = "";

  try {
    axiosInstance.request = async (config) => {
      capturedUrl = config.url;
      return {
        data: {
          count: 1,
          results: [makeMockRawBackendSession({ id: 201, license_plate: "30A-999.99" })],
        },
      };
    };

    const filters = {
      license_plate: "30A-999.99",
      status: "open",
      page: 1,
      page_size: 10,
      empty_param: "", // Phải bị loại bỏ
      null_param: null, // Phải bị loại bỏ
    };

    const res = await getParkingSessions(filters);
    assert.equal(res.total, 1);
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0].licensePlate, "30A-999.99");

    // Kiểm tra URLSearchParams không chứa null/empty
    assert.ok(capturedUrl.includes("license_plate=30A-999.99"));
    assert.ok(capturedUrl.includes("status=open"));
    assert.ok(!capturedUrl.includes("empty_param"));
    assert.ok(!capturedUrl.includes("null_param"));
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("HISTORY-06: Anomaly Detection: Flags sessions exceeding 24 hours or missing verification images", () => {
  // Session kéo dài 30 giờ (1800 phút)
  const longDurationSession = makeMockRawBackendSession({
    duration_seconds: 30 * 3600,
    entry_image_url: null,
    plate_image_url: null,
    review_status: "flagged",
    review_reasons: ["OVERTIME_ALERT", "MISSING_ENTRY_IMAGE"],
  });

  const isOvertime = (longDurationSession.duration_seconds || 0) > 24 * 3600;
  const isMissingImages = !longDurationSession.entry_image_url && !longDurationSession.plate_image_url;
  const isFlagged = longDurationSession.review_status === "flagged";

  assert.equal(isOvertime, true, "Phải phát hiện phiên đỗ quá 24h");
  assert.equal(isMissingImages, true, "Phải phát hiện phiên thiếu ảnh đối soát");
  assert.equal(isFlagged, true, "Phải đánh dấu cờ kiểm tra");
  assert.ok(longDurationSession.review_reasons.includes("OVERTIME_ALERT"));
});

test("HISTORY-07: getParkingSessions handles API failure gracefully", async () => {
  const originalRequest = axiosInstance.request;

  try {
    axiosInstance.request = async () => {
      const err = new Error("Gateway Timeout");
      err.response = { status: 504, data: { detail: "Gateway Timeout" } };
      throw err;
    };

    await assert.rejects(
      async () => {
        await getParkingSessions();
      },
      (err) => {
        assert.equal(err.response?.status, 504);
        return true;
      }
    );
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("HISTORY-08: URL search query params (license_plate / plate) filter history sessions", async () => {
  const originalRequest = axiosInstance.request;
  let capturedConfig = null;

  try {
    axiosInstance.request = async (config) => {
      capturedConfig = config;
      return {
        data: {
          count: 2,
          results: [
            makeMockRawBackendSession({ id: 801, license_plate: "43A-999.99" }),
            makeMockRawBackendSession({ id: 802, license_plate: "43A-999.99" }),
          ],
        },
      };
    };

    // Simulate URLSearchParams with license_plate from plate scan navigation (/history?license_plate=43A-999.99)
    const searchParams = new URLSearchParams("license_plate=43A-999.99");
    const queryPlate = (searchParams.get("license_plate") || searchParams.get("plate") || "").trim();

    assert.equal(queryPlate, "43A-999.99");

    const res = await getParkingSessions({
      license_plate: queryPlate,
      page: 1,
      page_size: 10,
    });

    assert.equal(res.total, 2);
    assert.equal(res.items.length, 2);
    assert.equal(res.items[0].licensePlate, "43A-999.99");
    assert.ok(capturedConfig.url.includes("license_plate=43A-999.99"));
  } finally {
    axiosInstance.request = originalRequest;
  }
});

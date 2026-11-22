import test from "node:test";
import assert from "node:assert/strict";
import { axiosInstance } from "#src/services/apiClient.js";
import {
  getSlots,
  fetchParkingSlots,
  updateSlotStatus,
  getParkingStructure,
  fetchParkingStructure,
  getParkingLotConfig,
  fetchParkingLotConfig,
  parkingLotService,
  normalizeSlot,
} from "#src/services/parkingLotService.js";

// Polyfill minimal browser document if needed for apiClient CSRF
if (typeof globalThis.document === "undefined") {
  globalThis.document = { cookie: "csrftoken=mock-csrf-token" };
}

test("PARKING-LOT-01: Contract aliases and exported methods parity", () => {
  assert.equal(typeof getSlots, "function");
  assert.equal(fetchParkingSlots, getSlots);
  assert.equal(typeof updateSlotStatus, "function");
  assert.equal(typeof getParkingStructure, "function");
  assert.equal(fetchParkingStructure, getParkingStructure);
  assert.equal(getParkingLotConfig, getParkingStructure);
  assert.equal(fetchParkingLotConfig, getParkingStructure);

  assert.equal(parkingLotService.getSlots, getSlots);
  assert.equal(parkingLotService.fetchParkingSlots, fetchParkingSlots);
  assert.equal(parkingLotService.updateSlotStatus, updateSlotStatus);
  assert.equal(parkingLotService.getParkingStructure, getParkingStructure);
  assert.equal(parkingLotService.fetchParkingStructure, fetchParkingStructure);
  assert.equal(parkingLotService.getParkingLotConfig, getParkingLotConfig);
  assert.equal(parkingLotService.fetchParkingLotConfig, fetchParkingLotConfig);
});

test("PARKING-LOT-02: Strict mode (Mock disabled) - throws error on 404/500/network without silent fallback", async () => {
  // Ensure mock is disabled (default when VITE_USE_MOCK is not true)
  const originalRequest = axiosInstance.request;

  try {
    // 1. Backend returns HTTP 404 Not Found
    axiosInstance.request = async () => {
      const err = new Error("Request failed with status code 404");
      err.status = 404;
      err.response = { status: 404 };
      throw err;
    };

    await assert.rejects(
      async () => await getSlots({ floor: "B1", zone: "A" }),
      (err) => {
        assert.equal(err.status, 404);
        return true;
      },
      "getSlots must reject on HTTP 404 without silent fallback to mock data"
    );

    await assert.rejects(
      async () => await updateSlotStatus("A-01", "MAINTENANCE"),
      (err) => {
        assert.equal(err.status, 404);
        return true;
      },
      "updateSlotStatus must reject on HTTP 404 without silent fallback"
    );

    await assert.rejects(
      async () => await getParkingStructure(),
      (err) => {
        assert.equal(err.status, 404);
        return true;
      },
      "getParkingStructure must reject on HTTP 404 without silent fallback"
    );

    // 2. Backend returns Network / 500 Server Error
    axiosInstance.request = async () => {
      const err = new Error("Network Error");
      err.code = "ERR_NETWORK";
      err.status = 500;
      throw err;
    };

    await assert.rejects(
      async () => await getSlots({ floor: "B1", zone: "A" }),
      (err) => {
        assert.equal(err.code, "ERR_NETWORK");
        return true;
      },
      "getSlots must reject on network error without silent fallback"
    );

    await assert.rejects(
      async () => await updateSlotStatus("A-01", "AVAILABLE"),
      (err) => {
        assert.equal(err.code, "ERR_NETWORK");
        return true;
      },
      "updateSlotStatus must reject on network error without silent fallback"
    );

    await assert.rejects(
      async () => await getParkingStructure(),
      (err) => {
        assert.equal(err.code, "ERR_NETWORK");
        return true;
      },
      "getParkingStructure must reject on network error without silent fallback"
    );
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("PARKING-LOT-03: Strict mode (Mock disabled) - processes successful backend API responses", async () => {
  const originalRequest = axiosInstance.request;

  try {
    axiosInstance.request = async (config) => {
      if (config.url === "/api/v1/parking/slots/") {
        return {
          data: [
            { id: 1, code: "A-01", status: "AVAILABLE", floor: "B1", zone: "A" },
            { id: 2, code: "A-02", status: "OCCUPIED", floor: "B1", zone: "A", plate: "30A-999.99" },
          ],
        };
      }
      if (config.url.startsWith("/api/v1/parking/slots/")) {
        return {
          data: {
            id: 1,
            code: "A-01",
            status: "MAINTENANCE",
            floor: "B1",
            zone: "A",
          },
        };
      }
      if (config.url === "/api/v1/parking/structure/") {
        return {
          data: [
            { id: "B1", code: "B1", name: "Tầng B1", zones: [] },
          ],
        };
      }
      throw new Error(`Unexpected URL: ${config.url}`);
    };

    const slots = await getSlots({ floor: "B1", zone: "A" });
    assert.equal(slots.length, 2);
    assert.equal(slots[0].code, "A-01");
    assert.equal(slots[0].statusText, "Trống");
    assert.equal(slots[1].code, "A-02");
    assert.equal(slots[1].statusText, "Đang đỗ");

    const updated = await updateSlotStatus(1, "MAINTENANCE");
    assert.equal(updated.code, "A-01");
    assert.equal(updated.status, "MAINTENANCE");
    assert.equal(updated.statusText, "Bảo trì");

    const structure = await getParkingStructure();
    assert.equal(structure.length, 1);
    assert.equal(structure[0].code, "B1");
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("PARKING-LOT-04: Mock mode explicitly enabled - returns mock data without calling backend API", async () => {
  // Bật mock qua localStorage override MOCK_PARKINGLOT = "true"
  globalThis.window = {
    localStorage: {
      getItem: (key) => (key === "MOCK_PARKINGLOT" ? "true" : null),
    },
  };

  const originalRequest = axiosInstance.request;
  let requestCalled = false;
  axiosInstance.request = async () => {
    requestCalled = true;
    throw new Error("Backend API should NOT be called when mock is enabled!");
  };

  try {
    // 1. getSlots returns 24 mock slots
    const mockSlots = await getSlots({ floor: "B1", zone: "A" });
    assert.equal(requestCalled, false, "Backend API must not be called when mock is enabled");
    assert.ok(Array.isArray(mockSlots));
    assert.equal(mockSlots.length, 24);
    assert.equal(mockSlots[0].code, "A-01");

    // 2. updateSlotStatus returns simulated updated slot
    const updated = await updateSlotStatus("A-05", { status: "RESERVED" });
    assert.equal(requestCalled, false);
    assert.equal(updated.code, "A-05");
    assert.equal(updated.status, "RESERVED");
    assert.equal(updated.statusText, "Đã đặt");

    // 3. getParkingStructure returns full mock structure
    const mockStructure = await getParkingStructure();
    assert.equal(requestCalled, false);
    assert.ok(Array.isArray(mockStructure));
    assert.ok(mockStructure.length > 0);
  } finally {
    axiosInstance.request = originalRequest;
    delete globalThis.window;
  }
});

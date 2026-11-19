import test from "node:test";
import assert from "node:assert/strict";
import { axiosInstance } from "#src/services/apiClient.js";
import {
  scanPlate,
  scanPlateImage,
  lookupVehicleByPlate,
} from "#src/services/plateScanService.js";

// Polyfill minimal FormData and Blob in Node if not available globally
const NodeBlob = globalThis.Blob || class MockBlob {
  constructor(parts = [], options = {}) {
    this.parts = parts;
    this.type = options.type || "";
  }
};

test("CAMERA-01: scanPlate throws when imageBlob is missing or null", async () => {
  await assert.rejects(
    async () => {
      await scanPlate({ imageBlob: null });
    },
    {
      name: "Error",
      message: "imageBlob is required for plate scanning.",
    }
  );
});

test("CAMERA-02: scanPlate constructs correct FormData with preview=true and gateId", async () => {
  const originalRequest = axiosInstance.request;
  let capturedConfig = null;

  try {
    axiosInstance.request = async (config) => {
      capturedConfig = config;
      return {
        data: {
          license_plate: "30A-123.45",
          confidence: 96.5,
          status: "detected",
        },
      };
    };

    const mockBlob = new NodeBlob(["fake-image-bytes"], { type: "image/jpeg" });
    const result = await scanPlate({
      imageBlob: mockBlob,
      preview: true,
      gateId: 2,
    });

    assert.equal(capturedConfig.method.toUpperCase(), "POST");
    assert.equal(capturedConfig.url, "/api/v1/parking/plate-scans/");
    assert.ok(capturedConfig.data instanceof FormData);
    assert.equal(capturedConfig.data.get("preview"), "true");
    assert.equal(capturedConfig.data.get("gate_id"), "2");
    assert.equal(result.license_plate, "30A-123.45");
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("CAMERA-03: scanPlate forwards AbortSignal when camera unmounts or cancels", async () => {
  const originalRequest = axiosInstance.request;
  let abortSignalReceived = null;

  try {
    axiosInstance.request = async (config) => {
      abortSignalReceived = config.signal;
      return { data: { success: true } };
    };

    const controller = new AbortController();
    const mockBlob = new NodeBlob(["bytes"], { type: "image/jpeg" });

    await scanPlate({
      imageBlob: mockBlob,
      signal: controller.signal,
    });

    assert.ok(abortSignalReceived, "AbortSignal must be passed down to axios");
    assert.equal(abortSignalReceived.aborted, false);

    controller.abort();
    assert.equal(abortSignalReceived.aborted, true);
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("CAMERA-04: lookupVehicleByPlate sanitizes plate, converts uppercase and encodes URL", async () => {
  const originalRequest = axiosInstance.request;
  let capturedUrl = "";

  try {
    axiosInstance.request = async (config) => {
      capturedUrl = config.url;
      return {
        data: {
          license_plate: "51K-992.14",
          has_active_ticket: true,
        },
      };
    };

    const result = await lookupVehicleByPlate("  51k-992.14  ");
    assert.equal(capturedUrl, "/api/v1/parking/vehicle-lookup/?license_plate=51K-992.14");
    assert.equal(result.license_plate, "51K-992.14");
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("CAMERA-05: lookupVehicleByPlate returns null for empty or falsy inputs without calling API", async () => {
  const originalRequest = axiosInstance.request;
  let networkCalled = false;

  try {
    axiosInstance.request = async () => {
      networkCalled = true;
      return { data: {} };
    };

    assert.equal(await lookupVehicleByPlate(""), null);
    assert.equal(await lookupVehicleByPlate(null), null);
    assert.equal(await lookupVehicleByPlate(undefined), null);
    assert.equal(networkCalled, false, "Network must not be triggered for empty input");
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("CAMERA-06: Confidence thresholding distinguishes auto-accept vs manual verification", () => {
  const CONFIDENCE_THRESHOLD = 80;

  function evaluateScanConfidence(confidence) {
    if (typeof confidence !== "number" || isNaN(confidence)) {
      return { action: "MANUAL_REVIEW", reason: "INVALID_CONFIDENCE" };
    }
    if (confidence >= CONFIDENCE_THRESHOLD) {
      return { action: "AUTO_ACCEPT", reason: "HIGH_CONFIDENCE" };
    }
    return { action: "MANUAL_REVIEW", reason: "LOW_CONFIDENCE" };
  }

  assert.equal(evaluateScanConfidence(95.5).action, "AUTO_ACCEPT");
  assert.equal(evaluateScanConfidence(80.0).action, "AUTO_ACCEPT");
  assert.equal(evaluateScanConfidence(79.9).action, "MANUAL_REVIEW");
  assert.equal(evaluateScanConfidence(45.0).action, "MANUAL_REVIEW");
  assert.equal(evaluateScanConfidence(null).action, "MANUAL_REVIEW");
  assert.equal(evaluateScanConfidence("abc").action, "MANUAL_REVIEW");
});

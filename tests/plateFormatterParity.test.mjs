import test from "node:test";
import assert from "node:assert/strict";
import {
  formatLicensePlateForDisplay,
  normalizeLicensePlate,
} from "../src/utils/plateFormatter.js";

/**
 * Table-driven parity test suite for Vietnamese License Plate Formatting.
 * Proves 100% parity with Backend apps/parking/services/plate_format.py
 * per Finding 2 and Technical Decision TL-65.
 */

const PARITY_TEST_CASES = [
  // --- 1. Ambiguous Shape A: 8 chars (^[0-9]{2}[A-Z][0-9]{5}$) ---
  // "29H11234" (Car 5-digit vs Moto 4-digit)
  { input: "29H11234", vehicleType: null, expected: "29H11234", desc: "Ambiguous 29H11234 unknown -> compact" },
  { input: "29H11234", vehicleType: "CAR", expected: "29H-112.34", desc: "Ambiguous 29H11234 car -> 29H-112.34" },
  { input: "29H11234", vehicleType: "MOTORCYCLE", expected: "29-H1 1234", desc: "Ambiguous 29H11234 moto -> 29-H1 1234" },
  { input: "29H1 1234", vehicleType: null, expected: "29H11234", desc: "Ambiguous with space unknown -> compact" },
  { input: "29H1 1234", vehicleType: "MOTORCYCLE", expected: "29-H1 1234", desc: "Ambiguous with space moto -> 29-H1 1234" },
  { input: "29-H1 1234", vehicleType: null, expected: "29-H1 1234", desc: "Explicit moto 4-digit preserved" },
  { input: "29-H1 1234", vehicleType: "CAR", expected: "29-H1 1234", desc: "Explicit moto separator preserved regardless of vehicleType" },

  // Demo plate: "51A89714"
  { input: "51A89714", vehicleType: null, expected: "51A89714", desc: "Demo plate 51A89714 unknown -> compact" },
  { input: "51A89714", vehicleType: "CAR", expected: "51A-897.14", desc: "Demo plate 51A89714 car -> 51A-897.14" },
  { input: "51A89714", vehicleType: "MOTORCYCLE", expected: "51-A8 9714", desc: "Demo plate 51A89714 moto -> 51-A8 9714" },
  { input: "51A-897.14", vehicleType: null, expected: "51A-897.14", desc: "Explicit car 5-digit preserved" },
  { input: "51A-897.14", vehicleType: "CAR", expected: "51A-897.14", desc: "Explicit car 5-digit preserved with type" },

  // Clip plate: "30A61235" (Hanoi car)
  { input: "30A61235", vehicleType: null, expected: "30A61235", desc: "Clip plate 30A61235 unknown -> compact" },
  { input: "30A61235", vehicleType: "CAR", expected: "30A-612.35", desc: "Clip plate 30A61235 car -> 30A-612.35" },
  { input: "30A61235", vehicleType: "MOTORCYCLE", expected: "30-A6 1235", desc: "Clip plate 30A61235 moto -> 30-A6 1235" },
  { input: "30A-612.35", vehicleType: null, expected: "30A-612.35", desc: "Clip plate 30A-612.35 explicit preserved" },

  // Other ambiguous 8-char plates
  { input: "30C46858", vehicleType: null, expected: "30C46858", desc: "Ambiguous 30C46858 unknown -> compact" },
  { input: "30C46858", vehicleType: "CAR", expected: "30C-468.58", desc: "Ambiguous 30C46858 car -> 30C-468.58" },
  { input: "43K86050", vehicleType: null, expected: "43K86050", desc: "Ambiguous 43K86050 unknown -> compact" },
  { input: "43K86050", vehicleType: "CAR", expected: "43K-860.50", desc: "Ambiguous 43K86050 car -> 43K-860.50" },
  { input: "29A99988", vehicleType: null, expected: "29A99988", desc: "Ambiguous 29A99988 unknown -> compact" },
  { input: "29A99988", vehicleType: "CAR", expected: "29A-999.88", desc: "Ambiguous 29A99988 car -> 29A-999.88" },

  // --- 2. Ambiguous Shape B: 9 chars 2-letter (^[0-9]{2}[A-Z]{2}[0-9]{5}$) ---
  // "29MD12345" (Car 5-digit 2-letter vs Moto electric 5-digit)
  { input: "29MD12345", vehicleType: null, expected: "29MD12345", desc: "Ambiguous 29MD12345 unknown -> compact" },
  { input: "29MD12345", vehicleType: "CAR", expected: "29MD-123.45", desc: "Ambiguous 29MD12345 car -> 29MD-123.45" },
  { input: "29MD12345", vehicleType: "MOTORCYCLE", expected: "29-MD 123.45", desc: "Ambiguous 29MD12345 moto -> 29-MD 123.45" },
  { input: "50LD04411", vehicleType: null, expected: "50LD04411", desc: "Ambiguous 50LD04411 unknown -> compact" },
  { input: "50LD04411", vehicleType: "CAR", expected: "50LD-044.11", desc: "Ambiguous 50LD04411 car -> 50LD-044.11" },

  // --- 3. Ambiguous Shape C: 8 chars 2-letter (^[0-9]{2}[A-Z]{2}[0-9]{4}$) ---
  { input: "29LD1234", vehicleType: null, expected: "29LD1234", desc: "Ambiguous 29LD1234 unknown -> compact" },
  { input: "29LD1234", vehicleType: "CAR", expected: "29LD-1234", desc: "Ambiguous 29LD1234 car -> 29LD-1234" },
  { input: "29LD1234", vehicleType: "MOTORCYCLE", expected: "29-LD 1234", desc: "Ambiguous 29LD1234 moto -> 29-LD 1234" },

  // --- 4. Unambiguous Motorcycle: 9 chars (^[0-9]{2}[A-Z][0-9][0-9]{5}$) ---
  // Clip plate: "81B334303" (Gia Lai motorcycle)
  { input: "81B334303", vehicleType: null, expected: "81-B3 343.03", desc: "Clip plate 81B334303 unambiguous -> 81-B3 343.03" },
  { input: "81-B3 343.03", vehicleType: null, expected: "81-B3 343.03", desc: "Clip plate 81-B3 343.03 explicit preserved" },
  // Clip plate: "59T249609" (TP.HCM motorcycle)
  { input: "59T249609", vehicleType: null, expected: "59-T2 496.09", desc: "Clip plate 59T249609 unambiguous -> 59-T2 496.09" },
  { input: "59-T2 496.09", vehicleType: null, expected: "59-T2 496.09", desc: "Clip plate 59-T2 496.09 explicit preserved" },
  // "59X112345"
  { input: "59X112345", vehicleType: null, expected: "59-X1 123.45", desc: "Unambiguous motorcycle 59X112345 -> 59-X1 123.45" },

  // --- 5. Unambiguous Car 4-digit: 7 chars (^[0-9]{2}[A-Z][0-9]{4}$) ---
  { input: "29A1234", vehicleType: null, expected: "29A-1234", desc: "Unambiguous car 4-digit 29A1234 -> 29A-1234" },
  { input: "43B4096", vehicleType: null, expected: "43B-4096", desc: "Unambiguous car 4-digit 43B4096 -> 43B-4096" },
  { input: "52S5678", vehicleType: null, expected: "52S-5678", desc: "Unambiguous car 4-digit 52S5678 -> 52S-5678" },

  // --- 6. Lowercase / Mixed case with whitespace ---
  { input: "  51a89714  ", vehicleType: null, expected: "51A89714", desc: "Whitespace lowercase ambiguous unknown -> compact" },
  { input: "  51a89714  ", vehicleType: "CAR", expected: "51A-897.14", desc: "Whitespace lowercase ambiguous car -> 51A-897.14" },
  { input: "30a-612.35", vehicleType: null, expected: "30A-612.35", desc: "Lowercase explicit car preserved" },
  { input: "81b334303", vehicleType: null, expected: "81-B3 343.03", desc: "Lowercase unambiguous motorcycle -> 81-B3 343.03" },
];

test("TL-65: Table-Driven Plate Formatter Parity Test Suite (42 cases)", () => {
  for (const { input, vehicleType, expected, desc } of PARITY_TEST_CASES) {
    const actual = formatLicensePlateForDisplay(input, vehicleType);
    assert.equal(
      actual,
      expected,
      `[FAIL] ${desc}: formatLicensePlateForDisplay("${input}", "${vehicleType}") expected "${expected}", got "${actual}"`
    );
  }
});

test("TL-65: Edge cases and non-standard strings", () => {
  assert.equal(formatLicensePlateForDisplay(null), "");
  assert.equal(formatLicensePlateForDisplay(undefined), "");
  assert.equal(formatLicensePlateForDisplay(""), "");
  assert.equal(formatLicensePlateForDisplay("   \t\n "), "");
  assert.equal(formatLicensePlateForDisplay("UNKNOWN_CODE"), "UNKNOWN_CODE");
  assert.equal(formatLicensePlateForDisplay("TM-12-34"), "TM-12-34");
  assert.equal(formatLicensePlateForDisplay(12345), "");
  assert.equal(formatLicensePlateForDisplay({}), "");
});

test("TL-65: normalizeLicensePlate helper sanity", () => {
  assert.equal(normalizeLicensePlate("51A-897.14"), "51A89714");
  assert.equal(normalizeLicensePlate("81-B3 343.03"), "81B334303");
  assert.equal(normalizeLicensePlate("29-H1 1234"), "29H11234");
  assert.equal(normalizeLicensePlate(null), "");
  assert.equal(normalizeLicensePlate(""), "");
});

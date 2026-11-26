import test from "node:test";
import assert from "node:assert/strict";
import * as fmt from "../src/utils/formatDateTime.js";

test("L9-FMT-01: date-only YYYY-MM-DD formats to dd/MM/yyyy without timezone shift", () => {
  assert.equal(fmt.formatIsoDateToDisplay("2026-11-24"), "24/11/2026");
  assert.equal(typeof fmt.formatDateVN, "function");
  assert.equal(fmt.formatDateVN("2026-11-24"), "24/11/2026");
  assert.equal(fmt.formatDateVN("2026-01-05"), "05/01/2026");
});

test("L9-FMT-02: full ISO with microseconds and Z converts to Asia/Ho_Chi_Minh (+07:00)", () => {
  assert.equal(fmt.formatIsoDateToDisplay("2026-11-24T19:51:55.442000Z"), "25/11/2026");
  assert.equal(typeof fmt.formatDateVN, "function");
  assert.equal(fmt.formatDateVN("2026-11-24T19:51:55.442000Z"), "25/11/2026");
  assert.equal(typeof fmt.formatDateTimeVN, "function");
  assert.equal(fmt.formatDateTimeVN("2026-11-24T19:51:55.442000Z"), "02:51 25/11/2026");
});

test("L9-FMT-03: ISO with +00:00 offset converts to Asia/Ho_Chi_Minh (+07:00) crossing month boundary", () => {
  assert.equal(fmt.formatIsoDateToDisplay("2026-03-31T17:00:00+00:00"), "01/04/2026");
  assert.equal(typeof fmt.formatDateVN, "function");
  assert.equal(fmt.formatDateVN("2026-03-31T17:00:00+00:00"), "01/04/2026");
  assert.equal(typeof fmt.formatDateTimeVN, "function");
  assert.equal(fmt.formatDateTimeVN("2026-03-31T17:00:00+00:00"), "00:00 01/04/2026");
  assert.equal(fmt.formatDateTimeVN("2026-11-24T19:51:55+07:00"), "19:51 24/11/2026");
});

test("L9-FMT-04: null, undefined, empty string, and invalid dates return clean fallback without leaking raw input", () => {
  for (const bad of [null, undefined, "", "   ", "invalid-date", "2026-99-99", "2026-02-30"]) {
    assert.equal(fmt.formatIsoDateToDisplay(bad), "", `Expected empty string for ${String(bad)}`);
    assert.equal(typeof fmt.formatDateVN, "function");
    assert.equal(fmt.formatDateVN(bad, "—"), "—", `Expected fallback for ${String(bad)}`);
    assert.equal(typeof fmt.formatDateTimeVN, "function");
    assert.equal(fmt.formatDateTimeVN(bad, "—"), "—", `Expected fallback for ${String(bad)}`);
  }
});

test("L9-FMT-05: formatTimeVN and formatReservedTimeDisplay format ISO timestamps while keeping HH:mm mock strings", () => {
  assert.equal(typeof fmt.formatTimeVN, "function");
  assert.equal(fmt.formatTimeVN("2026-11-24T19:51:55.442000Z"), "02:51");
  assert.equal(fmt.formatTimeVN("invalid", "—"), "—");

  assert.equal(typeof fmt.formatReservedTimeDisplay, "function");
  assert.equal(fmt.formatReservedTimeDisplay("2026-03-31T17:00:00+00:00"), "00:00 01/04/2026");
  assert.equal(fmt.formatReservedTimeDisplay("14:30"), "14:30");
  assert.equal(fmt.formatReservedTimeDisplay(null, "—"), "—");
});

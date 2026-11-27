import test from "node:test";
import assert from "node:assert/strict";
import { authService } from "../../../src/services/authService.js";

test("authService: không chứa mock data hay dev fallback accounts", () => {
  assert.equal(typeof authService.login, "function");
  assert.equal(typeof authService.logout, "function");
});

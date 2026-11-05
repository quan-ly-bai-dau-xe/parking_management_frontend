import test from 'node:test';
import assert from 'node:assert/strict';
import { getMockParkingSlots } from '../src/mocks/parkingSlotFallback.js';

test('1. getMockParkingSlots returns 24 standard slots for B1-A', () => {
  const slots = getMockParkingSlots({ floor: 'B1', zone: 'A' });
  assert.equal(slots.length, 24, 'B1-A must have exactly 24 slots');

  // Verify prefix uniformity
  const allStartWithA = slots.every((s) => String(s.code || s.label).startsWith('A-'));
  assert.ok(allStartWithA, 'All slots in Zone A must start with A- prefix');

  // Verify first and last slots
  assert.equal(slots[0].code, 'A-01');
  assert.equal(slots[23].code, 'A-24');
});

test('2. getMockParkingSlots generates consistent 24 slots for custom floors and zones', () => {
  const testCases = [
    { floor: 'B2', zone: 'B', expectedPrefix: 'B-' },
    { floor: 'B3', zone: 'C', expectedPrefix: 'C-' },
    { floor: 'F1', zone: 'D', expectedPrefix: 'D-' },
    { floor: 'B1', zone: 'VIP', expectedPrefix: 'VIP-' },
  ];

  for (const tc of testCases) {
    const slots = getMockParkingSlots({ floor: tc.floor, zone: tc.zone });
    assert.equal(slots.length, 24, `Floor ${tc.floor} Zone ${tc.zone} must have 24 slots`);

    assert.equal(slots[0].code, `${tc.expectedPrefix}01`);
    assert.equal(slots[23].code, `${tc.expectedPrefix}24`);
    assert.equal(slots[0].floor, tc.floor);
    assert.equal(slots[0].zone, tc.zone);
  }
});

test('3. Row splitting algorithm partitions 24 slots into 3 equal rows of 8', () => {
  const slots = getMockParkingSlots({ floor: 'B2', zone: 'B' });
  const slotsPerRow = 8;
  const rowA = slots.slice(0, slotsPerRow);
  const rowB = slots.slice(slotsPerRow, slotsPerRow * 2);
  const rowC = slots.slice(slotsPerRow * 2, slotsPerRow * 3);

  assert.equal(rowA.length, 8, 'Row 1 must contain exactly 8 slots');
  assert.equal(rowB.length, 8, 'Row 2 must contain exactly 8 slots');
  assert.equal(rowC.length, 8, 'Row 3 must contain exactly 8 slots');

  assert.equal(rowA[0].label, 'B-01');
  assert.equal(rowA[7].label, 'B-08');
  assert.equal(rowB[0].label, 'B-09');
  assert.equal(rowB[7].label, 'B-16');
  assert.equal(rowC[0].label, 'B-17');
  assert.equal(rowC[7].label, 'B-24');
});

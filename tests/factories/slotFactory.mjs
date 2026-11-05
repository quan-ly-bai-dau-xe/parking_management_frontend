/**
 * Contract Factory cho Parking Slot Domain
 */

export function makeMockSlot(overrides = {}) {
  return {
    id: 1,
    code: "A-01",
    slotCode: "A-01",
    zone: "Khu A",
    floor: "Tầng B1",
    display: "Khu A · Tầng B1 · Slot A-01",
    kind: "STANDARD",
    type: "car",
    status: "AVAILABLE",
    statusText: "Trống",
    plate: null,
    licensePlate: null,
    ...overrides,
  };
}

export function makeMockFullInventory() {
  const slots = [];
  // Zone A: 1..24
  for (let i = 1; i <= 24; i++) {
    const code = `A-${String(i).padStart(2, "0")}`;
    slots.push(makeMockSlot({ id: i, code, slotCode: code, zone: "Khu A", floor: "Tầng B1" }));
  }
  // Zone B: 25..48
  for (let i = 1; i <= 24; i++) {
    const code = `B-${String(i).padStart(2, "0")}`;
    slots.push(makeMockSlot({ id: 24 + i, code, slotCode: code, zone: "Khu B", floor: "Tầng B1" }));
  }
  // Zone C (EV): 49..72
  for (let i = 1; i <= 24; i++) {
    const code = `C-${String(i).padStart(2, "0")}`;
    slots.push(makeMockSlot({ id: 48 + i, code, slotCode: code, zone: "Khu C", floor: "Tầng B2", kind: "EV_CHARGING", type: "ev" }));
  }
  // Zone D: 73..96
  for (let i = 1; i <= 24; i++) {
    const code = `D-${String(i).padStart(2, "0")}`;
    slots.push(makeMockSlot({ id: 72 + i, code, slotCode: code, zone: "Khu D", floor: "Tầng B2" }));
  }
  return slots;
}

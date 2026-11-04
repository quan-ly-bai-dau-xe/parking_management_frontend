import { fullParkingLotData } from "./parkingLotData";
import { normalizeSlot } from "../services/parkingLotService";

function createSupplementalSlots(floorId, zoneId, existingSlots) {
  const row = zoneId.slice(-1);
  const targetCount = Math.max(existingSlots.length, 12);
  const statuses = ["AVAILABLE", "OCCUPIED", "AVAILABLE", "RESERVED", "MAINTENANCE"];
  const generated = Array.from({ length: targetCount - existingSlots.length }, (_, index) => {
    const number = existingSlots.length + index + 1;
    const status = statuses[(number + floorId.charCodeAt(1)) % statuses.length];
    return {
      slotId: `${row}-${String(number).padStart(2, "0")}`,
      label: `${row}-${String(number).padStart(2, "0")}`,
      row,
      type: number % 5 === 0 ? "EV_CHARGING" : "STANDARD",
      status,
      plate: status === "OCCUPIED" ? `30${number % 10}A-${String(100 + number).padStart(3, "0")}.${String(number).padStart(2, "0")}` : null,
    };
  });

  return [...existingSlots, ...generated];
}

export function getMockParkingSlots({ floor, zone } = {}) {
  return fullParkingLotData
    .filter((item) => !floor || item.floorId === floor)
    .flatMap((item) =>
      item.zones
        .filter(
          (itemZone) =>
            !zone ||
            itemZone.zoneId === zone ||
            itemZone.zoneName === zone ||
            itemZone.zoneId.endsWith(`-${zone}`)
        )
        .flatMap((itemZone) =>
          createSupplementalSlots(item.floorId, itemZone.zoneId, itemZone.slots).map((slot) => ({
            ...normalizeSlot({
              ...slot,
              floor: item.floorId,
              zone: itemZone.zoneId,
              parkingLot: "Bãi xe Smart Mobility",
            }),
          }))
        )
    );
}

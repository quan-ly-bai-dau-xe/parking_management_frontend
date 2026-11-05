import { fullParkingLotData } from "./parkingLotData.js";
import { normalizeSlot } from "../services/parkingLotService.js";

const SLOTS_PER_ZONE = 24;
const DEFAULT_FLOOR = "B1";
const DEFAULT_ZONE = "A";

const SAMPLE_PLATES = [
  "50A-882.19",
  "29A-456.78",
  "51F-999.99",
  "30H-123.45",
  "29A-892.16",
  "18B-632.87",
  "51G-111.22",
  "30F-777.88",
  "43A-654.32",
  "14B-888.66",
  "75D-216.14",
  "60A-333.22",
];

const SAMPLE_DURATIONS = ["45m", "1h24m", "2h10m", "3h45m", "5h12m", ">48h"];

/**
 * Sinh danh sách 24 ô đỗ xe chuẩn hóa (3 dãy x 8 ô) cho một tầng và phân khu cụ thể
 * @param {string} floorCode - Mã tầng (ví dụ: B1, B2, B3, F1)
 * @param {string} zoneCode - Mã khu vực (ví dụ: A, B, C, D)
 * @returns {Array<Object>}
 */
function generate24SlotsForZone(floorCode, zoneCode) {
  const floor = floorCode || DEFAULT_FLOOR;
  const zone = zoneCode || DEFAULT_ZONE;
  const prefix = zone.trim().toUpperCase() || "A";

  // Chu kỳ trạng thái cho 24 ô:
  // Hàng 1 (1-8): Tiêu chuẩn (6 available, 2 occupied)
  // Hàng 2 (9-16): Xe ưu tiên (4 available, 2 occupied, 1 reserved, 1 maintenance)
  // Hàng 3 (17-24): Mở rộng / Sạc điện (5 available, 2 occupied, 1 reserved)
  const pattern = [
    // Hàng 1 (1-8)
    "AVAILABLE", "OCCUPIED", "AVAILABLE", "AVAILABLE", "OCCUPIED", "AVAILABLE", "AVAILABLE", "AVAILABLE",
    // Hàng 2 (9-16)
    "AVAILABLE", "OCCUPIED", "AVAILABLE", "RESERVED", "AVAILABLE", "OCCUPIED", "AVAILABLE", "MAINTENANCE",
    // Hàng 3 (17-24)
    "AVAILABLE", "AVAILABLE", "OCCUPIED", "AVAILABLE", "RESERVED", "OCCUPIED", "AVAILABLE", "AVAILABLE",
  ];

  return Array.from({ length: SLOTS_PER_ZONE }, (_, idx) => {
    const num = idx + 1;
    const numStr = String(num).padStart(2, "0");
    const slotCode = `${prefix}-${numStr}`;

    // Đồng bộ với cảnh báo tại NotificationsPage: Ô A-12 tại Tầng B1 Khu A đỗ quá giờ (>48h)
    const isA12Special = floor === "B1" && prefix === "A" && num === 12;
    const rawStatus = isA12Special ? "OCCUPIED" : pattern[idx % pattern.length];
    const status = rawStatus;
    const isOccupied = status === "OCCUPIED";
    const isReserved = status === "RESERVED";
    const isPriority = num >= 9 && num <= 16;
    const isCharging = num >= 17;

    const slotKind = isCharging ? "EV_CHARGING" : isPriority ? "PRIORITY" : "STANDARD";
    const plate = isA12Special
      ? "51A-12345"
      : isOccupied
        ? SAMPLE_PLATES[num % SAMPLE_PLATES.length]
        : null;
    const duration = isA12Special
      ? ">48h"
      : isOccupied
        ? SAMPLE_DURATIONS[num % SAMPLE_DURATIONS.length]
        : null;
    const isOverstay = isOccupied && (isA12Special || duration === ">48h");
    const reservedTime = isReserved ? `${10 + (num % 8)}:30` : null;

    return normalizeSlot({
      id: slotCode,
      slotId: slotCode,
      code: slotCode,
      label: slotCode,
      row: num <= 8 ? "1" : num <= 16 ? "2" : "3",
      floor,
      zone,
      type: slotKind,
      slot_kind: slotKind,
      status,
      plate,
      licensePlate: plate,
      duration,
      isOverstay,
      reservedTime,
      reservedBy: isReserved ? (num % 2 === 0 ? "Khách hàng VIP" : "Khách đặt trước") : null,
      note: isReserved ? `ĐÃ ĐẶT ${reservedTime}` : "",
      parkingLot: "Bãi xe Smart Mobility",
    });
  });
}

/**
 * Lấy danh sách ô đỗ mock theo floor và zone
 */
export function getMockParkingSlots({ floor = "B1", zone = "A" } = {}) {
  const targetFloor = String(floor || "B1").trim().toUpperCase();
  const targetZone = String(zone || "A").trim().toUpperCase();

  // Nếu là Tầng B1 - Khu A: ưu tiên 24 ô mẫu đặc thù của B1-A với thông tin biển số phong phú
  if (targetFloor === "B1" && (targetZone === "A" || targetZone === "B1-A")) {
    const b1 = fullParkingLotData.find((f) => f.floorId === "B1");
    const b1a = b1?.zones?.find((z) => z.zoneId === "B1-A");
    if (b1a?.slots && b1a.slots.length > 0) {
      return b1a.slots.map((slot, idx) => {
        const num = idx + 1;
        const numStr = String(num).padStart(2, "0");
        const slotCode = `A-${numStr}`;
        return normalizeSlot({
          ...slot,
          id: slotCode,
          slotId: slotCode,
          code: slotCode,
          label: slotCode,
          row: num <= 8 ? "1" : num <= 16 ? "2" : "3",
          floor: "B1",
          zone: "A",
          parkingLot: "Bãi xe Smart Mobility",
        });
      });
    }
  }

  // Đối với mọi tầng và khu vực khác (B1-B, B1-C, B2-A, B2-B, B3, F1, Khu D...):
  // Tạo đầy đủ 24 ô chuẩn hóa (3 dãy x 8 ô) hoàn chỉnh
  return generate24SlotsForZone(targetFloor, targetZone);
}

export const mockParkingFloors = [
  {
    floorId: "B1",
    floorName: "Tầng B1",
    zones: [
      {
        zoneId: "B1-A",
        zoneName: "Khu A",
        totalSlots: 100,
        slots: [
          { slotId: "A-01", type: "STANDARD", status: "OCCUPIED", plate: "30H-123.45" },
          { slotId: "A-02", type: "STANDARD", status: "OCCUPIED", plate: "29A-892.16" },
          { slotId: "A-03", type: "EV_CHARGING", status: "AVAILABLE", plate: null },
          { slotId: "A-04", type: "STANDARD", status: "RESERVED", plate: "51G-111.22" },
          { slotId: "A-05", type: "STANDARD", status: "MAINTENANCE", plate: null },
          // ... Giả lập tỷ lệ 28 ô đã đỗ / 72 ô trống
        ],
        // Dữ liệu tổng hợp để render thanh tiến độ (occupancy bar)
        stats: { occupied: 28, empty: 72, percent: 28.4, statusText: "Còn chỗ" }
      },
      {
        zoneId: "B1-B",
        zoneName: "Khu B",
        totalSlots: 100,
        slots: [
          { slotId: "B-01", type: "STANDARD", status: "OCCUPIED", plate: "18B-632.87" },
          { slotId: "B-02", type: "STANDARD", status: "AVAILABLE", plate: null },
        ],
        stats: { occupied: 28, empty: 72, percent: 28.4, statusText: "Còn chỗ" }
      },
      {
        zoneId: "B1-C",
        zoneName: "Khu C",
        totalSlots: 100,
        slots: [
          { slotId: "C-01", type: "STANDARD", status: "AVAILABLE", plate: null },
        ],
        stats: { occupied: 28, empty: 72, percent: 28.4, statusText: "Còn chỗ" }
      }
    ]
  },
  {
    floorId: "B2",
    floorName: "Tầng B2",
    zones: [
      {
        zoneId: "B2-A",
        zoneName: "Khu A",
        totalSlots: 100,
        slots: [],
        stats: { occupied: 65, empty: 35, percent: 65.0, statusText: "Bình thường" }
      },
      {
        zoneId: "B2-B",
        zoneName: "Khu B",
        totalSlots: 100,
        slots: [
          { slotId: "B2-55", type: "STANDARD", status: "OCCUPIED", plate: "51F-999.99" } // Xe quá 48h
        ],
        stats: { occupied: 84, empty: 16, percent: 84.0, statusText: "Gần đầy" }
      },
      {
        zoneId: "B2-C",
        zoneName: "Khu C",
        totalSlots: 100,
        slots: [],
        stats: { occupied: 45, empty: 55, percent: 45.5, statusText: "Còn chỗ" }
      }
    ]
  },
  {
    floorId: "B3",
    floorName: "Tầng B3",
    zones: [
      {
        zoneId: "B3-A",
        zoneName: "Khu A",
        totalSlots: 100,
        slots: [],
        stats: { occupied: 12, empty: 88, percent: 12.0, statusText: "Còn chỗ" }
      },
      {
        zoneId: "B3-B",
        zoneName: "Khu B",
        totalSlots: 100,
        slots: [],
        stats: { occupied: 18, empty: 82, percent: 18.5, statusText: "Còn chỗ" }
      },
      {
        zoneId: "B3-C",
        zoneName: "Khu C",
        totalSlots: 100,
        slots: [],
        stats: { occupied: 20, empty: 80, percent: 20.0, statusText: "Còn chỗ" }
      }
    ]
  }
];

// src/mocks/parkingLotData.js
export const fullParkingLotData = [
  {
    floorId: "B1",
    floorName: "Tầng B1",
    zones: [
      {
        zoneId: "B1-A",
        zoneName: "Khu A",
        totalSlots: 24, // 24 ô theo đúng sơ đồ thực tế
        stats: { occupied: 12, empty: 7, reserved: 4, maintenance: 1, percent: 75.0, statusText: "75% Đã dùng" },
        slots: [
          // ==========================================
          // DÃY A1 - A08 (XE Ô TÔ TIÊU CHUẨN)
          // ==========================================
          {
            slotId: "A-01",
            label: "A-01",
            row: "A",
            type: "STANDARD",
            status: "AVAILABLE", // Ô TRỐNG
            plate: null,
            duration: null,
            reservedTime: null,
          },
          {
            slotId: "A-02",
            label: "A-02",
            row: "A",
            type: "STANDARD",
            status: "OCCUPIED", // ĐANG ĐỖ
            plate: "50A-882.19",
            duration: "1h24m",
            reservedTime: null,
          },
          {
            slotId: "A-03",
            label: "A-03",
            row: "A",
            type: "STANDARD",
            status: "OCCUPIED", // ĐANG ĐỖ
            plate: "29A-456.78",
            duration: "45m",
            reservedTime: null,
          },
          {
            slotId: "A-04",
            label: "A-04",
            row: "A",
            type: "STANDARD",
            status: "RESERVED", // ĐẶT TRƯỚC
            plate: null,
            duration: null,
            reservedTime: "13:30",
            note: "ĐÃ ĐẶT 13:30",
          },
          {
            slotId: "A-05",
            label: "A-05",
            row: "A",
            type: "STANDARD",
            status: "RESERVED", // ĐẶT TRƯỚC
            plate: null,
            duration: null,
            reservedTime: "14:30",
            note: "ĐÃ ĐẶT 14:30",
          },
          {
            slotId: "A-06",
            label: "A-06",
            row: "A",
            type: "STANDARD",
            status: "AVAILABLE", // Ô TRỐNG
            plate: null,
            duration: null,
            reservedTime: null,
          },
          {
            slotId: "A-07",
            label: "A-07",
            row: "A",
            type: "STANDARD",
            status: "OCCUPIED", // ĐANG ĐỖ
            plate: "51F-112.90",
            duration: "3h39m",
            reservedTime: null,
          },
          {
            slotId: "A-08",
            label: "A-08",
            row: "A",
            type: "STANDARD",
            status: "MAINTENANCE", // BẢO TRÌ
            plate: null,
            duration: null,
            reservedTime: null,
            note: "BẢO TRÌ CẢM BIẾN",
          },

          // ==========================================
          // DÃY B1 - B08 (XE ƯU TIÊN)
          // ==========================================
          {
            slotId: "B-01",
            label: "B-01",
            row: "B",
            type: "PRIORITY",
            status: "AVAILABLE", // Ô TRỐNG
            plate: null,
            duration: null,
            reservedTime: null,
          },
          {
            slotId: "B-02",
            label: "B-02",
            row: "B",
            type: "PRIORITY",
            status: "AVAILABLE", // Ô TRỐNG
            plate: null,
            duration: null,
            reservedTime: null,
          },
          {
            slotId: "B-03",
            label: "B-03",
            row: "B",
            type: "PRIORITY",
            status: "OCCUPIED", // ĐANG ĐỖ
            plate: "14A-998.11",
            duration: "5h12m",
            reservedTime: null,
          },
          {
            slotId: "B-04",
            label: "B-04",
            row: "B",
            type: "PRIORITY",
            status: "OCCUPIED", // ĐANG ĐỖ
            plate: "30E-732.41",
            duration: "2h05m",
            reservedTime: null,
          },
          {
            slotId: "B-05",
            label: "B-05",
            row: "B",
            type: "PRIORITY",
            status: "OCCUPIED", // ĐANG ĐỖ
            plate: "43A-667.12",
            duration: "12m",
            reservedTime: null,
          },
          {
            slotId: "B-06",
            label: "B-06",
            row: "B",
            type: "PRIORITY",
            status: "AVAILABLE", // Ô TRỐNG
            plate: null,
            duration: null,
            reservedTime: null,
          },
          {
            slotId: "B-07",
            label: "B-07",
            row: "B",
            type: "PRIORITY",
            status: "RESERVED", // ĐẶT TRƯỚC
            plate: null,
            duration: null,
            reservedTime: "15:00",
            note: "ĐÃ ĐẶT 15:00",
          },
          {
            slotId: "B-08",
            label: "B-08",
            row: "B",
            type: "PRIORITY",
            status: "OCCUPIED", // ĐANG ĐỖ
            plate: "29A-551.02",
            duration: "4h50m",
            reservedTime: null,
          },

          // ==========================================
          // DÃY C1 - C08 (KHU VỰC MỞ RỘNG / SẠC ĐIỆN)
          // ==========================================
          { slotId: "C-01", label: "C-01", row: "C", type: "EV_CHARGING", status: "AVAILABLE", plate: null },
          { slotId: "C-02", label: "C-02", row: "C", type: "EV_CHARGING", status: "OCCUPIED", plate: "51K-992.14", duration: "1h10m" },
          { slotId: "C-03", label: "C-03", row: "C", type: "STANDARD", status: "OCCUPIED", plate: "30A-123.45", duration: "3h15m" },
          { slotId: "C-04", label: "C-04", row: "C", type: "STANDARD", status: "OCCUPIED", plate: "43B-987.65", duration: "4h00m" },
          { slotId: "C-05", label: "C-05", row: "C", type: "STANDARD", status: "AVAILABLE", plate: null },
          { slotId: "C-06", label: "C-06", row: "C", type: "STANDARD", status: "OCCUPIED", plate: "29D-456.78", duration: "2h30m" },
          { slotId: "C-07", label: "C-07", row: "C", type: "STANDARD", status: "RESERVED", note: "ĐÃ ĐẶT 16:00" },
          { slotId: "C-08", label: "C-08", row: "C", type: "STANDARD", status: "AVAILABLE", plate: null },
        ],
      },
      {
        zoneId: "B1-B",
        zoneName: "Khu B",
        totalSlots: 100,
        stats: { occupied: 28, empty: 72, percent: 28.4, statusText: "Còn chỗ" },
        slots: [],
      },
      {
        zoneId: "B1-C",
        zoneName: "Khu C",
        totalSlots: 100,
        stats: { occupied: 28, empty: 72, percent: 28.4, statusText: "Còn chỗ" },
        slots: [],
      },
    ],
  },
  {
    floorId: "B2",
    floorName: "Tầng B2",
    zones: [
      {
        zoneId: "B2-A",
        zoneName: "Khu A",
        totalSlots: 100,
        stats: { occupied: 65, empty: 35, percent: 65.0, statusText: "Bình thường" },
        slots: [],
      },
      {
        zoneId: "B2-B",
        zoneName: "Khu B",
        totalSlots: 100,
        stats: { occupied: 84, empty: 16, percent: 84.0, statusText: "Gần đầy" },
        slots: [
          { slotId: "B2-55", label: "B2-55", type: "STANDARD", status: "OCCUPIED", plate: "51F-999.99", duration: ">48h" },
        ],
      },
      {
        zoneId: "B2-C",
        zoneName: "Khu C",
        totalSlots: 100,
        stats: { occupied: 45, empty: 55, percent: 45.5, statusText: "Còn chỗ" },
        slots: [],
      },
    ],
  },
  {
    floorId: "B3",
    floorName: "Tầng B3",
    zones: [
      {
        zoneId: "B3-A",
        zoneName: "Khu A",
        totalSlots: 100,
        stats: { occupied: 12, empty: 88, percent: 12.0, statusText: "Còn chỗ" },
        slots: [],
      },
      {
        zoneId: "B3-B",
        zoneName: "Khu B",
        totalSlots: 100,
        stats: { occupied: 18, empty: 82, percent: 18.5, statusText: "Còn chỗ" },
        slots: [],
      },
      {
        zoneId: "B3-C",
        zoneName: "Khu C",
        totalSlots: 100,
        stats: { occupied: 20, empty: 80, percent: 20.0, statusText: "Còn chỗ" },
        slots: [],
      },
    ],
  },
];
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
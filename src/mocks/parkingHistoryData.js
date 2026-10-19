/**
 * Mock data for Parking History (Lịch sử ra/vào bãi)
 * Based on Smart Mobility Design System tokens and specifications
 */

export const mockParkingHistory = [
  {
    id: "PH0001",
    sessionCode: "SS-20261018-001",
    licensePlate: "51K-992.14",
    entryTime: "18/10/2026 08:15",
    exitTime: "18/10/2026 11:45",
    duration: "3 giờ 30 phút",
    fee: "35.000đ",
    feeNumber: 35000,
    plateImageUrl:
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=400&q=80",
    vehicleType: "Ô tô",
    status: "completed", // completed (Đã ra), in_progress (Đang trong bãi)
  },
  {
    id: "PH0002",
    sessionCode: "SS-20261018-002",
    licensePlate: "30A-123.45",
    entryTime: "18/10/2026 09:00",
    exitTime: "18/10/2026 12:15",
    duration: "3 giờ 15 phút",
    fee: "35.000đ",
    feeNumber: 35000,
    plateImageUrl:
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80",
    vehicleType: "Ô tô",
    status: "completed",
  },
  {
    id: "PH0003",
    sessionCode: "SS-20261018-003",
    licensePlate: "59P1-678.90",
    entryTime: "18/10/2026 07:30",
    exitTime: "18/10/2026 17:45",
    duration: "10 giờ 15 phút",
    fee: "15.000đ",
    feeNumber: 15000,
    plateImageUrl:
      "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=400&q=80",
    vehicleType: "Xe máy",
    status: "completed",
  },
  {
    id: "PH0004",
    sessionCode: "SS-20261018-004",
    licensePlate: "43B-987.65",
    entryTime: "18/10/2026 10:20",
    exitTime: "18/10/2026 14:20",
    duration: "4 giờ 00 phút",
    fee: "50.000đ",
    feeNumber: 50000,
    plateImageUrl:
      "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=400&q=80",
    vehicleType: "Ô tô",
    status: "completed",
  },
  {
    id: "PH0005",
    sessionCode: "SS-20261018-005",
    licensePlate: "29D-456.78",
    entryTime: "18/10/2026 13:00",
    exitTime: "18/10/2026 15:30",
    duration: "2 giờ 30 phút",
    fee: "25.000đ",
    feeNumber: 25000,
    plateImageUrl:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80",
    vehicleType: "Ô tô",
    status: "completed",
  },
];

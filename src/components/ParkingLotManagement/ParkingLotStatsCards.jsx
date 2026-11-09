import { LayoutGrid, CheckCircle2, Car, Clock } from "lucide-react";
import { StatCard } from "../common";

export default function ParkingLotStatsCards({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Tổng ô đỗ trong khu */}
      <StatCard
        title="Tổng ô đỗ trong khu"
        value={stats.total}
        color="slate"
        icon={<LayoutGrid className="w-5 h-5" />}
      />

      {/* 2. Ô trống */}
      <StatCard
        title="Ô trống"
        value={stats.available}
        color="emerald"
        icon={<CheckCircle2 className="w-5 h-5" />}
      />

      {/* 3. Đang sử dụng */}
      <StatCard
        title="Đang sử dụng"
        value={stats.occupied}
        color="blue"
        icon={<Car className="w-5 h-5" />}
      />

      {/* 4. Đặt trước / Bảo trì */}
      <StatCard
        title="Đặt trước / Bảo trì"
        value={stats.reservedOrMaint}
        color="amber"
        icon={<Clock className="w-5 h-5" />}
      />
    </div>
  );
}

import React from "react";
import { StatCard } from "../common";

export default function VehicleStatsCards({ stats }) {
  const total = stats?.total_vehicles ?? stats?.totalVehicles ?? 0;
  const active = stats?.active_vehicles ?? stats?.activeVehicles ?? 0;
  const expiringSoon =
    stats?.expiring_soon_tickets ??
    stats?.expiring_tickets ??
    stats?.expiringTickets ??
    0;
  const expired = stats?.expired_tickets ?? stats?.expiredTickets ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Tổng phương tiện */}
      <StatCard
        title="Tổng phương tiện"
        value={total}
        color="blue"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        }
      />

      {/* Đang hoạt động */}
      <StatCard
        title="Đang hoạt động"
        value={active}
        color="emerald"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        }
      />

      {/* Vé sắp hết hạn */}
      <StatCard
        title="Vé sắp hết hạn"
        value={expiringSoon}
        color="amber"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />

      {/* Vé đã hết hạn */}
      <StatCard
        title="Vé đã hết hạn"
        value={expired}
        color="rose"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        }
      />
    </div>
  );
}

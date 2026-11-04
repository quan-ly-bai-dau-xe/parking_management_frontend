import React from "react";
import { TICKET_TYPE_STYLES } from "../../constants/vehicleConstants";

export default function VehicleTicketTypeBadge({ ticketType }) {
  const normalizedType =
    typeof ticketType === "object" && ticketType !== null
      ? (ticketType.name || ticketType.code || "")
      : (ticketType ?? "");

  const rawType = String(normalizedType).trim();

  if (!rawType || rawType === "—" || rawType === "Vé lượt") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
        Vé lượt
      </span>
    );
  }

  const lower = rawType.toLowerCase();
  let style = TICKET_TYPE_STYLES.DEFAULT;

  if (lower.includes(TICKET_TYPE_STYLES.DAILY.keyword)) {
    style = TICKET_TYPE_STYLES.DAILY;
  } else if (lower.includes(TICKET_TYPE_STYLES.MONTHLY.keyword)) {
    style = TICKET_TYPE_STYLES.MONTHLY;
  } else if (lower.includes(TICKET_TYPE_STYLES.QUARTERLY.keyword)) {
    style = TICKET_TYPE_STYLES.QUARTERLY;
  } else if (lower.includes(TICKET_TYPE_STYLES.YEARLY.keyword)) {
    style = TICKET_TYPE_STYLES.YEARLY;
  } else {
    style = TICKET_TYPE_STYLES.MONTHLY;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold ${style.badgeClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dotClass} mr-1.5`} />
      {rawType}
    </span>
  );
}

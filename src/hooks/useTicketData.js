import { useState, useMemo } from "react";
import { initialTickets } from "../mocks/ticketsData";
import { mockCustomers } from "../mocks/customerData";
import { INITIAL_TICKET_FILTERS } from "../constants/ticketConstants";

export default function useTicketData() {
  const [tickets, setTickets] = useState(initialTickets);
  const [filters, setFilters] = useState(INITIAL_TICKET_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_TICKET_FILTERS);
    setCurrentPage(1);
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (
        filters.ticketCode &&
        !t.ticketCode.toLowerCase().includes(filters.ticketCode.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.customerCode &&
        !t.customerCode.toLowerCase().includes(filters.customerCode.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.licensePlate &&
        !t.licensePlate.toLowerCase().includes(filters.licensePlate.toLowerCase())
      ) {
        return false;
      }
      if (filters.ticketType && t.ticketType !== filters.ticketType) {
        return false;
      }
      if (filters.status && t.status !== filters.status) {
        return false;
      }
      if (
        filters.slotLocation &&
        !t.slotLocation.toLowerCase().includes(filters.slotLocation.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.floor &&
        !t.slotLocation.toLowerCase().includes(filters.floor.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [tickets, filters]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage) || 1;

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTickets.slice(start, start + itemsPerPage);
  }, [filteredTickets, currentPage, itemsPerPage]);

  const handleItemsPerPageChange = (newSize) => {
    setItemsPerPage(newSize);
    setCurrentPage(1);
  };

  const handleCreateTicket = (newTicketData) => {
    const cust = mockCustomers.find(
      (c) => c.customerCode === newTicketData.customer,
    );
    const created = {
      stt: tickets.length + 1,
      ticketCode: `VT000${tickets.length + 1}`,
      customerCode: newTicketData.customer || "KH0001",
      customerName: cust?.name || newTicketData.customerName || "Khách hàng mới",
      licensePlate: newTicketData.vehicle || "51K-000-00",
      ticketType: newTicketData.ticketType || "Vé tháng",
      startDate: newTicketData.startDate || new Date().toLocaleDateString("vi-VN"),
      endDate: newTicketData.endDate || new Date().toLocaleDateString("vi-VN"),
      price: `${Number(newTicketData.price || 0).toLocaleString("vi-VN")}đ`,
      slotLocation: newTicketData.parkingSlot || "Tầng B1 - Auto",
      status: "active",
      statusText: "Đang hoạt động",
    };
    setTickets((prev) => [created, ...prev]);
  };

  const handleRenewTicket = (renewData) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.ticketCode === renewData.ticketId) {
          return {
            ...t,
            ticketType: renewData.newTicketType || t.ticketType,
            endDate: renewData.newEndDate || t.endDate,
            price: renewData.renewPrice
              ? `${Number(renewData.renewPrice).toLocaleString("vi-VN")}đ`
              : t.price,
            slotLocation: renewData.newSlot || t.slotLocation,
            status: "active",
            statusText: "Đang hoạt động",
          };
        }
        return t;
      }),
    );
  };

  const handleDeleteTicket = (ticketToDelete) => {
    setTickets((prev) =>
      prev.filter(
        (t) =>
          t.ticketCode !== (ticketToDelete?.ticketCode || ticketToDelete?.id),
      ),
    );
  };

  return {
    tickets,
    filteredTickets,
    paginatedTickets,
    filters,
    currentPage,
    totalPages,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    handleFilterChange,
    handleResetFilters,
    handleItemsPerPageChange,
    handleCreateTicket,
    handleRenewTicket,
    handleDeleteTicket,
  };
}

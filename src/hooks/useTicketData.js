import { useState, useMemo, useEffect, useCallback } from "react";
import { INITIAL_TICKET_FILTERS } from "../constants/ticketConstants";
import { ticketService } from "../services/ticketService";
import { mockCustomers } from "../mocks/customerData";

export default function useTicketData() {
  const [tickets, setTickets] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(INITIAL_TICKET_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ticketService.getTickets();
      setTickets(data);
    } catch (err) {
      console.error("[useTicketData] Lỗi tải danh sách vé:", err);
      setError(err?.message || "Không thể tải danh sách vé");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTicketTypes = useCallback(async () => {
    try {
      const types = await ticketService.getTicketTypes();
      setTicketTypes(types);
    } catch (err) {
      console.warn("[useTicketData] Lỗi tải loại vé:", err);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchTicketTypes();
  }, [fetchTickets, fetchTicketTypes]);

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

  const handleCreateTicket = async (newTicketData) => {
    try {
      const cust = mockCustomers.find(
        (c) => c.customerCode === newTicketData.customer,
      );
      const payload = {
        ...newTicketData,
        customerName: cust?.name || newTicketData.customerName,
      };

      const created = await ticketService.createTicket(payload);
      if (created) {
        setTickets((prev) => [created, ...prev]);
      }
      return created;
    } catch (err) {
      console.error("[useTicketData] Lỗi tạo vé:", err);
      throw err;
    }
  };

  const handleRenewTicket = async (renewData) => {
    try {
      const targetId = renewData.ticketId || renewData.id;
      const renewed = await ticketService.renewTicket(targetId, renewData);
      if (renewed) {
        setTickets((prev) =>
          prev.map((t) =>
            t.ticketCode === targetId || String(t.id) === String(targetId)
              ? { ...t, ...renewed }
              : t,
          ),
        );
      }
      return renewed;
    } catch (err) {
      console.error("[useTicketData] Lỗi gia hạn vé:", err);
      throw err;
    }
  };

  const handleDeleteTicket = async (ticketToDelete) => {
    const targetId = ticketToDelete?.id || ticketToDelete?.ticketCode;
    try {
      await ticketService.deleteTicket(targetId);
      setTickets((prev) =>
        prev.filter(
          (t) =>
            t.ticketCode !== (ticketToDelete?.ticketCode || ticketToDelete?.id) &&
            String(t.id) !== String(targetId),
        ),
      );
    } catch (err) {
      console.error("[useTicketData] Lỗi xóa vé:", err);
      throw err;
    }
  };

  return {
    tickets,
    ticketTypes,
    loading,
    error,
    refreshTickets: fetchTickets,
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

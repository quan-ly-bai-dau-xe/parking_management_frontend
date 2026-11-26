import { useState, useEffect, useCallback } from "react";
import ticketService from "../services/ticketService";
import { INITIAL_TICKET_FILTERS } from "../constants/ticketConstants";

export default function useTicketData() {
  const [tickets, setTickets] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState(INITIAL_TICKET_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);

  // Tải danh mục loại vé một lần khi khởi tạo
  useEffect(() => {
    let isMounted = true;
    async function loadTypes() {
      try {
        const types = await ticketService.getTicketTypes();
        if (isMounted) {
          setTicketTypes(types);
        }
      } catch (err) {
        console.warn("Failed to load ticket types:", err);
      }
    }
    loadTypes();
    return () => {
      isMounted = false;
    };
  }, []);

  // Tải danh sách vé từ backend theo bộ lọc & phân trang server-side
  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Tổng hợp từ khóa tìm kiếm từ các ô nhập
      const searchQuery =
        filters.ticketCode ||
        filters.customerCode ||
        filters.licensePlate ||
        filters.q ||
        filters.search ||
        "";

      const res = await ticketService.getTickets({
        page: currentPage,
        page_size: itemsPerPage,
        q: searchQuery,
        status: filters.status,
        ticketType: filters.ticketType,
      });

      setTickets(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      console.error("Fetch tickets error:", err);
      setError(err?.data?.message || err?.message || "Không thể tải danh sách vé.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, filters]);

  useEffect(() => {
    let isMounted = true;
    Promise.resolve()
      .then(() => {
        if (isMounted) {
          return fetchTickets();
        }
        return undefined;
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Fetch tickets effect error:", err);
          setError(err?.data?.message || err?.message || "Không thể tải danh sách vé.");
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [fetchTickets]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_TICKET_FILTERS);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (newSize) => {
    setItemsPerPage(newSize);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  const handleCreateTicket = async (newTicketData) => {
    await ticketService.createTicket(newTicketData);
    await fetchTickets();
  };

  const handleUpdateTicket = async (lookup, updateData) => {
    const updated = await ticketService.updateTicket(lookup, updateData);
    await fetchTickets();
    return updated;
  };

  const handleRenewTicket = async (lookup, renewData) => {
    const renewed = await ticketService.renewTicket(lookup, renewData);
    await fetchTickets();
    return renewed;
  };

  const handleDeleteTicket = async (lookup) => {
    const result = await ticketService.deleteTicket(lookup);
    await fetchTickets();
    return result;
  };

  return {
    tickets,
    filteredTickets: tickets,
    paginatedTickets: tickets,
    totalCount,
    filters,
    currentPage,
    totalPages,
    itemsPerPage,
    isLoading,
    error,
    ticketTypes,
    setCurrentPage,
    setItemsPerPage,
    handleFilterChange,
    handleResetFilters,
    handleItemsPerPageChange,
    handleCreateTicket,
    handleUpdateTicket,
    handleRenewTicket,
    handleDeleteTicket,
    refetchTickets: fetchTickets,
  };
}

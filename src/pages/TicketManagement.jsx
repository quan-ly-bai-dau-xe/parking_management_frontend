import { useState, useMemo, useEffect, useCallback } from "react";
import { ticketService } from "../services/ticketService";
import { Pagination, LoadingSpinner } from "../components/common";
import CreateTicketModal from "../components/CreateTicketModal";
import RenewTicketModal from "../components/RenewTicketModal";
import TicketDetailModal from "../components/TicketDetailModal";

export default function Ticket({ onNavigatedTab }) {
    const [tickets, setTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    // Filters
    const [searchCode, setSearchCode] = useState("");
    const [searchCustomer, setSearchCustomer] = useState("");
    const [searchPlate, setSearchPlate] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [selectedFloor, setSelectedFloor] = useState("");

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isRenewOpen, setIsRenewOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);

    const fetchTickets = useCallback(async () => {
        setIsLoading(true);
        try {
            const combinedSearch = [searchCode, searchCustomer, searchPlate].filter(Boolean).join(" ");
            const res = await ticketService.getTickets({
                search: combinedSearch,
                status: selectedStatus || "ALL",
                ticketType: selectedType || "ALL",
                page: currentPage,
                page_size: itemsPerPage,
            });
            setTickets(res.data || []);
            setTotalCount(res.total || res.data?.length || 0);
        } catch (error) {
            console.error("Lỗi khi tải danh sách vé:", error);
        } finally {
            setIsLoading(false);
        }
    }, [searchCode, searchCustomer, searchPlate, selectedStatus, selectedType, currentPage, itemsPerPage]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    // Client-side quick filter for remaining criteria (e.g. floor)
    const filteredTickets = useMemo(() => {
        return tickets.filter((t) => {
            if (selectedFloor && !t.slotLocation?.toLowerCase().includes(selectedFloor.toLowerCase())) {
                return false;
            }
            return true;
        });
    }, [tickets, selectedFloor]);

    const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

    const handleItemsPerPageChange = (newSize) => {
        setItemsPerPage(newSize);
        setCurrentPage(1);
    };

    const handleResetFilters = () => {
        setSearchCode("");
        setSearchCustomer("");
        setSearchPlate("");
        setSelectedType("");
        setSelectedStatus("");
        setSelectedFloor("");
        setCurrentPage(1);
    };

    const handleOpenDetail = (ticket) => {
        setSelectedTicket(ticket);
        setIsDetailOpen(true);
    };

    const handleOpenRenew = (ticket) => {
        setSelectedTicket(ticket);
        setIsRenewOpen(true);
    };

    const handleCreateSuccess = async (data) => {
        try {
            await ticketService.createTicket(data);
            setIsCreateOpen(false);
            fetchTickets();
        } catch (err) {
            alert(err.message || "Không thể tạo vé");
        }
    };

    const handleRenewSuccess = async (data) => {
        if (!selectedTicket) return;
        try {
            await ticketService.renewTicket(selectedTicket.backendId || selectedTicket.id, data);
            setIsRenewOpen(false);
            fetchTickets();
        } catch (err) {
            alert(err.message || "Không thể gia hạn vé");
        }
    };

    const renderStatusBadge = (status, text) => {
        switch (status) {
        case "active":
            return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {text || "Đang hoạt động"}
            </span>
            );
        case "expiring":
            return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {text || "Sắp hết hạn"}
            </span>
            );
        case "expired":
            return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {text || "Đã hết hạn"}
            </span>
            );
        case "cancelled":
        case "terminated":
            return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                {text || "Đã chấm dứt"}
            </span>
            );
        case "renewing":
            return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {text || "Đang gia hạn"}
            </span>
            );
        default:
            return <span>{text || status}</span>;
        }
    };

    return (
        <>
            {/* 1. HEADER & BREADCRUMB */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Quản lý vé
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                    Quản lý thông tin vé, tra cứu, thêm mới và gia hạn vé
                </p>
                </div>
                <div className="text-xs text-slate-400 select-none">
                Smart Mobility / <span className="text-slate-600 font-medium">Quản lý vé</span>
                </div>
            </div>

            {/* 2. FORM TÌM KIẾM & BỘ LỌC */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mã vé</label>
                    <input
                    type="text"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    placeholder="Nhập mã vé (VD: VT0001)..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mã / Tên khách hàng</label>
                    <input
                    type="text"
                    value={searchCustomer}
                    onChange={(e) => setSearchCustomer(e.target.value)}
                    placeholder="Nhập mã hoặc tên khách hàng..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Biển số xe</label>
                    <input
                    type="text"
                    value={searchPlate}
                    onChange={(e) => setSearchPlate(e.target.value)}
                    placeholder="Nhập biển số xe (VD: 51K-992.14)..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Loại vé</label>
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                    <option value="">Tất cả loại vé</option>
                    <option value="MONTH">Vé tháng</option>
                    <option value="DAY">Vé ngày</option>
                    <option value="QUARTER">Vé quý</option>
                    <option value="YEAR">Vé năm</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Trạng thái</label>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                    <option value="">Tất cả trạng thái</option>
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="EXPIRED">Đã hết hạn</option>
                    <option value="RENEWING">Đang gia hạn</option>
                    <option value="TERMINATED">Đã chấm dứt</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vị trí đỗ xe</label>
                    <select
                        value={selectedFloor}
                        onChange={(e) => setSelectedFloor(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                    <option value="">Tất cả tầng</option>
                    <option value="B1">Tầng B1</option>
                    <option value="B2">Tầng B2</option>
                    <option value="B3">Tầng B3</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={fetchTickets}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <span>🔍</span> Tìm kiếm
                    </button>
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
                    >
                        Làm mới
                    </button>
                    <button
                        type="button"
                        className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm shadow-emerald-500/20 transition-all cursor-pointer whitespace-nowrap"
                        onClick={() => setIsCreateOpen(true)}
                    >
                        + Thêm vé
                    </button>
                </div>
                </div>
            </div>

            {/* 3. BẢNG DANH SÁCH VÉ */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
                <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Danh sách vé
                </h2>
                <span className="text-xs text-slate-400 font-medium">
                    Tổng: <strong className="text-slate-700">{totalCount} vé</strong>
                </span>
                </div>

                {isLoading ? (
                    <div className="py-12 flex justify-center">
                        <LoadingSpinner text="Đang tải danh sách vé..." />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                        <tr className="border-b border-slate-100 text-[0.72rem] uppercase tracking-wider text-slate-400 font-semibold bg-slate-50/50">
                            <th className="py-3.5 px-4 text-center">STT</th>
                            <th className="py-3.5 px-4">Mã vé</th>
                            <th className="py-3.5 px-4">Khách hàng</th>
                            <th className="py-3.5 px-4">Biển số xe</th>
                            <th className="py-3.5 px-4">Loại vé</th>
                            <th className="py-3.5 px-4">Ngày hiệu lực</th>
                            <th className="py-3.5 px-4">Ngày hết hạn</th>
                            <th className="py-3.5 px-4">Giá vé</th>
                            <th className="py-3.5 px-4">Vị trí đỗ xe</th>
                            <th className="py-3.5 px-4">Trạng thái</th>
                            <th className="py-3.5 px-4 text-center">Thao tác</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredTickets.length === 0 ? (
                            <tr>
                                <td colSpan="11" className="py-10 text-center text-slate-400">
                                    Không có vé nào phù hợp với bộ lọc tìm kiếm.
                                </td>
                            </tr>
                        ) : (
                            filteredTickets.map((row) => (
                                <tr key={row.ticketCode || row.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-4 px-4 text-center text-slate-500">{row.stt}</td>
                                <td className="py-4 px-4 font-bold text-slate-900 font-mono">{row.ticketCode}</td>
                                <td className="py-4 px-4">
                                    <span className="block font-medium text-slate-800">{row.customerName !== "—" ? row.customerName : row.customerCode}</span>
                                    {row.customerName !== "—" && (
                                        <span className="text-[10px] text-slate-400 font-mono">{row.customerCode}</span>
                                    )}
                                </td>
                                <td className="py-4 px-4 font-medium text-slate-800 font-mono">{row.licensePlate}</td>
                                <td className="py-4 px-4 text-slate-700">{row.ticketType}</td>
                                <td className="py-4 px-4 text-slate-600 font-mono">{row.startDate}</td>
                                <td className="py-4 px-4 text-slate-600 font-mono">{row.endDate}</td>
                                <td className="py-4 px-4 font-semibold text-slate-900 font-mono">{row.price}</td>
                                <td className="py-4 px-4 text-slate-700 font-medium">{row.slotLocation}</td>
                                <td className="py-4 px-4">
                                    {renderStatusBadge(row.status, row.statusText)}
                                </td>
                                <td className="py-4 px-4 text-center">
                                    <div className="flex items-center justify-center gap-3 text-xs">
                                    <button
                                        type="button"
                                        className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                                        onClick={() => handleOpenDetail(row)}
                                    >
                                        Xem
                                    </button>
                                    <button
                                        type="button"
                                        className="text-emerald-600 hover:text-emerald-800 font-medium cursor-pointer"
                                        onClick={() => handleOpenRenew(row)}
                                    >
                                        Gia hạn
                                    </button>
                                    </div>
                                </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                    </div>
                )}

                {/* 4. KHỐI PHÂN TRANG */}
                <div className="pt-4 border-t border-slate-100">
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setCurrentPage(page)}
                    totalItems={totalCount}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    itemsPerPageOptions={[5, 10, 20]}
                    size="md"
                />
                </div>
            </div>

            {/* Modals */}
            <CreateTicketModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSave={handleCreateSuccess}
            />

            <RenewTicketModal
                isOpen={isRenewOpen}
                ticket={selectedTicket}
                onClose={() => setIsRenewOpen(false)}
                onConfirm={handleRenewSuccess}
            />

            <TicketDetailModal
                isOpen={isDetailOpen}
                ticket={selectedTicket}
                onClose={() => setIsDetailOpen(false)}
            />
        </>
    );
}

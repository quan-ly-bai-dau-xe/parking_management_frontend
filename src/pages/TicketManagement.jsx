import { useState, useMemo } from "react";
import { initialTickets } from "../mocks/ticketsData";
import { Pagination } from "../components/common";
import CreateTicketModal from "../components/CreateTicketModal";
import RenewTicketModal from "../components/RenewTicketModal";
import TicketDetailModal from "../components/TicketDetailModal";

export default function Ticket() {
    const [tickets] = useState(initialTickets);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isRenewOpen, setIsRenewOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);

    // Tính tổng số trang
    const totalPages = Math.ceil(tickets.length / itemsPerPage);

    // Cắt danh sách vé hiển thị theo trang hiện tại
    const paginatedTickets = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return tickets.slice(start, start + itemsPerPage);
    }, [tickets, currentPage, itemsPerPage]);

    // Xử lý khi thay đổi số bản ghi / trang
    const handleItemsPerPageChange = (newSize) => {
        setItemsPerPage(newSize);
        setCurrentPage(1); // Quay về trang 1 để tránh lỗi out of bounds
    };

    const handleOpenDetail = (ticket) => {
        setSelectedTicket(ticket);
        setIsDetailOpen(true);
    };

    const handleOpenRenew = (ticket) => {
        setSelectedTicket(ticket);
        setIsRenewOpen(true);
    };    

    const renderStatusBadge = (status, text) => {
        switch (status) {
        case "active":
            return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {text}
            </span>
            );
        case "expiring":
            return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {text}
            </span>
            );
        case "expired":
            return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {text}
            </span>
            );
        case "cancelled":
            return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                {text}
            </span>
            );
        case "renewing":
            return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {text}
            </span>
            );
        default:
            return <span>{text}</span>;
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mã vé</label>
                    <input
                    type="text"
                    placeholder="Nhập mã vé..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mã khách hàng</label>
                    <input
                    type="text"
                    placeholder="Nhập mã khách hàng..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Biển số xe</label>
                    <input
                    type="text"
                    placeholder="Nhập biển số xe..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ngày hiệu lực</label>
                    <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="mm/dd/yyyy"
                        className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                        type="text"
                        placeholder="mm/dd/yyyy"
                        className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center"
                    />
                    </div>
                </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Loại vé</label>
                    <select className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                    <option value="">Chọn loại vé</option>
                    <option value="monthly">Vé tháng</option>
                    <option value="daily">Vé ngày</option>
                    <option value="quarterly">Vé quý</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Trạng thái</label>
                    <select className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                    <option value="">Chọn trạng thái</option>
                    <option value="active">Đang hoạt động</option>
                    <option value="expiring">Sắp hết hạn</option>
                    <option value="expired">Đã hết hạn</option>
                    <option value="cancelled">Đã hủy</option>
                    <option value="renewing">Đang gia hạn</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vị trí đỗ xe</label>
                    <select className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                    <option value="">Chọn vị trí đỗ xe</option>
                    <option value="B1">Tầng B1</option>
                    <option value="B2">Tầng B2</option>
                    <option value="B3">Tầng B3</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button
                    type="button"
                    className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5"
                    >
                    <span>🔍</span> Tìm kiếm
                    </button>
                    <button
                    type="button"
                    className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all"
                    >
                    Làm mới
                    </button>
                    <button
                    type="button"
                    className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm shadow-emerald-500/20 transition-all"
                    onClick={() => {setIsCreateOpen(true)}}
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
                    Tổng: <strong className="text-slate-700">{tickets.length} vé</strong>
                </span>
                </div>

                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                    <tr className="border-b border-slate-100 text-[0.72rem] uppercase tracking-wider text-slate-400 font-semibold bg-slate-50/50">
                        <th className="py-3.5 px-4 text-center">STT</th>
                        <th className="py-3.5 px-4">Mã vé</th>
                        <th className="py-3.5 px-4">Mã khách hàng</th>
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
                    {paginatedTickets.map((row) => (
                        <tr key={row.ticketCode} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-4 text-center text-slate-500">{row.stt}</td>
                        <td className="py-4 px-4 font-bold text-slate-900 font-mono">{row.ticketCode}</td>
                        <td className="py-4 px-4 text-slate-600 font-mono">{row.customerCode}</td>
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
                            <button type="button" className="text-blue-600 hover:text-blue-800 font-medium"
                                onClick={() => {handleOpenDetail(row)}}
                            >
                                Xem
                            </button>
                            <button type="button" className="text-blue-600 hover:text-blue-800 font-medium">
                                Sửa
                            </button>
                            <button type="button" className="text-blue-600 hover:text-blue-800 font-medium"
                                onClick={() => {handleOpenRenew(row)}}
                            >
                                Gia hạn
                            </button>
                            </div>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>

                {/* 4. KHỐI PHÂN TRANG TÁI SỬ DỤNG BẰNG COMPONENT PAGINATION */}
                <div className="pt-4 border-t border-slate-100">
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setCurrentPage(page)}
                    totalItems={tickets.length}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    itemsPerPageOptions={[5, 10, 20]}
                    size="md"
                />
                </div>
            </div>

            {/* Render 3 Component Modal */}
            <CreateTicketModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSave={(data) => {
                console.log("Thêm vé mới:", data);
                }}
            />

            <RenewTicketModal
                isOpen={isRenewOpen}
                ticket={selectedTicket}
                onClose={() => setIsRenewOpen(false)}
                onConfirm={(data) => {
                console.log("Xác nhận gia hạn vé:", data);
                }}
            />

            <TicketDetailModal
                isOpen={isDetailOpen}
                ticket={selectedTicket}
                onClose={() => setIsDetailOpen(false)}
            />
        </>
    )
}
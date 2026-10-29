import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  EmptyState,
  Pagination,
  TableActions,
} from "../components/common";
import DataTable from "../components/common/DataTable";
import { customerService } from "../services/customerService";
import usePagination from "../hooks/usePagination";

const initialAdvancedFilters = {
  idNumber: "",
  birthday: "",
  gender: "",
};

export default function CustomerManagement() {
  const [customerData, setCustomerData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    customerCode: "",
    name: "",
    phone: "",
    idNumber: "",
    birthday: "",
    email: "",
    gender: "Nam",
    status: "Đang hoạt động",
    packageType: "Gói tháng",
  });

  // Tầng 1: Search term (mã, tên, SĐT, email)
  const [searchTerm, setSearchTerm] = useState("");

  // Tầng 2: Trạng thái & Gói
  const [statusFilter, setStatusFilter] = useState("");
  const [packageFilter, setPackageFilter] = useState("");

  // Tầng 3: Bộ lọc chi tiết (CCCD, Ngày sinh, Giới tính)
  const [appliedAdvancedFilters, setAppliedAdvancedFilters] = useState(initialAdvancedFilters);
  const [draftFilters, setDraftFilters] = useState(initialAdvancedFilters);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [expandedRowId, setExpandedRowId] = useState(null);

  const searchInputRef = useRef(null);
  const popoverRef = useRef(null);

  const fetchCustomerList = useCallback(() => {
    let isSubscribed = true;
    customerService
      .getCustomers()
      .then((data) => {
        if (isSubscribed) {
          setCustomerData(data);
          setErrorMessage(null);
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          console.error("Lỗi khi tải danh sách khách hàng:", err);
          setErrorMessage(err.message || "Không thể tải danh sách khách hàng");
        }
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = fetchCustomerList();
    return cleanup;
  }, [fetchCustomerList]);

  // Shortcut ⌘K / Ctrl+K to focus search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsPopoverOpen(false);
      }
    };
    if (isPopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPopoverOpen]);

  // Count active filters in Tầng 3 (Popover)
  const activeAdvancedCount = useMemo(() => {
    let count = 0;
    if (appliedAdvancedFilters.idNumber.trim()) count++;
    if (appliedAdvancedFilters.birthday.trim()) count++;
    if (appliedAdvancedFilters.gender) count++;
    return count;
  }, [appliedAdvancedFilters]);

  // Filtered customer list
  const customers = useMemo(() => {
    return customerData.filter((customer) => {
      // Tầng 1: Tìm theo mã, tên, SĐT, email
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchesCode = String(customer.customerCode ?? "").toLowerCase().includes(q);
        const matchesName = String(customer.name ?? "").toLowerCase().includes(q);
        const matchesPhone = String(customer.phone ?? "").toLowerCase().includes(q);
        const matchesEmail = String(customer.email ?? "").toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesPhone && !matchesEmail) {
          return false;
        }
      }

      // Tầng 2: Trạng thái & Gói
      if (statusFilter && customer.status !== statusFilter) {
        return false;
      }
      if (packageFilter && customer.packageType !== packageFilter) {
        return false;
      }

      // Tầng 3: CCCD, Ngày sinh, Giới tính
      if (
        appliedAdvancedFilters.idNumber.trim() &&
        !String(customer.idNumber ?? "")
          .toLowerCase()
          .includes(appliedAdvancedFilters.idNumber.trim().toLowerCase())
      ) {
        return false;
      }
      if (
        appliedAdvancedFilters.birthday.trim() &&
        !String(customer.birthday ?? "")
          .toLowerCase()
          .includes(appliedAdvancedFilters.birthday.trim().toLowerCase())
      ) {
        return false;
      }
      if (
        appliedAdvancedFilters.gender &&
        customer.gender !== appliedAdvancedFilters.gender
      ) {
        return false;
      }

      return true;
    });
  }, [customerData, searchTerm, statusFilter, packageFilter, appliedAdvancedFilters]);

  const { totalPages, paginatedList } = usePagination(
    customers,
    currentPage,
    itemsPerPage,
  );

  const handleOpenPopover = () => {
    if (!isPopoverOpen) {
      setDraftFilters({ ...appliedAdvancedFilters });
    }
    setIsPopoverOpen((prev) => !prev);
  };

  const handleApplyPopover = () => {
    setAppliedAdvancedFilters({ ...draftFilters });
    setCurrentPage(1);
    setIsPopoverOpen(false);
  };

  const handleCancelPopover = () => {
    setDraftFilters({ ...appliedAdvancedFilters });
    setIsPopoverOpen(false);
  };

  const handleClearPopoverDraft = () => {
    const cleared = { idNumber: "", birthday: "", gender: "" };
    setDraftFilters(cleared);
    setAppliedAdvancedFilters(cleared);
    setCurrentPage(1);
  };

  const handleResetAll = () => {
    setSearchTerm("");
    setStatusFilter("");
    setPackageFilter("");
    const cleared = { idNumber: "", birthday: "", gender: "" };
    setDraftFilters(cleared);
    setAppliedAdvancedFilters(cleared);
    setCurrentPage(1);
    searchInputRef.current?.focus();
  };

  const handleOpenCreateModal = () => {
    setEditingCustomerId(null);
    setNewCustomer({
      customerCode: `KH${String(customerData.length + 1).padStart(4, "0")}`,
      name: "",
      phone: "",
      idNumber: "",
      birthday: "",
      email: "",
      gender: "Nam",
      status: "Đang hoạt động",
      packageType: "Gói tháng",
    });
    setShowAddModal(true);
  };

  const handleEditClick = useCallback((customer) => {
    setEditingCustomerId(customer.id);
    setNewCustomer({
      customerCode: customer.customerCode ?? "",
      name: customer.name ?? "",
      phone: customer.phone ?? "",
      idNumber: customer.idNumber ?? "",
      birthday: customer.birthday ?? "",
      email: customer.email ?? "",
      gender: customer.gender ?? "Nam",
      status: customer.status ?? "Đang hoạt động",
      packageType: customer.packageType ?? "Gói tháng",
    });
    setShowAddModal(true);
  }, []);

  const handleDeleteCustomer = useCallback(async (customer) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa khách hàng ${customer?.name ?? ""} không?`,
    );
    if (!confirmed) return;

    try {
      await customerService.deleteCustomer(customer.id);
      setCustomerData((current) => {
        const newData = current.filter((c) => c.id !== customer.id);
        setCurrentPage((page) =>
          Math.min(page, Math.max(1, Math.ceil((newData.length - 1) / itemsPerPage))),
        );
        return newData;
      });
    } catch (err) {
      alert(`Xóa khách hàng thất bại: ${err.message}`);
    }
  }, [itemsPerPage]);

  const handleRowClick = (customer) => {
    setExpandedRowId((prev) => (prev === customer.id ? null : customer.id));
  };

  const handleSubmitCustomer = async (event) => {
    event.preventDefault();

    try {
      if (editingCustomerId) {
        const updated = await customerService.updateCustomer(editingCustomerId, newCustomer);
        setCustomerData((current) =>
          current.map((c) =>
            c.id === editingCustomerId
              ? {
                  ...c,
                  ...newCustomer,
                  ...updated,
                }
              : c,
          ),
        );
        setEditingCustomerId(null);
      } else {
        const created = await customerService.createCustomer({
          ...newCustomer,
          vehicles: [],
        });
        setCustomerData((current) => [...current, created]);
      }

      setNewCustomer({
        customerCode: "",
        name: "",
        phone: "",
        idNumber: "",
        birthday: "",
        email: "",
        gender: "Nam",
        status: "Đang hoạt động",
        packageType: "Gói tháng",
      });
      setShowAddModal(false);
    } catch (err) {
      alert(`Lưu thông tin thất bại: ${err.message}`);
    }
  };

  const columns = useMemo(
    () => [
      {
        header: "Mã khách hàng",
        accessor: "customerCode",
        renderCell: (row) => (
          <span className="font-semibold text-slate-800">{row.customerCode}</span>
        ),
      },
      {
        header: "Tên khách hàng",
        accessor: "name",
        renderCell: (row) => (
          <span className="font-medium text-slate-900">{row.name}</span>
        ),
      },
      {
        header: "Số điện thoại",
        accessor: "phone",
        renderCell: (row) => (
          <span className="font-semibold text-blue-600">{row.phone}</span>
        ),
      },
      { header: "Số CCCD", accessor: "idNumber" },
      { header: "Ngày sinh", accessor: "birthday" },
      { header: "Email", accessor: "email" },
      { header: "Giới tính", accessor: "gender" },
      {
        header: "Gói",
        accessor: "packageType",
        renderCell: (row) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {row.packageType || "Gói tháng"}
          </span>
        ),
      },
      {
        header: "Trạng thái",
        accessor: "status",
        renderCell: (row) => {
          const status = row.status || "Đang hoạt động";
          if (status === "Đang hoạt động") {
            return (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Đang hoạt động
              </span>
            );
          }
          if (status === "Sắp hết hạn") {
            return (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Sắp hết hạn
              </span>
            );
          }
          if (status === "Tạm khóa") {
            return (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border bg-rose-50 text-rose-700 border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Tạm khóa
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border bg-slate-100 text-slate-600 border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              {status}
            </span>
          );
        },
      },
      {
        header: "Thao tác",
        accessor: () => null,
        align: "center",
        renderCell: (row) => (
          <TableActions
            actions={[
              {
                label: "Sửa",
                icon: "edit",
                onClick: () => handleEditClick(row),
              },
              {
                label: "Xóa",
                icon: "delete",
                onClick: () => handleDeleteCustomer(row),
              },
            ]}
          />
        ),
      },
    ],
    [handleEditClick, handleDeleteCustomer],
  );

  return (
    <div className="min-h-screen bg-[#FAF8FF] text-[#0F172A] font-sans">
      <main className="w-full px-4 sm:px-6 lg:px-10 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Quản lý khách hàng
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý danh sách khách hàng, thuê bao và thông tin phương tiện.
            </p>
          </div>
        </div>

        {/* Bộ lọc 2 tầng + Popover tầng 3 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
          {/* Tầng 1: Search theo mã, tên, SĐT, email + Phím tắt ⌘K */}
          <div className="relative flex items-center">
            <span className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Tìm theo mã, tên, SĐT, email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs pl-9 pr-16 py-2.5 border border-slate-300 rounded-lg bg-white hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-slate-400 text-slate-800"
            />
            <div className="absolute right-2.5 flex items-center gap-1.5">
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setCurrentPage(1);
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <kbd
                onClick={() => searchInputRef.current?.focus()}
                className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-2xs font-mono font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded shadow-2xs cursor-pointer select-none"
                title="Nhấn ⌘K hoặc Ctrl+K để tìm kiếm"
              >
                <span className="text-xs">Ctrl+K</span>
              </kbd>
            </div>
          </div>

          {/* Tầng 2: [Tất cả trạng thái ▼] [Tất cả gói ▼] [+ Bộ lọc] [↻] */}
          <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
            {/* Dropdown: Tất cả trạng thái */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 pl-3 pr-8 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg appearance-none hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-2xs"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Đang hoạt động">Đang hoạt động</option>
                <option value="Sắp hết hạn">Sắp hết hạn</option>
                <option value="Tạm khóa">Tạm khóa</option>
                <option value="Hết hạn">Hết hạn</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Dropdown: Tất cả gói */}
            <div className="relative">
              <select
                value={packageFilter}
                onChange={(e) => {
                  setPackageFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 pl-3 pr-8 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg appearance-none hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-2xs"
              >
                <option value="">Tất cả gói</option>
                <option value="Gói tháng">Gói tháng</option>
                <option value="Gói quý">Gói quý</option>
                <option value="Gói năm">Gói năm</option>
                <option value="Vãng lai">Vãng lai</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* [+ Bộ lọc] with Popover (Tầng 3) */}
            <div className="relative" ref={popoverRef}>
              <button
                type="button"
                onClick={handleOpenPopover}
                className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border text-xs font-medium cursor-pointer transition-colors shadow-2xs ${
                  isPopoverOpen || activeAdvancedCount > 0
                    ? "bg-blue-50/70 border-blue-400 text-blue-700 font-semibold"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Bộ lọc</span>
                {activeAdvancedCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-2xs font-bold leading-none">
                    {activeAdvancedCount}
                  </span>
                )}
              </button>

              {/* Tầng 3: Popover hiển thị khi click [+ Bộ lọc] */}
              {isPopoverOpen && (
                <div
                  className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-40 space-y-3.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-800">Bộ lọc chi tiết</span>
                    {activeAdvancedCount > 0 && (
                      <button
                        type="button"
                        onClick={handleClearPopoverDraft}
                        className="text-2xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        Đặt lại
                      </button>
                    )}
                  </div>

                  {/* + CCCD */}
                  <div className="space-y-1">
                    <label className="block text-2xs font-semibold text-slate-600">
                      + CCCD:
                    </label>
                    <input
                      type="text"
                      placeholder="Nhập số CCCD..."
                      value={draftFilters.idNumber}
                      onChange={(e) =>
                        setDraftFilters((prev) => ({ ...prev, idNumber: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && handleApplyPopover()}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>

                  {/* + Ngày sinh */}
                  <div className="space-y-1">
                    <label className="block text-2xs font-semibold text-slate-600">
                      + Ngày sinh:
                    </label>
                    <input
                      type="text"
                      placeholder="dd/mm/yyyy"
                      value={draftFilters.birthday}
                      onChange={(e) =>
                        setDraftFilters((prev) => ({ ...prev, birthday: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && handleApplyPopover()}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>

                  {/* + Giới tính */}
                  <div className="space-y-1">
                    <label className="block text-2xs font-semibold text-slate-600">
                      + Giới tính:
                    </label>
                    <div className="relative">
                      <select
                        value={draftFilters.gender}
                        onChange={(e) =>
                          setDraftFilters((prev) => ({ ...prev, gender: e.target.value }))
                        }
                        className="w-full h-8.5 px-3 pr-8 text-xs bg-white border border-slate-300 rounded-lg appearance-none text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                      >
                        <option value="">Tất cả giới tính</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Actions: [Áp dụng] [Hủy] */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleCancelPopover}
                      className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyPopover}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* [↻] Nút làm mới bộ lọc */}
            <button
              type="button"
              onClick={() => {
                handleResetAll();
                fetchCustomerList();
              }}
              title="Làm mới bộ lọc và dữ liệu"
              aria-label="Làm mới bộ lọc và dữ liệu"
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Data Table Card: Danh sách khách hàng */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Card Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Bảng danh sách khách hàng
              </h2>
              <p className="text-2xs text-slate-500">
                Thông tin cá nhân và quản lý tài khoản khách hàng
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>Thêm</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {errorMessage && (
              <div className="m-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={fetchCustomerList}
                  className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-white border border-amber-300 font-medium text-amber-900 hover:bg-amber-100/60 transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
                >
                  Thử lại
                </button>
              </div>
            )}
            <DataTable
              columns={columns}
              rows={paginatedList}
              rowKey="id"
              onRowClick={handleRowClick}
              renderCell={(row, col) => (col.renderCell ? col.renderCell(row) : (typeof col.accessor === "function" ? col.accessor(row) : row[col.accessor]))}
              emptyMessage={
                <div className="flex min-h-[180px] items-center justify-center">
                  <EmptyState
                    title={
                      isLoading
                        ? "Đang tải dữ liệu..."
                        : errorMessage
                          ? "Không thể tải danh sách khách hàng"
                          : "Chưa có dữ liệu"
                    }
                    description={
                      isLoading
                        ? "Vui lòng đợi giây lát trong khi tải dữ liệu từ máy chủ."
                        : errorMessage
                          ? errorMessage
                          : "Không tìm thấy khách hàng phù hợp với bộ lọc."
                    }
                    action={
                      errorMessage ? (
                        <button
                          type="button"
                          onClick={fetchCustomerList}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Tải lại dữ liệu</span>
                        </button>
                      ) : null
                    }
                  />
                </div>
              }
            />
          </div>

          {customers.length > 0 && (
            <div className="p-4 border-t border-slate-100">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={customers.length}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              />
            </div>
          )}

          {/* Danh sách xe của khách hàng (hiển thị dưới cả phân trang) */}
          {paginatedList.map((row) =>
            expandedRowId === row.id && row.vehicles && row.vehicles.length > 0 ? (
              <div key={`expanded-${row.id}`} className="bg-slate-50/50 border-t border-slate-200">
                <div className="rounded-lg border border-slate-200 bg-white p-3 m-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-slate-700">
                      Danh sách xe của {row.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setExpandedRowId(null)}
                      className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
                      title="Đóng"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50/75 border-b border-slate-200 text-2xs font-semibold text-slate-700 uppercase tracking-wider">
                        <tr>
                          <th className="py-2 px-3">Biển số</th>
                          <th className="py-2 px-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-normal">
                        {row.vehicles.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-bold font-mono text-slate-900">
                              {v.licensePlate}
                            </td>
                            <td className="py-2.5 px-3">{v.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null
          )}
        </div>

        {/* Modal Thêm / Sửa khách hàng */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-900">
                {editingCustomerId ? "Sửa thông tin khách hàng" : "Thêm khách hàng mới"}
              </h2>

              <form onSubmit={handleSubmitCustomer} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-2xs font-semibold text-slate-600">
                      Mã khách hàng
                    </label>
                    <input
                      required
                      value={newCustomer.customerCode}
                      onChange={(e) =>
                        setNewCustomer((current) => ({
                          ...current,
                          customerCode: e.target.value,
                        }))
                      }
                      placeholder="Nhập mã khách hàng..."
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-2xs font-semibold text-slate-600">
                      Tên khách hàng
                    </label>
                    <input
                      required
                      value={newCustomer.name}
                      onChange={(e) =>
                        setNewCustomer((current) => ({
                          ...current,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Nhập tên khách hàng..."
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-2xs font-semibold text-slate-600">
                      Số điện thoại
                    </label>
                    <input
                      required
                      value={newCustomer.phone}
                      onChange={(e) =>
                        setNewCustomer((current) => ({
                          ...current,
                          phone: e.target.value,
                        }))
                      }
                      placeholder="Nhập số điện thoại..."
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-2xs font-semibold text-slate-600">
                      Số CCCD
                    </label>
                    <input
                      required
                      value={newCustomer.idNumber}
                      onChange={(e) =>
                        setNewCustomer((current) => ({
                          ...current,
                          idNumber: e.target.value,
                        }))
                      }
                      placeholder="Nhập số CCCD..."
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-2xs font-semibold text-slate-600">
                      Ngày sinh
                    </label>
                    <input
                      value={newCustomer.birthday}
                      onChange={(e) =>
                        setNewCustomer((current) => ({
                          ...current,
                          birthday: e.target.value,
                        }))
                      }
                      placeholder="dd/mm/yyyy"
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-2xs font-semibold text-slate-600">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) =>
                        setNewCustomer((current) => ({
                          ...current,
                          email: e.target.value,
                        }))
                      }
                      placeholder="Nhập email..."
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-2xs font-semibold text-slate-600">
                      Giới tính
                    </label>
                    <select
                      value={newCustomer.gender}
                      onChange={(e) =>
                        setNewCustomer((current) => ({
                          ...current,
                          gender: e.target.value,
                        }))
                      }
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-2xs font-semibold text-slate-600">
                      Gói thuê bao
                    </label>
                    <select
                      value={newCustomer.packageType || "Gói tháng"}
                      onChange={(e) =>
                        setNewCustomer((current) => ({
                          ...current,
                          packageType: e.target.value,
                        }))
                      }
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
                    >
                      <option value="Gói tháng">Gói tháng</option>
                      <option value="Gói quý">Gói quý</option>
                      <option value="Gói năm">Gói năm</option>
                      <option value="Vãng lai">Vãng lai</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-2xs font-semibold text-slate-600">
                      Trạng thái
                    </label>
                    <select
                      value={newCustomer.status || "Đang hoạt động"}
                      onChange={(e) =>
                        setNewCustomer((current) => ({
                          ...current,
                          status: e.target.value,
                        }))
                      }
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
                    >
                      <option value="Đang hoạt động">Đang hoạt động</option>
                      <option value="Sắp hết hạn">Sắp hết hạn</option>
                      <option value="Tạm khóa">Tạm khóa</option>
                      <option value="Hết hạn">Hết hạn</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingCustomerId(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                  >
                    {editingCustomerId ? "Cập nhật" : "Thêm khách hàng"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

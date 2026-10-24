import { useMemo, useState } from "react";
import { EmptyState, Pagination } from "../components/common";
import { mockCustomers } from "../mocks/customerData";
import usePagination from "../hooks/usePagination";

const initialFilters = {
  customerCode: "",
  name: "",
  phone: "",
  idNumber: "",
};

const stats = [
  ["Tổng khách hàng", "1,420"],
  ["Thuê bao kích hoạt", "1,280"],
  ["Sắp hết hạn (7 ngày)", "42"],
  ["Blacklist/Tạm khóa", "15"],
];

const fields = [
  ["customerCode", "Mã khách hàng", "Nhập mã khách hàng..."],
  ["name", "Tên khách hàng", "Nhập tên khách hàng..."],
  ["phone", "Số điện thoại", "Nhập số điện thoại..."],
  ["idNumber", "Số CCCD", "Nhập số CCCD..."],
];

export default function CustomerManagement() {
  const [customerData, setCustomerData] = useState(mockCustomers);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    customerCode: "",
    name: "",
    phone: "",
    idNumber: "",
  });
  const [filters, setFilters] = useState(initialFilters);
  const [submittedFilters, setSubmittedFilters] = useState(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const customers = useMemo(
    () =>
      customerData.filter((customer) =>
        Object.entries(submittedFilters).every(([key, value]) =>
          String(customer[key] ?? "")
            .toLowerCase()
            .includes(value.trim().toLowerCase()),
        ),
      ),
    [customerData, submittedFilters],
  );

  const { totalPages, paginatedList } = usePagination(
    customers,
    currentPage,
    itemsPerPage,
  );

  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const search = () => {
    setCurrentPage(1);
    setSubmittedFilters({ ...filters });
  };

  const reset = () => {
    setFilters({ ...initialFilters });
    setSubmittedFilters({ ...initialFilters });
    setCurrentPage(1);
  };

  const handleAddCustomer = (event) => {
    event.preventDefault();

    const customer = {
      ...newCustomer,
      id: `customer-${Date.now()}`,
    };

    setCustomerData((current) => [...current, customer]);
    setNewCustomer({
      customerCode: "",
      name: "",
      phone: "",
      idNumber: "",
    });
    setShowAddModal(false);
    setCurrentPage(1);
    setFilters({ ...initialFilters });
    setSubmittedFilters({ ...initialFilters });
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] px-4 py-6 text-[#0F172A] sm:px-6 lg:px-8">
      <div className="w-full space-y-5">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Quản lý khách hàng
        </h1>

        <section>
          <h2 className="mb-2 text-xs font-semibold">
            Thống kê nhanh
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs"
              >
                <p className="text-[11px] text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-bold text-slate-800">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[200px_minmax(0,1fr)]">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <h2 className="mb-4 text-xs font-bold">
              Bộ lọc nhanh
            </h2>

            <div className="space-y-3">
              {fields.map(([key, label, placeholder]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-slate-700">
                    {label}
                  </span>
                  <input
                    value={filters[key]}
                    onChange={(event) =>
                      setFilter(key, event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") search();
                    }}
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-[11px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={search}
                className="flex-1 rounded-lg bg-blue-600 px-2 py-2 text-[11px] font-semibold text-white hover:bg-blue-700"
              >
                Tìm kiếm
              </button>

              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] font-medium hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </section>

          <section className="flex min-h-[302px] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold">
                Bảng danh sách khách hàng
              </h2>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-blue-700"
              >
                + Thêm
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <div className="min-w-[560px]">
                <div className="grid grid-cols-4 bg-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-500">
                  <span>Mã khách hàng</span>
                  <span>Tên khách hàng</span>
                  <span>Số điện thoại</span>
                  <span>Số CCCD</span>
                </div>

                {customers.length === 0 ? (
                  <div className="flex min-h-[180px] items-center justify-center">
                    <EmptyState
                      title="Chưa có dữ liệu"
                      description="Không tìm thấy khách hàng phù hợp."
                    />
                  </div>
                ) : (
                  paginatedList.map((customer) => (
                    <div
                      key={customer.id}
                      className="grid grid-cols-4 border-t border-slate-100 px-3 py-3 text-xs"
                    >
                      <span>{customer.customerCode}</span>
                      <span>{customer.name}</span>
                      <span>{customer.phone}</span>
                      <span>{customer.idNumber}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {customers.length > 0 && (
              <div className="mt-auto pt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  totalItems={customers.length}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
          </section>
        </div>

        {showAddModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-customer-title"
              className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <h2
                id="add-customer-title"
                className="mb-4 text-lg font-bold"
              >
                Thêm khách hàng
              </h2>

              <form onSubmit={handleAddCustomer} className="space-y-3">
                {fields.map(([key, label, placeholder]) => (
                  <label key={key} className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-700">
                      {label}
                    </span>
                    <input
                      required
                      value={newCustomer[key]}
                      onChange={(event) =>
                        setNewCustomer((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      placeholder={placeholder}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                ))}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Thêm khách hàng
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
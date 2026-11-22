import { useMemo, useState, useCallback } from "react";
import {
  DataTable,
  TableActions,
  LoadingSpinner,
  EmptyState,
} from "../components/common";
import EmployeeModal from "../components/EmployeeManagement/EmployeeModal";
import useEmployees from "../hooks/useEmployees";

const AVATAR_CLASSES = {
  indigo: "bg-indigo-100 text-indigo-600",
  blue: "bg-blue-100 text-blue-600",
  pink: "bg-pink-100 text-pink-600",
  amber: "bg-amber-100 text-amber-600",
  emerald: "bg-emerald-100 text-emerald-600",
  cyan: "bg-cyan-100 text-cyan-600",
  violet: "bg-violet-100 text-violet-600",
  rose: "bg-rose-100 text-rose-600",
};

export default function EmployeeManagement() {
  const {
    employees,
    summary,
    positions,
    loading,
    error,
    fetchEmployees,
    saveEmployee,
    toggleStatus,
  } = useEmployees();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [actionError, setActionError] = useState(null);

  const handleOpenAddModal = () => {
    setSelectedEmployee(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = useCallback((employee) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  }, []);

  const handleSaveEmployee = async (employeeData) => {
    setActionError(null);
    try {
      await saveEmployee(employeeData);
      handleCloseModal();
    } catch (err) {
      setActionError(err?.message || "Không thể lưu thông tin nhân viên");
    }
  };

  const handleToggleStatus = useCallback(
    async (id) => {
      setActionError(null);
      try {
        await toggleStatus(id);
      } catch (err) {
        setActionError(
          err?.message || "Không thể cập nhật trạng thái hoạt động của nhân viên"
        );
      }
    },
    [toggleStatus]
  );

  const roleOptions = useMemo(() => {
    const list = new Set();
    positions.forEach((p) => {
      if (p.name) list.add(p.name);
    });
    employees.forEach((e) => {
      if (e.role) list.add(e.role);
    });
    return Array.from(list);
  }, [positions, employees]);

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        const query = search.trim().toLowerCase();
        return (
          (!query ||
            `${employee.name} ${employee.code || employee.id} ${employee.email}`
              .toLowerCase()
              .includes(query)) &&
          (role === "all" || employee.role === role) &&
          (status === "all" || employee.status === status)
        );
      }),
    [employees, role, search, status]
  );

  const columns = useMemo(
    () => [
      {
        header: "Nhân viên",
        accessor: (employee) => (
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold ${
                AVATAR_CLASSES[employee.tone] || "bg-slate-100 text-slate-600"
              }`}
            >
              {(employee.name || "")
                .split(" ")
                .filter(Boolean)
                .map((part) => part[0])
                .slice(-2)
                .join("")}
            </span>
            <span>
              <span className="block font-semibold text-slate-700">
                {employee.name}
              </span>
              <span className="block text-[10px] text-slate-400">
                {employee.email}
              </span>
            </span>
          </div>
        ),
      },
      {
        header: "Mã NV",
        accessor: (employee) => (
          <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
            {employee.code || employee.id}
          </span>
        ),
      },
      {
        header: "Chức vụ",
        accessor: (employee) => (
          <span className="text-slate-600">{employee.role}</span>
        ),
      },
      {
        header: "Liên hệ",
        accessor: (employee) => (
          <div>
            <span className="block text-slate-600">{employee.phone}</span>
            <span className="text-[10px] text-slate-400">{employee.email}</span>
          </div>
        ),
      },
      {
        header: "Khu vực",
        accessor: (employee) => (
          <div>
            <span className="block text-slate-600">
              {employee.area || "—"}
            </span>
            <span className="text-[10px] text-slate-400">
              {employee.city || "—"}
            </span>
          </div>
        ),
      },
      {
        header: "Trạng thái",
        accessor: (employee) => (
          <span
            className={`inline-flex min-w-[110px] items-center justify-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
              employee.status === "active"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {employee.statusDisplay ||
              (employee.status === "active"
                ? "Đang hoạt động"
                : "Không hoạt động")}
          </span>
        ),
      },
      {
        header: "Thao tác",
        align: "center",
        accessor: (employee) => (
          <TableActions
            actions={[
              {
                label: "Sửa",
                icon: "edit",
                title: "Sửa thông tin nhân viên",
                onClick: () => handleOpenEditModal(employee),
              },
              {
                label: employee.status === "active" ? "Khóa" : "Kích hoạt",
                icon: "toggle",
                title:
                  employee.status === "active"
                    ? "Ngưng hoạt động"
                    : "Kích hoạt lại",
                className: `w-22 justify-center ${
                  employee.status === "active"
                    ? "text-amber-600 hover:text-amber-800"
                    : "text-emerald-600 hover:text-emerald-800"
                }`,
                onClick: () => handleToggleStatus(employee.id),
              },
            ]}
          />
        ),
      },
    ],
    [handleOpenEditModal, handleToggleStatus]
  );

  return (
    <>
      <div className="w-full space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Quản lý nhân viên
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Theo dõi thông tin và trạng thái nhân sự trong hệ thống.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + Thêm nhân viên
          </button>
        </div>

        {actionError && (
          <div
            role="alert"
            className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
          >
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="font-bold hover:underline"
            >
              Đóng
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700"
          >
            <div className="flex items-center gap-2.5">
              <svg
                className="h-5 w-5 shrink-0 text-rose-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="font-semibold text-rose-800">
                  Không thể tải dữ liệu nhân viên
                </p>
                <p className="mt-0.5 text-rose-600">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchEmployees}
              className="ml-4 shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white transition hover:bg-rose-700"
            >
              Thử lại
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [
              "Tổng nhân viên",
              summary?.total_employees ?? employees.length,
              "Tất cả hồ sơ",
            ],
            [
              "Đang hoạt động",
              summary?.active_employees ??
                employees.filter((item) => item.status === "active").length,
              "Đang làm việc",
            ],
            [
              "Không hoạt động",
              summary?.inactive_employees ??
                employees.filter((item) => item.status === "inactive").length,
              "Hồ sơ tạm ngưng",
            ],
            [
              "Chức vụ",
              summary?.total_positions ??
                new Set(employees.map((item) => item.role)).size,
              "Nhóm chức vụ mẫu",
            ],
          ].map(([label, value, caption]) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-2xs"
            >
              <p className="text-[11px] text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
              <p className="mt-1 text-[10px] text-slate-400">{caption}</p>
            </div>
          ))}
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Danh sách nhân viên
              </h2>
              <p className="mt-1 text-[11px] text-slate-400">
                Quản lý hồ sơ và thông tin liên hệ.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm tên, mã, email..."
                className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-blue-500"
              />
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none"
              >
                <option value="all">Tất cả chức vụ</option>
                {roleOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Không hoạt động</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center py-16">
              <LoadingSpinner size="lg" label="Đang tải danh sách nhân viên..." />
            </div>
          ) : error ? (
            <EmptyState
              title="Không thể tải dữ liệu nhân viên"
              description={error}
              icon={
                <svg
                  className="h-10 w-10 text-rose-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              }
              action={
                <button
                  type="button"
                  onClick={fetchEmployees}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  Thử lại
                </button>
              }
            />
          ) : employees.length === 0 ? (
            <EmptyState
              title="Chưa có nhân viên nào trong hệ thống"
              description="Hiện tại chưa có hồ sơ nhân viên nào được lưu trữ."
              action={
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  + Thêm nhân viên
                </button>
              }
            />
          ) : (
            <DataTable
              columns={columns}
              rows={filteredEmployees}
              rowKey="id"
              emptyMessage="Không tìm thấy nhân viên phù hợp."
            />
          )}
        </section>
      </div>

      <EmployeeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        employee={selectedEmployee}
        onSave={handleSaveEmployee}
      />
    </>
  );
}

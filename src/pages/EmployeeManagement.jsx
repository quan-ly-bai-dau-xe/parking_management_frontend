import { useMemo, useState, useEffect, useCallback } from "react";
import { DataTable, TableActions, LoadingSpinner } from "../components/common";
import EmployeeModal from "../components/EmployeeManagement/EmployeeModal";
import { employeeService, INITIAL_EMPLOYEES } from "../services/employeeService";

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
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
  const [positions, setPositions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const fetchPositions = useCallback(async () => {
    try {
      const pos = await employeeService.getPositions();
      setPositions(pos || []);
    } catch (err) {
      console.warn("Could not fetch positions:", err);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const sum = await employeeService.getSummary();
      setSummary(sum);
    } catch (err) {
      console.warn("Could not fetch employee summary:", err);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await employeeService.getEmployees({
        search,
        role: role !== "all" ? role : undefined,
        status: status !== "all" ? status : undefined,
      });
      setEmployees(res.data || []);
    } catch (err) {
      console.error("Lỗi khi tải danh sách nhân viên:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, role, status]);

  useEffect(() => {
    fetchPositions();
    fetchSummary();
  }, [fetchPositions, fetchSummary]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleOpenAddModal = () => {
    setSelectedEmployee(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (employee) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleSaveEmployee = async (employeeData) => {
    try {
      if (employeeData.backendId || (employeeData.id && employeeData.rowVersion)) {
        // Cập nhật nhân viên hiện có
        const updated = await employeeService.updateEmployee(
          employeeData.backendId || employeeData.id,
          employeeData,
          positions
        );
        setEmployees((prev) =>
          prev.map((item) =>
            item.id === employeeData.id || item.backendId === employeeData.backendId
              ? { ...item, ...updated }
              : item
          )
        );
      } else {
        // Thêm nhân viên mới
        const created = await employeeService.createEmployee(employeeData, positions);
        setEmployees((prev) => [created, ...prev]);
      }
      fetchSummary();
    } catch (err) {
      alert(err.message || "Không thể lưu thông tin nhân viên");
    } finally {
      handleCloseModal();
    }
  };

  const handleDeleteEmployee = async (employee) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa nhân viên ${employee.name} (${employee.id}) không?`
    );
    if (!confirmed) return;

    try {
      await employeeService.deleteEmployee(
        employee.backendId || employee.id,
        employee.rowVersion || 1
      );
      setEmployees((prev) => prev.filter((item) => item.id !== employee.id));
      fetchSummary();
    } catch (err) {
      alert(err.message || "Không thể xóa nhân viên");
    }
  };

  const toggleStatus = async (employee) => {
    const newStatus = employee.status === "active" ? "inactive" : "active";
    // Optimistic update
    setEmployees((items) =>
      items.map((item) =>
        item.id === employee.id
          ? { ...item, status: newStatus, statusDisplay: newStatus === "active" ? "Đang hoạt động" : "Không hoạt động" }
          : item
      )
    );

    try {
      await employeeService.updateEmployee(
        employee.backendId || employee.id,
        { ...employee, status: newStatus },
        positions
      );
      fetchSummary();
    } catch (err) {
      console.warn("Could not sync status update to backend:", err);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const query = search.trim().toLowerCase();
      const matchQuery =
        !query ||
        `${employee.name} ${employee.id} ${employee.email}`
          .toLowerCase()
          .includes(query);

      const matchRole = role === "all" || employee.role === role || employee.roleCode === role;
      const matchStatus = status === "all" || employee.status === status;

      return matchQuery && matchRole && matchStatus;
    });
  }, [employees, role, search, status]);

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
              {(employee.name || "NV")
                .split(" ")
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
          <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500 font-mono">
            {employee.id}
          </span>
        ),
      },
      {
        header: "Chức vụ",
        accessor: (employee) => (
          <span className="text-slate-600 font-medium">{employee.role}</span>
        ),
      },
      {
        header: "Liên hệ",
        accessor: (employee) => (
          <div>
            <span className="block text-slate-600 font-mono">{employee.phone}</span>
            <span className="text-[10px] text-slate-400">{employee.email}</span>
          </div>
        ),
      },
      {
        header: "Khu vực",
        accessor: (employee) => (
          <div>
            <span className="block text-slate-600">{employee.area}</span>
            <span className="text-[10px] text-slate-400">{employee.city}</span>
          </div>
        ),
      },
      {
        header: "Trạng thái",
        accessor: (employee) => (
          <span
            className={`inline-flex items-center justify-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold min-w-[110px] ${
              employee.status === "active"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {employee.statusDisplay || (employee.status === "active" ? "Đang hoạt động" : "Không hoạt động")}
          </span>
        ),
      },
      {
        header: "Thao tác",
        className: "w-28 text-center",
        accessor: (employee) => (
          <TableActions
            actions={[
              {
                label: "Chỉnh sửa",
                className: "text-blue-600 hover:text-blue-700",
                onClick: () => handleOpenEditModal(employee),
              },
              {
                label: employee.status === "active" ? "Tạm khóa" : "Kích hoạt",
                className: `${
                  employee.status === "active"
                    ? "text-amber-600 hover:text-amber-700"
                    : "text-emerald-600 hover:text-emerald-700"
                }`,
                onClick: () => toggleStatus(employee),
              },
              {
                label: "Xóa",
                className: "text-rose-600 hover:text-rose-700",
                onClick: () => handleDeleteEmployee(employee),
              },
            ]}
          />
        ),
      },
    ],
    [positions],
  );

  const totalEmp = summary?.total_employees ?? employees.length;
  const activeEmp = summary?.active_employees ?? employees.filter((item) => item.status === "active").length;
  const inactiveEmp = summary?.inactive_employees ?? employees.filter((item) => item.status === "inactive").length;
  const positionsCount = summary?.total_positions ?? (positions.length || new Set(employees.map((item) => item.role)).size);

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
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 cursor-pointer"
          >
            + Thêm nhân viên
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Tổng nhân viên", totalEmp, "Tất cả hồ sơ"],
            ["Đang hoạt động", activeEmp, "Đang làm việc"],
            ["Không hoạt động", inactiveEmp, "Hồ sơ tạm ngưng"],
            ["Chức vụ", positionsCount, "Nhóm chức vụ trong bãi"],
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
                {positions.length > 0
                  ? positions.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))
                  : [...new Set(employees.map((item) => item.role))].map((item) => (
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

          {isLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner text="Đang tải danh sách nhân viên..." />
            </div>
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
        positions={positions}
      />
    </>
  );
}

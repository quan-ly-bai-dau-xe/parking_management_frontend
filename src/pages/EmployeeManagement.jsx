import { useMemo, useState } from "react";
import { DataTable, TableActions } from "../components/common";
import EmployeeModal from "../components/EmployeeModal";

const INITIAL_EMPLOYEES = [
  {
    id: "NV001",
    name: "Nguyễn Minh Anh",
    email: "minhanh@smartpark.vn",
    phone: "0905 123 456",
    role: "Quản lý",
    area: "Hải Châu",
    city: "Đà Nẵng",
    status: "active",
    tone: "indigo",
  },
  {
    id: "NV002",
    name: "Trần Quốc Bảo",
    email: "quocbao@smartpark.vn",
    phone: "0912 345 678",
    role: "Nhân viên vận hành",
    area: "Thanh Khê",
    city: "Đà Nẵng",
    status: "active",
    tone: "blue",
  },
  {
    id: "NV003",
    name: "Lê Thị Thu Hà",
    email: "thuha@smartpark.vn",
    phone: "0935 111 222",
    role: "Nhân viên thu ngân",
    area: "Quận 1",
    city: "Hồ Chí Minh",
    status: "active",
    tone: "pink",
  },
  {
    id: "NV004",
    name: "Phạm Hoàng Nam",
    email: "hoangnam@smartpark.vn",
    phone: "0901 222 333",
    role: "Kỹ thuật viên",
    area: "Cầu Giấy",
    city: "Hà Nội",
    status: "inactive",
    tone: "amber",
  },
  {
    id: "NV005",
    name: "Võ Ngọc Linh",
    email: "ngoclinh@smartpark.vn",
    phone: "0988 333 444",
    role: "Nhân viên vận hành",
    area: "Sơn Trà",
    city: "Đà Nẵng",
    status: "active",
    tone: "emerald",
  },
  {
    id: "NV006",
    name: "Đặng Gia Huy",
    email: "giahuy@smartpark.vn",
    phone: "0977 444 555",
    role: "Nhân viên thu ngân",
    area: "Liên Chiểu",
    city: "Đà Nẵng",
    status: "active",
    tone: "cyan",
  },
  {
    id: "NV007",
    name: "Bùi Thanh Tùng",
    email: "thanhtung@smartpark.vn",
    phone: "0966 555 666",
    role: "Kỹ thuật viên",
    area: "Thủ Đức",
    city: "Hồ Chí Minh",
    status: "active",
    tone: "violet",
  },
  {
    id: "NV008",
    name: "Phan Mỹ Duyên",
    email: "myduyen@smartpark.vn",
    phone: "0944 666 777",
    role: "Nhân viên vận hành",
    area: "Ngũ Hành Sơn",
    city: "Đà Nẵng",
    status: "active",
    tone: "rose",
  },
];

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
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

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

  const handleSaveEmployee = (employeeData) => {
    if (employeeData.id) {
      // Cập nhật nhân viên hiện có
      setEmployees((prev) =>
        prev.map((item) => (item.id === employeeData.id ? employeeData : item))
      );
    } else {
      // Thêm nhân viên mới: Tạo mã NV tiếp theo
      const maxIdNum = employees.reduce((max, emp) => {
        const num = parseInt(emp.id.replace(/\D/g, ""), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      const newId = `NV${String(maxIdNum + 1).padStart(3, "0")}`;

      const newEmployee = {
        ...employeeData,
        id: newId,
      };

      setEmployees((prev) => [newEmployee, ...prev]);
    }
  };

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        const query = search.trim().toLowerCase();
        return (
          (!query ||
            `${employee.name} ${employee.id} ${employee.email}`
              .toLowerCase()
              .includes(query)) &&
          (role === "all" || employee.role === role) &&
          (status === "all" || employee.status === status)
        );
      }),
    [employees, role, search, status],
  );

  const toggleStatus = (id) =>
    setEmployees((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === "active" ? "inactive" : "active",
            }
          : item,
      ),
    );

  const columns = useMemo(
    () => [
      {
        header: "Nhân viên",
        accessor: (employee) => (
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold ${AVATAR_CLASSES[employee.tone] || "bg-slate-100 text-slate-600"}`}
            >
              {employee.name
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
          <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
            {employee.id}
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
            {employee.status === "active"
              ? "Đang hoạt động"
              : "Không hoạt động"}
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
                onClick: () => toggleStatus(employee.id),
              },
            ]}
          />
        ),
      },
    ],
    [],
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Tổng nhân viên", employees.length, "Tất cả hồ sơ"],
            [
              "Đang hoạt động",
              employees.filter((item) => item.status === "active").length,
              "Đang làm việc",
            ],
            [
              "Không hoạt động",
              employees.filter((item) => item.status === "inactive").length,
              "Hồ sơ tạm ngưng",
            ],
            [
              "Chức vụ",
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
                {[...new Set(employees.map((item) => item.role))].map(
                  (item) => (
                    <option key={item}>{item}</option>
                  ),
                )}
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
          <DataTable
            columns={columns}
            rows={filteredEmployees}
            rowKey="id"
            emptyMessage="Không tìm thấy nhân viên phù hợp."
          />
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

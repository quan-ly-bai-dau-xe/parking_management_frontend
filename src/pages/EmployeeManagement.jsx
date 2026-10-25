import { useMemo, useState } from "react";

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
    setEmployees((items) => items.filter((item) => item.id !== id));
  const deleteEmployee = (id) =>
    setEmployees((items) => items.filter((item) => item.id !== id));

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-6 text-slate-800 sm:px-6 lg:px-10">
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                <tr>
                  {[
                    "Nhân viên",
                    "Mã NV",
                    "Chức vụ",
                    "Liên hệ",
                    "Khu vực",
                    "Trạng thái",
                    "Thao tác",
                  ].map((item) => (
                    <th key={item} className="px-3 py-3 font-semibold">
                      {item}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold ${AVATAR_CLASSES[employee.tone]}`}
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
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                        {employee.id}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {employee.role}
                    </td>
                    <td className="px-3 py-3">
                      <span className="block text-slate-600">
                        {employee.phone}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {employee.email}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="block text-slate-600">
                        {employee.area}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {employee.city}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${employee.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {employee.status === "active"
                          ? "Đang hoạt động"
                          : "Không hoạt động"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 text-slate-400">
                        <button
                          type="button"
                          title="Sửa nhân viên"
                          onClick={() => alert(`Sửa ${employee.name}`)}
                          className="cursor-pointer hover:text-blue-600"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          title="Đổi trạng thái"
                          onClick={() => toggleStatus(employee.id)}
                          className="cursor-pointer hover:text-rose-600"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M18 8A6 6 0 016 8m0 0V4m0 4h4m-4 4a6 6 0 0012 0m0 0v4m0-4h-4"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredEmployees.length === 0 && (
            <p className="px-4 py-10 text-center text-xs text-slate-400">
              Không tìm thấy nhân viên phù hợp.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

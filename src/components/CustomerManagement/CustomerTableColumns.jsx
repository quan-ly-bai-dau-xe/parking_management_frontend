import React from "react";
import { TableActions } from "../common";

export const getCustomerColumns = ({ onEdit, onDeleteClick }) => [
  {
    header: "Mã khách hàng",
    accessor: "customerCode",
    renderCell: (row) => (
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-slate-800">{row.customerCode}</span>
        {row.isTestSample && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            MẪU TEST
          </span>
        )}
      </div>
    ),
  },
  {
    header: "Tên khách hàng",
    accessor: "name",
    renderCell: (row) => (
      <div>
        <span className="font-medium text-slate-900">{row.name}</span>
        {row.isTestSample && (
          <p className="text-[10px] text-amber-600 font-normal">
            (Dữ liệu mẫu - Không vướng xe/vé - Xóa được)
          </p>
        )}
      </div>
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
    header: "Phương tiện",
    accessor: "vehiclesCount",
    align: "center",
    renderCell: (row) => {
      const count = row.vehiclesCount ?? (row.vehicles ? row.vehicles.length : 0);
      const plates = (row.vehicles || []).map((v) => v.licensePlate).filter(Boolean);

      if (count === 0) {
        return (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200"
            title="Khách hàng chưa đăng ký phương tiện"
          >
            0 xe
          </span>
        );
      }

      return (
        <div className="inline-flex flex-col items-center gap-0.5">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
            title={`Biển số: ${plates.join(", ") || "Xem chi tiết dòng"}`}
          >
            <span>🚗</span>
            <span>{count} xe</span>
          </span>
          {plates.length > 0 && (
            <span
              className="text-[10px] font-mono text-slate-500 max-w-[110px] truncate"
              title={plates.join(", ")}
            >
              {plates[0]}
              {plates.length > 1 ? ` (+${plates.length - 1})` : ""}
            </span>
          )}
        </div>
      );
    },
  },
  {
    header: "Gói vé đăng ký",
    accessor: "packageType",
    renderCell: (row) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
        {row.packageType || "Vé tháng"}
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
      if (
        status === "Tạm khóa" ||
        status === "Tạm ngưng" ||
        status === "Danh sách đen"
      ) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border bg-rose-50 text-rose-700 border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {status}
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
    renderCell: (row) => {
      const isDeletable = row.canDelete !== false;
      const deleteTitle = isDeletable
        ? "Xóa khách hàng"
        : `Bị chặn bởi quy tắc DEL-02: Đang có ${row.vehiclesCount ?? 0} xe đăng ký hoặc vé hiệu lực. Nhấn để xem chi tiết cách xử lý.`;

      return (
        <TableActions
          actions={[
            {
              label: "Sửa",
              icon: "edit",
              onClick: () => onEdit(row),
            },
            {
              label: "Xóa",
              icon: "delete",
              disabled: false,
              title: deleteTitle,
              className: isDeletable
                ? "text-rose-600 hover:text-rose-800 cursor-pointer"
                : "text-amber-600/70 hover:text-amber-700 cursor-pointer",
              onClick: () => onDeleteClick(row, isDeletable),
            },
          ]}
        />
      );
    },
  },
];

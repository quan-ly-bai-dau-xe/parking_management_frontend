import React, { useRef, useState, useEffect } from "react";

/**
 * CustomerSelectCombobox
 * Component lựa chọn chủ sở hữu (Khách hàng) cho phương tiện dạng Searchable Combobox.
 * Hỗ trợ tìm kiếm nhanh theo mã, tên, SĐT, CCCD, phân tách concerns độc lập khỏi EditVehicleModal.
 */
export default function CustomerSelectCombobox({
  customers = [],
  selectedCustomer = null,
  isAddingNew = false,
  onSelectCustomer,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCustomers = React.useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase().trim();
    return customers.filter((c) => {
      const code = String(c.customerCode || c.code || `KH${String(c.id).padStart(4, "0")}`).toLowerCase();
      const name = String(c.name || c.full_name || "").toLowerCase();
      const phone = String(c.phone || "");
      const cccd = String(c.identity_card_number || c.idNumber || "");
      return code.includes(term) || name.includes(term) || phone.includes(term) || cccd.includes(term);
    });
  }, [customers, searchTerm]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-2xs font-semibold text-slate-500">
          Chủ sở hữu (Khách hàng) {isAddingNew && <span className="text-rose-500">*</span>}
        </label>
        {customers.length > 0 && (
          <span className="text-3xs text-slate-400">
            {customers.length} khách hàng
          </span>
        )}
      </div>

      {selectedCustomer ? (
        <div className="flex items-center justify-between p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-blue-900 truncate">
                {selectedCustomer.name || selectedCustomer.full_name}
              </span>
              <span className="px-1.5 py-0.5 rounded text-3xs font-mono font-bold bg-blue-100 text-blue-700">
                {selectedCustomer.customerCode || selectedCustomer.code || `KH${String(selectedCustomer.id).padStart(4, "0")}`}
              </span>
            </div>
            <div className="text-2xs text-blue-600 mt-0.5">
              SĐT: {selectedCustomer.phone || "Chưa có"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectCustomer(null);
              setSearchTerm("");
              setIsOpen(true);
            }}
            className="px-2 py-1 text-2xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded shadow-2xs transition-colors shrink-0 cursor-pointer"
            title="Thay đổi khách hàng khác"
          >
            Thay đổi
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT hoặc mã KH..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="w-full text-xs pl-8 pr-8 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg
              className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {isOpen && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto divide-y divide-slate-100">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => {
                  const code = c.customerCode || c.code || `KH${String(c.id).padStart(4, "0")}`;
                  const name = c.name || c.full_name;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        onSelectCustomer(c);
                        setIsOpen(false);
                        setSearchTerm("");
                      }}
                      className="p-2.5 hover:bg-blue-50/70 cursor-pointer transition-colors flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {name}
                        </div>
                        <div className="text-2xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-blue-600 font-semibold">{code}</span>
                          {c.phone && <span>· SĐT: {c.phone}</span>}
                        </div>
                      </div>
                      <span className="text-2xs text-blue-600 font-medium shrink-0">
                        Chọn
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-3 text-center text-xs text-slate-400">
                  Không tìm thấy khách hàng nào với "{searchTerm}"
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

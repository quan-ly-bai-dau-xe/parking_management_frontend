import { useState, useMemo, useCallback } from "react";
import {
  Download,
  Plus,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { PageHeader, Button, EmptyState, LoadingSpinner } from "../components/common";
import { ConfirmModal } from "../components/common/modal";
import { useToast } from "../context/ToastContext";
import { useParkingLot } from "../hooks/useParkingLot";
import { getStatusText } from "../services/parkingLotService";
import {
  ParkingLotStatsCards,
  ParkingLotFilters,
  ParkingSlotMatrix,
  ParkingSlotListView,
  SlotDetailPanel,
  ParkingLotStructureAndActivity,
  EditSlotModal,
  AddSlotModal,
  StructureModal,
} from "../components/ParkingLotManagement";
import { INITIAL_STRUCTURE_LIST } from "../constants/parkingLotConstants";

export default function ParkingLotManagement() {
  const toast = useToast();

  // 1. Quản lý trạng thái bộ lọc
  const [selectedFloor, setSelectedFloor] = useState("B1");
  const [selectedZone, setSelectedZone] = useState("A");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("");

  // 2. Quản lý chế độ xem (Matrix View vs List View)
  const [viewMode, setViewMode] = useState("matrix");

  // 3. Quản lý cấu trúc bãi ở chân trang
  const [structureList, setStructureList] = useState(INITIAL_STRUCTURE_LIST);

  // 4. Quản lý modal thao tác ô đỗ xe & cấu trúc
  const [isEditSlotModalOpen, setIsEditSlotModalOpen] = useState(false);
  const [isAddSlotModalOpen, setIsAddSlotModalOpen] = useState(false);
  const [isDeleteSlotModalOpen, setIsDeleteSlotModalOpen] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState(null);

  const [structureModalConfig, setStructureModalConfig] = useState({
    isOpen: false,
    mode: "add_floor",
    initialData: null,
  });
  const [deleteStructureTarget, setDeleteStructureTarget] = useState(null);

  // 5. Kết nối hook Backend API thực tế (STRICT API MODE: Không fallback về mock)
  const { slots, isLoading, error, refetch, updateSlotStatus } = useParkingLot({
    floor: selectedFloor,
    zone: selectedZone,
  });

  // 5b. Quản lý danh sách ô đỗ reactive tại client (đồng bộ từ API theo chuẩn React)
  const [prevSlots, setPrevSlots] = useState(slots);
  const [localSlots, setLocalSlots] = useState(slots || []);

  if (slots !== prevSlots) {
    setPrevSlots(slots);
    setLocalSlots(slots || []);
  }

  // 6. Quản lý ô đỗ đang được chọn xem chi tiết
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Tự động đồng bộ slot được chọn khi danh sách localSlots thay đổi
  const activeSelectedSlot = useMemo(() => {
    if (selectedSlot) {
      const selectedId = String(
        selectedSlot.id || selectedSlot.code || selectedSlot.label || ""
      );
      // Tìm xem slot đã chọn có tồn tại trong danh sách localSlots hiện tại không
      const matched = localSlots.find(
        (s) =>
          (s.id && String(s.id) === selectedId) ||
          (s.label && String(s.label) === selectedId) ||
          (s.code && String(s.code) === selectedId) ||
          (s.slotId && String(s.slotId) === selectedId)
      );
      if (matched) {
        return {
          id: String(matched.label || matched.code || matched.id),
          slotId: String(matched.slotId || matched.id),
          status: matched.status,
          statusText: matched.statusText || getStatusText(matched.status),
          parkingLot: matched.parkingLot || "Bãi xe Smart Mobility",
          floor: matched.floor || selectedFloor,
          zone: matched.zone || selectedZone,
          licensePlate: matched.plate || matched.licensePlate || "—",
          vehicleType: matched.type === "PRIORITY" ? "Xe ưu tiên" : "Ô tô",
          reservedBy:
            matched.reservedBy ||
            (matched.reservedTime ? `Khách đặt lúc ${matched.reservedTime}` : "—"),
          note: matched.note || matched.notes || "—",
        };
      }
      return selectedSlot;
    }

    if (localSlots.length > 0) {
      const first = localSlots[0];
      return {
        id: String(first.label || first.code || first.id),
        slotId: String(first.slotId || first.id),
        status: first.status,
        statusText: first.statusText || getStatusText(first.status),
        parkingLot: first.parkingLot || "Bãi xe Smart Mobility",
        floor: first.floor || selectedFloor,
        zone: first.zone || selectedZone,
        licensePlate: first.plate || first.licensePlate || "—",
        vehicleType: first.type === "PRIORITY" ? "Xe ưu tiên" : "Ô tô",
        reservedBy:
          first.reservedBy ||
          (first.reservedTime ? `Khách đặt lúc ${first.reservedTime}` : "—"),
        note: first.note || first.notes || "—",
      };
    }

    return null;
  }, [selectedSlot, localSlots, selectedFloor, selectedZone]);

  // 7. Thống kê nhanh từ dữ liệu thực tế (dựa trên localSlots)
  const stats = useMemo(() => {
    const total = localSlots.length;
    const available = localSlots.filter((s) => s.status === "AVAILABLE").length;
    const occupied = localSlots.filter((s) => s.status === "OCCUPIED").length;
    const reservedOrMaint = localSlots.filter(
      (s) => s.status === "RESERVED" || s.status === "MAINTENANCE"
    ).length;
    return { total, available, occupied, reservedOrMaint };
  }, [localSlots]);

  // 8. Lọc ô đỗ xe theo điều kiện tìm kiếm và tiêu chí lọc
  const matchesFilter = useCallback(
    (slot) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchLabel = String(slot.label || slot.code || slot.id || "")
          .toLowerCase()
          .includes(q);
        const matchPlate = String(slot.plate || slot.licensePlate || "")
          .toLowerCase()
          .includes(q);
        if (!matchLabel && !matchPlate) return false;
      }
      if (statusFilter && slot.status !== statusFilter) {
        return false;
      }
      if (vehicleTypeFilter) {
        if (vehicleTypeFilter === "PRIORITY" && slot.type !== "PRIORITY") return false;
        if (vehicleTypeFilter === "STANDARD" && slot.type !== "STANDARD") return false;
      }
      return true;
    },
    [searchQuery, statusFilter, vehicleTypeFilter]
  );

  const filteredSlots = useMemo(() => {
    return localSlots.filter(matchesFilter);
  }, [localSlots, matchesFilter]);

  // Phân chia theo dãy A, B và C cho Matrix View
  const { rowASlots, rowBSlots, rowCSlots } = useMemo(() => {
    const a = localSlots.filter(
      (s) =>
        s.row === "A" ||
        (!s.row && String(s.label || s.code || "").startsWith("A"))
    );
    const b = localSlots.filter(
      (s) =>
        s.row === "B" ||
        (!s.row && String(s.label || s.code || "").startsWith("B"))
    );
    const c = localSlots.filter(
      (s) =>
        s.row === "C" ||
        (!s.row && String(s.label || s.code || "").startsWith("C"))
    );

    // Fallback linh hoạt nếu cấu trúc ô không đặt tên theo tiền tố A/B/C
    if (a.length === 0 && b.length === 0 && c.length === 0 && localSlots.length > 0) {
      const mid = Math.ceil(localSlots.length / 2);
      return {
        rowASlots: localSlots.slice(0, mid),
        rowBSlots: localSlots.slice(mid),
        rowCSlots: [],
      };
    }
    return { rowASlots: a, rowBSlots: b, rowCSlots: c };
  }, [localSlots]);

  // 9. Đặt lại toàn bộ bộ lọc
  const handleResetFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("");
    setVehicleTypeFilter("");
    setSelectedFloor("B1");
    setSelectedZone("A");
  }, []);

  // 10. Chọn ô đỗ
  const handleSelectSlot = useCallback(
    (slot) => {
      if (!slot) return;
      const slotIdStr = String(slot.label || slot.code || slot.id || "");
      setSelectedSlot({
        id: slotIdStr,
        slotId: String(slot.slotId || slot.id || slotIdStr),
        status: slot.status,
        statusText: slot.statusText || getStatusText(slot.status),
        parkingLot: slot.parkingLot || "Bãi xe Smart Mobility",
        floor: slot.floor || selectedFloor,
        zone: slot.zone || selectedZone,
        licensePlate: slot.plate || slot.licensePlate || "—",
        vehicleType: slot.type === "PRIORITY" ? "Xe ưu tiên" : "Ô tô",
        reservedBy:
          slot.reservedBy ||
          (slot.reservedTime ? `Khách đặt lúc ${slot.reservedTime}` : "—"),
        note: slot.note || slot.notes || "—",
      });
    },
    [selectedFloor, selectedZone]
  );

  // 11. Cập nhật nhanh trạng thái ô đỗ
  const handleUpdateSlotStatus = useCallback(
    async (slot, newStatus) => {
      const slotId = slot?.id || slot?.slotId || slot?.label || slot?.code;
      const res = await updateSlotStatus(slotId, newStatus);
      const statusText = getStatusText(newStatus);

      if (res?.success) {
        setLocalSlots((prev) =>
          prev.map((s) => {
            const sId = String(s.id || s.slotId || s.label || s.code || "");
            if (sId === String(slotId)) {
              return {
                ...s,
                status: newStatus,
                statusText,
                ...(newStatus === "AVAILABLE"
                  ? { licensePlate: "—", plate: null, reservedBy: "—" }
                  : {}),
              };
            }
            return s;
          })
        );

        setSelectedSlot((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                statusText,
                ...(newStatus === "AVAILABLE"
                  ? { licensePlate: "—", reservedBy: "—" }
                  : {}),
              }
            : null
        );

        toast.success(
          `Đã cập nhật trạng thái ô ${slot.label || slotId} thành "${statusText}".`
        );
      } else {
        toast.error(
          res?.error || `Không thể cập nhật trạng thái ô ${slot.label || slotId}.`
        );
      }
    },
    [updateSlotStatus, toast]
  );

  // 12. Chỉnh sửa chi tiết ô đỗ
  const handleOpenEditSlot = useCallback(
    (slot) => {
      handleSelectSlot(slot);
      setIsEditSlotModalOpen(true);
    },
    [handleSelectSlot]
  );

  const handleSaveEditSlot = useCallback(
    (updatedSlot) => {
      const targetId = String(
        updatedSlot.id || updatedSlot.code || updatedSlot.label || updatedSlot.slotId || ""
      );
      const statusText = updatedSlot.statusText || getStatusText(updatedSlot.status);
      const normalizedUpdated = {
        ...updatedSlot,
        id: targetId,
        statusText,
        licensePlate: updatedSlot.licensePlate || updatedSlot.plate || "—",
        plate: updatedSlot.plate || (updatedSlot.licensePlate !== "—" ? updatedSlot.licensePlate : null),
      };

      setLocalSlots((prev) =>
        prev.map((s) => {
          const sId = String(s.id || s.code || s.label || s.slotId || "");
          return sId === targetId ? { ...s, ...normalizedUpdated } : s;
        })
      );
      handleSelectSlot(normalizedUpdated);
      toast.success(
        `Đã lưu thay đổi cho ô đỗ ${updatedSlot.label || updatedSlot.id}.`
      );
    },
    [handleSelectSlot, toast]
  );

  // 13. Xóa ô đỗ xe
  const handleOpenDeleteSlot = useCallback((slot) => {
    setSlotToDelete(slot);
    setIsDeleteSlotModalOpen(true);
  }, []);

  const handleConfirmDeleteSlot = useCallback(() => {
    if (!slotToDelete) return;
    const targetId = String(
      slotToDelete.label || slotToDelete.code || slotToDelete.id || slotToDelete.slotId || ""
    );

    setLocalSlots((prev) =>
      prev.filter(
        (s) =>
          String(s.label || s.code || s.id || s.slotId || "") !== targetId
      )
    );

    if (String(activeSelectedSlot?.id) === targetId) {
      setSelectedSlot(null);
    }

    setIsDeleteSlotModalOpen(false);
    setSlotToDelete(null);
    toast.success(`Đã xóa thành công ô đỗ ${targetId}.`);
  }, [slotToDelete, activeSelectedSlot, toast]);

  // 14. Thêm ô đỗ xe mới
  const handleAddSlot = useCallback(
    (newSlot) => {
      const codeStr = String(newSlot.code || newSlot.id || "").toUpperCase();
      const formattedSlot = {
        ...newSlot,
        id: codeStr,
        slotId: codeStr,
        code: codeStr,
        label: codeStr,
        row: newSlot.row || (codeStr.includes("-") ? codeStr.split("-")[0] : "A"),
        status: newSlot.status || "AVAILABLE",
        statusText: newSlot.statusText || getStatusText(newSlot.status || "AVAILABLE"),
        licensePlate: newSlot.licensePlate || newSlot.plate || "—",
        plate: newSlot.plate || null,
      };

      setLocalSlots((prev) => [formattedSlot, ...prev]);
      handleSelectSlot(formattedSlot);
      toast.success(
        `Đã thêm ô đỗ ${formattedSlot.code} vào Khu ${formattedSlot.zone} - Tầng ${formattedSlot.floor}.`
      );
    },
    [handleSelectSlot, toast]
  );

  // 15. Xuất báo cáo sơ đồ bãi xe (Genuine CSV Export)
  const handleExportReport = useCallback(() => {
    if (localSlots.length === 0) {
      toast.warning("Không có dữ liệu ô đỗ để xuất báo cáo.");
      return;
    }

    const headers = [
      "Mã ô",
      "Tầng",
      "Khu vực",
      "Dãy",
      "Loại ô",
      "Trạng thái",
      "Biển số xe",
      "Thời gian / Ghi chú",
    ];

    const rows = localSlots.map((s) => [
      s.label || s.code || s.id,
      s.floor || selectedFloor,
      s.zone || selectedZone,
      s.row || "—",
      s.type === "PRIORITY" ? "Xe ưu tiên" : "Ô tô tiêu chuẩn",
      s.statusText || getStatusText(s.status),
      s.plate || s.licensePlate || "",
      s.duration || s.reservedTime || s.note || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [
        headers.join(","),
        ...rows.map((row) =>
          row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `bao-cao-so-do-bai-xe-${selectedFloor}-${selectedZone}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(
      `Đã xuất báo cáo ${localSlots.length} ô đỗ Tầng ${selectedFloor} - Khu ${selectedZone} thành công.`
    );
  }, [localSlots, selectedFloor, selectedZone, toast]);

  // 16. Thao tác cấu trúc bãi xe
  const handleOpenAddFloor = useCallback(() => {
    setStructureModalConfig({
      isOpen: true,
      mode: "add_floor",
      initialData: null,
    });
  }, []);

  const handleOpenAddZone = useCallback(() => {
    setStructureModalConfig({
      isOpen: true,
      mode: "add_zone",
      initialData: null,
    });
  }, []);

  const handleSaveStructureItem = useCallback(
    (itemData) => {
      if (structureModalConfig.mode === "edit_item") {
        setStructureList((prev) =>
          prev.map((it) =>
            it === structureModalConfig.initialData
              ? { ...it, name: itemData.name }
              : it
          )
        );
        toast.success(`Đã cập nhật danh mục "${itemData.name}".`);
      } else {
        setStructureList((prev) => [...prev, itemData]);
        toast.success(
          `Đã thêm ${itemData.type} "${itemData.name}" vào cấu trúc bãi xe.`
        );
      }
    },
    [structureModalConfig, toast]
  );

  const handleEditStructure = useCallback((item) => {
    setStructureModalConfig({
      isOpen: true,
      mode: "edit_item",
      initialData: item,
    });
  }, []);

  const handleDeleteStructure = useCallback((item) => {
    setDeleteStructureTarget(item);
  }, []);

  const handleConfirmDeleteStructure = useCallback(() => {
    if (!deleteStructureTarget) return;
    setStructureList((prev) =>
      prev.filter((it) => it !== deleteStructureTarget)
    );
    toast.success(`Đã xóa ${deleteStructureTarget.name} khỏi cấu trúc bãi.`);
    setDeleteStructureTarget(null);
  }, [deleteStructureTarget, toast]);

  return (
    <div className="space-y-6">
      {/* 1. Tiêu đề trang & các action buttons chuẩn Lucide Icons */}
      <PageHeader
        title="Sơ đồ bãi đậu xe"
        description="Theo dõi sức chứa, trạng thái từng ô và quản lý cấu trúc bãi đỗ"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="w-3.5 h-3.5 text-slate-500" />}
              onClick={handleExportReport}
              className="cursor-pointer"
            >
              Xuất báo cáo
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5 text-slate-500" />}
              onClick={handleOpenAddFloor}
              className="cursor-pointer"
            >
              Thêm tầng
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5 text-slate-500" />}
              onClick={handleOpenAddZone}
              className="cursor-pointer"
            >
              Thêm khu
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsAddSlotModalOpen(true)}
              className="cursor-pointer"
            >
              Thêm ô đỗ xe
            </Button>
          </div>
        }
      />

      {/* 2. Error Alert Banner khi Backend API gặp sự cố (STRICT API MODE) */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-900">
                Lỗi kết nối API máy chủ (/api/v1/parking/slots/)
              </h4>
              <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                {error}
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            icon={
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
            }
            onClick={refetch}
            disabled={isLoading}
            className="cursor-pointer shrink-0"
          >
            Thử lại
          </Button>
        </div>
      )}

      {/* 3. Thanh công cụ tìm kiếm, bộ lọc & chuyển đổi chế độ xem */}
      <ParkingLotFilters
        selectedFloor={selectedFloor}
        setSelectedFloor={setSelectedFloor}
        selectedZone={selectedZone}
        setSelectedZone={setSelectedZone}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        vehicleTypeFilter={vehicleTypeFilter}
        setVehicleTypeFilter={setVehicleTypeFilter}
        onResetFilters={handleResetFilters}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* 4. Hàng 4 thẻ thống kê nhanh (Metric Cards) */}
      <ParkingLotStatsCards stats={stats} />

      {/* 5. Khu vực trung tâm: Sơ đồ ma trận / Bảng danh sách & Panel chi tiết */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-9">
          {isLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-16 flex flex-col items-center justify-center text-center shadow-2xs">
              <LoadingSpinner size="lg" />
              <p className="mt-3 text-sm text-slate-500">
                Đang tải dữ liệu ô đỗ xe từ máy chủ...
              </p>
            </div>
          ) : error && localSlots.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs">
              <EmptyState
                title="Không thể tải dữ liệu sơ đồ ô đỗ xe"
                description="Endpoint máy chủ backend hiện chưa khả dụng hoặc trả về lỗi. Hệ thống tuân thủ chế độ không sử dụng dữ liệu giả (mock fallback)."
                icon={<AlertCircle className="w-10 h-10 text-rose-400" />}
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                    onClick={refetch}
                    className="cursor-pointer"
                  >
                    Tải lại sơ đồ
                  </Button>
                }
              />
            </div>
          ) : viewMode === "list" ? (
            <ParkingSlotListView
              slots={filteredSlots}
              selectedSlot={activeSelectedSlot}
              onSelectSlot={handleSelectSlot}
              onEditSlot={handleOpenEditSlot}
              onDeleteSlot={handleOpenDeleteSlot}
              selectedFloor={selectedFloor}
              selectedZone={selectedZone}
            />
          ) : (
            <ParkingSlotMatrix
              stats={stats}
              rowASlots={rowASlots}
              rowBSlots={rowBSlots}
              rowCSlots={rowCSlots}
              selectedSlot={activeSelectedSlot}
              onSelectSlot={handleSelectSlot}
              matchesFilter={matchesFilter}
            />
          )}
        </div>

        <div className="lg:col-span-3">
          <SlotDetailPanel
            selectedSlot={activeSelectedSlot}
            setSelectedSlot={setSelectedSlot}
            onUpdateStatus={handleUpdateSlotStatus}
            onEditSlot={handleOpenEditSlot}
            onDeleteSlot={handleOpenDeleteSlot}
          />
        </div>
      </div>

      {/* 6. Chân trang: Cấu trúc bãi & Hoạt động gần đây */}
      <ParkingLotStructureAndActivity
        structureList={structureList}
        onConfigureStructure={handleOpenAddFloor}
        onEditStructure={handleEditStructure}
        onDeleteStructure={handleDeleteStructure}
      />

      {/* 7. Các modals hỗ trợ thao tác người dùng */}
      <EditSlotModal
        isOpen={isEditSlotModalOpen}
        onClose={() => setIsEditSlotModalOpen(false)}
        slot={activeSelectedSlot}
        onSave={handleSaveEditSlot}
      />

      <AddSlotModal
        isOpen={isAddSlotModalOpen}
        onClose={() => setIsAddSlotModalOpen(false)}
        selectedFloor={selectedFloor}
        selectedZone={selectedZone}
        onAdd={handleAddSlot}
      />

      <ConfirmModal
        isOpen={isDeleteSlotModalOpen}
        onClose={() => setIsDeleteSlotModalOpen(false)}
        title="Xác nhận xóa ô đỗ xe"
        description={`Bạn có chắc chắn muốn xóa ô đỗ ${
          slotToDelete?.label || slotToDelete?.code || slotToDelete?.id || ""
        }? Thao tác này không thể hoàn tác.`}
        variant="error"
        confirmText="Xóa ô đỗ"
        cancelText="Hủy"
        onConfirm={handleConfirmDeleteSlot}
      />

      <StructureModal
        isOpen={structureModalConfig.isOpen}
        onClose={() =>
          setStructureModalConfig((prev) => ({ ...prev, isOpen: false }))
        }
        mode={structureModalConfig.mode}
        initialData={structureModalConfig.initialData}
        onSave={handleSaveStructureItem}
      />

      <ConfirmModal
        isOpen={Boolean(deleteStructureTarget)}
        onClose={() => setDeleteStructureTarget(null)}
        title="Xác nhận xóa hạng mục cấu trúc"
        description={`Bạn có chắc chắn muốn xóa ${deleteStructureTarget?.name} khỏi danh mục cấu trúc bãi xe?`}
        variant="error"
        confirmText="Xóa hạng mục"
        cancelText="Hủy"
        onConfirm={handleConfirmDeleteStructure}
      />
    </div>
  );
}

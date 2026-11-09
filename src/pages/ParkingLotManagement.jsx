import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const floorParam = searchParams.get("floor");
  const zoneParam = searchParams.get("zone");
  const slotParam = searchParams.get("slot");
  const filterParam = searchParams.get("filter");

  const [selectedFloor, setSelectedFloor] = useState(floorParam || "B1");
  const [selectedZone, setSelectedZone] = useState(zoneParam || "A");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    filterParam === "overstay" ? "OVERSTAY" : ""
  );
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("");

  // Tự động đồng bộ URL params khi query string thay đổi
  useEffect(() => {
    if (floorParam && floorParam !== selectedFloor) {
      setSelectedFloor(floorParam);
    }
    if (zoneParam && zoneParam !== selectedZone) {
      setSelectedZone(zoneParam);
    }
    if (filterParam === "overstay") {
      setStatusFilter("OVERSTAY");
    }
  }, [floorParam, zoneParam, filterParam]);

  // 2. Quản lý chế độ xem (Matrix View vs List View)
  const [viewMode, setViewMode] = useState("matrix");

  // 3. Quản lý cấu trúc bãi ở chân trang (Single Source of Truth cho tầng & phân khu)
  const [structureList, setStructureList] = useState(INITIAL_STRUCTURE_LIST);

  // 3b. Derive floorOptions và zoneOptions từ structureList
  const floorOptions = useMemo(() => {
    const floors = structureList.filter((item) => item.type === "Tầng");
    if (floors.length === 0) return [{ value: "B1", label: "Tầng B1" }];
    return floors.map((f) => ({
      value: f.code || f.name.replace(/^Tầng\s*/i, ""),
      label: f.name,
    }));
  }, [structureList]);

  const zoneOptions = useMemo(() => {
    const zones = structureList.filter((item) => item.type === "Khu");
    if (zones.length === 0) return [{ value: "A", label: "Khu A" }];
    return zones.map((z) => ({
      value: z.code || z.name.replace(/^Khu\s*/i, ""),
      label: z.name,
    }));
  }, [structureList]);

  // 3c. Tự động chuyển floor/zone đang chọn nếu bị xóa khỏi cấu trúc bãi
  useEffect(() => {
    if (floorOptions.length > 0 && !floorOptions.some((f) => f.value === selectedFloor)) {
      setSelectedFloor(floorOptions[0].value);
    }
  }, [floorOptions, selectedFloor]);

  useEffect(() => {
    if (zoneOptions.length > 0 && !zoneOptions.some((z) => z.value === selectedZone)) {
      setSelectedZone(zoneOptions[0].value);
    }
  }, [zoneOptions, selectedZone]);

  // Đặt lại ô đang chọn khi chuyển tầng hoặc khu vực để panel chi tiết cập nhật chuẩn theo tầng/khu mới
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedFloor, selectedZone]);

  // 4. Quản lý modal thao tác ô đỗ xe & cấu trúc
  const [isEditSlotModalOpen, setIsEditSlotModalOpen] = useState(false);
  const [isAddSlotModalOpen, setIsAddSlotModalOpen] = useState(false);
  const [isDeleteSlotModalOpen, setIsDeleteSlotModalOpen] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState(null);

  // 4b. Quản lý nhật ký hoạt động gần đây tại chân trang
  const [activities, setActivities] = useState([
    {
      id: "act-1",
      color: "bg-blue-500",
      text: "Khởi tạo sơ đồ bãi xe Smart Mobility thành công.",
    },
    {
      id: "act-2",
      color: "bg-emerald-500",
      text: "Khu A - Tầng B1 đã hoàn tất tải dữ liệu ô đỗ xe.",
    },
    {
      id: "act-3",
      color: "bg-amber-500",
      text: "Ô A-04 được xác nhận đặt trước bởi khách hàng VIP.",
    },
  ]);

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

  // Tự động chọn ô đỗ khi URL truyền slot parameter (ví dụ từ liên kết thông báo)
  useEffect(() => {
    if (slotParam && localSlots.length > 0) {
      const target = localSlots.find(
        (s) =>
          String(s.code || s.label || s.id || s.slotId).toUpperCase() ===
          slotParam.toUpperCase()
      );
      if (target) {
        setSelectedSlot(target);
      }
    }
  }, [slotParam, localSlots]);

  // 7. Thống kê nhanh từ dữ liệu thực tế (dựa trên localSlots)
  const stats = useMemo(() => {
    const total = localSlots.length;
    const available = localSlots.filter((s) => s.status === "AVAILABLE").length;
    const occupied = localSlots.filter((s) => s.status === "OCCUPIED").length;
    const reservedOrMaint = localSlots.filter(
      (s) => s.status === "RESERVED" || s.status === "MAINTENANCE"
    ).length;
    const overstayCount = localSlots.filter((s) => s.isOverstay).length;
    return { total, available, occupied, reservedOrMaint, overstayCount };
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
      if (statusFilter === "OVERSTAY") {
        if (!slot.isOverstay) return false;
      } else if (statusFilter && slot.status !== statusFilter) {
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

  // Phân chia theo dãy và nhãn cho Matrix View (Đồng bộ chuẩn 3 dãy x 8 ô cho mọi tầng/khu)
  const { rowASlots, rowBSlots, rowCSlots, rowLabels } = useMemo(() => {
    if (localSlots.length === 0) {
      return {
        rowASlots: [],
        rowBSlots: [],
        rowCSlots: [],
        rowLabels: {
          a: `DÃY 1: ${selectedZone}-01 - ${selectedZone}-08 (XE Ô TÔ TIÊU CHUẨN)`,
          b: `DÃY 2: ${selectedZone}-09 - ${selectedZone}-16 (XE ƯU TIÊN)`,
          c: `DÃY 3: ${selectedZone}-17 - ${selectedZone}-24 (KHU VỰC MỞ RỘNG / SẠC ĐIỆN)`,
        },
      };
    }

    // Sắp xếp các ô theo số thứ tự để đảm bảo luôn hiển thị đúng trật tự từ 1 đến N
    const sorted = [...localSlots].sort((x, y) => {
      const numX = parseInt(String(x.label || x.code || "").replace(/\D+/g, "") || "0", 10);
      const numY = parseInt(String(y.label || y.code || "").replace(/\D+/g, "") || "0", 10);
      if (numX !== numY) return numX - numY;
      return String(x.label || x.code || "").localeCompare(String(y.label || y.code || ""));
    });

    const slotsPerRow = 8;
    const rA = sorted.slice(0, slotsPerRow);
    const rB = sorted.slice(slotsPerRow, slotsPerRow * 2);
    const rC = sorted.slice(slotsPerRow * 2, slotsPerRow * 3);

    const firstA = rA[0]?.label || `${selectedZone}-01`;
    const lastA = rA[rA.length - 1]?.label || `${selectedZone}-08`;
    const firstB = rB[0]?.label || `${selectedZone}-09`;
    const lastB = rB[rB.length - 1]?.label || `${selectedZone}-16`;
    const firstC = rC[0]?.label || `${selectedZone}-17`;
    const lastC = rC[rC.length - 1]?.label || `${selectedZone}-24`;

    return {
      rowASlots: rA,
      rowBSlots: rB,
      rowCSlots: rC,
      rowLabels: {
        a: `DÃY 1: ${firstA} - ${lastA} (XE Ô TÔ TIÊU CHUẨN)`,
        b: `DÃY 2: ${firstB} - ${lastB} (XE ƯU TIÊN)`,
        c: rC.length > 0 ? `DÃY 3: ${firstC} - ${lastC} (KHU VỰC MỞ RỘNG / SẠC ĐIỆN)` : "",
      },
    };
  }, [localSlots, selectedZone]);

  // 9. Đặt lại toàn bộ bộ lọc
  const handleResetFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("");
    setVehicleTypeFilter("");
    if (floorOptions.length > 0) setSelectedFloor(floorOptions[0].value);
    if (zoneOptions.length > 0) setSelectedZone(zoneOptions[0].value);
  }, [floorOptions, zoneOptions]);

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

  // 11b. Xác nhận đã kiểm tra ô đỗ quá giờ
  const handleAcknowledgeOverstay = useCallback(
    (slot) => {
      if (!slot) return;
      const slotCode = String(slot.label || slot.code || slot.id);
      setLocalSlots((prev) =>
        prev.map((s) => {
          if (String(s.label || s.code || s.id) === slotCode) {
            return {
              ...s,
              isOverstay: false,
              overstayAcknowledged: true,
              note: s.note ? `${s.note} | Đã kiểm tra` : "Đã kiểm tra thực tế",
            };
          }
          return s;
        })
      );
      setSelectedSlot((prev) =>
        prev && String(prev.label || prev.code || prev.id) === slotCode
          ? {
              ...prev,
              isOverstay: false,
              overstayAcknowledged: true,
              note: prev.note ? `${prev.note} | Đã kiểm tra` : "Đã kiểm tra thực tế",
            }
          : prev
      );
      toast.success(
        `Đã xác nhận kiểm tra thực tế cho ô đỗ ${slotCode}. Cảnh báo quá giờ đã được xử lý.`
      );
    },
    [toast]
  );

  // 11c. Báo vi phạm ô đỗ quá giờ
  const handleReportViolation = useCallback(
    (slot) => {
      if (!slot) return;
      const plate = slot.plate || slot.licensePlate || "Chưa rõ biển số";
      const slotCode = String(slot.label || slot.code || slot.id);
      toast.warning(
        `Đã lập biên bản ghi nhận vi phạm đỗ quá giờ cho xe ${plate} tại vị trí ${slotCode}.`
      );
    },
    [toast]
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

  // Hàm hỗ trợ cuộn mượt lên vị trí sơ đồ ma trận
  const scrollToMatrixView = useCallback(() => {
    const el = document.getElementById("parking-lot-matrix-view");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleSelectFloor = useCallback(
    (floorCode) => {
      if (!floorCode) return;
      const code = String(floorCode).trim().toUpperCase();
      setSelectedFloor(code);
      scrollToMatrixView();
      toast.info(`Đang xem sơ đồ Tầng ${code}.`);
    },
    [scrollToMatrixView, toast]
  );

  const handleSelectZone = useCallback(
    (zoneCode) => {
      if (!zoneCode) return;
      const code = String(zoneCode).trim().toUpperCase();
      setSelectedZone(code);
      scrollToMatrixView();
      toast.info(`Đang xem sơ đồ Khu ${code}.`);
    },
    [scrollToMatrixView, toast]
  );

  const handleSaveStructureItem = useCallback(
    (itemData) => {
      if (structureModalConfig.mode === "edit_item") {
        setStructureList((prev) =>
          prev.map((it) =>
            it === structureModalConfig.initialData
              ? { ...it, ...itemData }
              : it
          )
        );
        toast.success(`Đã cập nhật danh mục "${itemData.name}".`);
      } else {
        setStructureList((prev) => [...prev, itemData]);

        // ĐỒNG BỘ TỨC THÌ: Chuyển ngay bộ lọc & sơ đồ sang Tầng/Khu mới tạo
        if (itemData.type === "Tầng") {
          setSelectedFloor(itemData.code);
        } else if (itemData.type === "Khu") {
          setSelectedZone(itemData.code);
        }

        setTimeout(() => {
          scrollToMatrixView();
        }, 150);

        // Ghi nhận hoạt động vào nhật ký
        setActivities((prev) => [
          {
            id: `act-${Date.now()}`,
            color: itemData.type === "Tầng" ? "bg-blue-500" : "bg-purple-500",
            text: `Đã thêm ${itemData.type} "${itemData.name}" (Mã: ${itemData.code}) vào cấu trúc bãi.`,
          },
          ...prev.slice(0, 4),
        ]);

        toast.success(
          `Đã thêm ${itemData.type} "${itemData.name}" vào cấu trúc và chuyển sơ đồ đến ${itemData.name}.`
        );
      }
    },
    [structureModalConfig, scrollToMatrixView, toast]
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

    setActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        color: "bg-rose-500",
        text: `Đã xóa ${deleteStructureTarget.name} khỏi cấu trúc bãi xe.`,
      },
      ...prev.slice(0, 4),
    ]);

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
        floorOptions={floorOptions}
        zoneOptions={zoneOptions}
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

      {/* Banner cảnh báo nhanh nếu có ô đỗ quá giờ */}
      {stats.overstayCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
            <span>
              Phát hiện <strong>{stats.overstayCount}</strong> vị trí có phương tiện đỗ quá giờ quy định (&gt;24h / 48h).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === "OVERSTAY" ? "" : "OVERSTAY")}
            className="font-bold text-amber-700 hover:text-amber-800 underline cursor-pointer"
          >
            {statusFilter === "OVERSTAY" ? "Hiển thị tất cả vị trí" : "Lọc riêng các ô quá giờ"}
          </button>
        </div>
      )}

      {/* 5. Khu vực trung tâm: Sơ đồ ma trận / Bảng danh sách & Panel chi tiết */}
      <div id="parking-lot-matrix-view" className="grid grid-cols-1 lg:grid-cols-12 gap-6 scroll-mt-6">
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
              rowLabels={rowLabels}
              selectedFloor={selectedFloor}
              selectedZone={selectedZone}
              selectedSlot={activeSelectedSlot}
              onSelectSlot={handleSelectSlot}
              matchesFilter={matchesFilter}
              onAddSlot={() => setIsAddSlotModalOpen(true)}
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
            onAcknowledgeOverstay={handleAcknowledgeOverstay}
            onReportViolation={handleReportViolation}
          />
        </div>
      </div>

      {/* 6. Chân trang: Cấu trúc bãi & Hoạt động gần đây */}
      <ParkingLotStructureAndActivity
        structureList={structureList}
        selectedFloor={selectedFloor}
        selectedZone={selectedZone}
        onSelectFloor={handleSelectFloor}
        onSelectZone={handleSelectZone}
        onConfigureStructure={handleOpenAddFloor}
        onAddFloor={handleOpenAddFloor}
        onAddZone={handleOpenAddZone}
        onEditStructure={handleEditStructure}
        onDeleteStructure={handleDeleteStructure}
        activities={activities}
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
        floorOptions={floorOptions}
        zoneOptions={zoneOptions}
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

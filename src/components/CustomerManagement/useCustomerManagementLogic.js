import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { customerService } from "../../services/customerService";

export const initialAdvancedFilters = {
  idNumber: "",
  birthday: "",
  gender: "",
};

export const initialNewCustomerState = {
  customerCode: "",
  name: "",
  phone: "",
  idNumber: "",
  birthday: "",
  email: "",
  gender: "Nam",
  status: "ACTIVE",
  packageType: "Vé tháng",
};

export function useCustomerManagementLogic(customerData, setCustomerData, toast) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCustomer, setNewCustomer] = useState(initialNewCustomerState);

  // Modal xác nhận xóa
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [customerBlockedFromDelete, setCustomerBlockedFromDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [packageFilter, setPackageFilter] = useState("");
  const [appliedAdvancedFilters, setAppliedAdvancedFilters] = useState(initialAdvancedFilters);
  const [draftFilters, setDraftFilters] = useState(initialAdvancedFilters);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [expandedRowId, setExpandedRowId] = useState(null);

  const searchInputRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
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

  const activeAdvancedCount = useMemo(() => {
    let count = 0;
    if (appliedAdvancedFilters.idNumber.trim()) count++;
    if (appliedAdvancedFilters.birthday.trim()) count++;
    if (appliedAdvancedFilters.gender) count++;
    return count;
  }, [appliedAdvancedFilters]);

  const customers = useMemo(() => {
    return customerData.filter((customer) => {
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchesCode = String(customer.customerCode ?? "").toLowerCase().includes(q);
        const matchesName = String(customer.name ?? "").toLowerCase().includes(q);
        const matchesPhone = String(customer.phone ?? "").toLowerCase().includes(q);
        const matchesEmail = String(customer.email ?? "").toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesPhone && !matchesEmail) return false;
      }

      if (statusFilter && customer.status !== statusFilter) return false;
      if (packageFilter && customer.packageType !== packageFilter) return false;

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
      if (appliedAdvancedFilters.gender && customer.gender !== appliedAdvancedFilters.gender) {
        return false;
      }

      return true;
    });
  }, [customerData, searchTerm, statusFilter, packageFilter, appliedAdvancedFilters]);

  const handleOpenPopover = () => {
    if (!isPopoverOpen) setDraftFilters({ ...appliedAdvancedFilters });
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
    setNewCustomer(initialNewCustomerState);
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
      status: customer.statusCode ?? "ACTIVE",
      packageType: customer.packageType ?? "Vé tháng",
      rowVersion: customer.rowVersion,
    });
    setShowAddModal(true);
  }, []);

  const handleDeleteClick = useCallback((row, isDeletable) => {
    if (isDeletable) {
      setCustomerToDelete(row);
    } else {
      setCustomerBlockedFromDelete(row);
    }
  }, []);

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await customerService.deleteCustomer(customerToDelete.id);
      setCustomerData((current) => {
        const newData = current.filter((c) => c.id !== customerToDelete.id);
        setCurrentPage((page) =>
          Math.min(page, Math.max(1, Math.ceil((newData.length - 1) / itemsPerPage))),
        );
        return newData;
      });
      toast.success("Xóa khách hàng thành công!");
      setCustomerToDelete(null);
    } catch (err) {
      toast.error(`Xóa khách hàng thất bại: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitCustomer = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingCustomerId) {
        const updated = await customerService.updateCustomer(editingCustomerId, newCustomer);
        setCustomerData((current) =>
          current.map((c) => (c.id === editingCustomerId ? { ...c, ...newCustomer, ...updated } : c)),
        );
        setEditingCustomerId(null);
        toast.success("Cập nhật thông tin khách hàng thành công!");
      } else {
        const created = await customerService.createCustomer({ ...newCustomer, vehicles: [] });
        setCustomerData((current) => [created, ...current]);
        toast.success("Thêm mới khách hàng thành công!");
      }
      setNewCustomer(initialNewCustomerState);
      setShowAddModal(false);
    } catch (err) {
      toast.error(`Lưu thông tin thất bại: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    showAddModal,
    setShowAddModal,
    editingCustomerId,
    setEditingCustomerId,
    isSubmitting,
    newCustomer,
    setNewCustomer,
    customerToDelete,
    setCustomerToDelete,
    customerBlockedFromDelete,
    setCustomerBlockedFromDelete,
    isDeleting,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    packageFilter,
    setPackageFilter,
    appliedAdvancedFilters,
    draftFilters,
    setDraftFilters,
    isPopoverOpen,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    expandedRowId,
    setExpandedRowId,
    searchInputRef,
    popoverRef,
    activeAdvancedCount,
    customers,
    handleOpenPopover,
    handleApplyPopover,
    handleCancelPopover,
    handleClearPopoverDraft,
    handleResetAll,
    handleOpenCreateModal,
    handleEditClick,
    handleDeleteClick,
    handleConfirmDelete,
    handleSubmitCustomer,
  };
}

import { useMemo } from "react";
import { Button, PageHeader } from "../components/common";
import {
  CustomerModal,
  CustomerFilters,
  CustomerDataTable,
  CustomerDeleteModals,
  getCustomerColumns,
  useCustomerManagementLogic,
} from "../components/CustomerManagement";
import usePagination from "../hooks/usePagination";
import useCustomerData from "../hooks/useCustomerData";
import { useToast } from "../context/ToastContext";

export default function CustomerManagement() {
  const toast = useToast();
  const { customerData, setCustomerData, isLoading, errorMessage, fetchCustomerList } =
    useCustomerData();

  const {
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
  } = useCustomerManagementLogic(customerData, setCustomerData, toast);

  const { totalPages, paginatedList } = usePagination(customers, currentPage, itemsPerPage);

  const columns = useMemo(
    () => getCustomerColumns({ onEdit: handleEditClick, onDeleteClick: handleDeleteClick }),
    [handleEditClick, handleDeleteClick],
  );

  return (
    <>
      <PageHeader
        title="Quản lý khách hàng"
        description="Quản lý danh sách khách hàng, thông tin định danh và phương tiện đăng ký."
        actions={
          <Button variant="primary" size="sm" onClick={handleOpenCreateModal} className="cursor-pointer">
            + Thêm khách hàng mới
          </Button>
        }
      />

      <CustomerFilters
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(val) => {
          setStatusFilter(val);
          setCurrentPage(1);
        }}
        packageFilter={packageFilter}
        onPackageChange={(val) => {
          setPackageFilter(val);
          setCurrentPage(1);
        }}
        appliedAdvancedFilters={appliedAdvancedFilters}
        draftFilters={draftFilters}
        onDraftFilterChange={(field, val) => setDraftFilters((prev) => ({ ...prev, [field]: val }))}
        isPopoverOpen={isPopoverOpen}
        onTogglePopover={handleOpenPopover}
        onApplyPopover={handleApplyPopover}
        onCancelPopover={handleCancelPopover}
        onClearPopover={handleClearPopoverDraft}
        onResetAll={handleResetAll}
        activeAdvancedCount={activeAdvancedCount}
        searchInputRef={searchInputRef}
        popoverRef={popoverRef}
      />

      <CustomerDataTable
        columns={columns}
        paginatedList={paginatedList}
        expandedRowId={expandedRowId}
        onRowClick={(c) => setExpandedRowId((prev) => (prev === c.id ? null : c.id))}
        onCloseExpanded={() => setExpandedRowId(null)}
        isLoading={isLoading}
        errorMessage={errorMessage}
        onRetry={fetchCustomerList}
        totalItems={customers.length}
        totalPages={totalPages}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={(val) => {
          setItemsPerPage(Number(val));
          setCurrentPage(1);
        }}
      />

      <CustomerModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingCustomerId(null);
        }}
        editingCustomerId={editingCustomerId}
        customerData={newCustomer}
        isSubmitting={isSubmitting}
        onChange={(field, val) => setNewCustomer((curr) => ({ ...curr, [field]: val }))}
        onSubmit={handleSubmitCustomer}
      />

      <CustomerDeleteModals
        customerToDelete={customerToDelete}
        onCloseDelete={() => setCustomerToDelete(null)}
        isDeleting={isDeleting}
        onConfirmDelete={handleConfirmDelete}
        customerBlockedFromDelete={customerBlockedFromDelete}
        onCloseBlocked={() => setCustomerBlockedFromDelete(null)}
      />
    </>
  );
}

import { useState, useEffect, useCallback } from "react";
import { employeeService } from "../services/employeeService.js";

/**
 * Custom hook quản lý trạng thái và tương tác dữ liệu cho màn hình Quản lý nhân viên
 */
export default function useEmployees() {
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await employeeService.getEmployees();
      setEmployees(data);

      // Đồng bộ chỉ số thống kê KPI
      try {
        const sum = await employeeService.getEmployeeSummary();
        setSummary(sum);
      } catch (sumErr) {
        console.warn("[useEmployees] Không thể lấy summary KPI:", sumErr?.message);
      }

      // Đồng bộ danh mục chức vụ nếu chưa có
      try {
        const posList = await employeeService.getPositions();
        setPositions(posList);
      } catch (posErr) {
        console.warn("[useEmployees] Không thể lấy positions:", posErr?.message);
      }
    } catch (err) {
      console.error("[useEmployees] Lỗi khi tải danh sách nhân viên:", err);
      setError(
        err?.message ||
          "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng hoặc thử lại."
      );
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function initializeEmployees() {
      try {
        const data = await employeeService.getEmployees();
        if (!ignore) {
          setEmployees(data);
          setError(null);
        }

        try {
          const sum = await employeeService.getEmployeeSummary();
          if (!ignore) setSummary(sum);
        } catch {
          // KPI summary non-critical
        }

        try {
          const posList = await employeeService.getPositions();
          if (!ignore) setPositions(posList);
        } catch {
          // Positions list non-critical
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err?.message ||
              "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng hoặc thử lại."
          );
          setEmployees([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    initializeEmployees();

    return () => {
      ignore = true;
    };
  }, []);

  const saveEmployee = useCallback(
    async (employeeData) => {
      if (employeeData.id) {
        // Cập nhật nhân viên hiện có
        const updated = await employeeService.updateEmployee(
          employeeData.id,
          employeeData
        );
        setEmployees((prev) =>
          prev.map((item) => (item.id === employeeData.id ? updated : item))
        );
        return updated;
      } else {
        // Thêm nhân viên mới
        const created = await employeeService.createEmployee(employeeData);
        setEmployees((prev) => [created, ...prev]);
        return created;
      }
    },
    []
  );

  const toggleStatus = useCallback(
    async (id) => {
      const target = employees.find((item) => item.id === id);
      if (!target) return;

      try {
        const updated = await employeeService.toggleEmployeeStatus(
          id,
          target.status,
          target.rowVersion
        );
        setEmployees((prev) =>
          prev.map((item) => (item.id === id ? updated : item))
        );
      } catch (err) {
        console.error("[useEmployees] Lỗi cập nhật trạng thái nhân viên:", err);
        throw err;
      }
    },
    [employees]
  );

  const deleteEmployee = useCallback(async (id) => {
    await employeeService.deleteEmployee(id);
    setEmployees((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    employees,
    setEmployees,
    summary,
    positions,
    loading,
    error,
    fetchEmployees,
    saveEmployee,
    toggleStatus,
    deleteEmployee,
  };
}

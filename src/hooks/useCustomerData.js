import { useState, useCallback, useEffect } from "react";
import { customerService } from "../services/customerService";

export default function useCustomerData() {
  const [customerData, setCustomerData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const fetchCustomerList = useCallback(() => {
    let isSubscribed = true;
    setIsLoading(true);
    customerService
      .getCustomers()
      .then((data) => {
        if (isSubscribed) {
          setCustomerData(data);
          setErrorMessage(null);
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          console.error("Lỗi khi tải danh sách khách hàng:", err);
          setErrorMessage(err.message || "Không thể tải danh sách khách hàng");
        }
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = fetchCustomerList();
    return cleanup;
  }, [fetchCustomerList]);

  return {
    customerData,
    setCustomerData,
    isLoading,
    errorMessage,
    fetchCustomerList,
  };
}

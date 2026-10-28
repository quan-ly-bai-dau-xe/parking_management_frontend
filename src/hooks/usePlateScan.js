import { useState, useCallback, useRef } from "react";
import * as plateScanService from "../features/plateScanService";

/**
 * Custom hook for managing plate scan operations and state
 */
export function usePlateScan() {
  const [scanResult, setScanResult] = useState(null);
  const [vehicleData, setVehicleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);

  const abortControllerRef = useRef(null);

  const cancelScan = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  }, []);

  const addToSearchHistory = useCallback((query, type = "search") => {
    const historyItem = { query, type, timestamp: new Date().toISOString() };
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item.query !== query);
      return [historyItem, ...filtered].slice(0, 10);
    });
  }, []);

  const scanImage = useCallback(
    async (imageFile, gateId = 1) => {
      cancelScan();
      setLoading(true);
      setError(null);
      setScanResult(null);
      setVehicleData(null);

      abortControllerRef.current = new AbortController();

      try {
        const result = await plateScanService.scanPlateImage(imageFile, gateId);
        setScanResult(result);
        addToSearchHistory(result.plate_number || "unknown", "scan");
        return result;
      } catch (err) {
        if (err.name === "AbortError") return null;
        setError(err.message || "Failed to scan image");
        return null;
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [cancelScan, addToSearchHistory]
  );

  const searchByPlate = useCallback(
    async (plateNumber, gateId = 1) => {
      setLoading(true);
      setError(null);

      try {
        const result = await plateScanService.lookupVehicleByPlate(plateNumber, gateId);
        addToSearchHistory(plateNumber, "search");
        return result;
      } catch (err) {
        setError(err.message || "Failed to lookup vehicle");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [addToSearchHistory]
  );

  const clearError = useCallback(() => setError(null), []);
  const reset = useCallback(() => {
    cancelScan();
    setScanResult(null);
    setVehicleData(null);
    setError(null);
  }, [cancelScan]);

  return {
    scanResult,
    vehicleData,
    loading,
    error,
    searchHistory,
    scanImage,
    searchByPlate,
    cancelScan,
    clearError,
    reset,
    addToSearchHistory,
  };
}

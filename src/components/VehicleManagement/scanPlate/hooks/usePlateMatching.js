import { useState, useCallback } from "react";
import {
  mapPlateScanToVehicle,
  matchPlateLookup,
  normalizePlate,
  parseEntryTimeToDate,
} from "../../../../services/plateScanService";

export { normalizePlate, parseEntryTimeToDate };

/**
 * usePlateMatching
 * Hook chuyên biệt quản lý tra cứu, đối soát biển số xe & open session
 * Single Source of Truth cho GateCameraControlModal và ScanPlateModal
 */
export function usePlateMatching({
  vehicles = [],
  mockVehiclesFallback = true,
  onResetBarrier = null,
  onMatchSuccess = null,
  onMatchError = null,
} = {}) {
  const [detectedPlate, setDetectedPlate] = useState("");
  const [matchedVehicle, setMatchedVehicle] = useState(null);
  const [scanDetails, setScanDetails] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [searchStatus, setSearchStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [rawLookup, setRawLookup] = useState(null);

  const handleMatchPlate = useCallback(
    async (plateInput) => {
      const rawInput = (plateInput || "").trim();
      const norm = normalizePlate(rawInput);
      if (!norm) return null;

      setIsScanning(true);
      setSearchStatus("idle");
      setErrorMessage("");
      if (onResetBarrier) onResetBarrier();

      try {
        const result = await matchPlateLookup(rawInput, {
          vehicles,
          mockVehiclesFallback,
        });

        if (result.success) {
          setMatchedVehicle(result.vehicle);
          setRawLookup(result.rawLookup);
          setSearchStatus("matched");
          setErrorMessage("");
          if (onMatchSuccess) {
            onMatchSuccess(result, rawInput);
          }
          return result;
        } else {
          setMatchedVehicle(null);
          setRawLookup(null);
          setSearchStatus("error");
          setErrorMessage(result.errorMessage);
          if (onMatchError) {
            onMatchError(result.error, result.errorMessage);
          }
          return result;
        }
      } catch (unexpectedErr) {
        const msg = unexpectedErr?.message || "Đã xảy ra lỗi không xác định khi tra cứu biển số.";
        setMatchedVehicle(null);
        setRawLookup(null);
        setSearchStatus("error");
        setErrorMessage(msg);
        if (onMatchError) {
          onMatchError(unexpectedErr, msg);
        }
        return { success: false, errorMessage: msg, error: unexpectedErr };
      } finally {
        setIsScanning(false);
      }
    },
    [vehicles, mockVehiclesFallback, onResetBarrier, onMatchSuccess, onMatchError]
  );

  const handleImageScanned = useCallback(
    (scanResult, previewUrl) => {
      if (!scanResult) return;
      const extractedPlate =
        scanResult.plate_final ||
        scanResult.best_candidate?.plate_text ||
        scanResult.plate_raw ||
        scanResult.license_plate ||
        "";

      if (extractedPlate) {
        setDetectedPlate(extractedPlate);
        const conf =
          scanResult.best_candidate?.confidence ??
          scanResult.confidence ??
          null;
        setScanDetails({
          confidence: conf,
          plate: extractedPlate,
          imageUrl: scanResult.image_url || previewUrl,
          source: "image",
        });

        const mapped = mapPlateScanToVehicle(scanResult);
        if (mapped && mapped.isRecognized) {
          setMatchedVehicle(mapped);
          setSearchStatus("matched");
          setRawLookup(scanResult.vehicle_lookup || null);
          if (onMatchSuccess) {
            onMatchSuccess(
              {
                success: true,
                vehicle: mapped,
                rawLookup: scanResult.vehicle_lookup || null,
                openSession: scanResult.session || null,
                isWalkIn: false,
                isBlacklisted: Boolean(mapped.isBlacklisted),
              },
              extractedPlate
            );
          }
        } else {
          handleMatchPlate(extractedPlate);
        }
      }
    },
    [handleMatchPlate, onMatchSuccess]
  );

  const resetMatching = useCallback(() => {
    setDetectedPlate("");
    setMatchedVehicle(null);
    setScanDetails(null);
    setSearchStatus("idle");
    setErrorMessage("");
    setRawLookup(null);
  }, []);

  return {
    detectedPlate,
    setDetectedPlate,
    matchedVehicle,
    setMatchedVehicle,
    scanDetails,
    setScanDetails,
    isScanning,
    setIsScanning,
    searchStatus,
    setSearchStatus,
    errorMessage,
    setErrorMessage,
    rawLookup,
    setRawLookup,
    handleMatchPlate,
    handleImageScanned,
    resetMatching,
  };
}

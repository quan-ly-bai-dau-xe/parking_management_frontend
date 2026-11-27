import { useState, useCallback, useRef } from "react";
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
  const matchEpochRef = useRef(0);

  const handleMatchPlate = useCallback(
    async (plateInput, options = {}) => {
      const rawInput = (plateInput || "").trim();
      const norm = normalizePlate(rawInput);
      if (!norm) return null;

      const requestEpoch = ++matchEpochRef.current;
      const shouldCommit =
        typeof options?.shouldCommit === "function" ? options.shouldCommit : null;

      setIsScanning(true);
      setSearchStatus("idle");
      setErrorMessage("");
      if (onResetBarrier) onResetBarrier();

      try {
        const result = await matchPlateLookup(rawInput, {
          vehicles,
          mockVehiclesFallback,
        });

        if (
          requestEpoch !== matchEpochRef.current ||
          (shouldCommit && !shouldCommit(result))
        ) {
          return null;
        }

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
        if (
          requestEpoch !== matchEpochRef.current ||
          (shouldCommit && !shouldCommit(null, unexpectedErr))
        ) {
          return null;
        }
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
        if (requestEpoch === matchEpochRef.current) {
          setIsScanning(false);
        }
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
          matchEpochRef.current += 1;
          setIsScanning(false);
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
    matchEpochRef.current += 1;
    setDetectedPlate("");
    setMatchedVehicle(null);
    setScanDetails(null);
    setIsScanning(false);
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

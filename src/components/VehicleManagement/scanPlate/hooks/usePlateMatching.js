import { useState, useCallback, useEffect } from "react";
import {
  lookupVehicleByPlate,
  getParkingSessions,
  mapPlateScanToVehicle,
  mapVehicleLookupToVehicle,
} from "../../../../services/plateScanService";

export const parseEntryTimeToDate = (entryTimeStr) => {
  if (!entryTimeStr) return null;
  const str = String(entryTimeStr).trim();
  const timeFirst = str.match(/^(\d{1,2}):(\d{1,2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (timeFirst) {
    const [, hour, min, day, month, year] = timeFirst;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const dateFirst = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
  if (dateFirst) {
    const [, day, month, year, hour = "0", min = "0"] = dateFirst;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) return d;
  return null;
};

export const normalizePlate = (str) =>
  (str || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

/**
 * usePlateMatching
 * Hook chuyên biệt quản lý tra cứu, đối soát biển số xe & open session
 */
export function usePlateMatching({ vehicles = [], onResetBarrier }) {
  const [detectedPlate, setDetectedPlate] = useState("");
  const [matchedVehicle, setMatchedVehicle] = useState(null);
  const [scanDetails, setScanDetails] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [searchStatus, setSearchStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [rawLookup, setRawLookup] = useState(null);

  const findInLocalList = useCallback(
    (norm) => {
      if (!Array.isArray(vehicles) || vehicles.length === 0) return null;
      return vehicles.find((v) => normalizePlate(v.licensePlate) === norm) || null;
    },
    [vehicles]
  );

  const resolveActiveSession = async (plate) => {
    try {
      const sessionRes = await getParkingSessions({ license_plate: plate, status: "open" });
      const active = sessionRes?.items?.[0] || sessionRes?.results?.[0];
      if (!active) return null;
      const rawIso =
        active.entryTimeRaw ||
        active.rawEntryTime ||
        active.entry_time ||
        parseEntryTimeToDate(active.entryTime)?.toISOString() ||
        active.entryTime;

      return {
        id: active.id,
        session_code: active.sessionCode || active.session_code,
        entry_time: rawIso,
        entry_image_url: active.plateImageUrl || active.entryImageUrl || active.entry_image_url,
        slot_code: active.slotCode || active.slot_code,
      };
    } catch {
      return null;
    }
  };

  const handleMatchPlate = useCallback(
    async (plateInput) => {
      const rawInput = (plateInput || "").trim();
      const norm = normalizePlate(rawInput);
      if (!norm) return;

      setIsScanning(true);
      setSearchStatus("idle");
      setErrorMessage("");
      if (onResetBarrier) onResetBarrier();

      try {
        const lookupResult = await lookupVehicleByPlate(rawInput);
        let openSession = lookupResult?.open_session || null;
        if (!openSession) {
          openSession = await resolveActiveSession(rawInput);
        }
        const consolidatedLookup = lookupResult
          ? { ...lookupResult, open_session: openSession }
          : openSession
            ? { open_session: openSession }
            : null;

        setRawLookup(consolidatedLookup);
        const vehicle = mapVehicleLookupToVehicle(consolidatedLookup);

        if (vehicle) {
          setMatchedVehicle(vehicle);
          setSearchStatus("matched");
        } else {
          const found = findInLocalList(norm);
          if (found) {
            setMatchedVehicle(found);
            setSearchStatus("matched");
          } else {
            setMatchedVehicle({
              id: "WALK_IN_" + Date.now(),
              licensePlate: rawInput.toUpperCase(),
              vehicleType: "CAR",
              model: "Khách vãng lai",
              status: "active",
              customer: { name: "Khách vãng lai (Vé lượt)" },
            });
            setSearchStatus("matched");
          }
        }
      } catch {
        const openSession = await resolveActiveSession(rawInput);
        setRawLookup(openSession ? { open_session: openSession } : null);

        const localFound = findInLocalList(norm);
        if (localFound) {
          setMatchedVehicle(localFound);
          setSearchStatus("matched");
        } else {
          setMatchedVehicle({
            id: "WALK_IN_" + Date.now(),
            licensePlate: rawInput.toUpperCase(),
            vehicleType: "CAR",
            model: "Khách vãng lai",
            status: "active",
            customer: { name: "Khách vãng lai (Vé lượt)" },
          });
          setSearchStatus("matched");
        }
      } finally {
        setIsScanning(false);
      }
    },
    [findInLocalList, onResetBarrier]
  );

  const handleImageScanned = (scanResult, previewUrl) => {
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
      } else {
        handleMatchPlate(extractedPlate);
      }
    }
  };

  const resetMatching = () => {
    setDetectedPlate("");
    setMatchedVehicle(null);
    setScanDetails(null);
    setSearchStatus("idle");
    setErrorMessage("");
    setRawLookup(null);
  };

  return {
    detectedPlate,
    setDetectedPlate,
    matchedVehicle,
    setMatchedVehicle,
    scanDetails,
    setScanDetails,
    isScanning,
    searchStatus,
    errorMessage,
    setErrorMessage,
    rawLookup,
    setRawLookup,
    handleMatchPlate,
    handleImageScanned,
    resetMatching,
  };
}

/**
 * Standard license plate formatter and normalizer for Vietnamese vehicles.
 * Supports cars (4 and 5 digits) and motorbikes (4 and 5 digits).
 */

/**
 * Normalizes a license plate by removing all non-alphanumeric characters
 * and converting to uppercase.
 * Example: "51A-897.14" -> "51A89714"
 *
 * @param {string} plate
 * @returns {string}
 */
export function normalizeLicensePlate(plate) {
  if (!plate || typeof plate !== "string") {
    return "";
  }
  return plate.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

// Standard civilian car regex patterns
const CAR_5DIGIT_RE = /^([0-9]{2}[A-Z]{1,2})([0-9]{3})([0-9]{2})$/;
const CAR_4DIGIT_RE = /^([0-9]{2}[A-Z]{1,2})([0-9]{4})$/;

// Motorcycle regex patterns
const MOTO_5DIGIT_RE = /^([0-9]{2})([A-Z][0-9A-Z])([0-9]{3})([0-9]{2})$/;
const MOTO_4DIGIT_RE = /^([0-9]{2})([A-Z][0-9A-Z])([0-9]{4})$/;

// Explicit motorcycle patterns with province hyphen (e.g., 29-H1 1234, 81-B3 343.03)
const MOTO_EXPLICIT_4_RE = /^([0-9]{2})-([A-Z][0-9A-Z])[\s.-]*([0-9]{4})$/;
const MOTO_EXPLICIT_5_RE =
  /^([0-9]{2})-([A-Z][0-9A-Z])[\s.-]*([0-9]{3})[\s.-]*([0-9]{2})$/;

// Explicit car patterns with series hyphen (e.g., 51A-897.14, 29A-1234, 30A-612.35)
const CAR_EXPLICIT_4_RE = /^([0-9]{2}[A-Z]{1,2})-([0-9]{4})$/;
const CAR_EXPLICIT_5_RE =
  /^([0-9]{2}[A-Z]{1,2})-([0-9]{3})[\s.-]*([0-9]{2})$/;

// Unambiguous compact patterns (only 1 valid vehicle type is possible)
const MOTO_UNAMBIGUOUS_5_RE =
  /^([0-9]{2})([A-Z][0-9])([0-9]{3})([0-9]{2})$/;
const CAR_UNAMBIGUOUS_4_RE = /^([0-9]{2}[A-Z])([0-9]{4})$/;

// Compact ambiguous shapes (match more than one pattern: car vs motorcycle)
const AMBIGUOUS_SHAPES = [
  /^[0-9]{2}[A-Z][0-9]{5}$/, // Shape A: Car 5-digit vs Moto 4-digit (e.g. 29H11234, 51A89714)
  /^[0-9]{2}[A-Z]{2}[0-9]{5}$/, // Shape B: Car 5-digit 2-letter vs Moto electric (e.g. 29MD12345)
  /^[0-9]{2}[A-Z]{2}[0-9]{4}$/, // Shape C: Car 4-digit 2-letter vs Moto 4-digit 2-letter (e.g. 29LD1234)
];

/**
 * Formats a license plate into the standard Vietnamese display format.
 * Examples:
 * - "51A89714", "CAR" -> "51A-897.14"
 * - "29H11234", "MOTORCYCLE" -> "29-H1 1234"
 * - "29H11234", null -> "29H11234" (ambiguous shape, kept compact)
 * - "81B334303", null -> "81-B3 343.03" (unambiguous motorcycle 5-digit)
 * - "29A1234", null -> "29A-1234" (unambiguous car 4-digit)
 * - "29-H1 1234", null -> "29-H1 1234" (explicit format preserved)
 *
 * @param {string} plate
 * @param {string|null} vehicleType
 * @returns {string}
 */
export function formatLicensePlateForDisplay(plate, vehicleType = null) {
  if (!plate || typeof plate !== "string") {
    return "";
  }

  const s = plate.trim().toUpperCase();
  if (!s) return "";

  // 1. Explicit motorcycle patterns with province hyphen
  const mExp4 = s.match(MOTO_EXPLICIT_4_RE);
  if (mExp4) {
    return `${mExp4[1]}-${mExp4[2]} ${mExp4[3]}`;
  }
  const mExp5 = s.match(MOTO_EXPLICIT_5_RE);
  if (mExp5) {
    return `${mExp5[1]}-${mExp5[2]} ${mExp5[3]}.${mExp5[4]}`;
  }

  // 2. Explicit car patterns with series hyphen
  const mCarExp5 = s.match(CAR_EXPLICIT_5_RE);
  if (mCarExp5) {
    return `${mCarExp5[1]}-${mCarExp5[2]}.${mCarExp5[3]}`;
  }
  const mCarExp4 = s.match(CAR_EXPLICIT_4_RE);
  if (mCarExp4) {
    return `${mCarExp4[1]}-${mCarExp4[2]}`;
  }

  // 3. Clean compact alphanumeric
  const raw = normalizeLicensePlate(s);

  const vt =
    typeof vehicleType === "string" ? vehicleType.trim().toUpperCase() : "";
  const isMoto =
    ["MOTORCYCLE", "MOTO", "XE_MAY", "BIKE"].includes(vt) ||
    vt.includes("MOTO") ||
    vt.includes("XE_MAY") ||
    vt.includes("BIKE");
  const isCar =
    !isMoto &&
    (["CAR", "EV", "AUTO", "OTO"].includes(vt) ||
      vt.includes("CAR") ||
      vt.includes("AUTO") ||
      vt === "OTO");

  // 4. If vehicle type is known:
  if (isCar) {
    const mC5 = raw.match(CAR_5DIGIT_RE);
    if (mC5) return `${mC5[1]}-${mC5[2]}.${mC5[3]}`;
    const mC4 = raw.match(CAR_4DIGIT_RE);
    if (mC4) return `${mC4[1]}-${mC4[2]}`;
    return s;
  }

  if (isMoto) {
    const mM5 = raw.match(MOTO_5DIGIT_RE);
    if (mM5) return `${mM5[1]}-${mM5[2]} ${mM5[3]}.${mM5[4]}`;
    const mM4 = raw.match(MOTO_4DIGIT_RE);
    if (mM4) return `${mM4[1]}-${mM4[2]} ${mM4[3]}`;
    return s;
  }

  // 5. When vehicle type is unknown:
  // 5a. Unambiguous motorcycle 5-digit: e.g. 81B334303 -> 81-B3 343.03
  const mUm5 = raw.match(MOTO_UNAMBIGUOUS_5_RE);
  if (mUm5) return `${mUm5[1]}-${mUm5[2]} ${mUm5[3]}.${mUm5[4]}`;

  // 5b. Unambiguous car 4-digit: e.g. 29A1234 -> 29A-1234
  const mUc4 = raw.match(CAR_UNAMBIGUOUS_4_RE);
  if (mUc4) return `${mUc4[1]}-${mUc4[2]}`;

  // 5c. Ambiguous shapes without known vehicle type: DO NOT GUESS -> return raw cleaned compact
  for (const ambRe of AMBIGUOUS_SHAPES) {
    if (ambRe.test(raw)) {
      return raw;
    }
  }

  return s;
}

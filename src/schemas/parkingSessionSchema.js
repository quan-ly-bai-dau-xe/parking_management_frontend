import { z } from "zod";

/**
 * Pure Zod Validation Schema cho Parking Session Domain.
 * Xác thực contract từ Backend DRF hoặc Mock Data.
 * Không chứa hàm format hiển thị (format date, format tiền) hay mappers.
 */
export const ParkingSessionSchema = z.object({
  id: z.union([z.string(), z.number()]),
  session_code: z.string().optional(),
  sessionCode: z.string().optional(),
  license_plate: z.string().optional(),
  licensePlate: z.string().optional(),
  vehicle_type: z.string().nullable().optional(),
  vehicleType: z.string().nullable().optional(),

  // Ảnh vào / ra từ API backend hoặc Mock
  entry_image_url: z.string().nullable().optional(),
  plate_image_url: z.string().nullable().optional(),
  entry_plate_image_url: z.string().nullable().optional(),
  plateImageUrl: z.string().nullable().optional(),

  exit_image_url: z.string().nullable().optional(),
  exit_plate_image_url: z.string().nullable().optional(),
  exitPlateImageUrl: z.string().nullable().optional(),

  entry_time: z.string().nullable().optional(),
  entryTime: z.string().nullable().optional(),
  exit_time: z.string().nullable().optional(),
  exitTime: z.string().nullable().optional(),

  entry_gate_name: z.string().nullable().optional(),
  entryGate: z.string().nullable().optional(),
  exit_gate_name: z.string().nullable().optional(),
  exitGate: z.string().nullable().optional(),

  duration_seconds: z.number().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  duration_text: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  durationText: z.string().nullable().optional(),

  fee: z.union([z.string(), z.number()]).nullable().optional(),
  fee_amount: z.union([z.string(), z.number()]).nullable().optional(),
  feeNumber: z.number().nullable().optional(),

  status: z.string().nullable().optional(),
  review_status: z.string().nullable().optional(),
  reviewStatus: z.string().nullable().optional(),
  review_reasons: z.unknown().optional(),
  reviewReasons: z.unknown().optional(),
  vehicle_lookup: z.unknown().optional(),
  vehicle: z.unknown().optional(),
});

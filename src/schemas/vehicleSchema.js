import { z } from "zod";

/**
 * Pure Zod Validation Schemas cho Vehicle Domain.
 * Đảm bảo tính toàn vẹn dữ liệu và phân tách concerns giữa Schema, Service và UI Modal.
 */

export const VehicleTypeSchema = z.object({
  id: z.number(),
  code: z.string().optional(),
  name: z.string().optional(),
});

export const VehicleFormSchema = z.object({
  licensePlate: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập biển số xe.")
    .regex(
      /^[0-9]{2}[A-Z0-9]{1,2}-?[0-9]{3,5}(\.[0-9]{2})?$/i,
      "Biển số xe không đúng định dạng chuẩn (VD: 51K-992.14 hoặc 30H-123.45)"
    ),
  model: z.string().trim().optional().default(""),
  brand: z.string().trim().optional().default(""),
  color: z.string().trim().optional().default(""),
  customerId: z.union([z.number(), z.string()]).optional(),
  customerName: z.string().trim().optional().default(""),
  customerPhone: z.string().trim().optional().default(""),
  vehicleTypeId: z.number().default(1),
  notes: z.string().trim().optional().default(""),
  status: z.string().optional().default("active"),
  parkingSlotCode: z.string().optional().default(""),
});

export const VehicleListItemSchema = z.object({
  id: z.union([z.number(), z.string()]),
  licensePlate: z.string(),
  model: z.string().optional(),
  brand: z.string().optional(),
  color: z.string().optional(),
  vehicleTypeId: z.number().optional(),
  vehicleTypeCode: z.string().optional(),
  customer: z
    .object({
      id: z.union([z.number(), z.string()]).optional(),
      name: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional(),
  parkingSlot: z.any().optional(),
  ticketType: z.string().optional(),
  status: z.string().optional(),
  note: z.string().optional(),
  rowVersion: z.number().optional(),
});

import { z } from "zod";

/**
 * Pure Zod Validation Schemas cho Customer Domain.
 * Kiểm tra tính hợp lệ của contract từ Backend / Mock Data.
 */

export const CustomerVehicleSchema = z.object({
  id: z.union([z.number(), z.string()]),
  licensePlate: z.string().optional(),
  license_plate: z.string().optional(),
  status: z.string().optional(),
  model_name: z.string().optional(),
  brand: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});

export const CustomerListItemSchema = z.object({
  id: z.union([z.number(), z.string()]),
  code: z.string().optional(),
  customerCode: z.string().optional(),
  full_name: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().nullable().optional(),
  identity_card_number: z.string().nullable().optional(),
  idNumber: z.string().optional(),
  date_of_birth: z.string().nullable().optional(),
  birthday: z.string().optional(),
  email: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  status: z.string().optional(),
  status_display: z.string().optional(),
  packageType: z.string().optional(),
  vehicles_count: z.number().optional(),
  vehicles: z.array(CustomerVehicleSchema).optional().default([]),
  has_active_ticket: z.boolean().optional(),
  hasActiveTicket: z.boolean().optional(),
  row_version: z.number().optional(),
  rowVersion: z.number().optional(),
  is_anonymized: z.boolean().optional(),
  isAnonymized: z.boolean().optional(),
  is_test_sample: z.boolean().optional(),
  isTestSample: z.boolean().optional(),
});

export const CustomerDetailSchema = z.object({
  id: z.union([z.number(), z.string()]),
  code: z.string().optional(),
  full_name: z.string().optional(),
  name: z.string().optional(),
  date_of_birth: z.string().nullable().optional(),
  birthday: z.string().optional(),
  gender: z.string().nullable().optional(),
  identity_card_number: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  province_id: z.number().nullable().optional(),
  province_name: z.string().nullable().optional(),
  district_id: z.number().nullable().optional(),
  district_name: z.string().nullable().optional(),
  ward_id: z.number().nullable().optional(),
  ward_name: z.string().nullable().optional(),
  status: z.string().optional(),
  status_display: z.string().optional(),
  status_reason: z.string().nullable().optional(),
  is_anonymized: z.boolean().optional(),
  row_version: z.number().optional(),
  vehicles: z.array(z.any()).optional().default([]),
});

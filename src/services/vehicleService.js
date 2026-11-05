import { apiClient, axiosInstance } from "./apiClient.js";
import {
  mapVehicleSearchItem,
  mapVehicleResults,
  toCreatePayload,
  toUpdatePayload,
} from "../utils/vehicle/vehicleApiMapper.js";

export { mapVehicleSearchItem, mapVehicleResults };

export async function searchVehicles(query = "") {
  const response = await axiosInstance.get("/api/v1/parking/vehicle-search/", {
    params: { q: query },
  });
  return response.data;
}

export async function fetchVehicles(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.append("plate", params.search);
  if (params.code) searchParams.append("code", params.code);
  if (params.plate) searchParams.append("plate", params.plate);
  if (params.customer) searchParams.append("customer", params.customer);
  if (params.vehicleType) searchParams.append("vehicle_type", params.vehicleType);
  if (params.ticketType) searchParams.append("ticket_type", params.ticketType);
  if (params.status) searchParams.append("status", params.status);
  if (params.ticketState) searchParams.append("ticket_state", params.ticketState);
  if (params.ordering) searchParams.append("ordering", params.ordering);
  if (params.page) searchParams.append("page", params.page.toString());
  if (params.page_size) searchParams.append("page_size", params.page_size.toString());

  return apiClient(`/api/v1/vehicles/?${searchParams.toString()}`);
}

export async function fetchVehicleSummary() {
  return apiClient("/api/v1/vehicles/summary/");
}

export async function fetchVehicleDetail(id) {
  return apiClient(`/api/v1/vehicles/${id}/`);
}

export async function fetchVehicleTypes() {
  return apiClient("/api/v1/vehicle-types/");
}

export async function exportVehiclesCsv(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.append("plate", params.search);
  if (params.code) searchParams.append("code", params.code);
  if (params.plate) searchParams.append("plate", params.plate);
  if (params.customer) searchParams.append("customer", params.customer);
  if (params.vehicleType) searchParams.append("vehicle_type", params.vehicleType);
  if (params.ticketType) searchParams.append("ticket_type", params.ticketType);
  if (params.status) searchParams.append("status", params.status);
  if (params.ticketState) searchParams.append("ticket_state", params.ticketState);
  if (params.ordering) searchParams.append("ordering", params.ordering);

  const query = searchParams.toString();
  const url = `/api/v1/vehicles/export/${query ? `?${query}` : ""}`;

  const response = await axiosInstance.get(url, {
    responseType: "blob",
  });

  const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `danh_sach_phuong_tien_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

export const vehicleService = {
  list: (params) => fetchVehicles(params),
  getSummary: () => fetchVehicleSummary(),
  getDetail: (id) => fetchVehicleDetail(id),
  getTypes: () => fetchVehicleTypes(),
  exportCsv: (params) => exportVehiclesCsv(params),
  create: (payload) =>
    apiClient("/api/v1/vehicles/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toCreatePayload(payload)),
    }),
  update: (id, payload) =>
    apiClient(`/api/v1/vehicles/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toUpdatePayload(payload)),
    }),
  remove: (id) =>
    apiClient(`/api/v1/vehicles/${id}/`, {
      method: "DELETE",
    }),
};

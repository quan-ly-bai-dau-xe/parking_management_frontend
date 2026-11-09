/**
 * Centralized Services Export
 * Consolidates all API & Business Logic Services for Frontend.
 */

export { apiClient, fetchCsrfToken, getCookie } from "./apiClient";
export { authService } from "../features/authService";
export { customerService, mapBackendCustomerToFrontend, mapFrontendCustomerToBackend } from "./customerService";
export { employeeService, mapBackendEmployeeToFrontend, INITIAL_EMPLOYEES } from "./employeeService";
export { ticketService, mapBackendTicketToFrontend } from "./ticketService";
export { parkingLotService } from "./parkingLotService";
export {
  vehicleService,
  fetchVehicles,
  fetchVehicleSummary,
  fetchVehicleDetail,
  searchVehicles,
  mapVehicleResults,
  mapVehicleSearchItem,
} from "../features/vehicleService";
export { dashboardService } from "../features/dashboardService";
export {
  plateScanService,
  scanPlateImage,
  lookupVehicleByPlate,
  getParkingSessions,
  getParkingSessionDetail,
  mapPlateScanToVehicle,
  mapVehicleLookupToVehicle,
  mapSessionToFrontend,
} from "../features/plateScanService";


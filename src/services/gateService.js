import { apiClient } from './apiClient.js';

/**
 * Fetch list of parking gates from backend API.
 *
 * @param {Object} [params={}]
 * @param {string} [params.direction] - 'IN' | 'OUT'
 * @param {boolean} [params.isActive] - true | false
 * @returns {Promise<Array<Object>>}
 */
export async function getParkingGates(params = {}) {
  const query = {};
  if (params.direction) {
    query.direction = params.direction;
  }
  if (params.isActive !== undefined) {
    query.is_active = params.isActive;
  } else if (params.is_active !== undefined) {
    query.is_active = params.is_active;
  }

  const data = await apiClient('/api/v1/parking/gates/', {
    method: 'GET',
    params: Object.keys(query).length > 0 ? query : undefined,
  });

  if (Array.isArray(data)) {
    return data;
  }
  if (data && Array.isArray(data.results)) {
    return data.results;
  }
  return [];
}

/**
 * Query worker online status and last auto event telemetry for a specific gate.
 *
 * @param {number|string} gateId
 * @returns {Promise<{ success: boolean, worker_online: boolean|null, last_auto_event: Object|null, gate: Object|null, error?: string }>}
 */
export async function getGateWorkerStatus(gateId) {
  try {
    const gates = await getParkingGates();
    const targetId = Number(gateId);
    const targetCode = String(gateId || '').trim();

    const gate = gates.find(
      (g) =>
        (targetId && Number(g.id) === targetId) ||
        (targetCode && String(g.code || '').trim() === targetCode)
    ) || null;

    if (!gate) {
      return {
        success: true,
        worker_online: false,
        last_auto_event: null,
        gate: null,
      };
    }

    return {
      success: true,
      worker_online: Boolean(gate.worker_online),
      last_auto_event: gate.last_auto_event || null,
      gate,
    };
  } catch (error) {
    return {
      success: false,
      worker_online: null,
      error: error?.message || String(error),
      last_auto_event: null,
      gate: null,
    };
  }
}

export default {
  getParkingGates,
  getGateWorkerStatus,
};

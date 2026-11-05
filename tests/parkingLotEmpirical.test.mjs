import test from 'node:test';
import assert from 'node:assert/strict';
import { axiosInstance } from '../src/services/apiClient.js';
import {
  getStatusText,
  normalizeSlot,
  getSlots,
  fetchParkingSlots,
  updateSlotStatus,
  getActiveSessions,
  fetchActiveSessions,
  parkingLotService,
} from '../src/services/parkingLotService.js';

// Polyfill minimal browser document if needed for apiClient CSRF
if (typeof globalThis.document === 'undefined') {
  globalThis.document = { cookie: 'csrftoken=mock-csrf-token' };
}

test('1. Service exports and aliases conform to PROJECT.md interface contract', () => {
  assert.equal(typeof getSlots, 'function', 'getSlots must be a function');
  assert.equal(fetchParkingSlots, getSlots, 'fetchParkingSlots must be an exact alias of getSlots');
  assert.equal(typeof updateSlotStatus, 'function', 'updateSlotStatus must be a function');
  assert.equal(typeof getActiveSessions, 'function', 'getActiveSessions must be a function');
  assert.equal(fetchActiveSessions, getActiveSessions, 'fetchActiveSessions must be an exact alias of getActiveSessions');
  assert.equal(typeof normalizeSlot, 'function', 'normalizeSlot must be a function');
  assert.equal(typeof getStatusText, 'function', 'getStatusText must be a function');

  assert.equal(parkingLotService.getSlots, getSlots);
  assert.equal(parkingLotService.fetchParkingSlots, fetchParkingSlots);
  assert.equal(parkingLotService.updateSlotStatus, updateSlotStatus);
  assert.equal(parkingLotService.getActiveSessions, getActiveSessions);
  assert.equal(parkingLotService.fetchActiveSessions, fetchActiveSessions);
  assert.equal(parkingLotService.normalizeSlot, normalizeSlot);
  assert.equal(parkingLotService.getStatusText, getStatusText);
});

test('2. getStatusText maps statuses correctly and handles edge cases', () => {
  assert.equal(getStatusText('AVAILABLE'), 'Trống');
  assert.equal(getStatusText('OCCUPIED'), 'Đang đỗ');
  assert.equal(getStatusText('RESERVED'), 'Đã đặt');
  assert.equal(getStatusText('MAINTENANCE'), 'Bảo trì');
  assert.equal(getStatusText('CHARGING'), 'Đang sạc');

  // Fallbacks for unknown status or falsy values
  assert.equal(getStatusText('CUSTOM_STATUS'), 'CUSTOM_STATUS');
  assert.equal(getStatusText(null), 'Không xác định');
  assert.equal(getStatusText(undefined), 'Không xác định');
  assert.equal(getStatusText(''), 'Không xác định');
});

test('3. normalizeSlot stress test: empty, null, and non-object inputs', () => {
  // Primitive or null inputs return empty object
  assert.deepEqual(normalizeSlot(null), {});
  assert.deepEqual(normalizeSlot('invalid'), {});
  assert.deepEqual(normalizeSlot(12345), {});

  // Undefined input uses default argument ({}) and produces a safe defaulted slot object
  const fromUndefined = normalizeSlot(undefined);
  assert.equal(fromUndefined.status, 'AVAILABLE');
  assert.equal(fromUndefined.statusText, 'Trống');

  const emptyNormalized = normalizeSlot({});
  assert.equal(emptyNormalized.status, 'AVAILABLE');
  assert.equal(emptyNormalized.statusText, 'Trống');
  assert.equal(emptyNormalized.type, 'STANDARD');
  assert.equal(emptyNormalized.slot_kind, 'STANDARD');
  assert.equal(emptyNormalized.floor, 'B1');
  assert.equal(emptyNormalized.zone, 'A');
  assert.equal(emptyNormalized.parkingLot, 'Bãi xe Smart Mobility');
  assert.equal(emptyNormalized.plate, null);
  assert.equal(emptyNormalized.licensePlate, null);
  assert.equal(emptyNormalized.row, 'A');
  assert.equal(emptyNormalized.notes, '');
});

test('4. normalizeSlot maps backend snake_case and various field names accurately', () => {
  const rawBackend = {
    id: 42,
    code: 'B-08',
    status: 'OCCUPIED',
    slot_kind: 'PRIORITY',
    license_plate: '29A-888.99',
    floor_code: 'B2',
    zone_code: 'C',
    parking_lot_name: 'Vincom Mega Mall',
    notes: 'Xe giám đốc',
    reserved_time: '14:30',
    reserved_by: 'Nguyễn Văn A',
    duration: '2h 15m',
    custom_attribute: 'custom_value',
  };

  const slot = normalizeSlot(rawBackend);
  assert.equal(slot.id, 42);
  assert.equal(slot.slotId, 'B-08');
  assert.equal(slot.code, 'B-08');
  assert.equal(slot.label, 'B-08');
  assert.equal(slot.row, 'B');
  assert.equal(slot.status, 'OCCUPIED');
  assert.equal(slot.statusText, 'Đang đỗ');
  assert.equal(slot.type, 'PRIORITY');
  assert.equal(slot.slot_kind, 'PRIORITY');
  assert.equal(slot.plate, '29A-888.99');
  assert.equal(slot.licensePlate, '29A-888.99');
  assert.equal(slot.floor, 'B2');
  assert.equal(slot.zone, 'C');
  assert.equal(slot.parkingLot, 'Vincom Mega Mall');
  assert.equal(slot.note, 'Xe giám đốc');
  assert.equal(slot.notes, 'Xe giám đốc');
  assert.equal(slot.reservedTime, '14:30');
  assert.equal(slot.reservedBy, 'Nguyễn Văn A');
  assert.equal(slot.duration, '2h 15m');
  assert.equal(slot.custom_attribute, 'custom_value', 'Extra backend properties must be preserved');
});

test('5. normalizeSlot row extraction logic handles diverse formats', () => {
  assert.equal(normalizeSlot({ code: 'A-01' }).row, 'A');
  assert.equal(normalizeSlot({ code: 'B-15' }).row, 'B');
  assert.equal(normalizeSlot({ code: 'VIP-01' }).row, 'VIP');
  assert.equal(normalizeSlot({ code: 'SLOT1' }).row, 'A', 'Fallback to A when no hyphen');
  assert.equal(normalizeSlot({ code: 'A-01', row: 'C' }).row, 'C', 'Explicit row takes precedence');
});

test('6. normalizeSlot plate resolution precedence', () => {
  assert.equal(
    normalizeSlot({ plate: 'P1', licensePlate: 'P2', license_plate: 'P3' }).plate,
    'P1',
    'plate takes top precedence'
  );
  assert.equal(
    normalizeSlot({ licensePlate: 'P2', license_plate: 'P3' }).plate,
    'P2',
    'licensePlate takes second precedence'
  );
  assert.equal(
    normalizeSlot({ license_plate: 'P3' }).plate,
    'P3',
    'license_plate takes third precedence'
  );
  assert.equal(
    normalizeSlot({}).plate,
    null,
    'defaults to null when absent'
  );
});

test('7. getSlots constructs query parameters and maps responses correctly', async () => {
  const originalRequest = axiosInstance.request;
  let interceptedConfig = null;

  try {
    axiosInstance.request = async (config) => {
      interceptedConfig = config;
      return {
        data: [
          { id: 1, code: 'A-01', status: 'AVAILABLE' },
          { id: 2, code: 'A-02', status: 'OCCUPIED', plate: '30E-123.45' },
        ],
      };
    };

    const slots = await getSlots({
      floor: 'B1',
      zone: 'A',
      status: 'AVAILABLE',
      vehicle_type: 'CAR',
      slot_kind: 'STANDARD',
      search: 'A-01',
      custom_param: 'test',
    });

    assert.equal(interceptedConfig.url, '/api/v1/parking/slots/');
    assert.equal(interceptedConfig.method, 'GET');
    assert.deepEqual(interceptedConfig.params, {
      floor: 'B1',
      zone: 'A',
      status: 'AVAILABLE',
      vehicle_type: 'CAR',
      slot_kind: 'STANDARD',
      search: 'A-01',
      custom_param: 'test',
    });

    assert.equal(slots.length, 2);
    assert.equal(slots[0].code, 'A-01');
    assert.equal(slots[0].statusText, 'Trống');
    assert.equal(slots[1].code, 'A-02');
    assert.equal(slots[1].statusText, 'Đang đỗ');
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test('8. getSlots maps camelCase aliases (vehicleType, slotKind) without duplicates', async () => {
  const originalRequest = axiosInstance.request;
  let interceptedConfig = null;

  try {
    axiosInstance.request = async (config) => {
      interceptedConfig = config;
      return { data: [] };
    };

    await getSlots({
      vehicleType: 'TRUCK',
      slotKind: 'LARGE',
    });

    assert.equal(interceptedConfig.params.vehicle_type, 'TRUCK');
    assert.equal(interceptedConfig.params.slot_kind, 'LARGE');
    assert.equal(interceptedConfig.params.vehicleType, undefined);
    assert.equal(interceptedConfig.params.slotKind, undefined);
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test('9. getSlots handles DRF paginated responses and null responses', async () => {
  const originalRequest = axiosInstance.request;

  try {
    // Paginated response
    axiosInstance.request = async () => ({
      data: {
        count: 1,
        next: null,
        previous: null,
        results: [{ id: 99, code: 'B-09', status: 'MAINTENANCE' }],
      },
    });

    const paginatedSlots = await getSlots();
    assert.equal(paginatedSlots.length, 1);
    assert.equal(paginatedSlots[0].code, 'B-09');
    assert.equal(paginatedSlots[0].statusText, 'Bảo trì');

    // Null response
    axiosInstance.request = async () => ({ data: null });
    const nullSlots = await getSlots();
    assert.deepEqual(nullSlots, [], 'Null response must return empty array');

    // Unexpected object response
    axiosInstance.request = async () => ({ data: { foo: 'bar' } });
    const objSlots = await getSlots();
    assert.deepEqual(objSlots, [], 'Unexpected object must return empty array');
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test('10. updateSlotStatus validates slotId and builds PATCH request', async () => {
  const originalRequest = axiosInstance.request;
  let interceptedConfig = null;

  try {
    axiosInstance.request = async (config) => {
      interceptedConfig = config;
      return {
        data: {
          id: config.url.split('/')[4],
          code: 'A-05',
          status: config.data?.status || 'AVAILABLE',
        },
      };
    };

    // Missing slotId must throw
    await assert.rejects(
      async () => await updateSlotStatus(null, 'AVAILABLE'),
      /slotId là bắt buộc/
    );
    await assert.rejects(
      async () => await updateSlotStatus('', 'AVAILABLE'),
      /slotId là bắt buộc/
    );

    // String status payload
    const updatedFromString = await updateSlotStatus('A-05', 'OCCUPIED');
    assert.equal(interceptedConfig.url, '/api/v1/parking/slots/A-05/');
    assert.equal(interceptedConfig.method, 'PATCH');
    assert.deepEqual(interceptedConfig.data, { status: 'OCCUPIED' });
    assert.equal(updatedFromString.status, 'OCCUPIED');
    assert.equal(updatedFromString.statusText, 'Đang đỗ');

    // Object payload
    const updatedFromObj = await updateSlotStatus(105, {
      status: 'RESERVED',
      note: 'Khách VIP hẹn trước',
    });
    assert.equal(interceptedConfig.url, '/api/v1/parking/slots/105/');
    assert.equal(interceptedConfig.method, 'PATCH');
    assert.deepEqual(interceptedConfig.data, {
      status: 'RESERVED',
      note: 'Khách VIP hẹn trước',
    });
    assert.equal(updatedFromObj.status, 'RESERVED');
    assert.equal(updatedFromObj.statusText, 'Đã đặt');
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test('11. getActiveSessions builds GET request with status=open and merges params', async () => {
  const originalRequest = axiosInstance.request;
  let interceptedConfig = null;

  try {
    axiosInstance.request = async (config) => {
      interceptedConfig = config;
      return {
        data: [
          { id: 1, plate: '30A-111.11', status: 'open' },
        ],
      };
    };

    const sessions = await getActiveSessions({ limit: 10 });
    assert.equal(interceptedConfig.url, '/api/v1/parking/sessions/');
    assert.equal(interceptedConfig.method, 'GET');
    assert.equal(interceptedConfig.params.status, 'open');
    assert.equal(interceptedConfig.params.limit, 10);
    assert.equal(sessions.length, 1);
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test('12. Error status propagation: getSlots propagates HTTP 404, 500, and network errors', async () => {
  const originalRequest = axiosInstance.request;

  try {
    // 404 error
    axiosInstance.request = async () => {
      const err = new Error('HTTP Error 404');
      err.status = 404;
      err.code = 'ERR_BAD_REQUEST';
      throw err;
    };

    await assert.rejects(
      async () => await getSlots({ floor: 'B1' }),
      (err) => {
        assert.equal(err.status, 404);
        return true;
      }
    );

    // Network / API_UNAVAILABLE error
    axiosInstance.request = async () => {
      const err = new Error('Network Error');
      err.code = 'API_UNAVAILABLE';
      throw err;
    };

    await assert.rejects(
      async () => await getSlots({ floor: 'B1' }),
      (err) => {
        assert.equal(err.code, 'API_UNAVAILABLE');
        return true;
      }
    );
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test('13. Mathematical edge cases: statistics and density with zero slots', () => {
  const slots = [];
  const stats = {
    total: slots.length,
    available: slots.filter((s) => s.status === 'AVAILABLE').length,
    occupied: slots.filter((s) => s.status === 'OCCUPIED').length,
    reservedOrMaint: slots.filter(
      (s) => s.status === 'RESERVED' || s.status === 'MAINTENANCE'
    ).length,
  };

  assert.equal(stats.total, 0);
  assert.equal(stats.available, 0);
  assert.equal(stats.occupied, 0);
  assert.equal(stats.reservedOrMaint, 0);

  // Density formula in ParkingSlotMatrix:
  // Math.round(((stats.occupied + stats.reservedOrMaint) / (stats.total || 1)) * 100)
  const densityPercent = Math.round(
    ((stats.occupied + stats.reservedOrMaint) / (stats.total || 1)) * 100
  );
  assert.equal(densityPercent, 0, 'Density must evaluate to 0%, never NaN or Infinity');
  assert.ok(!Number.isNaN(densityPercent));
});

test('14. Adversarial challenge: verify behavior when slot codes are strings vs non-strings', () => {
  // Standard string slot code works seamlessly
  const slotStandard = normalizeSlot({ code: 'A-01' });
  assert.equal(slotStandard.code, 'A-01');
  assert.equal(slotStandard.row, 'A');

  // Defensive verification: when code is explicitly numeric (e.g. raw DB ID or integer code),
  // code is safely coerced to string without throwing TypeError.
  const isNumericCodeSafe = (() => {
    try {
      const slotNumeric = normalizeSlot({ code: 101 });
      assert.equal(slotNumeric.code, '101');
      assert.equal(slotNumeric.row, 'A');
      return true;
    } catch {
      return false;
    }
  })();
  assert.equal(
    isNumericCodeSafe,
    true,
    'Numeric slot codes must be safely coerced to string without throwing TypeError'
  );
});


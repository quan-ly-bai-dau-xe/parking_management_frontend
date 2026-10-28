import test from 'node:test';
import assert from 'node:assert/strict';

import { authService } from '../src/features/authService.js';
import {
  fetchVehicles,
  mapVehicleResults,
  mapVehicleSearchItem,
  searchVehicles,
  vehicleService,
} from '../src/features/vehicleService.js';
import {
  getParkingSessions,
  lookupVehicleByPlate,
  mapPlateScanToVehicle,
  mapSessionToFrontend,
  mapVehicleLookupToVehicle,
  scanPlateImage,
} from '../src/features/plateScanService.js';

class MemoryStorage {
  #values = new Map();

  setItem(key, value) {
    this.#values.set(key, String(value));
  }

  getItem(key) {
    return this.#values.get(key) ?? null;
  }

  removeItem(key) {
    this.#values.delete(key);
  }

  has(key) {
    return this.#values.has(key);
  }

  clear() {
    this.#values.clear();
  }
}

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function installBrowserMocks() {
  const previous = {
    document: globalThis.document,
    localStorage: globalThis.localStorage,
    sessionStorage: globalThis.sessionStorage,
    fetch: globalThis.fetch,
  };

  globalThis.document = { cookie: 'csrftoken=mock-token-xyz' };
  globalThis.localStorage = new MemoryStorage();
  globalThis.sessionStorage = new MemoryStorage();

  return () => {
    Object.entries(previous).forEach(([key, value]) => {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    });
  };
}

/* =========================================================================
   P0: ĐĂNG NHẬP
   Kiểm tra validation, request payload, CSRF, lưu sp_user, lỗi 401
   ========================================================================= */

test('[P0] Đăng nhập: Validation chặn các trường hợp thiếu tài khoản hoặc mật khẩu', async () => {
  const restore = installBrowserMocks();
  try {
    await assert.rejects(
      () => authService.login({ account: '', password: '123' }),
      /Vui lòng nhập đầy đủ tài khoản và mật khẩu/
    );

    await assert.rejects(
      () => authService.login({ account: 'staff', password: '' }),
      /Vui lòng nhập đầy đủ tài khoản và mật khẩu/
    );

    await assert.rejects(
      () => authService.login({ account: null, password: null }),
      /Vui lòng nhập đầy đủ tài khoản và mật khẩu/
    );
  } finally {
    restore();
  }
});

test('[P0] Đăng nhập: CSRF handshake, gửi payload chuẩn và lưu sp_user vào localStorage khi rememberMe=true', async () => {
  const restore = installBrowserMocks();
  globalThis.document.cookie = ''; // Giả lập chưa có CSRF cookie
  const calls = [];

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes('/csrf/')) {
      globalThis.document.cookie = 'csrftoken=csrf-received-from-cookie';
      return new Response('', { status: 200 });
    }
    return jsonResponse({ id: 101, username: 'operator', role: 'OPERATOR' });
  };

  try {
    const result = await authService.login({
      account: '  operator  ',
      password: 'password123',
      rememberMe: true,
    });

    assert.equal(result.status, 200);
    assert.equal(result.user.username, 'operator');

    // 1. Kiểm tra CSRF handshake
    assert.equal(calls[0].url, '/api/v1/auth/csrf/');

    // 2. Kiểm tra request payload login
    const loginCall = calls.find((c) => c.url === '/api/v1/auth/login/');
    assert.ok(loginCall, 'Request đăng nhập không được gửi');
    assert.equal(loginCall.options.method, 'POST');
    assert.deepEqual(JSON.parse(loginCall.options.body), {
      identifier: 'operator',
      password: 'password123',
      remember: true,
    });

    // 3. Kiểm tra lưu session vào localStorage, không vào sessionStorage
    assert.equal(localStorage.getItem('sp_user'), JSON.stringify(result.user));
    assert.equal(sessionStorage.has('sp_user'), false);
  } finally {
    restore();
  }
});

test('[P0] Đăng nhập: Lưu sp_user vào sessionStorage khi rememberMe=false', async () => {
  const restore = installBrowserMocks();
  globalThis.fetch = async (url) => {
    if (url.includes('/csrf/')) return new Response('', { status: 200 });
    return jsonResponse({ id: 102, username: 'temp_user', role: 'STAFF' });
  };

  try {
    const result = await authService.login({
      account: 'temp_user',
      password: 'temp_password',
      rememberMe: false,
    });

    assert.equal(result.status, 200);
    assert.equal(sessionStorage.getItem('sp_user'), JSON.stringify(result.user));
    assert.equal(localStorage.has('sp_user'), false);
  } finally {
    restore();
  }
});

test('[P0] Đăng nhập: Xử lý lỗi 401 (Sai thông tin) và không lưu session rác', async () => {
  const restore = installBrowserMocks();
  globalThis.fetch = async (url) => {
    if (url.includes('/csrf/')) return new Response('', { status: 200 });
    return jsonResponse(
      { detail: 'Tài khoản hoặc mật khẩu không chính xác' },
      401
    );
  };

  try {
    await assert.rejects(
      () => authService.login({ account: 'wrong', password: 'bad', rememberMe: true }),
      (err) => {
        assert.equal(err.status, 401);
        assert.match(err.message, /Tài khoản hoặc mật khẩu không chính xác/);
        return true;
      }
    );

    // Không được lưu session vào storage khi thất bại
    assert.equal(localStorage.has('sp_user'), false);
    assert.equal(sessionStorage.has('sp_user'), false);
  } finally {
    restore();
  }
});

/* =========================================================================
   P0: TRA CỨU XE THEO BIỂN SỐ
   Kiểm tra query, response lỗi, mapping vehicle/customer/vị trí/vé
   ========================================================================= */

test('[P0] Tra cứu xe theo biển số: Gửi query license_plate và mapping đầy đủ vehicle, customer, parking_position, ticket', async () => {
  const restore = installBrowserMocks();
  let requestedUrl = null;

  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return jsonResponse({
      vehicle: {
        id: 42,
        code: 'VH-0042',
        license_plate: '51K-888.88',
        vehicle_type: 'Ô tô điện',
        vehicle_type_code: 'EV',
        brand: 'VinFast',
        model_name: 'VF 8',
        color: 'Trắng',
      },
      customer: {
        id: 7,
        code: 'KH-0007',
        full_name: 'Trần Văn Bình',
        phone: '0912345678',
      },
      parking_position: {
        display_text: 'B2-C15',
        zone_code: 'C',
        floor_name: 'Tầng B2',
        slot_code: '15',
      },
      active_ticket: {
        code: 'TKT-2026-001',
        ticket_type_name: 'Vé tháng cư dân',
        status: 'ACTIVE',
        effective_from: '2026-01-01T00:00:00Z',
        effective_to: '2026-12-31T23:59:59Z',
      },
      open_session: {
        id: 200,
        session_code: 'PS-200',
      },
      is_blacklisted: false,
    });
  };

  try {
    const rawData = await lookupVehicleByPlate('51K-888.88');
    assert.match(requestedUrl, /\/api\/v1\/parking\/vehicle-lookup\/\?license_plate=51K-888\.88/);

    const vehicle = mapVehicleLookupToVehicle(rawData);
    assert.equal(vehicle.backendId, 42);
    assert.equal(vehicle.licensePlate, '51K-888.88');
    assert.equal(vehicle.brand, 'VinFast');
    assert.equal(vehicle.avatarIcon, 'car-cyan'); // EV type

    // Customer
    assert.equal(vehicle.customer.name, 'Trần Văn Bình');
    assert.equal(vehicle.customer.phone, '0912345678');

    // Parking slot
    assert.equal(vehicle.parkingSlot.display, 'B2-C15');
    assert.equal(vehicle.parkingSlot.zone, 'C');
    assert.equal(vehicle.parkingSlot.floor, 'Tầng B2');

    // Ticket
    assert.equal(vehicle.ticket.type, 'Vé tháng cư dân');
    assert.equal(vehicle.ticket.status, 'active');
    assert.ok(vehicle.ticket.remainingDays > 0);

    // Status: có open_session => 'parked'
    assert.equal(vehicle.status, 'parked');
  } finally {
    restore();
  }
});

test('[P0] Tra cứu xe theo biển số: Xử lý lỗi API (404/500) và dữ liệu không tìm thấy xe', async () => {
  const restore = installBrowserMocks();
  globalThis.fetch = async () => {
    return jsonResponse({ detail: 'Không tìm thấy thông tin xe' }, 404);
  };

  try {
    await assert.rejects(
      () => lookupVehicleByPlate('99Z-999.99'),
      (err) => {
        assert.equal(err.status, 404);
        return true;
      }
    );

    // Khi lookup không có xe hoặc null, mapVehicleLookupToVehicle trả về null an toàn
    assert.equal(mapVehicleLookupToVehicle(null), null);
    assert.equal(mapVehicleLookupToVehicle({}), null);
    assert.equal(mapVehicleLookupToVehicle({ vehicle: null }), null);
  } finally {
    restore();
  }
});

/* =========================================================================
   P0: HIỂN THỊ DANH SÁCH XE
   Kiểm tra payload array/pagination, filter, mapping
   ========================================================================= */

test('[P0] Hiển thị danh sách xe: Gửi đúng bộ query filter và pagination params', async () => {
  const restore = installBrowserMocks();
  let requestedUrl = null;

  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return jsonResponse({ count: 1, results: [] });
  };

  try {
    await fetchVehicles({
      search: '51K',
      vehicleType: 'CAR',
      ticketType: 'VIP',
      status: 'active',
      ticketStatus: 'VALID',
      page: 3,
      page_size: 25,
    });

    const parsedUrl = new URL(requestedUrl, 'http://localhost');
    assert.equal(parsedUrl.pathname, '/api/v1/vehicles/');
    assert.equal(parsedUrl.searchParams.get('q'), '51K');
    assert.equal(parsedUrl.searchParams.get('vehicle_type'), 'CAR');
    assert.equal(parsedUrl.searchParams.get('ticket_type'), 'VIP');
    assert.equal(parsedUrl.searchParams.get('status'), 'active');
    assert.equal(parsedUrl.searchParams.get('ticket_status'), 'VALID');
    assert.equal(parsedUrl.searchParams.get('page'), '3');
    assert.equal(parsedUrl.searchParams.get('page_size'), '25');
  } finally {
    restore();
  }
});

test('[P0] Hiển thị danh sách xe: mapVehicleResults hỗ trợ cả dạng array và dạng object có pagination results', () => {
  const sampleVehicle = {
    id: 1,
    license_plate: '30E-123.45',
    vehicle_type: 'Ô tô',
    customer: { full_name: 'Lê Văn C' },
    parking_position: { display_text: 'A1-01' },
  };

  // Case 1: Dạng mảng trực tiếp
  const arrayResult = mapVehicleResults([sampleVehicle]);
  assert.equal(Array.isArray(arrayResult), true);
  assert.equal(arrayResult.length, 1);
  assert.equal(arrayResult[0].licensePlate, '30E-123.45');
  assert.equal(arrayResult[0].customer.name, 'Lê Văn C');

  // Case 2: Dạng phân trang { count, results }
  const pagedResult = mapVehicleResults({ count: 100, results: [sampleVehicle] });
  assert.equal(Array.isArray(pagedResult), true);
  assert.equal(pagedResult.length, 1);
  assert.equal(pagedResult[0].parkingSlot.display, 'A1-01');

  // Case 3: Payload null/rỗng không crash
  assert.deepEqual(mapVehicleResults(null), []);
  assert.deepEqual(mapVehicleResults({}), []);
});

/* =========================================================================
   P0: LỊCH SỬ XE VÀO/RA
   Kiểm tra session list, trạng thái, phí, thời gian, filter
   ========================================================================= */

test('[P0] Lịch sử xe vào/ra: Gửi đúng bộ lọc filters khi gọi getParkingSessions', async () => {
  const restore = installBrowserMocks();
  let requestedUrl = null;

  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return jsonResponse({ count: 10, results: [] });
  };

  try {
    await getParkingSessions({
      license_plate: '51A',
      status: 'closed',
      review_status: 'AUTO',
      min_fee: 20000,
      max_fee: 100000,
      page: 2,
      page_size: 15,
    });

    const parsed = new URL(requestedUrl, 'http://localhost');
    assert.equal(parsed.pathname, '/api/v1/parking/sessions/');
    assert.equal(parsed.searchParams.get('license_plate'), '51A');
    assert.equal(parsed.searchParams.get('status'), 'closed');
    assert.equal(parsed.searchParams.get('review_status'), 'AUTO');
    assert.equal(parsed.searchParams.get('min_fee'), '20000');
    assert.equal(parsed.searchParams.get('max_fee'), '100000');
    assert.equal(parsed.searchParams.get('page'), '2');
    assert.equal(parsed.searchParams.get('page_size'), '15');
  } finally {
    restore();
  }
});

test('[P0] Lịch sử xe vào/ra: Mapping session giữ đúng phí, trạng thái, thời gian an toàn và vehicle lookup', () => {
  const mapped = mapSessionToFrontend({
    id: 99,
    session_code: 'SES-99',
    license_plate: '29A-888.88',
    vehicle_type: 'Ô tô',
    entry_time: '2026-10-28T07:30:00Z',
    exit_time: '2026-10-28T10:30:00Z',
    entry_gate_name: 'Cổng Vào 1',
    exit_gate_name: 'Cổng Ra 2',
    duration_text: '3 giờ 00 phút',
    duration_seconds: 10800,
    fee_amount: '60000',
    status: 'CLOSED',
    review_status: 'AUTO',
    plate_image_url: 'https://cdn.example.com/plates/29A.jpg',
    vehicle_lookup: {
      vehicle: { id: 5, license_plate: '29A-888.88' },
      customer: { full_name: 'Phạm Thị D' },
    },
  });

  assert.equal(mapped.id, 99);
  assert.equal(mapped.sessionCode, 'SES-99');
  assert.equal(mapped.licensePlate, '29A-888.88');
  assert.equal(mapped.feeNumber, 60000);
  assert.match(mapped.fee, /60\.000/);
  assert.equal(mapped.status, 'CLOSED');
  assert.equal(mapped.reviewStatus, 'AUTO');
  assert.equal(mapped.entryGate, 'Cổng Vào 1');
  assert.equal(mapped.exitGate, 'Cổng Ra 2');
  assert.equal(mapped.duration, '3 giờ 00 phút');
  assert.equal(mapped.plateImageUrl, 'https://cdn.example.com/plates/29A.jpg');
  assert.equal(mapped.vehicle.customer.name, 'Phạm Thị D');

  // Test trường hợp phí rỗng (null/undefined)
  const emptyFeeMapped = mapSessionToFrontend({ id: 100, fee: null });
  assert.equal(emptyFeeMapped.feeNumber, 0);
  assert.equal(emptyFeeMapped.fee, '—');
});

/* =========================================================================
   P1: NHẬN DIỆN BIỂN SỐ TỪ ẢNH
   Kiểm tra multipart upload, gate_id, response không tìm thấy xe, lỗi API
   ========================================================================= */

test('[P1] Nhận diện biển số từ ảnh: Gửi multipart upload chứa file ảnh và gate_id', async () => {
  const restore = installBrowserMocks();
  let received = null;

  globalThis.fetch = async (url, options) => {
    received = { url, options };
    return jsonResponse({
      review_status: 'AUTO',
      plate_normalized: '51K12345',
      vehicle_lookup: { vehicle: { id: 10, license_plate: '51K-123.45' } },
    });
  };

  try {
    const dummyBlob = new Blob(['image-bytes-mock'], { type: 'image/jpeg' });
    const result = await scanPlateImage(dummyBlob, 5);

    assert.equal(received.url, '/api/v1/parking/plate-scans/');
    assert.equal(received.options.method, 'POST');
    assert.ok(received.options.body instanceof FormData);
    assert.equal(received.options.body.get('gate_id'), '5');
    assert.equal(received.options.body.get('image').type, 'image/jpeg');
    assert.equal(result.plate_normalized, '51K12345');
  } finally {
    restore();
  }
});

test('[P1] Nhận diện biển số từ ảnh: Xử lý an toàn khi scan không tìm thấy xe hoặc API scan báo lỗi', async () => {
  const restore = installBrowserMocks();

  // 1. Backend OCR nhận diện được biển số nhưng xe chưa đăng ký trong bãi
  const scanWithoutVehicle = {
    review_status: 'NEEDS_REVIEW',
    plate_normalized: '51UNKNOWN',
    vehicle_lookup: { vehicle: null },
  };
  assert.equal(mapPlateScanToVehicle(scanWithoutVehicle), null);
  assert.equal(mapPlateScanToVehicle({}), null);

  // 2. API trả lỗi (e.g. ảnh hỏng / 400 Bad Request)
  globalThis.fetch = async () => {
    return jsonResponse({ message: 'Không thể nhận diện biển số từ ảnh chụp' }, 400);
  };

  try {
    const dummyBlob = new Blob(['corrupted'], { type: 'image/jpeg' });
    await assert.rejects(
      () => scanPlateImage(dummyBlob, 1),
      (err) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /Không thể nhận diện biển số/);
        return true;
      }
    );
  } finally {
    restore();
  }
});

/* =========================================================================
   P1: ĐĂNG XUẤT
   Có rủi ro bảo mật nếu session cũ vẫn còn -> Kiểm tra xóa toàn bộ localStorage và sessionStorage
   ========================================================================= */

test('[P1] Đăng xuất: Xóa sạch toàn bộ sp_user và sp_auth_token khỏi cả localStorage và sessionStorage', async () => {
  const restore = installBrowserMocks();
  try {
    // Đặt sẵn dữ liệu nhạy cảm trong cả hai kho lưu trữ
    localStorage.setItem('sp_user', JSON.stringify({ id: 1, role: 'ADMIN' }));
    localStorage.setItem('sp_auth_token', 'local-token-secret');
    sessionStorage.setItem('sp_user', JSON.stringify({ id: 1, role: 'ADMIN' }));
    sessionStorage.setItem('sp_auth_token', 'session-token-secret');

    const logoutResult = await authService.logout();
    assert.equal(logoutResult, true);

    // Đảm bảo không còn sót bất kỳ token hay thông tin user nào
    assert.equal(localStorage.has('sp_user'), false);
    assert.equal(localStorage.has('sp_auth_token'), false);
    assert.equal(sessionStorage.has('sp_user'), false);
    assert.equal(sessionStorage.has('sp_auth_token'), false);
  } finally {
    restore();
  }
});

/* =========================================================================
   P1: MAP DỮ LIỆU XE (FALLBACK AN TOÀN)
   Backend đổi field nhưng UI vẫn hiển thị fallback chuẩn mà không crash
   ========================================================================= */

test('[P1] Map dữ liệu xe: Xử lý an toàn với các trường bắt buộc và fallback khi thiếu field', () => {
  // Backend trả về object thiếu hầu hết các trường lồng nhau
  const partialItem = {
    id: 55,
    license_plate: '43A-567.89',
    vehicle_type: 'Ô tô con',
  };

  const mapped = mapVehicleSearchItem(partialItem);

  assert.equal(mapped.id, 55);
  assert.equal(mapped.licensePlate, '43A-567.89');
  assert.equal(mapped.brand, '—');
  assert.equal(mapped.model, '—');
  assert.equal(mapped.customer.name, '—');
  assert.equal(mapped.customer.phone, '—');
  assert.equal(mapped.customer.email, '—');
  assert.equal(mapped.parkingSlot.display, 'Chưa có vị trí');
  assert.equal(mapped.ticket.type, '—');
  assert.equal(mapped.ticket.status, 'expired');
  assert.equal(mapped.ticket.remainingDays, 0);

  // Thử trường hợp item hoàn toàn rỗng {}
  assert.doesNotThrow(() => mapVehicleSearchItem({}));
});

/* =========================================================================
   P2: QUẢN LÝ CRUD XE
   Kiểm tra payload create/update/delete và lỗi không được hiển thị thành công giả
   ========================================================================= */

test('[P2] Quản lý CRUD xe: Gửi đúng endpoint, method và payload JSON', async () => {
  const restore = installBrowserMocks();
  const requests = [];

  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    if (url.includes('/csrf/')) return new Response('', { status: 200 });
    return jsonResponse({ id: 18, message: 'Thao tác thành công' });
  };

  const vehicleModel = {
    id: 'XE0018',
    licensePlate: '30A-999.88',
    vehicleType: 'Ô tô',
    customer: { name: 'Vũ Văn H', phone: '0988776655' },
    parkingSlot: { display: 'B1-B08' },
    status: 'active',
  };

  try {
    // 1. Create
    await vehicleService.create(vehicleModel);
    // 2. Update
    await vehicleService.update({ ...vehicleModel, backendId: 18 });
    // 3. Delete
    await vehicleService.remove({ ...vehicleModel, backendId: 18 });

    const crudRequests = requests.filter((r) => !r.url.includes('/csrf/'));
    assert.equal(crudRequests.length, 3);

    // Create POST
    assert.equal(crudRequests[0].url, '/api/v1/vehicles/');
    assert.equal(crudRequests[0].options.method, 'POST');
    assert.deepEqual(JSON.parse(crudRequests[0].options.body), {
      license_plate: '30A-999.88',
      vehicle_type: 'Ô tô',
      customer_name: 'Vũ Văn H',
      customer_phone: '0988776655',
      parking_position: 'B1-B08',
      status: 'active',
    });

    // Update PATCH
    assert.equal(crudRequests[1].url, '/api/v1/vehicles/18/');
    assert.equal(crudRequests[1].options.method, 'PATCH');

    // Delete DELETE
    assert.equal(crudRequests[2].url, '/api/v1/vehicles/18/');
    assert.equal(crudRequests[2].options.method, 'DELETE');
  } finally {
    restore();
  }
});

test('[P2] Quản lý CRUD xe: Lỗi từ backend (400, 500) phải ném exception, không được báo thành công giả', async () => {
  const restore = installBrowserMocks();

  globalThis.fetch = async (url) => {
    if (url.includes('/csrf/')) return new Response('', { status: 200 });
    return jsonResponse({ license_plate: ['Biển số xe đã tồn tại trong hệ thống.'] }, 400);
  };

  const vehicleModel = {
    licensePlate: '51F-111.11',
    vehicleType: 'Ô tô',
    customer: { name: 'Nguyễn Văn Test', phone: '0901234567' },
    parkingSlot: { display: 'A-01' },
    status: 'active',
  };

  try {
    await assert.rejects(
      () => vehicleService.create(vehicleModel),
      (err) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /Biển số xe đã tồn tại/);
        return true;
      }
    );

    // Đảm bảo update khi gặp 500 cũng reject
    globalThis.fetch = async (url) => {
      if (url.includes('/csrf/')) return new Response('', { status: 200 });
      return jsonResponse({ detail: 'Lỗi máy chủ nội bộ' }, 500);
    };

    await assert.rejects(
      () => vehicleService.update({ ...vehicleModel, backendId: 999 }),
      (err) => {
        assert.equal(err.status, 500);
        return true;
      }
    );
  } finally {
    restore();
  }
});

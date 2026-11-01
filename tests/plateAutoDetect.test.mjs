import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SCAN_STATES,
  STATUS_MESSAGES,
  calculateMeanAbsoluteDifference,
  checkStability,
  computeDownscaledDimensions,
  computeGrayscaleThumbnail,
  createPlateAutoDetectMachine,
  extractScanConfidence,
  formatReviewReasons,
  isStaticScene,
  scaleBoundingBox,
  selectBestCandidateFrame,
} from '../src/utils/plateAutoDetect.js';
import { API_UNAVAILABLE_MESSAGE, apiClient } from '../src/services/apiClient.js';
import { scanPlate } from '../src/services/plateScanService.js';

function makeThumb(fillValue, length = 768) {
  return new Uint8Array(length).fill(fillValue);
}

function makeFrameCapture(label = 'frame', width = 1280, height = 720) {
  return async () => ({
    blob: new Blob([label], { type: 'image/jpeg' }),
    width,
    height,
  });
}

function makeScanResponse(plateFinal, confidence = 96.5, box = { x1: 100, y1: 200, x2: 420, y2: 300 }) {
  return {
    plate_raw: plateFinal,
    plate_final: plateFinal,
    best_candidate: {
      plate_text: plateFinal,
      plate_normalized: plateFinal,
      confidence,
      bounding_box: box,
    },
    image_url: null,
    review_status: 'AUTO',
    review_reasons: [],
  };
}

test('1. Stability voting (3 of 4) and highest-confidence frame selection', () => {
  assert.deepEqual(checkStability([]), { isStable: false, stablePlate: null, count: 0 });
  assert.equal(checkStability(['51K99214', '51K99214']).isStable, false);

  const stable3 = checkStability(['51K99214', '51K99214', '51K99214']);
  assert.equal(stable3.isStable, true);
  assert.equal(stable3.stablePlate, '51K99214');
  assert.equal(stable3.count, 3);

  const outlier = checkStability(['51K99214', '51K99219', '51K99214', '51K99214']);
  assert.equal(outlier.isStable, true);
  assert.equal(outlier.stablePlate, '51K99214');

  const split22 = checkStability(['51K99214', '30A12345', '51K99214', '30A12345']);
  assert.equal(split22.isStable, false);

  const sliding = checkStability(['30A11111', '30A11111', '51K99214', '51K99214', '51K99214']);
  assert.equal(sliding.isStable, true);
  assert.equal(sliding.stablePlate, '51K99214');

  const frames = [
    { blob: { id: 'low' }, scanResult: makeScanResponse('51K99214', 84.2) },
    { blob: { id: 'high' }, scanResult: makeScanResponse('51K99214', 98.7) },
    { blob: { id: 'other' }, scanResult: makeScanResponse('30A12345', 99.9) },
  ];
  const best = selectBestCandidateFrame(frames, '51K99214');
  assert.equal(best.blob.id, 'high');
  assert.equal(extractScanConfidence(best.scanResult), 98.7);
});

test('2. Downscaling dimensions and grayscale motion-gating helpers', () => {
  assert.deepEqual(computeDownscaledDimensions(1920, 1080, 1280), {
    width: 1280,
    height: 720,
    scale: 1280 / 1920,
  });
  assert.deepEqual(computeDownscaledDimensions(640, 480, 1280), {
    width: 640,
    height: 480,
    scale: 1,
  });

  const rgba = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
  const gray = computeGrayscaleThumbnail({ data: rgba }, 2);
  assert.equal(gray[0], 255);
  assert.equal(gray[1], 0);
  assert.equal(calculateMeanAbsoluteDifference(makeThumb(100, 16), makeThumb(102, 16)), 2);
  assert.equal(isStaticScene(makeThumb(100, 16), makeThumb(102, 16), 5.0), true);
  assert.equal(isStaticScene(makeThumb(100, 16), makeThumb(125, 16), 5.0), false);
});

test('3. Bounding-box scaling for CSS object-fit cover and contain', () => {
  const box = { x1: 100, y1: 100, x2: 300, y2: 200 };

  // Cover: 1280x720 video inside 640x480 box -> scale = 480/720 = 2/3, offsetX = (640 - 853.33)/2 = -106.67
  const coverTaller = scaleBoundingBox({
    box,
    sourceWidth: 1280,
    sourceHeight: 720,
    containerWidth: 640,
    containerHeight: 480,
    fitMode: 'cover',
  });
  assert.ok(Math.abs(coverTaller.left - -40) < 0.05);
  assert.ok(Math.abs(coverTaller.top - 66.67) < 0.05);
  assert.ok(Math.abs(coverTaller.width - 133.33) < 0.05);
  assert.ok(Math.abs(coverTaller.height - 66.67) < 0.05);

  // Contain: 1280x720 video inside 1280x1000 box -> letterbox scale = 1, offsetY = (1000 - 720)/2 = 140
  const containLetterbox = scaleBoundingBox({
    box,
    sourceWidth: 1280,
    sourceHeight: 720,
    containerWidth: 1280,
    containerHeight: 1000,
    fitMode: 'contain',
  });
  assert.deepEqual(containLetterbox, {
    left: 100,
    top: 240,
    width: 200,
    height: 100,
  });

  // Contain pillarbox: 720x720 video inside 1000x500 box -> scale = 500/720, offsetX = 250
  const containPillarbox = scaleBoundingBox({
    box: { x1: 72, y1: 72, x2: 216, y2: 144 },
    sourceWidth: 720,
    sourceHeight: 720,
    containerWidth: 1000,
    containerHeight: 500,
    fitMode: 'contain',
  });
  assert.deepEqual(containPillarbox, {
    left: 300,
    top: 50,
    width: 100,
    height: 50,
  });

  assert.equal(
    scaleBoundingBox({
      box: null,
      sourceWidth: 1280,
      sourceHeight: 720,
      containerWidth: 640,
      containerHeight: 360,
    }),
    null
  );
});

test('4. State machine enforces single in-flight, <= 1 req/s rate limit, and preview=true', async () => {
  let now = 10_000;
  let calls = [];
  let resolveFirst;

  const machine = createPlateAutoDetectMachine({
    nowFn: () => now,
    scanFn: (args) => {
      calls.push(args);
      return new Promise((resolve) => {
        resolveFirst = resolve;
      });
    },
  });

  machine.startSearching();

  // Start first tick; do not resolve scanFn yet
  const firstPromise = machine.tick({
    thumbnail: makeThumb(50),
    captureFrame: makeFrameCapture('f1'),
    gateId: 2,
  });

  // While first request is in flight, even 5 seconds later a second tick must be skipped
  now += 5000;
  const overlappingResult = await machine.tick({
    thumbnail: makeThumb(90),
    captureFrame: makeFrameCapture('f2'),
  });
  assert.equal(overlappingResult.action, 'skipped_in_flight');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].preview, true);
  assert.equal(calls[0].gateId, 2);

  resolveFirst(makeScanResponse('43K86050', 95.0));
  const firstOutcome = await firstPromise;
  assert.equal(firstOutcome.action, 'confirming');
  assert.equal(machine.getSnapshot().scanState, SCAN_STATES.CONFIRMING);

  // Advance only 400ms (< 1000ms rate limit) -> must skip due to rate limit
  now += 400;
  const rateLimited = await machine.tick({
    thumbnail: makeThumb(120),
    captureFrame: makeFrameCapture('f3'),
  });
  assert.equal(rateLimited.action, 'skipped_rate_limit');
  assert.equal(calls.length, 1);
});

test('5. State machine skips static scene ONLY when last answer was 422, and keeps searching on 422', async () => {
  let now = 20_000;
  let callCount = 0;

  const machine = createPlateAutoDetectMachine({
    nowFn: () => now,
    scanFn: async () => {
      callCount += 1;
      const err = new Error('Không nhận diện được biển số xe từ hình ảnh đã cung cấp.');
      err.status = 422;
      throw err;
    },
  });

  machine.startSearching();

  // First frame returns 422 -> state remains SEARCHING with "Đang tìm biển số…"
  const r1 = await machine.tick({
    thumbnail: makeThumb(80),
    captureFrame: makeFrameCapture('empty1'),
  });
  assert.equal(r1.action, 'no_plate_422');
  assert.equal(machine.getSnapshot().scanState, SCAN_STATES.SEARCHING);
  assert.equal(machine.getSnapshot().statusMessage, STATUS_MESSAGES.SEARCHING);
  assert.equal(callCount, 1);

  // Next second: scene is static (80 vs 82 -> MAD 2 < 5) and last answer was 422 -> skipped!
  now += 1200;
  let captureCalled = false;
  const r2 = await machine.tick({
    thumbnail: makeThumb(82),
    captureFrame: async () => {
      captureCalled = true;
      return { blob: new Blob(['x']), width: 640, height: 360 };
    },
  });
  assert.equal(r2.action, 'skipped_static_422');
  assert.equal(captureCalled, false);
  assert.equal(callCount, 1);

  // Next second: vehicle enters scene (82 vs 140 -> MAD 58 >= 5) -> sent!
  now += 1200;
  const r3 = await machine.tick({
    thumbnail: makeThumb(140),
    captureFrame: makeFrameCapture('moving'),
  });
  assert.equal(r3.action, 'no_plate_422');
  assert.equal(callCount, 2);
});

test('6. State machine obeys 503 Retry-After, 429 backoff, network backoff with apiClient message, and 401/403 stop', async () => {
  let now = 50_000;
  let nextError = null;
  let callCount = 0;

  const machine = createPlateAutoDetectMachine({
    nowFn: () => now,
    scanFn: async () => {
      callCount += 1;
      throw nextError;
    },
  });

  machine.startSearching();

  // 503 with Retry-After: 4
  nextError = Object.assign(new Error('Overloaded'), { status: 503, retryAfter: 4 });
  const r503 = await machine.tick({
    thumbnail: makeThumb(40),
    captureFrame: makeFrameCapture('f503'),
  });
  assert.equal(r503.action, 'backoff_503');
  assert.equal(r503.retrySeconds, 4);

  // 2.5s later (< 4s Retry-After) -> skipped_backoff
  now += 2500;
  const during503 = await machine.tick({
    thumbnail: makeThumb(90),
    captureFrame: makeFrameCapture('f_skip'),
  });
  assert.equal(during503.action, 'skipped_backoff');
  assert.equal(callCount, 1);

  // After 4s -> dispatches again; test network failure surfacing apiClient message
  now += 2000;
  nextError = Object.assign(new Error(API_UNAVAILABLE_MESSAGE), { code: 'API_UNAVAILABLE' });
  const rNet = await machine.tick({
    thumbnail: makeThumb(120),
    captureFrame: makeFrameCapture('f_net'),
  });
  assert.equal(rNet.action, 'backoff_network');
  assert.equal(machine.getSnapshot().statusMessage, API_UNAVAILABLE_MESSAGE);

  // After network backoff -> test 429 backoff
  now += 2500;
  nextError = Object.assign(new Error('Too Many Requests'), { status: 429 });
  const r429 = await machine.tick({
    thumbnail: makeThumb(160),
    captureFrame: makeFrameCapture('f_429'),
  });
  assert.equal(r429.action, 'backoff_429');

  // After 429 backoff -> test 403 stopping loop and exposing backend message
  now += 3000;
  nextError = Object.assign(new Error('Bạn không có quyền thực hiện thao tác này.'), {
    status: 403,
    data: { code: 'MSG-4.2-M01', message: 'Bạn không có quyền thực hiện thao tác này.' },
  });
  const r403 = await machine.tick({
    thumbnail: makeThumb(200),
    captureFrame: makeFrameCapture('f_403'),
  });
  assert.equal(r403.action, 'stopped_auth');
  assert.equal(machine.getSnapshot().scanState, SCAN_STATES.ERROR);
  assert.equal(
    machine.getSnapshot().errorMessage,
    'Bạn không có quyền thực hiện thao tác này.'
  );

  // Subsequent ticks must not run once stopped in ERROR state
  now += 5000;
  const after403 = await machine.tick({
    thumbnail: makeThumb(10),
    captureFrame: makeFrameCapture('f_dead'),
  });
  assert.equal(after403.action, 'skipped_inactive');
});

test('7. State machine aborts in-flight request on stop/close and handles authoritative apply (preview=false) + mismatch', async () => {
  let now = 80_000;
  let capturedSignal = null;

  const abortMachine = createPlateAutoDetectMachine({
    nowFn: () => now,
    scanFn: ({ signal }) => {
      capturedSignal = signal;
      return new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          const abortErr = new Error('Aborted');
          abortErr.name = 'AbortError';
          reject(abortErr);
        });
      });
    },
  });

  abortMachine.startSearching();
  const pendingTick = abortMachine.tick({
    thumbnail: makeThumb(30),
    captureFrame: makeFrameCapture('abort_frame'),
  });
  // Yield microtask so captureFrame resolves and scanFn starts
  await Promise.resolve();
  assert.ok(capturedSignal);
  assert.equal(capturedSignal.aborted, false);

  abortMachine.stop();
  assert.equal(capturedSignal.aborted, true);
  const abortedOutcome = await pendingTick;
  assert.equal(abortedOutcome.action, 'aborted');
  assert.equal(abortMachine.getSnapshot().scanState, SCAN_STATES.IDLE);

  // Full 3-of-4 detection + best-frame retention + authoritative apply + mismatch check
  const previewFrames = [
    { conf: 88.0, label: 'low_conf_blob' },
    { conf: 99.2, label: 'best_conf_blob' },
    { conf: 91.5, label: 'mid_conf_blob' },
  ];
  let idx = 0;
  let applyCalls = [];
  let authoritativePlate = '30G99999'; // First simulate mismatch against previewed 43K86050

  const fullMachine = createPlateAutoDetectMachine({
    nowFn: () => now,
    scanFn: async ({ imageBlob, preview }) => {
      if (preview) {
        const item = previewFrames[idx];
        idx += 1;
        return makeScanResponse('43K86050', item.conf);
      }
      applyCalls.push(imageBlob);
      return {
        ...makeScanResponse(authoritativePlate, 99.2),
        image_url: 'https://res.cloudinary.com/demo/image/upload/v1/plate.jpg',
      };
    },
  });

  fullMachine.startSearching();
  for (let i = 0; i < 3; i += 1) {
    now += 1100;
    const label = previewFrames[i].label;
    await fullMachine.tick({
      thumbnail: makeThumb(20 + i * 30),
      captureFrame: async () => ({
        blob: new Blob([label], { type: 'image/jpeg' }),
        width: 1280,
        height: 720,
      }),
    });
  }

  assert.equal(fullMachine.getSnapshot().scanState, SCAN_STATES.DETECTED);
  assert.equal(await fullMachine.getSnapshot().bestFrameBlob.text(), 'best_conf_blob');

  // First apply: backend returns 30G99999 !== previewed 43K86050 -> mismatch asks re-confirmation
  const mismatchRes = await fullMachine.apply({ gateId: 1 });
  assert.equal(mismatchRes.success, false);
  assert.equal(mismatchRes.mismatch, true);
  assert.equal(fullMachine.getSnapshot().detectedData.plate_final, '30G99999');
  assert.equal(await applyCalls[0].text(), 'best_conf_blob');

  // Second apply: operator confirms 30G99999 and backend returns 30G99999 -> success!
  const confirmedRes = await fullMachine.apply({ gateId: 1 });
  assert.equal(confirmedRes.success, true);
  assert.equal(confirmedRes.data.plate_final, '30G99999');
  assert.ok(confirmedRes.data.image_url);
});

test('8. apiClient FormData multipart boundary support, AbortError passthrough, and review reason mapping', async () => {
  assert.deepEqual(formatReviewReasons(['LOW_CHAR_CONFIDENCE', 'POSITION_CORRECTED', 'CUSTOM']), [
    'Độ tin cậy ký tự thấp',
    'Đã tự động sửa ký tự theo quy tắc',
    'CUSTOM',
  ]);

  const origDoc = globalThis.document;
  const origFetch = globalThis.fetch;
  globalThis.document = { cookie: 'csrftoken=test-csrf-token' };

  try {
    let capturedReq = null;
    globalThis.fetch = async (url, init) => {
      capturedReq = { url, init };
      return new Response(JSON.stringify(makeScanResponse('51K99214', 97.5)), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const res = await scanPlate({
      imageBlob: new Blob(['jpeg-bytes'], { type: 'image/jpeg' }),
      preview: true,
      gateId: 3,
    });
    assert.equal(res.plate_final, '51K99214');
    assert.equal(capturedReq.url, '/api/v1/parking/plate-scans/');
    assert.equal(capturedReq.init.headers['Content-Type'], undefined);
    assert.equal(capturedReq.init.headers['X-CSRFToken'], 'test-csrf-token');
    assert.equal(capturedReq.init.body.get('preview'), 'true');
    assert.equal(capturedReq.init.body.get('gate_id'), '3');

    // Verify AbortError is rethrown as AbortError and NOT wrapped into API_UNAVAILABLE
    globalThis.fetch = async () => {
      const abortErr = new Error('The operation was aborted.');
      abortErr.name = 'AbortError';
      throw abortErr;
    };
    await assert.rejects(
      () => apiClient('/api/v1/parking/plate-scans/', { method: 'GET' }),
      (err) => err.name === 'AbortError'
    );
  } finally {
    globalThis.document = origDoc;
    globalThis.fetch = origFetch;
  }
});

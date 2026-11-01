/**
 * Pure functions and state machine for real-time license plate auto-detection.
 * Kept free of React and DOM globals so every rule can be verified deterministically under node:test.
 */

export const SCAN_STATES = {
  IDLE: 'IDLE',
  SEARCHING: 'SEARCHING',
  CONFIRMING: 'CONFIRMING',
  DETECTED: 'DETECTED',
  APPLYING: 'APPLYING',
  ERROR: 'ERROR',
};

export const STATUS_MESSAGES = {
  SEARCHING: 'Đang tìm biển số…',
  CONFIRMING: 'Đã thấy biển số, đang xác nhận…',
  DETECTED: 'Đã nhận diện ổn định biển số xe.',
  BUSY_503: 'Hệ thống nhận diện đang quá tải, tự động thử lại sau ít giây…',
  RATE_LIMITED_429: 'Tốc độ gửi khung hình tạm giới hạn, đang tự động thử lại…',
};

export const REVIEW_REASON_LABELS = {
  LOW_CHAR_CONFIDENCE: 'Độ tin cậy ký tự thấp',
  POSITION_CORRECTED: 'Đã tự động sửa ký tự theo quy tắc',
  MODEL_DISAGREEMENT: 'Hai mô hình nhận diện cho kết quả khác nhau',
  INVALID_FORMAT: 'Định dạng biển số không chuẩn',
  UNKNOWN_PLATE_PATTERN: 'Kiểu biển số chưa định danh',
  NO_DETECTION_RETRY: 'Nhận diện lại vị trí biển số',
  LOW_DETECTION_CONFIDENCE: 'Độ tin cậy phát hiện biển số thấp',
  IRREGULAR_ASPECT_RATIO: 'Khung biển số bị lệch/nghiêng',
  LOW_IMAGE_SHARPNESS: 'Hình ảnh mờ hoặc rung',
};

/**
 * Format backend review reason codes to Vietnamese labels.
 *
 * @param {string[]} [reasons=[]]
 * @returns {string[]}
 */
export function formatReviewReasons(reasons = []) {
  if (!Array.isArray(reasons)) return [];
  return reasons.map((code) => REVIEW_REASON_LABELS[code] || code);
}

/**
 * Compute downscaled frame dimensions whose longer side never exceeds maxLongSide.
 *
 * @param {number} sourceWidth
 * @param {number} sourceHeight
 * @param {number} [maxLongSide=1280]
 * @returns {{ width: number, height: number, scale: number }}
 */
export function computeDownscaledDimensions(sourceWidth, sourceHeight, maxLongSide = 1280) {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: 0, height: 0, scale: 0 };
  }
  const longSide = Math.max(sourceWidth, sourceHeight);
  const scale = longSide > maxLongSide ? maxLongSide / longSide : 1;
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
    scale,
  };
}

/**
 * Compute a 1D grayscale array from an RGBA buffer or ImageData using ITU-R BT.601 luma weights.
 *
 * @param {Uint8ClampedArray|Uint8Array|number[]|{ data: Uint8ClampedArray|Uint8Array }} rgbaSource
 * @param {number} [targetPixels=768]
 * @returns {Uint8Array}
 */
export function computeGrayscaleThumbnail(rgbaSource, targetPixels = 768) {
  const data = rgbaSource && rgbaSource.data ? rgbaSource.data : rgbaSource;
  if (!data || data.length === 0) {
    return new Uint8Array(0);
  }

  const numPixels = Math.min(Math.floor(data.length / 4), targetPixels);
  const grayscale = new Uint8Array(numPixels);

  for (let i = 0; i < numPixels; i += 1) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    grayscale[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  return grayscale;
}

/**
 * Calculate mean absolute pixel difference between two equal-sized grayscale buffers.
 *
 * @param {Uint8Array} grayA
 * @param {Uint8Array} grayB
 * @returns {number}
 */
export function calculateMeanAbsoluteDifference(grayA, grayB) {
  if (!grayA || !grayB || grayA.length === 0 || grayB.length === 0) {
    return Infinity;
  }
  if (grayA.length !== grayB.length) {
    return Infinity;
  }

  let totalDiff = 0;
  for (let i = 0; i < grayA.length; i += 1) {
    totalDiff += Math.abs(grayA[i] - grayB[i]);
  }

  return totalDiff / grayA.length;
}

/**
 * Decide whether consecutive thumbnails represent a static scene.
 *
 * @param {Uint8Array} grayA
 * @param {Uint8Array} grayB
 * @param {number} [threshold=5.0]
 * @returns {boolean}
 */
export function isStaticScene(grayA, grayB, threshold = 5.0) {
  return calculateMeanAbsoluteDifference(grayA, grayB) < threshold;
}

/**
 * 3-of-4 temporal stability voting.
 *
 * @param {Array<string|{ plate_final?: string }>} historyWindow
 * @param {number} [minMatches=3]
 * @param {number} [windowSize=4]
 * @returns {{ isStable: boolean, stablePlate: string | null, count: number }}
 */
export function checkStability(historyWindow = [], minMatches = 3, windowSize = 4) {
  if (!Array.isArray(historyWindow) || historyWindow.length === 0) {
    return { isStable: false, stablePlate: null, count: 0 };
  }

  const recentItems = historyWindow.slice(-windowSize);
  const plateCounts = new Map();

  for (const item of recentItems) {
    const rawPlate = typeof item === 'object' && item !== null ? item.plate_final : item;
    if (typeof rawPlate === 'string') {
      const plate = rawPlate.trim();
      if (plate.length > 0) {
        plateCounts.set(plate, (plateCounts.get(plate) || 0) + 1);
      }
    }
  }

  let topPlate = null;
  let maxCount = 0;
  for (const [plate, count] of plateCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      topPlate = plate;
    }
  }

  if (maxCount >= minMatches && topPlate !== null) {
    return { isStable: true, stablePlate: topPlate, count: maxCount };
  }

  return { isStable: false, stablePlate: null, count: maxCount };
}

/**
 * Extract numeric confidence on 0..100 scale from a backend PlateScanResponseSerializer payload.
 *
 * @param {Object|null|undefined} scanResult
 * @returns {number|null}
 */
export function extractScanConfidence(scanResult) {
  if (!scanResult || typeof scanResult !== 'object') return null;
  if (typeof scanResult.best_candidate?.confidence === 'number') {
    return scanResult.best_candidate.confidence;
  }
  if (typeof scanResult.confidence === 'number') {
    return scanResult.confidence;
  }
  return null;
}

/**
 * Select the highest-confidence candidate frame matching stablePlate.
 *
 * @param {Array<{ blob: Blob, scanResult: Object, timestamp?: number }>} candidateFrames
 * @param {string|null} [stablePlate=null]
 * @returns {{ blob: Blob, scanResult: Object, timestamp?: number } | null}
 */
export function selectBestCandidateFrame(candidateFrames = [], stablePlate = null) {
  if (!Array.isArray(candidateFrames) || candidateFrames.length === 0) {
    return null;
  }

  let eligible = candidateFrames;
  if (stablePlate) {
    const matched = candidateFrames.filter(
      (frame) => frame?.scanResult?.plate_final === stablePlate
    );
    if (matched.length > 0) {
      eligible = matched;
    }
  }

  let bestFrame = null;
  let maxConfidence = -Infinity;

  for (const frame of eligible) {
    if (!frame || !frame.blob || !frame.scanResult) continue;
    const conf = extractScanConfidence(frame.scanResult) ?? 0;
    if (conf > maxConfidence) {
      maxConfidence = conf;
      bestFrame = frame;
    }
  }

  return bestFrame;
}

/**
 * Scale a backend bounding box { x1, y1, x2, y2 } from sent image pixel coordinates
 * to displayed video container coordinates accounting for CSS object-fit ('cover' or 'contain').
 *
 * @param {Object} params
 * @param {{ x1: number, y1: number, x2: number, y2: number }} params.box
 * @param {number} params.sourceWidth
 * @param {number} params.sourceHeight
 * @param {number} params.containerWidth
 * @param {number} params.containerHeight
 * @param {'cover'|'contain'} [params.fitMode='cover']
 * @returns {{ left: number, top: number, width: number, height: number } | null}
 */
export function scaleBoundingBox({
  box,
  sourceWidth,
  sourceHeight,
  containerWidth,
  containerHeight,
  fitMode = 'cover',
}) {
  if (
    !box ||
    typeof box.x1 !== 'number' ||
    typeof box.y1 !== 'number' ||
    typeof box.x2 !== 'number' ||
    typeof box.y2 !== 'number' ||
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    containerWidth <= 0 ||
    containerHeight <= 0
  ) {
    return null;
  }

  const sourceAspect = sourceWidth / sourceHeight;
  const containerAspect = containerWidth / containerHeight;

  let scale;
  let offsetX;
  let offsetY;

  if (fitMode === 'contain') {
    if (containerAspect > sourceAspect) {
      scale = containerHeight / sourceHeight;
      const renderedWidth = sourceWidth * scale;
      offsetX = (containerWidth - renderedWidth) / 2;
      offsetY = 0;
    } else {
      scale = containerWidth / sourceWidth;
      const renderedHeight = sourceHeight * scale;
      offsetX = 0;
      offsetY = (containerHeight - renderedHeight) / 2;
    }
  } else if (containerAspect > sourceAspect) {
    scale = containerWidth / sourceWidth;
    const renderedHeight = sourceHeight * scale;
    offsetX = 0;
    offsetY = (containerHeight - renderedHeight) / 2;
  } else {
    scale = containerHeight / sourceHeight;
    const renderedWidth = sourceWidth * scale;
    offsetX = (containerWidth - renderedWidth) / 2;
    offsetY = 0;
  }

  const rawLeft = offsetX + box.x1 * scale;
  const rawTop = offsetY + box.y1 * scale;
  const rawWidth = Math.max(0, (box.x2 - box.x1) * scale);
  const rawHeight = Math.max(0, (box.y2 - box.y1) * scale);

  return {
    left: Math.round(rawLeft * 100) / 100,
    top: Math.round(rawTop * 100) / 100,
    width: Math.round(rawWidth * 100) / 100,
    height: Math.round(rawHeight * 100) / 100,
  };
}

/**
 * Pure continuous plate auto-detection state machine (F2, F3, F4).
 *
 * Enforces:
 * - At most 1 request per rateLimitMs (default 1000ms).
 * - Strictly 1 request in flight (synchronous lock acquired before frame capture).
 * - Motion gating: skips frame capture/send when thumbnail is static AND last response was 422.
 * - 3-of-4 temporal voting + highest-confidence frame retention.
 * - AbortController cancellation on stop/close/reset.
 * - Backoff on 503 (obeying Retry-After), 429, and network failure (surfacing apiClient connection message).
 * - Immediate loop stop on 401/403 surfacing backend message.
 * - Authoritative apply (preview=false) comparing against the previewed plate_final.
 */
export function createPlateAutoDetectMachine({
  scanFn,
  nowFn = () => Date.now(),
  onStateChange = null,
  rateLimitMs = 1000,
  staticThreshold = 5.0,
  minMatches = 3,
  windowSize = 4,
  maxCandidateFrames = 8,
  default503BackoffSec = 3,
  rateLimit429BackoffMs = 2500,
  networkBackoffMs = 2000,
} = {}) {
  if (typeof scanFn !== 'function') {
    throw new Error('createPlateAutoDetectMachine requires a scanFn function.');
  }

  let scanState = SCAN_STATES.IDLE;
  let statusMessage = STATUS_MESSAGES.SEARCHING;
  let errorMessage = '';
  let detectedData = null;
  let rawBoundingBox = null;
  let sourceDimensions = { width: 0, height: 0 };

  let inFlight = false;
  let abortController = null;
  let generation = 0;
  let lastRequestAt = 0;
  let backoffUntil = 0;
  let lastResponseWas422 = false;
  let previousThumbnail = null;
  let history = [];
  let candidateFrames = [];
  let bestFrameBlob = null;

  function getSnapshot() {
    return {
      scanState,
      statusMessage,
      errorMessage,
      detectedData,
      rawBoundingBox,
      sourceDimensions,
      inFlight,
      lastRequestAt,
      backoffUntil,
      lastResponseWas422,
      history: [...history],
      bestFrameBlob,
    };
  }

  function emit() {
    if (typeof onStateChange === 'function') {
      onStateChange(getSnapshot());
    }
  }

  function abortInFlight() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    inFlight = false;
  }

  function clearDetectionBuffers() {
    history = [];
    candidateFrames = [];
    bestFrameBlob = null;
    lastResponseWas422 = false;
    previousThumbnail = null;
    detectedData = null;
    rawBoundingBox = null;
    sourceDimensions = { width: 0, height: 0 };
  }

  function startSearching() {
    generation += 1;
    abortInFlight();
    clearDetectionBuffers();
    backoffUntil = 0;
    errorMessage = '';
    statusMessage = STATUS_MESSAGES.SEARCHING;
    scanState = SCAN_STATES.SEARCHING;
    emit();
  }

  function reset() {
    startSearching();
  }

  function stop() {
    generation += 1;
    abortInFlight();
    clearDetectionBuffers();
    backoffUntil = 0;
    errorMessage = '';
    statusMessage = STATUS_MESSAGES.SEARCHING;
    scanState = SCAN_STATES.IDLE;
    emit();
  }

  function setFatalError(message) {
    generation += 1;
    abortInFlight();
    errorMessage = message || 'Không thể truy cập camera.';
    scanState = SCAN_STATES.ERROR;
    emit();
  }

  async function tick({ thumbnail = null, captureFrame, gateId = null } = {}) {
    if (
      scanState !== SCAN_STATES.SEARCHING &&
      scanState !== SCAN_STATES.CONFIRMING
    ) {
      return { action: 'skipped_inactive' };
    }

    if (inFlight) {
      return { action: 'skipped_in_flight' };
    }

    const now = nowFn();
    if (now < backoffUntil) {
      return { action: 'skipped_backoff' };
    }

    if (lastRequestAt > 0 && now - lastRequestAt < rateLimitMs) {
      return { action: 'skipped_rate_limit' };
    }

    if (thumbnail && thumbnail.length > 0) {
      if (
        previousThumbnail &&
        lastResponseWas422 &&
        isStaticScene(previousThumbnail, thumbnail, staticThreshold)
      ) {
        previousThumbnail = thumbnail;
        return { action: 'skipped_static_422' };
      }
      previousThumbnail = thumbnail;
    }

    if (typeof captureFrame !== 'function') {
      return { action: 'skipped_no_frame' };
    }

    // Acquire lock synchronously before awaiting canvas toBlob so overlapping ticks cannot race.
    inFlight = true;
    const tickGeneration = generation;
    const controller = new AbortController();
    abortController = controller;

    try {
      const captured = await captureFrame();
      if (
        tickGeneration !== generation ||
        controller.signal.aborted ||
        !captured ||
        !captured.blob
      ) {
        return { action: 'aborted_before_send' };
      }

      lastRequestAt = nowFn();
      const responseData = await scanFn({
        imageBlob: captured.blob,
        preview: true,
        gateId,
        signal: controller.signal,
      });

      if (tickGeneration !== generation || controller.signal.aborted) {
        return { action: 'aborted' };
      }

      lastResponseWas422 = false;
      const box = responseData?.best_candidate?.bounding_box || responseData?.bounding_box || null;
      if (box) {
        rawBoundingBox = box;
        sourceDimensions = {
          width: captured.width || 0,
          height: captured.height || 0,
        };
      }

      candidateFrames.push({
        blob: captured.blob,
        scanResult: responseData,
        timestamp: nowFn(),
      });
      if (candidateFrames.length > maxCandidateFrames) {
        candidateFrames.shift();
      }

      history.push(responseData?.plate_final || '');
      if (history.length > windowSize) {
        history.shift();
      }

      const stability = checkStability(history, minMatches, windowSize);
      if (stability.isStable && stability.stablePlate) {
        const bestFrame = selectBestCandidateFrame(candidateFrames, stability.stablePlate);
        bestFrameBlob = bestFrame ? bestFrame.blob : captured.blob;
        detectedData = bestFrame ? bestFrame.scanResult : responseData;
        scanState = SCAN_STATES.DETECTED;
        statusMessage = STATUS_MESSAGES.DETECTED;
        emit();
        return { action: 'detected', data: detectedData };
      }

      scanState = SCAN_STATES.CONFIRMING;
      statusMessage = STATUS_MESSAGES.CONFIRMING;
      emit();
      return { action: 'confirming', data: responseData };
    } catch (err) {
      if (
        tickGeneration !== generation ||
        controller.signal.aborted ||
        err?.name === 'AbortError'
      ) {
        return { action: 'aborted' };
      }

      if (err?.status === 422) {
        lastResponseWas422 = true;
        rawBoundingBox = null;
        scanState = SCAN_STATES.SEARCHING;
        statusMessage = STATUS_MESSAGES.SEARCHING;
        emit();
        return { action: 'no_plate_422' };
      }

      if (err?.status === 503) {
        const retrySeconds =
          typeof err.retryAfter === 'number' && err.retryAfter > 0
            ? err.retryAfter
            : default503BackoffSec;
        backoffUntil = nowFn() + retrySeconds * 1000;
        statusMessage = STATUS_MESSAGES.BUSY_503;
        emit();
        return { action: 'backoff_503', retrySeconds };
      }

      if (err?.status === 429) {
        const delayMs =
          typeof err.retryAfter === 'number' && err.retryAfter > 0
            ? err.retryAfter * 1000
            : rateLimit429BackoffMs;
        backoffUntil = nowFn() + delayMs;
        statusMessage = STATUS_MESSAGES.RATE_LIMITED_429;
        emit();
        return { action: 'backoff_429', delayMs };
      }

      if (err?.status === 401 || err?.status === 403) {
        const backendMsg =
          err?.data?.message ||
          err?.message ||
          'Phiên làm việc hết hạn hoặc tài khoản không có quyền quét biển số xe.';
        errorMessage = backendMsg;
        scanState = SCAN_STATES.ERROR;
        emit();
        return { action: 'stopped_auth', status: err.status, message: backendMsg };
      }

      // Network failure or unexpected server error: back off and show apiClient's connection message.
      backoffUntil = nowFn() + networkBackoffMs;
      statusMessage =
        err?.message ||
        'Không thể kết nối tới máy chủ. Vui lòng kiểm tra Docker/backend đã chạy tại cổng 8000 rồi thử lại.';
      emit();
      return { action: 'backoff_network', message: statusMessage };
    } finally {
      if (abortController === controller) {
        abortController = null;
      }
      if (tickGeneration === generation) {
        inFlight = false;
      }
    }
  }

  async function apply({ gateId = null } = {}) {
    if (!bestFrameBlob) {
      return {
        success: false,
        error: 'Không tìm thấy khung hình biển số để áp dụng.',
      };
    }

    const previewedPlate = (detectedData?.plate_final || '').trim();
    const applyGeneration = generation;
    const controller = new AbortController();
    abortController = controller;
    inFlight = true;
    scanState = SCAN_STATES.APPLYING;
    emit();

    try {
      const authoritativeData = await scanFn({
        imageBlob: bestFrameBlob,
        preview: false,
        gateId,
        signal: controller.signal,
      });

      if (applyGeneration !== generation || controller.signal.aborted) {
        return { success: false, aborted: true };
      }

      const authoritativePlate = (authoritativeData?.plate_final || '').trim();
      detectedData = authoritativeData;
      scanState = SCAN_STATES.DETECTED;
      emit();

      if (previewedPlate && authoritativePlate && previewedPlate !== authoritativePlate) {
        return {
          success: false,
          mismatch: true,
          data: authoritativeData,
          error: `Kết quả lưu chính thức (${authoritativePlate}) khác với kết quả xem trước (${previewedPlate}). Vui lòng kiểm tra và bấm Áp dụng lần nữa để xác nhận.`,
        };
      }

      return {
        success: true,
        data: authoritativeData,
      };
    } catch (err) {
      if (
        applyGeneration !== generation ||
        controller.signal.aborted ||
        err?.name === 'AbortError'
      ) {
        return { success: false, aborted: true };
      }

      scanState = SCAN_STATES.DETECTED;
      emit();
      const errMsg =
        err?.data?.message ||
        err?.message ||
        'Không thể lưu kết quả quét biển số lên hệ thống. Vui lòng thử lại.';
      return {
        success: false,
        error: errMsg,
      };
    } finally {
      if (abortController === controller) {
        abortController = null;
      }
      if (applyGeneration === generation) {
        inFlight = false;
      }
    }
  }

  return {
    getSnapshot,
    startSearching,
    reset,
    stop,
    setFatalError,
    tick,
    apply,
  };
}

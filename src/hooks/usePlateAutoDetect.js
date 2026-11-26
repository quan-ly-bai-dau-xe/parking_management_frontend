import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SCAN_STATES,
  STATUS_MESSAGES,
  computeDownscaledDimensions,
  computeGrayscaleThumbnail,
  createPlateAutoDetectMachine,
  isStaticScene,
} from '../utils/plateAutoDetect';
import { scanPlate } from '../services/plateScanService';

const PREFERRED_CAMERA_KEY = 'preferred_camera_device_id';
// Empirical OCR benchmark (Round 91 TL Decision 2 / Finding H2):
// Committed git HEAD value (1280px, quality 0.85) is retained because statistical Wilson score
// interval proves differences of 1-3 frames out of 99 frames are noise (overlap [87.4%, 97.2%] vs [88.7%, 97.8%]),
// and downscaling 720p streams to 960px degrades OCR accuracy on real webcam inputs.
const MAX_LONG_SIDE = 1280;
const JPEG_QUALITY = 0.85;
const THUMB_WIDTH = 32;
const THUMB_HEIGHT = 24;
const INTERVAL_CONFIRMING_MS = 250;
const INTERVAL_SEARCHING_MS = 600;
const INTERVAL_STATIC_MS = 2000;
const INTERVAL_KEEP_ALIVE_MS = 3000;

function mapGetUserMediaError(err) {
  if (!err) {
    return 'Không thể kết nối đến camera laptop. Vui lòng thử lại.';
  }
  if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
    return 'Quyền truy cập camera bị từ chối. Vui lòng cấp quyền camera trong cài đặt trình duyệt rồi thử lại.';
  }
  if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
    return 'Không tìm thấy thiết bị camera trên máy tính này.';
  }
  if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
    return 'Camera đang được ứng dụng khác sử dụng hoặc bị khóa phần cứng.';
  }
  if (err.name === 'SecurityError') {
    return 'Trình duyệt chỉ cho phép mở camera trên kết nối bảo mật (HTTPS hoặc localhost).';
  }
  return 'Không thể kết nối đến camera laptop. Vui lòng kiểm tra thiết bị hoặc chọn camera khác.';
}

/**
 * React hook managing camera MediaStream lifecycle and binding it to the pure auto-detect state machine.
 *
 * @param {Object} params
 * @param {boolean} params.isOpen
 * @param {React.RefObject<HTMLVideoElement>} params.videoRef
 * @param {string|number|null} [params.gateId=null]
 */
export function usePlateAutoDetect({
  isOpen,
  videoRef,
  gateId = 1,
  keepAlivePlate = '',
  onKeepAliveSighting = null,
}) {
  const [snapshot, setSnapshot] = useState({
    scanState: SCAN_STATES.IDLE,
    statusMessage: STATUS_MESSAGES.SEARCHING,
    errorMessage: '',
    detectedData: null,
    rawBoundingBox: null,
    sourceDimensions: { width: 0, height: 0 },
  });
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => {
    try {
      return localStorage.getItem(PREFERRED_CAMERA_KEY) || '';
    } catch {
      return '';
    }
  });

  const [isTabVisible, setIsTabVisible] = useState(() =>
    typeof document !== 'undefined' ? !document.hidden : true
  );
  const [cameraDeviceError, setCameraDeviceError] = useState('');

  const streamRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const thumbCanvasRef = useRef(null);
  const machineRef = useRef(null);
  const handleTrackEndedRef = useRef(null);

  // Pause frame capture and network requests when tab is hidden
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const getMachine = useCallback(() => {
    if (machineRef.current === null) {
      machineRef.current = createPlateAutoDetectMachine({
        scanFn: scanPlate,
        onStateChange: (next) => {
          setSnapshot({
            scanState: next.scanState,
            statusMessage: next.statusMessage,
            errorMessage: next.errorMessage,
            detectedData: next.detectedData,
            rawBoundingBox: next.rawBoundingBox,
            sourceDimensions: next.sourceDimensions,
          });
        },
      });
    }
    return machineRef.current;
  }, []);

  const stopCameraTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        if (handleTrackEndedRef.current) {
          track.removeEventListener('ended', handleTrackEndedRef.current);
        }
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [videoRef]);

  const updateVideoDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
    } catch {
      // Device enumeration failure does not block active stream
    }
  }, []);

  const changeCamera = useCallback((deviceId) => {
    setSelectedDeviceId(deviceId);
    try {
      if (deviceId) {
        localStorage.setItem(PREFERRED_CAMERA_KEY, deviceId);
      } else {
        localStorage.removeItem(PREFERRED_CAMERA_KEY);
      }
    } catch {
      // Ignore storage quota / private-mode restrictions
    }
  }, []);

  const resetDetection = useCallback(() => {
    getMachine().reset();
  }, [getMachine]);

  // Acquire and release MediaStream cleanly on open, close, unmount, and camera switch
  useEffect(() => {
    const machine = getMachine();
    if (!isOpen) {
      stopCameraTracks();
      machine.stop();
      return undefined;
    }

    let isMounted = true;

    async function initCamera() {
      await Promise.resolve();
      if (!isMounted) return;

      stopCameraTracks();
      setCameraDeviceError('');

      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setCameraDeviceError('Trình duyệt chỉ cho phép mở camera trên kết nối bảo mật (HTTPS hoặc localhost).');
        machine.setFatalError(
          'Trình duyệt chỉ cho phép mở camera trên kết nối bảo mật (HTTPS hoặc localhost).'
        );
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraDeviceError('Trình duyệt hiện tại không hỗ trợ truy cập camera (MediaDevices.getUserMedia).');
        machine.setFatalError(
          'Trình duyệt hiện tại không hỗ trợ truy cập camera (MediaDevices.getUserMedia).'
        );
        return;
      }

      const defaultVideoConstraint = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: selectedDeviceId
            ? { ...defaultVideoConstraint, deviceId: { exact: selectedDeviceId } }
            : defaultVideoConstraint,
          audio: false,
        });
      } catch (firstErr) {
        // Fallback to default camera when a previously saved deviceId was unplugged
        if (
          selectedDeviceId &&
          (firstErr?.name === 'OverconstrainedError' || firstErr?.name === 'NotFoundError')
        ) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: defaultVideoConstraint,
              audio: false,
            });
            if (isMounted) {
              changeCamera('');
            }
          } catch (fallbackErr) {
            if (isMounted) {
              const errorMsg = mapGetUserMediaError(fallbackErr);
              setCameraDeviceError(errorMsg);
              machine.setFatalError(errorMsg);
            }
            return;
          }
        } else {
          if (isMounted) {
            const errorMsg = mapGetUserMediaError(firstErr);
            setCameraDeviceError(errorMsg);
            machine.setFatalError(errorMsg);
          }
          return;
        }
      }

      if (!isMounted) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const handleTrackEnded = () => {
        stopCameraTracks();
        setCameraDeviceError('Thiết bị camera đã bị ngắt kết nối.');
        machine.setFatalError('Thiết bị camera đã bị ngắt kết nối.');
      };
      handleTrackEndedRef.current = handleTrackEnded;
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', handleTrackEnded);
      });

      streamRef.current = stream;
      setCameraDeviceError('');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play?.().catch(() => {});
      }
      machine.startSearching();
      updateVideoDevices();
    }

    initCamera();

    return () => {
      isMounted = false;
      stopCameraTracks();
      machine.stop();
    };
  }, [
    isOpen,
    selectedDeviceId,
    stopCameraTracks,
    updateVideoDevices,
    changeCamera,
    getMachine,
    videoRef,
  ]);

  // Continuous adaptive polling driver delegating rate-limit, motion-gating, and state rules to the pure machine
  useEffect(() => {
    if (
      !isOpen ||
      !isTabVisible ||
      (snapshot.scanState !== SCAN_STATES.SEARCHING &&
        snapshot.scanState !== SCAN_STATES.CONFIRMING)
    ) {
      return undefined;
    }

    const machine = getMachine();
    let timeoutId = null;
    let isCancelled = false;
    let prevThumb = null;

    const runLoop = async () => {
      if (isCancelled) return;

      if (typeof document !== 'undefined' && document.hidden) {
        timeoutId = setTimeout(runLoop, INTERVAL_SEARCHING_MS);
        return;
      }

      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        timeoutId = setTimeout(runLoop, INTERVAL_SEARCHING_MS);
        return;
      }

      if (!thumbCanvasRef.current) {
        thumbCanvasRef.current = document.createElement('canvas');
        thumbCanvasRef.current.width = THUMB_WIDTH;
        thumbCanvasRef.current.height = THUMB_HEIGHT;
      }
      const thumbCtx = thumbCanvasRef.current.getContext('2d', {
        willReadFrequently: true,
      });
      let thumbnail = null;
      if (thumbCtx) {
        thumbCtx.drawImage(video, 0, 0, THUMB_WIDTH, THUMB_HEIGHT);
        const imgData = thumbCtx.getImageData(0, 0, THUMB_WIDTH, THUMB_HEIGHT);
        thumbnail = computeGrayscaleThumbnail(imgData, THUMB_WIDTH * THUMB_HEIGHT);
      }

      const captureFrame = async () => {
        const currentVideo = videoRef.current;
        if (
          !currentVideo ||
          currentVideo.readyState < 2 ||
          !currentVideo.videoWidth ||
          !currentVideo.videoHeight
        ) {
          return null;
        }
        const { width, height } = computeDownscaledDimensions(
          currentVideo.videoWidth,
          currentVideo.videoHeight,
          MAX_LONG_SIDE
        );
        if (!captureCanvasRef.current) {
          captureCanvasRef.current = document.createElement('canvas');
        }
        const canvas = captureCanvasRef.current;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Draw natural full video frame without thresholding, binarization, or cropping
        ctx.drawImage(currentVideo, 0, 0, width, height);
        const blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
        });
        if (!blob) return null;
        return { blob, width, height };
      };

      const tickResult = await machine.tick({ thumbnail, captureFrame, gateId });

      if (isCancelled) return;

      // Adaptive polling intervals:
      // - 250-300ms when CONFIRMING (collecting 3/4 matches)
      // - 1500-2500ms when scene is static (e.g. after 422 or no motion)
      // - 500-1000ms when SEARCHING
      const currentSnap = machine.getSnapshot();
      let nextInterval;

      if (currentSnap.scanState === SCAN_STATES.CONFIRMING) {
        nextInterval = INTERVAL_CONFIRMING_MS;
      } else if (
        tickResult?.action === 'skipped_static_422' ||
        currentSnap.lastResponseWas422 ||
        (prevThumb && thumbnail && isStaticScene(prevThumb, thumbnail))
      ) {
        nextInterval = INTERVAL_STATIC_MS;
      } else {
        nextInterval = INTERVAL_SEARCHING_MS;
      }

      prevThumb = thumbnail;
      timeoutId = setTimeout(runLoop, nextInterval);
    };

    const initialDelay = snapshot.scanState === SCAN_STATES.CONFIRMING
      ? INTERVAL_CONFIRMING_MS
      : INTERVAL_SEARCHING_MS;
    timeoutId = setTimeout(runLoop, initialDelay);

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isOpen, isTabVisible, snapshot.scanState, gateId, getMachine, videoRef]);

  const applyAuthoritativeScan = useCallback(async () => {
    return getMachine().apply({ gateId });
  }, [gateId, getMachine]);

  // Browser Mode walk-in presence probe: while DETECTED & pending, check periodically
  // whether the same plate is still in front of the camera to refresh lastSeenAt (D1/D2).
  useEffect(() => {
    const cleanKeepAlive = String(keepAlivePlate || '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase();
    if (
      !isOpen ||
      !isTabVisible ||
      !cleanKeepAlive ||
      cameraDeviceError ||
      snapshot.scanState !== SCAN_STATES.DETECTED
    ) {
      return undefined;
    }

    let isCancelled = false;
    let inFlight = false;
    let activeController = null;

    const probePresence = async () => {
      if (isCancelled || inFlight) return;
      if (typeof document !== 'undefined' && document.hidden) return;

      const currentVideo = videoRef.current;
      if (
        !currentVideo ||
        currentVideo.readyState < 2 ||
        !currentVideo.videoWidth ||
        !currentVideo.videoHeight
      ) {
        return;
      }

      inFlight = true;
      activeController = new AbortController();
      try {
        const { width, height } = computeDownscaledDimensions(
          currentVideo.videoWidth,
          currentVideo.videoHeight,
          MAX_LONG_SIDE
        );
        if (!captureCanvasRef.current) {
          captureCanvasRef.current = document.createElement('canvas');
        }
        const canvas = captureCanvasRef.current;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(currentVideo, 0, 0, width, height);
        const blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
        });
        if (!blob || isCancelled || activeController.signal.aborted) return;

        const responseData = await scanPlate({
          imageBlob: blob,
          preview: true,
          gateId,
          signal: activeController.signal,
        });
        if (isCancelled || activeController.signal.aborted) return;

        const sightedNorm = String(responseData?.plate_final || '')
          .replace(/[^A-Za-z0-9]/g, '')
          .toUpperCase();
        if (sightedNorm && sightedNorm === cleanKeepAlive) {
          onKeepAliveSighting?.(Date.now(), responseData);
        }
      } catch {
        // 422 (empty road) or transient errors intentionally do not refresh lastSeenAt
      } finally {
        activeController = null;
        inFlight = false;
      }
    };

    const intervalId = setInterval(probePresence, INTERVAL_KEEP_ALIVE_MS);
    return () => {
      isCancelled = true;
      clearInterval(intervalId);
      if (activeController) {
        activeController.abort();
      }
    };
  }, [
    isOpen,
    isTabVisible,
    keepAlivePlate,
    cameraDeviceError,
    snapshot.scanState,
    gateId,
    videoRef,
    onKeepAliveSighting,
  ]);

  return {
    scanState: snapshot.scanState,
    cameraError: cameraDeviceError,
    scanError: snapshot.scanState === SCAN_STATES.ERROR ? snapshot.errorMessage : '',
    videoDevices,
    selectedDeviceId,
    changeCamera,
    statusMessage: snapshot.statusMessage,
    detectedData: snapshot.detectedData,
    rawBoundingBox: snapshot.rawBoundingBox,
    sourceDimensions: snapshot.sourceDimensions,
    resetDetection,
    applyAuthoritativeScan,
  };
}

export default usePlateAutoDetect;

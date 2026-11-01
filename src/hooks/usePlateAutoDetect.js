import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SCAN_STATES,
  STATUS_MESSAGES,
  computeDownscaledDimensions,
  computeGrayscaleThumbnail,
  createPlateAutoDetectMachine,
} from '../utils/plateAutoDetect';
import { scanPlate } from '../services/plateScanService';

const PREFERRED_CAMERA_KEY = 'preferred_camera_device_id';
const MAX_LONG_SIDE = 1280;
const JPEG_QUALITY = 0.85;
const THUMB_WIDTH = 32;
const THUMB_HEIGHT = 24;
const LOOP_TICK_MS = 250;

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
export function usePlateAutoDetect({ isOpen, videoRef, gateId = null }) {
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

  const streamRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const thumbCanvasRef = useRef(null);
  const machineRef = useRef(null);

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
      streamRef.current.getTracks().forEach((track) => track.stop());
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

      if (typeof window !== 'undefined' && !window.isSecureContext) {
        machine.setFatalError(
          'Trình duyệt chỉ cho phép mở camera trên kết nối bảo mật (HTTPS hoặc localhost).'
        );
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
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
              machine.setFatalError(mapGetUserMediaError(fallbackErr));
            }
            return;
          }
        } else {
          if (isMounted) {
            machine.setFatalError(mapGetUserMediaError(firstErr));
          }
          return;
        }
      }

      if (!isMounted) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
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

  // Continuous polling driver delegating all rate-limit, motion-gating, and state rules to the pure machine
  useEffect(() => {
    if (
      !isOpen ||
      (snapshot.scanState !== SCAN_STATES.SEARCHING &&
        snapshot.scanState !== SCAN_STATES.CONFIRMING)
    ) {
      return undefined;
    }

    const machine = getMachine();
    const intervalId = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
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

      machine.tick({ thumbnail, captureFrame, gateId });
    }, LOOP_TICK_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [isOpen, snapshot.scanState, gateId, getMachine, videoRef]);

  const applyAuthoritativeScan = useCallback(async () => {
    return getMachine().apply({ gateId });
  }, [gateId, getMachine]);

  return {
    scanState: snapshot.scanState,
    cameraError: snapshot.errorMessage,
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

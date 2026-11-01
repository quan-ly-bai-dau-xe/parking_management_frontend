import { apiClient } from './apiClient.js';

/**
 * Service to execute license plate scan against the backend plate-scans endpoint.
 *
 * @param {Object} params
 * @param {Blob|File} params.imageBlob - Captured image frame (JPEG/PNG/WEBP).
 * @param {boolean} [params.preview=false] - When true, skips Cloudinary upload and returns image_url: null.
 * @param {number|string|null} [params.gateId=null] - Optional gate identifier.
 * @param {AbortSignal|null} [params.signal=null] - Optional AbortSignal to cancel in-flight request.
 * @returns {Promise<Object>} Backend scan result envelope.
 */
export async function scanPlate({ imageBlob, preview = false, gateId = null, signal = null }) {
  if (!imageBlob) {
    throw new Error('imageBlob is required for plate scanning.');
  }

  const formData = new FormData();
  // Name the file plate_frame.jpg for standard multipart upload
  formData.append('image', imageBlob, 'plate_frame.jpg');
  formData.append('preview', preview ? 'true' : 'false');

  if (gateId !== null && gateId !== undefined && gateId !== '') {
    formData.append('gate_id', String(gateId));
  }

  return apiClient('/api/v1/parking/plate-scans/', {
    method: 'POST',
    body: formData,
    signal,
  });
}

export default {
  scanPlate,
};

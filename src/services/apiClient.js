/**
 * Centralized API client for communicating with Django backend via Vite proxy.
 * Handles Session cookies and Django CSRF token requirements.
 */

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

const API_UNAVAILABLE_MESSAGE =
  "Không thể kết nối tới máy chủ. Vui lòng kiểm tra Docker/backend đã chạy tại cổng 8000 rồi thử lại.";

function createApiConnectionError(error) {
  const connectionError = new Error(API_UNAVAILABLE_MESSAGE);
  connectionError.code = "API_UNAVAILABLE";
  connectionError.cause = error;
  return connectionError;
}

export async function fetchCsrfToken() {
  // Call backend CSRF initialization endpoint to ensure csrftoken cookie is set
  try {
    await fetch('/api/v1/auth/csrf/', {
      method: 'GET',
      credentials: 'include',
    });
  } catch (error) {
    console.warn('Could not initialize CSRF token:', error);
    throw createApiConnectionError(error);
  }
}

export async function apiClient(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    let csrfToken = getCookie('csrftoken');
    if (!csrfToken) {
      await fetchCsrfToken();
      csrfToken = getCookie('csrftoken');
    }
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
  }

  // Ensure path starts with /api
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  let response;
  try {
    response = await fetch(url, {
      ...options,
      method,
      headers,
      credentials: 'include', // Include session cookies for authentication
    });
  } catch (error) {
    console.warn(`API request failed (${method} ${url}):`, error);
    throw createApiConnectionError(error);
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg =
      (typeof data === 'object' && (data.detail || data.message || JSON.stringify(data))) ||
      `HTTP Error ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

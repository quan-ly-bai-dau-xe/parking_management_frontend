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



export async function fetchCsrfToken() {
  // Call backend CSRF initialization endpoint to ensure csrftoken cookie is set
  try {
    await fetch('/api/v1/auth/csrf/', {
      method: 'GET',
      credentials: 'include',
    });
  } catch (error) {
    console.warn('Could not initialize CSRF token:', error);
  }
}

export async function apiClient(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
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

  const response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'include', // Include session cookies for authentication
  });

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

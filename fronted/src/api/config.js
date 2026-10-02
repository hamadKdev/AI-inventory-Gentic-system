const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

const TOKEN_STORAGE_KEY = 'nowshera_mall_jwt_token';

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted environments
  }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function getNormalizedBaseUrl() {
  if (!API_BASE_URL || typeof API_BASE_URL !== 'string') {
    return '';
  }
  const trimmed = API_BASE_URL.trim().replace(/\/+$/, '');
  if (trimmed === 'https://YOUR-FASTAPI-BACKEND-URL') {
    return '';
  }
  return trimmed;
}

export function getNormalizedWebhookUrl() {
  if (!N8N_WEBHOOK_URL || typeof N8N_WEBHOOK_URL !== 'string') {
    return '';
  }
  const trimmed = N8N_WEBHOOK_URL.trim();
  if (trimmed === 'https://YOUR-N8N-PRODUCTION-WEBHOOK-URL') {
    return '';
  }
  return trimmed;
}

export function isCrossOriginUrl(targetUrl) {
  if (typeof window === 'undefined' || !targetUrl) return false;
  try {
    const parsed = new URL(targetUrl, window.location.origin);
    return parsed.origin !== window.location.origin;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(message, status = 0, details = null, raw = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.raw = raw;
  }
}

export function formatValidationErrors(data) {
  if (!data) return 'Validation error. Please check your input.';
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;

  if (Array.isArray(data.detail)) {
    const messages = data.detail.map((err) => {
      if (typeof err === 'string') return err;
      const field = Array.isArray(err.loc)
        ? err.loc.filter((part) => part !== 'body' && part !== 'query' && part !== 'path').join('.')
        : '';
      const msg = err.msg || 'Invalid value';
      return field ? `${field}: ${msg}` : msg;
    });
    return messages.join(' | ');
  }

  return 'Validation failed. Please check the submitted fields.';
}

export function parseApiError(status, data, isLoginEndpoint = false) {
  const backendMessage =
    (typeof data?.detail === 'string' && data.detail) ||
    (typeof data?.message === 'string' && data.message) ||
    (typeof data?.error === 'string' && data.error) ||
    null;

  if (status === 401) {
    if (!isLoginEndpoint) {
      clearAuthToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
      return new ApiError(
        backendMessage || 'Your session has expired. Please log in again.',
        401,
        data
      );
    }
    return new ApiError(
      backendMessage || 'Invalid email or password.',
      401,
      data
    );
  }

  if (status === 403) {
    return new ApiError(
      backendMessage || 'You do not have permission to perform this action.',
      403,
      data
    );
  }

  if (status === 404) {
    return new ApiError(
      backendMessage || 'Requested item was not found.',
      404,
      data
    );
  }

  if (status === 422) {
    return new ApiError(formatValidationErrors(data), 422, data);
  }

  if (status >= 500) {
    return new ApiError(
      'Something went wrong. Please try again.',
      status,
      data
    );
  }

  return new ApiError(
    backendMessage || formatValidationErrors(data) || 'Request failed. Please try again.',
    status,
    data
  );
}

async function executeFetchWithFallback(directUrl, proxyUrl, fetchOptions) {
  const useProxyFirst = isCrossOriginUrl(directUrl);
  const primaryUrl = useProxyFirst ? proxyUrl : directUrl;
  const secondaryUrl = useProxyFirst ? directUrl : proxyUrl;

  try {
    const res = await fetch(primaryUrl, fetchOptions);
    const contentType = res.headers.get('content-type') || '';
    // If proxy route returned an SPA HTML fallback (404 or index.html), retry direct URL
    if (
      useProxyFirst &&
      (res.status === 404 || contentType.includes('text/html'))
    ) {
      return await fetch(secondaryUrl, fetchOptions);
    }
    return res;
  } catch (primaryErr) {
    if (primaryErr?.name === 'AbortError') {
      throw primaryErr;
    }
    return await fetch(secondaryUrl, fetchOptions);
  }
}

export async function apiRequest(endpoint, options = {}) {
  const baseUrl = getNormalizedBaseUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (!baseUrl) {
    throw new ApiError(
      'Unable to connect to the server. VITE_API_BASE_URL is not configured.',
      0
    );
  }

  const directUrl = `${baseUrl}${normalizedEndpoint}`;
  const proxyUrl = `/__api_proxy${normalizedEndpoint}`;
  const token = getAuthToken();

  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  if (token && !options.skipAuth) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutMs = options.timeout || 25000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await executeFetchWithFallback(directUrl, proxyUrl, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      try {
        const text = await response.text();
        data = text ? { detail: text } : null;
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      const isLogin = normalizedEndpoint.startsWith('/auth/login');
      throw parseApiError(response.status, data, isLogin);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error?.name === 'AbortError') {
      throw new ApiError('Request timed out. Unable to connect to the server.', 0);
    }

    throw new ApiError('Unable to connect to the server.', 0, null, error);
  }
}

export { API_BASE_URL, N8N_WEBHOOK_URL };

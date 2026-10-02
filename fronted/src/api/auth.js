import { apiRequest, setAuthToken, clearAuthToken } from './config.js';

/**
 * POST /auth/login
 * Authenticates manager or staff with email and password.
 */
export async function login(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });

  const token =
    data?.access_token ||
    data?.token ||
    data?.jwt ||
    data?.data?.access_token ||
    data?.data?.token ||
    (typeof data === 'string' ? data : null);

  if (token) {
    setAuthToken(token);
  }

  return {
    token,
    raw: data,
  };
}

/**
 * POST /auth/signup
 * Internal staff/manager account creation endpoint supported by FastAPI backend.
 */
export async function signup(payload) {
  return apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * GET /auth/me
 * Retrieves the currently authenticated user's profile and role.
 */
export async function getMe() {
  const data = await apiRequest('/auth/me', {
    method: 'GET',
  });

  const userObj = data?.user || data?.data || data || {};
  const rawRole = String(
    userObj.role || userObj.user_role || userObj.account_type || ''
  )
    .trim()
    .toLowerCase();

  return {
    id: userObj.id || userObj.user_id || userObj.sub || null,
    name:
      userObj.name ||
      userObj.full_name ||
      userObj.username ||
      (userObj.email ? userObj.email.split('@')[0] : 'User'),
    email: userObj.email || '',
    role: rawRole === 'manager' ? 'manager' : 'staff',
    rawRole: rawRole || 'staff',
    raw: data,
  };
}

export function logout() {
  clearAuthToken();
}

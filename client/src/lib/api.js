export const API_BASE = import.meta.env.VITE_API_URL || "/api";

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}

export async function api(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "فشل الطلب.");
  }

  return payload;
}

export function adminHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

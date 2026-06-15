export function getLocalItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setLocalItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked in private modes; keep the game usable anyway.
  }
}

export function getStoredItem(key) {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) {
      return value;
    }
  } catch {
    // Ignore unavailable localStorage.
  }

  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setStoredItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore unavailable localStorage.
  }

  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Ignore unavailable sessionStorage.
  }
}

export function removeStoredItem(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore unavailable localStorage.
  }

  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore unavailable sessionStorage.
  }
}

export function readJsonLocalItem(key, fallback = null) {
  const raw = getLocalItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

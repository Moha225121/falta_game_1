import { apiUrl } from "./api.js";

const roomCodeLength = 5;
const activeRoomSessionKey = "kalak:activeRoomSession";
const pendingRoomLeaveKey = "kalak:pendingRoomLeave";
const roomSessionStorageKeys = [
  "kalak:room",
  "kalak:roomCode",
  "kalak:sessionId",
  "kalak:playerId",
  activeRoomSessionKey
];

function normalizeRoomCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, roomCodeLength);
}

function storageJson(key) {
  const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStorageJson(key, value) {
  const text = JSON.stringify(value);
  localStorage.setItem(key, text);
  sessionStorage.setItem(key, text);
}

function clearPendingRoomLeave() {
  localStorage.removeItem(pendingRoomLeaveKey);
  sessionStorage.removeItem(pendingRoomLeaveKey);
}

export function normalizeRoomSession(value = {}) {
  const code = normalizeRoomCode(value.code);
  const playerId = String(value.playerId || value.sessionId || "").trim();
  if (code.length !== roomCodeLength || !playerId) {
    return null;
  }

  return { code, playerId };
}

export function clearRoomSessionCache({ keepPendingLeave = false } = {}) {
  for (const key of roomSessionStorageKeys) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }

  if (!keepPendingLeave) {
    clearPendingRoomLeave();
  }
}

export function readActiveRoomSession() {
  return normalizeRoomSession(storageJson(activeRoomSessionKey));
}

function readPendingRoomLeave() {
  return normalizeRoomSession(storageJson(pendingRoomLeaveKey));
}

export function rememberRoomSession(session) {
  const normalized = normalizeRoomSession(session);
  if (!normalized) {
    return null;
  }

  writeStorageJson(activeRoomSessionKey, normalized);
  return normalized;
}

export function queuePendingRoomLeave(session) {
  const normalized = normalizeRoomSession(session);
  if (!normalized) {
    return null;
  }

  writeStorageJson(pendingRoomLeaveKey, normalized);
  return normalized;
}

function sendRoomLeaveRequest(session, { keepalive = false } = {}) {
  const normalized = normalizeRoomSession(session);
  if (!normalized) {
    return Promise.resolve(false);
  }

  return fetch(apiUrl("/rooms/leave"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalized),
    keepalive
  }).then((response) => response.ok).catch(() => false);
}

export function sendPendingRoomLeave() {
  const pendingLeave = readPendingRoomLeave();
  if (!pendingLeave) {
    return Promise.resolve(false);
  }

  return sendRoomLeaveRequest(pendingLeave, { keepalive: true }).then((sent) => {
    if (sent) {
      clearPendingRoomLeave();
    }
    return sent;
  });
}

export function cleanRoomSessionOnEntry() {
  const hasPendingLeave = Boolean(readPendingRoomLeave());
  sendPendingRoomLeave();
  clearRoomSessionCache({ keepPendingLeave: hasPendingLeave });
}

export function sendRoomLeaveBeacon(session) {
  const normalized = normalizeRoomSession(session);
  if (!normalized) {
    return false;
  }

  const body = JSON.stringify(normalized);
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(apiUrl("/rooms/leave"), blob)) {
      return true;
    }
  }

  sendRoomLeaveRequest(normalized, { keepalive: true });
  return false;
}

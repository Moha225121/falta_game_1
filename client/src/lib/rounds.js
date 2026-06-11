export const MAX_TOTAL_ROUNDS = 20;

export function selectedModeIds(value, fallback = ["kalak"]) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const modes = [...new Set(raw.map((mode) => String(mode).trim()).filter(Boolean))];
  return modes.length ? modes : fallback;
}

export function roundLimits(modeCount = 1) {
  const step = Math.max(1, modeCount);
  return {
    min: step,
    max: Math.max(step, Math.floor(MAX_TOTAL_ROUNDS / step) * step),
    step
  };
}

export function normalizeRoundCount(value, modeCount = 1) {
  const limits = roundLimits(modeCount);
  const numeric = Number(value);
  const requested = Number.isFinite(numeric) ? numeric : limits.min;
  const rounded = Math.round(requested / limits.step) * limits.step;
  return Math.min(limits.max, Math.max(limits.min, rounded));
}

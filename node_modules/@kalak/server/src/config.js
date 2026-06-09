const configuredMaxPlayers = Number(process.env.MAX_PLAYERS || 6);

export const config = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || true,
  adminToken: process.env.ADMIN_TOKEN || "",
  minPlayers: Number(process.env.MIN_PLAYERS || 3),
  maxPlayers: Number.isFinite(configuredMaxPlayers) ? Math.max(3, Math.min(6, configuredMaxPlayers)) : 6,
  answerSeconds: Number(process.env.ANSWER_SECONDS || 30),
  voteSeconds: Number(process.env.VOTE_SECONDS || 30)
};

export function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(number)));
}

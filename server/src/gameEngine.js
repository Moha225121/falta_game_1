import { customAlphabet, nanoid } from "nanoid";
import { clampNumber } from "./config.js";
import {
  CLOSEST_NUMBER_ROUNDS,
  DIRECT_CHOICE_ROUNDS,
  FAKE_FACTS,
  HOT_TAKE_BOT_ANSWERS,
  HOT_TAKE_PROMPTS,
  IMPOSTER_WORDS,
  JUDGE_PICK_GAME_ANSWERS,
  JUDGE_PICK_PROMPTS,
  LAST_SURVIVOR_BOT_ANSWERS,
  LAST_SURVIVOR_CHALLENGES,
  MINORITY_WINS_ROUNDS,
  MIND_MATCH_ROUNDS,
  MODE_IDS,
  REVERSE_TRAP_ROUNDS,
  SPLIT_STEAL_SCENARIOS,
  TARGET_GUESS_ROUNDS
} from "./gameModes.js";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 5;
const ROOM_CODE_ATTEMPTS = 100;
const makeCode = customAlphabet(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);
const BOT_NAMES = [
  "ندى الآلية",
  "سالم الآلي",
  "ميرا الآلية",
  "طارق الآلي",
  "لينا الآلية",
  "عمر الآلي",
  "ريان الآلي",
  "هنا الآلية"
];
const BOT_COLORS = ["#12d6c5", "#ff3f98", "#f6b84a", "#62df6c", "#8c6cff"];
const BOT_MARKS = ["spark", "diamond", "crown", "bolt", "circle"];
const MAX_TOTAL_ROUNDS = 20;
const SCIENCE_DAY_MODE = "science_day";
const PRIZES_MODE = "prizes";
const PRIZES_ROUNDS = 5;
const SCIENCE_DAY_TOTAL_SETS = 2;
const SCIENCE_DAY_QUESTIONS_PER_SET = 7;
const SCIENCE_DAY_TOTAL_QUESTIONS = SCIENCE_DAY_TOTAL_SETS * SCIENCE_DAY_QUESTIONS_PER_SET;
const SCIENCE_DAY_SET_ONE = "set1";
const SCIENCE_DAY_SET_TWO = "set2";
const SCIENCE_DAY_SET_IDS = new Set([SCIENCE_DAY_SET_ONE, SCIENCE_DAY_SET_TWO]);
const SCIENCE_DAY_SET_LABELS = {
  [SCIENCE_DAY_SET_ONE]: "المجموعة الأولى",
  [SCIENCE_DAY_SET_TWO]: "المجموعة الثانية"
};
const SCIENCE_DAY_CORRECT_POINTS = 2;
const SCIENCE_DAY_SPEED_BONUS = 1;
const SCIENCE_DAY_QUESTION_SECONDS = 30;
const IMPOSTER_CLUE_SECONDS = 30;
const IMPOSTER_CLUE_PASSES = 2;
const IMPOSTER_CLUE_MAX_LENGTH = 20;
const IMPOSTER_EMPTY_CLUE = "بدون وصف";
const AVATAR_DEFAULT = {
  persona: "a1",
  skin: "#c9865a",
  hair: "#15120f",
  outfit: "#12d6c5",
  hairStyle: "short",
  eyes: "focused",
  mouth: "smile",
  accessory: "headset"
};
const AVATAR_CHOICES = {
  skin: new Set(["#c9865a", "#a96f45", "#8d5338", "#e0ad7f", "#6a3d2f"]),
  hair: new Set(["#15120f", "#4a2d20", "#d6a94d", "#2457c5", "#df3e8f"]),
  outfit: new Set(["#12d6c5", "#ff3f98", "#f6b84a", "#62df6c", "#8c6cff", "#ff5d69"]),
  hairStyle: new Set(["short", "wave", "curls", "fade", "cap"]),
  eyes: new Set(["focused", "happy", "sharp", "bright"]),
  mouth: new Set(["smile", "grin", "smirk", "calm"]),
  accessory: new Set(["none", "glasses", "headset", "visor"])
};
const BOT_AVATARS = [
  { persona: "a1", skin: "#c9865a", hair: "#15120f", outfit: "#12d6c5", hairStyle: "short", eyes: "focused", mouth: "smile", accessory: "headset" },
  { persona: "a2", skin: "#a96f45", hair: "#2457c5", outfit: "#ff3f98", hairStyle: "fade", eyes: "sharp", mouth: "smirk", accessory: "visor" },
  { persona: "a3", skin: "#e0ad7f", hair: "#4a2d20", outfit: "#f6b84a", hairStyle: "wave", eyes: "happy", mouth: "grin", accessory: "none" },
  { persona: "a4", skin: "#8d5338", hair: "#df3e8f", outfit: "#8c6cff", hairStyle: "curls", eyes: "bright", mouth: "smirk", accessory: "glasses" },
  { persona: "a5", skin: "#6a3d2f", hair: "#d6a94d", outfit: "#62df6c", hairStyle: "cap", eyes: "focused", mouth: "smile", accessory: "headset" }
];
const BOT_FAKE_ANSWERS = [
  "الميناء القديم",
  "بوصلة فضية",
  "1974",
  "قمر الصحراء",
  "سبعة أبواب",
  "جزيرة مخفية",
  "الخريطة الذهبية",
  "ريح الشمال",
  "المنارة الأولى",
  "رخام أزرق",
  "الأرشيف الملكي",
  "مدينة جبلية"
];
const BOT_CORRECT_ANSWER_RATE = 0.18;
const BOT_CORRECT_VOTE_RATE = 0.42;
const RECONNECT_GRACE_MS = 45_000;
const LIVE_GAME_PHASES = new Set(["answering", "voting", "results"]);
const CUMULATIVE_DEFAULTS = {
  roomsCreated: 0,
  roomsClosed: 0,
  humanPlayersJoined: 0,
  botsAdded: 0,
  gamesStarted: 0,
  gamesFinished: 0,
  gamesEndedByHost: 0,
  answerSubmissions: 0,
  botAnswerSubmissions: 0,
  voteSubmissions: 0,
  botVoteSubmissions: 0,
  chatMessages: 0,
  disconnections: 0,
  reconnections: 0,
  playersLeft: 0,
  kickRemovals: 0
};
const PHASE_ORDER = ["lobby", "answering", "voting", "results", "finished"];

function percent(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function elapsedSeconds(start, end = Date.now()) {
  return start ? Math.max(0, Math.floor((end - start) / 1000)) : 0;
}

function normalizeAnswer(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u0623\u0625\u0622]/g, "\u0627")
    .replace(/\u0624/g, "\u0648")
    .replace(/\u0626/g, "\u064A")
    .replace(/\u0649/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/[\u06A9\u06AA]/g, "\u0643")
    .replace(/[\u06CC\u064A]/g, "\u064A")
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "");
}

function answerDistanceLimit(normalized) {
  if (!normalized || /^[0-9]+$/.test(normalized)) {
    return 0;
  }

  if (normalized.length < 5) {
    return 0;
  }

  return normalized.length < 9 ? 1 : 2;
}

function levenshteinDistanceWithin(left, right, maxDistance) {
  if (left === right) {
    return 0;
  }

  if (Math.abs(left.length - right.length) > maxDistance) {
    return maxDistance + 1;
  }

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    let rowMinimum = current[0];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const distance = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + cost
      );
      current[rightIndex] = distance;
      rowMinimum = Math.min(rowMinimum, distance);
    }

    if (rowMinimum > maxDistance) {
      return maxDistance + 1;
    }

    previous = current;
  }

  return previous[right.length];
}

function answersMatch(value, expected) {
  const normalizedValue = normalizeAnswer(value);
  const normalizedExpected = normalizeAnswer(expected);

  if (!normalizedValue || !normalizedExpected) {
    return false;
  }

  if (normalizedValue === normalizedExpected) {
    return true;
  }

  const maxDistance = Math.min(
    answerDistanceLimit(normalizedValue),
    answerDistanceLimit(normalizedExpected)
  );

  return maxDistance > 0 && levenshteinDistanceWithin(normalizedValue, normalizedExpected, maxDistance) <= maxDistance;
}

function isNumericAnswer(value) {
  const answer = String(value || "").trim();
  return /[0-9٠-٩۰-۹]/.test(answer);
}

function isEnglishAnswer(value) {
  const answer = String(value || "").trim();
  return /[a-z]/i.test(answer) && !/[\u0600-\u06FF]/.test(answer);
}

function answerFormatNote(question) {
  const answer = question?.correctAnswer || "";
  if (isNumericAnswer(answer)) {
    return "ملاحظة: الإجابة رقم.";
  }

  if (isEnglishAnswer(answer)) {
    return "ملاحظة: الإجابة بالإنجليزي.";
  }

  return "";
}

function promptWithAnswerFormatNote(question, mode) {
  const prompt = question?.prompt || "";
  if ((mode !== "kalak" && mode !== PRIZES_MODE) || !prompt || /ملاحظة:\s*الإجابة/.test(prompt)) {
    return prompt;
  }

  const note = answerFormatNote(question);
  return note ? `${prompt}\n${note}` : prompt;
}

function parseNumericAnswer(value) {
  const normalizedDigits = String(value || "")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/,/g, ".");
  const match = normalizedDigits.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function shuffle(items) {
  const array = [...items];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [array[index], array[target]] = [array[target], array[index]];
  }
  return array;
}

function contentPayload(question) {
  return question?.content && typeof question.content === "object" ? question.content : {};
}

function contentPrompt(question, fallback) {
  return question?.prompt || contentPayload(question).prompt || fallback;
}

function contentCategory(question, fallback) {
  return question?.category || fallback;
}

function contentDifficulty(question) {
  return question?.difficulty || "medium";
}

function contentQuestionId(question, fallback) {
  return question?.id || fallback;
}

function playerName(name) {
  const fallback = `لاعب ${Math.floor(1000 + Math.random() * 9000)}`;
  return String(name || fallback).trim().slice(0, 28) || fallback;
}

function cleanMessage(message) {
  return String(message || "").trim().replace(/\s+/g, " ").slice(0, 180);
}

function cleanAnswerText(text) {
  return String(text || "").trim().replace(/\s+/g, " ").slice(0, 160);
}

function cleanImposterClueText(text) {
  return cleanAnswerText(text).slice(0, IMPOSTER_CLUE_MAX_LENGTH);
}

function cleanAvatarValue(value, choices, fallback) {
  return choices.has(value) ? value : fallback;
}

function cleanPersona(value) {
  return String(value || AVATAR_DEFAULT.persona)
    .trim()
    .replace(/[^a-z0-9_-]/gi, "")
    .slice(0, 24) || AVATAR_DEFAULT.persona;
}

function cleanSessionId(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-z0-9_-]/gi, "")
    .slice(0, 64) || nanoid(16);
}

function cleanRoomCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, ROOM_CODE_LENGTH);
}

function isScienceDayRoom(room) {
  return room?.settings?.mode === SCIENCE_DAY_MODE || room?.activeMode === SCIENCE_DAY_MODE;
}

function isPrizesRoom(room) {
  return room?.settings?.mode === PRIZES_MODE || room?.activeMode === PRIZES_MODE;
}

function isMonitorOnlyRoom(room) {
  return isScienceDayRoom(room) || isPrizesRoom(room);
}

function cleanScienceDaySet(value) {
  const set = String(value || "").trim();
  return SCIENCE_DAY_SET_IDS.has(set) ? set : SCIENCE_DAY_SET_ONE;
}

function scienceDaySetNumber(value) {
  return cleanScienceDaySet(value) === SCIENCE_DAY_SET_TWO ? 2 : 1;
}

function scienceDaySetLabel(value) {
  return SCIENCE_DAY_SET_LABELS[cleanScienceDaySet(value)];
}

function scienceDayQuestionNumber(round) {
  return ((Math.max(1, Number(round) || 1) - 1) % SCIENCE_DAY_QUESTIONS_PER_SET) + 1;
}

function scienceDayQuestionSet(question = {}) {
  const tags = Array.isArray(question.tags) ? question.tags.map((tag) => String(tag).trim()) : [];
  if (tags.includes("science-day-set-2") || tags.includes("المجموعة الثانية")) {
    return SCIENCE_DAY_SET_TWO;
  }
  if (tags.includes("science-day-set-1") || tags.includes("المجموعة الأولى")) {
    return SCIENCE_DAY_SET_ONE;
  }
  return "";
}

function scienceDayQuestionMatchesSet(set) {
  const cleanSet = cleanScienceDaySet(set);
  return (question) => scienceDayQuestionSet(question) === cleanSet;
}

function scienceDayQuestionOrder(question = {}) {
  const match = String(question.id || "").match(/q_science_day_set[12]_(\d+)$/);
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Number(match[1]) || Number.MAX_SAFE_INTEGER;
}

function codedError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function cleanAvatar(avatar = {}) {
  return {
    persona: cleanPersona(avatar.persona || avatar.id),
    skin: cleanAvatarValue(avatar.skin, AVATAR_CHOICES.skin, AVATAR_DEFAULT.skin),
    hair: cleanAvatarValue(avatar.hair, AVATAR_CHOICES.hair, AVATAR_DEFAULT.hair),
    outfit: cleanAvatarValue(avatar.outfit || avatar.color, AVATAR_CHOICES.outfit, AVATAR_DEFAULT.outfit),
    hairStyle: cleanAvatarValue(avatar.hairStyle, AVATAR_CHOICES.hairStyle, AVATAR_DEFAULT.hairStyle),
    eyes: cleanAvatarValue(avatar.eyes, AVATAR_CHOICES.eyes, AVATAR_DEFAULT.eyes),
    mouth: cleanAvatarValue(avatar.mouth, AVATAR_CHOICES.mouth, AVATAR_DEFAULT.mouth),
    accessory: cleanAvatarValue(avatar.accessory, AVATAR_CHOICES.accessory, AVATAR_DEFAULT.accessory)
  };
}

function createPlayer(socket, payload = {}) {
  return {
    id: cleanSessionId(payload.sessionId),
    socketId: socket.id,
    name: playerName(payload.name),
    avatar: cleanAvatar(payload.avatar),
    score: 0,
    scienceDayCorrectCount: 0,
    scienceDayTotalMs: 0,
    connected: true,
    disconnectedAt: null,
    reconnectTimer: null,
    joinedAt: Date.now()
  };
}

function createBot(room) {
  const botCount = [...room.players.values()].filter((player) => player.isBot).length;
  const baseName = BOT_NAMES[botCount % BOT_NAMES.length];
  const usedNames = new Set([...room.players.values()].map((player) => player.name));
  const name = usedNames.has(baseName) ? `${baseName} ${botCount + 1}` : baseName;

  return {
    id: `bot_${nanoid(8)}`,
    name,
    avatar: cleanAvatar(BOT_AVATARS[botCount % BOT_AVATARS.length]),
    score: 0,
    scienceDayCorrectCount: 0,
    scienceDayTotalMs: 0,
    isBot: true,
    joinedAt: Date.now()
  };
}

function createEmptyRoom(code, host, config) {
  return {
    code,
    hostId: host.id,
    players: new Map([[host.id, host]]),
    phase: "lobby",
    round: 0,
    settings: {
      mode: "kalak",
      modes: ["kalak"],
      category: "all",
      categories: [],
      rounds: 1,
      answerSeconds: config.answerSeconds,
      voteSeconds: config.voteSeconds
    },
    usedQuestionIds: [],
    question: null,
    submissions: new Map(),
    answerDrafts: new Map(),
    votes: new Map(),
    options: [],
    correctWriterIds: [],
    eliminatedPlayerIds: new Set(),
    kickVotes: new Map(),
    activeMode: "kalak",
    modeData: null,
    results: null,
    messages: [],
    phaseEndsAt: null,
    timer: null,
    botTimers: [],
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    gameStartedAt: null,
    finishedAt: null,
    statsFinalRecorded: false
  };
}

export class KalakGameEngine {
  constructor(io, store, config) {
    this.io = io;
    this.store = store;
    this.config = config;
    this.rooms = new Map();
    this.usedRoomCodes = new Set();
    this.startedAt = Date.now();
    this.cumulative = this.store?.getGameCounters?.(CUMULATIVE_DEFAULTS) || { ...CUMULATIVE_DEFAULTS };
  }

  incrementCounter(key, amount = 1) {
    this.cumulative[key] = (this.cumulative[key] || 0) + amount;
    this.store?.incrementGameCounter?.(key, amount);
  }

  recordRoomEvent(type, room) {
    this.store?.recordRoomEvent?.(type, room);
  }

  bindSocket(socket) {
    socket.on("room:create", (payload, ack) => this.handle(socket, ack, () => this.createRoom(socket, payload)));
    socket.on("room:join", (payload, ack) => this.handle(socket, ack, () => this.joinRoom(socket, payload)));
    socket.on("room:restore", (payload, ack) => this.handle(socket, ack, () => this.restoreRoom(socket, payload)));
    socket.on("room:leave", (payload, ack) => this.handle(socket, ack, () => this.leaveRoom(socket, payload)));
    socket.on("room:updateSettings", (payload, ack) => this.handle(socket, ack, () => this.updateSettings(socket, payload)));
    socket.on("room:addBot", (payload, ack) => this.handle(socket, ack, () => this.addBot(socket)));
    socket.on("room:removeBot", (payload, ack) => this.handle(socket, ack, () => this.removeBot(socket, payload)));
    socket.on("player:kickVote", (payload, ack) => this.handle(socket, ack, () => this.voteKick(socket, payload)));
    socket.on("game:start", (payload, ack) => this.handle(socket, ack, () => this.startGame(socket)));
    socket.on("game:end", (payload, ack) => this.handle(socket, ack, () => this.endGame(socket)));
    socket.on("answer:draft", (payload) => this.saveAnswerDraft(socket, payload));
    socket.on("answer:submit", (payload, ack) => this.handle(socket, ack, () => this.submitAnswer(socket, payload)));
    socket.on("vote:submit", (payload, ack) => this.handle(socket, ack, () => this.submitVote(socket, payload)));
    socket.on("round:next", (payload, ack) => this.handle(socket, ack, () => this.nextRound(socket)));
    socket.on("chat:send", (payload, ack) => this.handle(socket, ack, () => this.sendChat(socket, payload)));
    socket.on("disconnect", () => this.removePlayer(socket));
  }

  async handle(socket, ack, action) {
    try {
      const result = await action();
      if (typeof ack === "function") {
        ack({ ok: true, ...result });
      }
    } catch (error) {
      const payload = {
        ok: false,
        error: error.message || "حدث خطأ غير متوقع.",
        errorCode: error.code || "UNKNOWN_ERROR"
      };
      if (typeof ack === "function") {
        ack(payload);
      } else {
        socket.emit("game:error", payload);
      }
    }
  }

  getRoom(code) {
    const room = this.rooms.get(cleanRoomCode(code));
    return room ? this.publicRoom(room, null) : null;
  }

  getStatistics() {
    const now = Date.now();
    const roomRows = [...this.rooms.values()].map((room) => this.publicRoomStatistics(room, now));
    const phaseCounts = PHASE_ORDER.map((phase) => ({
      phase,
      count: roomRows.filter((room) => room.phase === phase).length
    }));
    const modeCounts = new Map();

    for (const room of roomRows) {
      const mode = room.activeMode || "kalak";
      if (!modeCounts.has(mode)) {
        modeCounts.set(mode, {
          mode,
          rooms: 0,
          players: 0,
          activeGames: 0
        });
      }

      const row = modeCounts.get(mode);
      row.rooms += 1;
      row.players += room.players.total;
      if (LIVE_GAME_PHASES.has(room.phase)) {
        row.activeGames += 1;
      }
    }

    const playerTotals = roomRows.reduce((acc, room) => {
      acc.total += room.players.total;
      acc.humans += room.players.humans;
      acc.bots += room.players.bots;
      acc.onlineHumans += room.players.onlineHumans;
      acc.offlineHumans += room.players.offlineHumans;
      acc.connectedTotal += room.players.connectedTotal;
      acc.eliminated += room.players.eliminated;
      return acc;
    }, {
      total: 0,
      humans: 0,
      bots: 0,
      onlineHumans: 0,
      offlineHumans: 0,
      connectedTotal: 0,
      eliminated: 0
    });

    const roomTotals = {
      total: roomRows.length,
      lobby: phaseCounts.find((phase) => phase.phase === "lobby")?.count || 0,
      answering: phaseCounts.find((phase) => phase.phase === "answering")?.count || 0,
      voting: phaseCounts.find((phase) => phase.phase === "voting")?.count || 0,
      results: phaseCounts.find((phase) => phase.phase === "results")?.count || 0,
      finished: phaseCounts.find((phase) => phase.phase === "finished")?.count || 0,
      inGame: roomRows.filter((room) => LIVE_GAME_PHASES.has(room.phase)).length,
      openSlots: roomRows.reduce((sum, room) => sum + Math.max(0, this.config.maxPlayers - room.players.total), 0),
      averagePlayers: roomRows.length ? Number((playerTotals.total / roomRows.length).toFixed(1)) : 0,
      averageHumans: roomRows.length ? Number((playerTotals.humans / roomRows.length).toFixed(1)) : 0
    };

    const totalAnswerSubmissions = this.cumulative.answerSubmissions + this.cumulative.botAnswerSubmissions;
    const totalVoteSubmissions = this.cumulative.voteSubmissions + this.cumulative.botVoteSubmissions;
    const historical = this.store?.roomEventStats?.() || {
      createdTotal: this.cumulative.roomsCreated,
      closedTotal: this.cumulative.roomsClosed,
      timeline: [],
      recent: []
    };

    return {
      startedAt: new Date(this.startedAt).toISOString(),
      generatedAt: new Date(now).toISOString(),
      uptimeSeconds: elapsedSeconds(this.startedAt, now),
      socketConnections: this.io.engine?.clientsCount ?? this.io.sockets?.sockets?.size ?? 0,
      rooms: roomTotals,
      players: playerTotals,
      games: {
        live: roomTotals.inGame,
        waiting: roomTotals.lobby,
        finishedRooms: roomTotals.finished,
        finalResultRooms: roomRows.filter((room) => room.results?.isFinal).length
      },
      cumulative: { ...this.cumulative },
      historical,
      activity: {
        humanAnswerSubmissions: this.cumulative.answerSubmissions,
        botAnswerSubmissions: this.cumulative.botAnswerSubmissions,
        totalAnswerSubmissions,
        humanVoteSubmissions: this.cumulative.voteSubmissions,
        botVoteSubmissions: this.cumulative.botVoteSubmissions,
        totalVoteSubmissions,
        chatMessages: this.cumulative.chatMessages,
        totalActions: totalAnswerSubmissions + totalVoteSubmissions + this.cumulative.chatMessages
      },
      phases: phaseCounts,
      modes: [...modeCounts.values()].sort((a, b) => b.rooms - a.rooms || a.mode.localeCompare(b.mode)),
      recentRooms: roomRows
        .sort((a, b) => b.lastActivityTimestamp - a.lastActivityTimestamp)
        .slice(0, 12)
        .map(({ createdTimestamp, lastActivityTimestamp, ...room }) => room)
    };
  }

  publicRoomStatistics(room, now = Date.now()) {
    const players = [...room.players.values()];
    const humans = players.filter((player) => !player.isBot);
    const bots = players.filter((player) => player.isBot);
    const onlineHumans = humans.filter((player) => player.connected !== false);
    const offlineHumans = humans.filter((player) => player.connected === false);
    const connectedTotal = players.filter((player) => player.connected !== false).length;
    const answerers = this.eligibleAnswerers(room);
    const voters = this.eligibleVoters(room);
    const topPlayer = [...players].sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt)[0] || null;
    const lastActivityAt = room.lastActivityAt || room.createdAt;

    return {
      code: room.code,
      phase: room.phase,
      activeMode: this.currentMode(room),
      round: room.round,
      settings: {
        rounds: room.settings.rounds,
        modes: room.settings.modes || [room.settings.mode || "kalak"],
        categories: room.settings.categories || [],
        answerSeconds: room.settings.answerSeconds,
        voteSeconds: room.settings.voteSeconds
      },
      createdAt: new Date(room.createdAt).toISOString(),
      createdTimestamp: room.createdAt,
      lastActivityAt: new Date(lastActivityAt).toISOString(),
      lastActivityTimestamp: lastActivityAt,
      ageSeconds: elapsedSeconds(room.createdAt, now),
      idleSeconds: elapsedSeconds(lastActivityAt, now),
      gameAgeSeconds: room.gameStartedAt ? elapsedSeconds(room.gameStartedAt, room.finishedAt || now) : 0,
      phaseEndsAt: room.phaseEndsAt ? new Date(room.phaseEndsAt).toISOString() : null,
      phaseRemainingSeconds: room.phaseEndsAt ? Math.max(0, Math.ceil((room.phaseEndsAt - now) / 1000)) : null,
      players: {
        total: players.length,
        humans: humans.length,
        bots: bots.length,
        onlineHumans: onlineHumans.length,
        offlineHumans: offlineHumans.length,
        connectedTotal,
        eliminated: room.eliminatedPlayerIds.size
      },
      hostOnline: Boolean(room.hostId && room.players.get(room.hostId)?.connected !== false),
      progress: {
        submissions: room.submissions.size,
        answerers: answerers.length,
        submissionPercent: percent(room.submissions.size, answerers.length),
        votes: room.votes.size,
        voters: voters.length,
        votePercent: percent(room.votes.size, voters.length),
        options: room.options.length,
        messages: room.messages.length
      },
      results: room.results ? {
        isFinal: Boolean(room.results.isFinal),
        awards: Array.isArray(room.results.awards) ? room.results.awards.length : 0
      } : null,
      topPlayer: topPlayer ? {
        name: topPlayer.name,
        score: topPlayer.score,
        isBot: Boolean(topPlayer.isBot)
      } : null
    };
  }

  generateRoomCode() {
    for (let attempt = 0; attempt < ROOM_CODE_ATTEMPTS; attempt += 1) {
      const code = makeCode();
      if (!this.rooms.has(code) && !this.usedRoomCodes.has(code)) {
        this.usedRoomCodes.add(code);
        return code;
      }
    }

    throw new Error("تعذر إنشاء كود غرفة فريد. حاول مرة ثانية.");
  }

  connectedHumans(room) {
    return [...room.players.values()].filter((player) => !player.isBot && player.connected !== false);
  }

  lobbySeatCount(room) {
    return [...room.players.values()].filter((player) => player.isBot || player.connected !== false).length;
  }

  prizeContestants(room) {
    return [...room.players.values()].filter((player) => player.id !== room.hostId && !player.isBot);
  }

  connectedPrizeContestants(room) {
    return this.prizeContestants(room).filter((player) => player.connected !== false);
  }

  assignHostIfNeeded(room, preferredPlayerId = null) {
    const currentHost = room.hostId ? room.players.get(room.hostId) : null;
    if (currentHost && !currentHost.isBot && currentHost.connected !== false) {
      return currentHost.id;
    }

    const preferredPlayer = preferredPlayerId ? room.players.get(preferredPlayerId) : null;
    const nextHost = preferredPlayer && !preferredPlayer.isBot && preferredPlayer.connected !== false
      ? preferredPlayer
      : this.connectedHumans(room)[0] || null;

    room.hostId = nextHost?.id || (room.phase === "lobby" && currentHost && !currentHost.isBot ? currentHost.id : null);
    return room.hostId;
  }

  async createRoom(socket, payload = {}) {
    this.detachSocketFromCurrentRoom(socket);

    const player = createPlayer(socket, payload);
    const code = this.generateRoomCode();

    const room = createEmptyRoom(code, player, this.config);
    const settingsInput = {
      ...room.settings,
      ...payload,
      modes: payload.modes ?? (payload.mode ? [payload.mode] : room.settings.modes)
    };
    room.settings = this.cleanSettings(settingsInput);
    room.activeMode = room.settings.mode;
    this.rooms.set(code, room);
    this.incrementCounter("roomsCreated");
    this.incrementCounter("humanPlayersJoined");
    this.recordRoomEvent("created", room);
    this.bindPlayerSocket(socket, room, player, payload, { announceReturn: false });

    this.addSystemMessage(room, `${player.name} فتح الغرفة.`);
    this.emitRoom(room);

    return {
      room: this.publicRoom(room, player.id),
      playerId: player.id
    };
  }

  async joinRoom(socket, payload = {}) {
    const code = cleanRoomCode(payload.code);
    const room = this.rooms.get(code);
    const sessionId = cleanSessionId(payload.sessionId);

    if (code.length !== ROOM_CODE_LENGTH) {
      throw new Error("اكتب كود غرفة صحيح من 5 خانات.");
    }

    if (!room) {
      throw codedError("كود الغرفة غير موجود.", "ROOM_UNAVAILABLE");
    }

    const existingPlayer = room.players.get(sessionId);
    this.detachSocketFromCurrentRoom(socket, { keepCode: code, keepPlayerId: existingPlayer ? sessionId : null });
    if (!this.rooms.has(code)) {
      throw codedError("كود الغرفة غير موجود.", "ROOM_UNAVAILABLE");
    }

    if (existingPlayer) {
      return this.restorePlayer(socket, room, existingPlayer, payload);
    }

    if (room.phase !== "lobby" && !(isScienceDayRoom(room) && room.phase !== "finished")) {
      throw new Error("هذه المباراة بدأت بالفعل.");
    }

    if (isPrizesRoom(room) && this.prizeContestants(room).length >= this.config.maxPlayers) {
      throw new Error("هذه الغرفة ممتلئة.");
    }

    if (!isMonitorOnlyRoom(room) && this.lobbySeatCount(room) >= this.config.maxPlayers) {
      throw new Error("هذه الغرفة ممتلئة.");
    }

    const player = createPlayer(socket, payload);
    room.players.set(player.id, player);
    this.assignHostIfNeeded(room, player.id);
    this.incrementCounter("humanPlayersJoined");
    this.bindPlayerSocket(socket, room, player, payload, { announceReturn: false });

    this.addSystemMessage(room, `${player.name} انضم للغرفة.`);
    this.emitRoom(room);

    return {
      room: this.publicRoom(room, player.id),
      playerId: player.id
    };
  }

  async restoreRoom(socket, payload = {}) {
    const code = cleanRoomCode(payload.code);
    const room = this.rooms.get(code);
    const sessionId = cleanSessionId(payload.sessionId);

    if (code.length !== ROOM_CODE_LENGTH) {
      throw new Error("اكتب كود غرفة صحيح من 5 خانات.");
    }

    if (!room) {
      throw codedError("هذه الغرفة انتهت أو انقطعت.", "ROOM_UNAVAILABLE");
    }

    const player = room.players.get(sessionId);
    if (!player || player.isBot) {
      if (room.phase === "lobby") {
        return this.joinRoom(socket, payload);
      }

      throw codedError("لم نجد جلستك في هذه الغرفة.", "SESSION_MISSING");
    }

    this.detachSocketFromCurrentRoom(socket, { keepCode: code, keepPlayerId: player.id });
    if (!this.rooms.has(code)) {
      throw codedError("هذه الغرفة انتهت أو انقطعت.", "ROOM_UNAVAILABLE");
    }
    return this.restorePlayer(socket, room, player, payload);
  }

  detachSocketFromCurrentRoom(socket, { keepCode = "", keepPlayerId = "" } = {}) {
    const currentCode = cleanRoomCode(socket.data.roomCode);
    const currentPlayerId = String(socket.data.playerId || "");
    const keepCurrentRoom = keepCode && keepPlayerId && currentCode === keepCode && currentPlayerId === keepPlayerId;

    if (!currentCode || keepCurrentRoom) {
      return null;
    }

    const room = this.rooms.get(currentCode);
    if (!room || !room.players.has(currentPlayerId)) {
      delete socket.data.roomCode;
      delete socket.data.playerId;
      return null;
    }

    const player = room.players.get(currentPlayerId);
    if (room.phase === "lobby" && room.hostId === currentPlayerId) {
      this.closeRoom(room, "المضيف غادر الغرفة، انتهت الغرفة.", { excludeSocketId: socket.id });
      delete socket.data.roomCode;
      delete socket.data.playerId;
      return player;
    }

    return this.removePlayerFromRoom(room, currentPlayerId, `${player?.name || "اللاعب"} غادر الغرفة.`);
  }

  async leaveRoom(socket, payload = {}) {
    const requestedCode = cleanRoomCode(payload.code || socket.data.roomCode);
    const requestedPlayerId = String(payload.playerId || socket.data.playerId || "");
    const room = requestedCode ? this.rooms.get(requestedCode) : null;
    const playerId = requestedPlayerId || this.playerId(socket);

    if (!room || !room.players.has(playerId)) {
      if (!requestedCode || socket.data.roomCode === requestedCode) {
        delete socket.data.roomCode;
        delete socket.data.playerId;
      }
      return { room: null };
    }

    const player = room.players.get(playerId);
    const socketOwnsRequestedPlayer = socket.data.roomCode === requestedCode && socket.data.playerId === playerId;

    if (!socketOwnsRequestedPlayer && player.socketId !== socket.id) {
      return { room: null };
    }

    if (room.phase === "lobby" && room.hostId === playerId) {
      this.closeRoom(room, "المضيف غادر الغرفة، انتهت الغرفة.", { excludeSocketId: socket.id });
      if (socket.data.roomCode === requestedCode && socket.data.playerId === playerId) {
        delete socket.data.roomCode;
        delete socket.data.playerId;
      }
      return { room: null };
    }

    this.removePlayerFromRoom(room, playerId, `${player?.name || "اللاعب"} غادر الغرفة.`);
    return { room: null };
  }

  restorePlayer(socket, room, player, payload = {}) {
    const wasDisconnected = player.connected === false;
    this.bindPlayerSocket(socket, room, player, payload, { announceReturn: wasDisconnected });
    if (wasDisconnected) {
      this.incrementCounter("reconnections");
    }
    this.assignHostIfNeeded(room, player.id);
    this.emitRoom(room);
    return {
      room: this.publicRoom(room, player.id),
      playerId: player.id
    };
  }

  bindPlayerSocket(socket, room, player, payload = {}, { announceReturn = true } = {}) {
    const previousSocketId = player.socketId;
    if (previousSocketId && previousSocketId !== socket.id) {
      const previousSocket = this.io.sockets?.sockets?.get(previousSocketId);
      previousSocket?.leave?.(room.code);
      previousSocket?.leave?.(this.privatePlayerRoom(room, player.id));
      if (previousSocket?.data?.playerId === player.id) {
        delete previousSocket.data.roomCode;
        delete previousSocket.data.playerId;
      }
    }

    if (player.reconnectTimer) {
      clearTimeout(player.reconnectTimer);
      player.reconnectTimer = null;
    }

    player.socketId = socket.id;
    player.connected = true;
    player.disconnectedAt = null;
    player.name = playerName(payload.name || player.name);
    player.avatar = cleanAvatar(payload.avatar || player.avatar);

    socket.join(room.code);
    socket.join(this.privatePlayerRoom(room, player.id));
    socket.data.roomCode = room.code;
    socket.data.playerId = player.id;

    if (announceReturn) {
      this.addSystemMessage(room, `${player.name} رجع للغرفة.`);
    }
  }

  async updateSettings(socket, payload = {}) {
    const room = this.requireRoom(socket);
    this.requireHost(room, socket);

    if (room.phase !== "lobby") {
      throw new Error("يمكن تغيير الإعدادات في غرفة الانتظار فقط.");
    }

    const settingsInput = {
      ...room.settings,
      ...payload,
      modes: payload.modes ?? (payload.mode ? [payload.mode] : room.settings.modes)
    };
    room.settings = this.cleanSettings(settingsInput);
    room.activeMode = room.settings.mode;
    this.emitRoom(room);
    return { room: this.publicRoom(room, this.playerId(socket)) };
  }

  async addBot(socket) {
    const room = this.requireRoom(socket);
    this.requireHost(room, socket);

    if (room.phase !== "lobby") {
      throw new Error("يمكن إضافة اللاعبين الآليين في غرفة الانتظار فقط.");
    }

    if (isScienceDayRoom(room)) {
      throw new Error("اليوم العلمي مصمم للحضور الحقيقي عبر الرابط أو QR.");
    }

    if (isPrizesRoom(room)) {
      throw new Error("جوائز مصمم للاعبين الحقيقيين فقط عبر الرابط أو QR.");
    }

    if (this.lobbySeatCount(room) >= this.config.maxPlayers) {
      throw new Error("هذه الغرفة ممتلئة.");
    }

    const bot = createBot(room);
    room.players.set(bot.id, bot);
    this.incrementCounter("botsAdded");
    this.addSystemMessage(room, `${bot.name} انضم كلاعب آلي للتجربة.`);
    this.emitRoom(room);
    return { room: this.publicRoom(room, this.playerId(socket)) };
  }

  async removeBot(socket, payload = {}) {
    const room = this.requireRoom(socket);
    this.requireHost(room, socket);

    throw new Error("الإخراج يتم بتصويت اللاعبين فقط.");
  }

  async voteKick(socket, payload = {}) {
    const room = this.requireRoom(socket);
    const playerId = this.playerId(socket);
    const voter = room.players.get(playerId);
    const targetId = String(payload.playerId || "");
    const target = room.players.get(targetId);

    if (!target) {
      throw new Error("اللاعب غير موجود.");
    }

    if (target.id === playerId) {
      throw new Error("لا يمكنك التصويت لإخراج نفسك.");
    }

    if (voter?.isBot) {
      throw new Error("اللاعب الآلي لا يصوت على الطرد.");
    }

    const voters = this.kickVotersFor(room, target.id);
    if (!voters.some((player) => player.id === playerId)) {
      throw new Error("لا يمكنك التصويت على هذا اللاعب.");
    }

    if (!room.kickVotes.has(target.id)) {
      room.kickVotes.set(target.id, new Set());
    }

    const votes = room.kickVotes.get(target.id);
    if (votes.has(playerId)) {
      throw new Error("صوتك محسوب بالفعل.");
    }

    votes.add(playerId);

    if (votes.size >= voters.length) {
      this.removePlayerFromRoom(room, target.id, `تم إخراج ${target.name} بتصويت اللاعبين.`, {
        notify: true
      });
      return {
        room: this.rooms.has(room.code) && room.players.has(playerId) ? this.publicRoom(room, playerId) : null
      };
    }

    this.emitRoom(room);
    return { room: this.publicRoom(room, this.playerId(socket)) };
  }

  async startGame(socket) {
    const room = this.requireRoom(socket);
    this.requireHost(room, socket);

    const connectedPlayers = isPrizesRoom(room)
      ? this.connectedPrizeContestants(room)
      : [...room.players.values()].filter((player) => player.connected !== false);
    const requiredPlayers = isScienceDayRoom(room) ? 1 : this.config.minPlayers;
    if (connectedPlayers.length < requiredPlayers) {
      throw new Error(`اللعبة تحتاج على الأقل ${requiredPlayers} لاعبين.`);
    }

    if (room.phase !== "lobby" && room.phase !== "finished") {
      throw new Error("اللعبة تعمل بالفعل.");
    }

    room.round = 0;
    room.usedQuestionIds = [];
    room.eliminatedPlayerIds = new Set();
    room.activeMode = room.settings.modes[0] || "kalak";
    room.modeData = null;
    room.gameStartedAt = Date.now();
    room.finishedAt = null;
    room.statsFinalRecorded = false;
    this.incrementCounter("gamesStarted");
    for (const player of room.players.values()) {
      player.score = 0;
      player.scienceDayCorrectCount = 0;
      player.scienceDayTotalMs = 0;
    }

    await this.startRound(room);
    return { room: this.publicRoom(room, this.playerId(socket)) };
  }

  async endGame(socket) {
    const room = this.requireRoom(socket);
    this.requireHost(room, socket);

    if (room.phase === "lobby") {
      return { room: this.publicRoom(room, this.playerId(socket)) };
    }

    this.incrementCounter("gamesEndedByHost");
    this.clearTimer(room);
    room.phase = "lobby";
    room.round = 0;
    room.usedQuestionIds = [];
    room.submissions = new Map();
    room.answerDrafts = new Map();
    room.votes = new Map();
    room.options = [];
    room.correctWriterIds = [];
    room.eliminatedPlayerIds = new Set();
    room.modeData = null;
    room.results = null;
    room.question = null;
    room.phaseEndsAt = null;
    room.activeMode = room.settings.modes[0] || "kalak";
    room.kickVotes = new Map();
    room.gameStartedAt = null;
    room.finishedAt = null;

    for (const player of room.players.values()) {
      player.score = 0;
    }

    this.addSystemMessage(room, "المضيف أنهى اللعبة ورجع الغرفة للانتظار.");
    this.emitRoom(room);
    return { room: this.publicRoom(room, this.playerId(socket)) };
  }

  saveAnswerDraft(socket, payload = {}) {
    const room = socket.data.roomCode ? this.rooms.get(socket.data.roomCode) : null;
    const playerId = this.playerId(socket);

    if (!room || room.phase !== "answering") {
      return;
    }

    room.answerDrafts = room.answerDrafts || new Map();

    if (this.currentMode(room) !== "imposter" && room.submissions.has(playerId)) {
      return;
    }

    if (!this.canSubmitAnswer(room, playerId) || room.players.get(playerId)?.isBot) {
      return;
    }

    const text = cleanAnswerText(payload.text);
    if (text) {
      room.answerDrafts.set(playerId, {
        playerId,
        text,
        updatedAt: Date.now()
      });
      return;
    }

    room.answerDrafts.delete(playerId);
  }

  async submitAnswer(socket, payload = {}) {
    const room = this.requireRoom(socket);
    const playerId = this.playerId(socket);

    if (room.phase !== "answering") {
      throw new Error("انتهى الوقت.");
    }

    if (this.currentMode(room) === "imposter") {
      return this.submitImposterClue(room, playerId, payload.text);
    }

    if (!this.eligibleAnswerers(room).some((player) => player.id === playerId)) {
      throw new Error("أنت غير مشارك في هذه الجولة.");
    }

    const text = cleanAnswerText(payload.text);
    if (text.length < 1) {
      throw new Error("اكتب إجابة أولًا.");
    }

    this.incrementCounter("answerSubmissions");

    if ((this.currentMode(room) === "kalak" || this.currentMode(room) === PRIZES_MODE) && answersMatch(text, room.question.correctAnswer)) {
      if (!room.correctWriterIds.includes(playerId)) {
        room.correctWriterIds.push(playerId);
      }
      room.answerDrafts.delete(playerId);

      return {
        room: this.publicRoom(room, playerId),
        correctAnswerHit: true,
        message: "إجابتك صحيحة. الآن اكتب إجابة غلط مقنعة عشان تخدع اللاعبين."
      };
    }

    room.submissions.set(playerId, {
      playerId,
      text,
      submittedAt: Date.now()
    });
    room.answerDrafts.delete(playerId);

    this.emitRoom(room);

    if (room.submissions.size >= this.eligibleAnswerers(room).length) {
      setTimeout(() => this.finishAnswering(room.code), 550);
    }

    return { room: this.publicRoom(room, playerId) };
  }

  submitImposterClue(room, playerId, value) {
    const turn = this.currentImposterTurn(room);
    if (!turn || turn.playerId !== playerId) {
      throw new Error("ليس دورك الآن.");
    }

    const text = cleanImposterClueText(value);
    if (text.length < 1) {
      throw new Error("اكتب وصفًا أولًا.");
    }

    this.incrementCounter("answerSubmissions");
    this.completeImposterTurn(room, text);
    return { room: this.publicRoom(room, playerId) };
  }

  async submitVote(socket, payload = {}) {
    const room = this.requireRoom(socket);
    const playerId = this.playerId(socket);

    if (room.phase !== "voting") {
      throw new Error("انتهى الوقت.");
    }

    const voters = this.eligibleVoters(room);
    if (!voters.some((player) => player.id === playerId)) {
      throw new Error("أنت غير مشارك في التصويت لهذه الجولة.");
    }

    const option = room.options.find((item) => item.id === payload.optionId);
    if (!option) {
      throw new Error("الخيار غير موجود.");
    }

    if (option.ownerIds.includes(playerId)) {
      throw new Error("لا يمكنك التصويت لإجابتك.");
    }

    const previousVote = room.votes.get(playerId);
    if (previousVote?.optionId === option.id) {
      return { room: this.publicRoom(room, playerId) };
    }

    room.votes.set(playerId, {
      playerId,
      optionId: option.id,
      votedAt: Date.now()
    });

    this.incrementCounter("voteSubmissions");

    this.emitRoom(room);

    if (this.currentMode(room) !== SCIENCE_DAY_MODE && room.votes.size >= this.eligibleVoters(room).length) {
      setTimeout(() => this.finishVoting(room.code), 550);
    }

    return { room: this.publicRoom(room, playerId) };
  }

  async nextRound(socket) {
    const room = this.requireRoom(socket);
    const playerId = this.playerId(socket);
    this.requireHost(room, socket);

    if (this.currentMode(room) === SCIENCE_DAY_MODE && room.phase === "voting") {
      this.finishScienceDayVoting(room);
      return { room: this.publicRoom(room, playerId) };
    }

    if (room.phase !== "results") {
      throw new Error("الجولة الحالية لم تنته بعد.");
    }

    if (room.results?.isFinal || room.modeData?.matchFinished || room.round >= room.settings.rounds) {
      room.phase = "finished";
      room.phaseEndsAt = null;
      this.emitRoom(room);
      return { room: this.publicRoom(room, playerId) };
    }

    await this.startRound(room);
    return { room: this.publicRoom(room, playerId) };
  }

  async sendChat(socket, payload = {}) {
    const room = this.requireRoom(socket);
    const playerId = this.playerId(socket);
    const player = room.players.get(playerId);
    const message = cleanMessage(payload.message);

    if (!message) {
      throw new Error("الرسالة فارغة.");
    }

    room.messages.push({
      id: nanoid(8),
      type: "player",
      playerId: player.id,
      playerName: player.name,
      message,
      createdAt: Date.now()
    });
    this.incrementCounter("chatMessages");
    room.messages = room.messages.slice(-60);
    this.emitRoom(room);
    return { room: this.publicRoom(room, playerId) };
  }

  selectModeForRound(room) {
    const modes = this.cleanModes(room.settings);
    const mode = modes[room.round % modes.length] || "kalak";
    room.settings = {
      ...room.settings,
      modes,
      mode
    };
    room.activeMode = mode;
    return mode;
  }

  currentMode(room) {
    if (MODE_IDS.has(room.activeMode)) {
      return room.activeMode;
    }

    if (MODE_IDS.has(room.settings?.mode)) {
      return room.settings.mode;
    }

    return this.cleanModes(room.settings)[0];
  }

  async scienceDayQuestionForRound(room) {
    const questions = (await this.store.list({ mode: SCIENCE_DAY_MODE, active: true }))
      .filter(scienceDayQuestionMatchesSet(room.settings.scienceDaySet))
      .sort((a, b) => (
        scienceDayQuestionOrder(a) - scienceDayQuestionOrder(b)
        || String(a.id).localeCompare(String(b.id))
      ));
    const index = scienceDayQuestionNumber(room.round) - 1;
    return questions[index] || null;
  }

  async startRound(room) {
    this.clearTimer(room);
    const mode = this.selectModeForRound(room);

    if ((room.settings.modes || []).length > 1 && mode !== "last_survivor") {
      room.eliminatedPlayerIds = new Set();
    }

    if (mode !== "kalak" && mode !== PRIZES_MODE) {
      await this.startSpecialRound(room);
      return;
    }

    const question = await this.store.random({
      mode,
      categories: mode === PRIZES_MODE ? [] : room.settings.categories,
      excludeIds: room.usedQuestionIds
    });

    if (!question) {
      throw new Error("لا توجد أسئلة نشطة للأنواع المختارة.");
    }

    room.round += 1;
    room.phase = "answering";
    room.question = question;
    room.usedQuestionIds.push(question.id);
    room.submissions = new Map();
    room.answerDrafts = new Map();
    room.votes = new Map();
    room.options = [];
    room.correctWriterIds = [];
    room.modeData = null;
    room.results = null;
    room.phaseEndsAt = Date.now() + room.settings.answerSeconds * 1000;
    room.timer = setTimeout(() => this.finishAnswering(room.code), room.settings.answerSeconds * 1000);

    this.emitRoom(room);
    this.scheduleBotAnswers(room);
  }

  async startSpecialRound(room) {
    const mode = this.currentMode(room);
    room.round += 1;
    room.submissions = new Map();
    room.answerDrafts = new Map();
    room.votes = new Map();
    room.options = [];
    room.correctWriterIds = [];
    room.results = null;
    const content = mode === SCIENCE_DAY_MODE
      ? await this.scienceDayQuestionForRound(room)
      : await this.store.random({
        mode,
        excludeIds: room.usedQuestionIds
      });

    if (content) {
      room.usedQuestionIds.push(content.id);
    }

    if (mode === "imposter") {
      this.startImposterRound(room, content);
      return;
    }

    if (mode === "fake_fact") {
      this.startFakeFactRound(room, content);
      return;
    }

    if (mode === "last_survivor") {
      this.startLastSurvivorRound(room, content);
      return;
    }

    if (mode === "judge_pick") {
      this.startJudgePickRound(room, content);
      return;
    }

    if (mode === "target_guess") {
      this.startTargetGuessRound(room, content);
      return;
    }

    if (mode === "split_steal") {
      this.startSplitStealRound(room, content);
      return;
    }

    if (mode === "minority_wins") {
      this.startMinorityWinsRound(room, content);
      return;
    }

    if (mode === "reverse_trap") {
      this.startReverseTrapRound(room, content);
      return;
    }

    if (mode === "mind_match") {
      this.startMindMatchRound(room, content);
      return;
    }

    if (mode === "closest_number") {
      this.startClosestNumberRound(room, content);
      return;
    }

    if (mode === "hot_take") {
      this.startHotTakeRound(room, content);
      return;
    }

    if (mode === SCIENCE_DAY_MODE) {
      this.startScienceDayRound(room, content);
      return;
    }

    if (DIRECT_CHOICE_ROUNDS[mode]) {
      this.startDirectChoiceRound(room, mode, content);
    }
  }

  startImposterRound(room, question = null) {
    const activePlayers = this.activePlayers(room).sort((a, b) => a.joinedAt - b.joinedAt);
    const imposter = activePlayers[Math.floor(Math.random() * activePlayers.length)];
    const content = contentPayload(question);
    const word = content.secretWord || question?.correctAnswer || IMPOSTER_WORDS[Math.floor(Math.random() * IMPOSTER_WORDS.length)];
    const turnOrder = activePlayers.map((player) => player.id);

    room.phase = "answering";
    room.modeData = {
      imposterId: imposter.id,
      secretWord: word,
      turnOrder,
      turnIndex: 0,
      passesPerPlayer: IMPOSTER_CLUE_PASSES,
      clueSeconds: IMPOSTER_CLUE_SECONDS,
      totalTurns: turnOrder.length * IMPOSTER_CLUE_PASSES,
      clues: {}
    };
    room.question = {
      id: `imposter_${room.round}`,
      category: "الدخيل",
      prompt: "صف الكلمة بكلمة واحدة.",
      difficulty: "medium"
    };
    if (question && room.question.id.startsWith("imposter_")) {
      room.question = {
        ...room.question,
        id: contentQuestionId(question, room.question.id),
        category: contentCategory(question, room.question.category),
        prompt: content.cluePrompt || contentPrompt(question, room.question.prompt),
        difficulty: contentDifficulty(question)
      };
    }
    this.startImposterTurn(room);
  }

  startImposterTurn(room) {
    this.clearTimer(room);

    if (!this.skipInactiveImposterSpeakers(room)) {
      this.finishAnswering(room.code);
      return;
    }

    const turn = this.currentImposterTurn(room);
    if (!turn) {
      this.finishAnswering(room.code);
      return;
    }

    room.phaseEndsAt = Date.now() + turn.clueSeconds * 1000;
    room.timer = setTimeout(() => this.advanceImposterTurn(room.code), turn.clueSeconds * 1000);
    this.emitRoom(room);
    this.scheduleCurrentImposterBot(room);
  }

  skipInactiveImposterSpeakers(room) {
    const data = room.modeData || {};
    const turnOrder = Array.isArray(data.turnOrder) ? data.turnOrder : [];
    const totalTurns = Number(data.totalTurns) || turnOrder.length * (Number(data.passesPerPlayer) || IMPOSTER_CLUE_PASSES);
    const activeIds = new Set(this.activePlayers(room).map((player) => player.id));

    while (turnOrder.length && Number(data.turnIndex || 0) < totalTurns) {
      const playerId = turnOrder[(Number(data.turnIndex) || 0) % turnOrder.length];
      if (activeIds.has(playerId)) {
        return true;
      }
      data.turnIndex = (Number(data.turnIndex) || 0) + 1;
    }

    return false;
  }

  recordImposterClue(room, playerId, text) {
    const turn = this.currentImposterTurn(room);
    const data = room.modeData || {};
    const turnOrder = Array.isArray(data.turnOrder) ? data.turnOrder : [];
    const passIndex = turnOrder.length ? Math.floor((Number(data.turnIndex) || 0) / turnOrder.length) : 0;
    const clue = cleanImposterClueText(text) || IMPOSTER_EMPTY_CLUE;
    const clues = data.clues && typeof data.clues === "object" ? data.clues : {};
    const playerClues = Array.isArray(clues[playerId]) ? [...clues[playerId]] : [];

    playerClues[passIndex] = clue;
    clues[playerId] = playerClues.slice(0, Number(data.passesPerPlayer) || IMPOSTER_CLUE_PASSES);
    data.clues = clues;
    room.modeData = data;
    room.submissions.set(playerId, {
      playerId,
      text: this.combinedImposterClue(room, playerId),
      clues: this.imposterCluesFor(room, playerId),
      submittedAt: Date.now()
    });
    room.answerDrafts.delete(playerId);
  }

  completeImposterTurn(room, text = "") {
    const turn = this.currentImposterTurn(room);
    if (!turn) {
      this.finishAnswering(room.code);
      return;
    }

    this.recordImposterClue(room, turn.playerId, text);
    room.modeData.turnIndex = turn.turnIndex + 1;

    if (room.modeData.turnIndex >= turn.totalTurns) {
      this.finishAnswering(room.code);
      return;
    }

    this.startImposterTurn(room);
  }

  advanceImposterTurn(code) {
    const room = this.rooms.get(code);
    if (!room || room.phase !== "answering" || this.currentMode(room) !== "imposter") {
      return;
    }

    const turn = this.currentImposterTurn(room);
    if (!turn) {
      this.finishAnswering(code);
      return;
    }

    const draft = room.answerDrafts.get(turn.playerId)?.text || "";
    this.completeImposterTurn(room, draft);
  }

  scheduleCurrentImposterBot(room) {
    const turn = this.currentImposterTurn(room);
    const bot = turn?.player;
    if (!bot?.isBot) {
      return;
    }

    this.queueBotTask(room, () => {
      const liveRoom = this.rooms.get(room.code);
      const liveTurn = liveRoom ? this.currentImposterTurn(liveRoom) : null;
      if (!liveRoom || liveRoom.phase !== "answering" || liveTurn?.playerId !== bot.id || this.currentMode(liveRoom) !== "imposter") {
        return;
      }

      this.incrementCounter("botAnswerSubmissions");
      this.completeImposterTurn(liveRoom, this.botAnswerText(liveRoom, bot));
    }, 1100 + Math.floor(Math.random() * 1200));
  }

  startFakeFactRound(room, question = null) {
    const content = contentPayload(question);
    const fact = question
      ? {
        statement: content.statement || question.prompt,
        answer: content.answer || question.correctAnswer,
        explanation: content.explanation || ""
      }
      : FAKE_FACTS[Math.floor(Math.random() * FAKE_FACTS.length)];

    room.phase = "voting";
    room.modeData = fact;
    room.question = {
      id: `fake_fact_${room.round}`,
      category: "كذبة ذكية",
      prompt: fact.statement,
      difficulty: "medium"
    };
    if (question) {
      room.question = {
        ...room.question,
        id: contentQuestionId(question, room.question.id),
        category: contentCategory(question, room.question.category),
        difficulty: contentDifficulty(question)
      };
    }
    room.options = shuffle([
      { id: "true", text: "صح", isCorrect: fact.answer === "true", ownerIds: [] },
      { id: "fake", text: "غلط", isCorrect: fact.answer === "fake", ownerIds: [] }
    ]);
    room.phaseEndsAt = Date.now() + room.settings.voteSeconds * 1000;
    room.timer = setTimeout(() => this.finishVoting(room.code), room.settings.voteSeconds * 1000);
    this.emitRoom(room);
    this.scheduleBotVotes(room);
  }

  startLastSurvivorRound(room, question = null) {
    const challenge = contentPrompt(
      question,
      LAST_SURVIVOR_CHALLENGES[Math.floor(Math.random() * LAST_SURVIVOR_CHALLENGES.length)]
    );

    room.phase = "answering";
    room.modeData = { challenge };
    room.question = {
      id: `last_survivor_${room.round}`,
      category: "⚡ الفرصة الأخيرة",
      prompt: challenge,
      difficulty: "medium"
    };
    if (question) {
      room.question = {
        ...room.question,
        id: contentQuestionId(question, room.question.id),
        category: contentCategory(question, room.question.category),
        difficulty: contentDifficulty(question)
      };
    }
    room.phaseEndsAt = Date.now() + room.settings.answerSeconds * 1000;
    room.timer = setTimeout(() => this.finishAnswering(room.code), room.settings.answerSeconds * 1000);
    this.emitRoom(room);
    this.scheduleBotAnswers(room);
  }

  startJudgePickRound(room, question = null) {
    const activePlayers = this.activePlayers(room);
    const judge = activePlayers[(room.round - 1) % activePlayers.length];
    const promptIndex = Math.floor(Math.random() * JUDGE_PICK_PROMPTS.length);
    const content = contentPayload(question);
    const prompt = contentPrompt(question, JUDGE_PICK_PROMPTS[promptIndex]);
    const gameAnswers = Array.isArray(content.gameAnswers) && content.gameAnswers.length > 0
      ? content.gameAnswers
      : JUDGE_PICK_GAME_ANSWERS[promptIndex] || [];
    const gameAnswer = shuffle(gameAnswers)[0] || "";

    room.phase = "answering";
    room.modeData = {
      judgeId: judge.id,
      prompt,
      gameAnswer,
      gameAnswers: gameAnswer ? [gameAnswer] : []
    };
    room.question = {
      id: `judge_pick_${room.round}`,
      category: "الحكم",
      prompt: `الحكم: ${judge.name}. ${prompt}`,
      difficulty: "medium"
    };
    if (question) {
      room.question = {
        ...room.question,
        id: contentQuestionId(question, room.question.id),
        category: contentCategory(question, room.question.category),
        difficulty: contentDifficulty(question)
      };
    }
    room.phaseEndsAt = Date.now() + room.settings.answerSeconds * 1000;
    room.timer = setTimeout(() => this.finishAnswering(room.code), room.settings.answerSeconds * 1000);
    this.emitRoom(room);
    this.scheduleBotAnswers(room);
  }

  startTargetGuessRound(room, question = null) {
    const activePlayers = this.activePlayers(room);
    const target = activePlayers[Math.floor(Math.random() * activePlayers.length)];
    const content = contentPayload(question);
    const challenge = question
      ? {
        prompt: contentPrompt(question, question.prompt),
        options: content.options || []
      }
      : TARGET_GUESS_ROUNDS[Math.floor(Math.random() * TARGET_GUESS_ROUNDS.length)];

    room.phase = "voting";
    room.modeData = {
      ...challenge,
      targetId: target.id
    };
    room.question = {
      id: `target_guess_${room.round}`,
      category: "توقع الهدف",
      prompt: `الهدف: ${target.name}. ${challenge.prompt}`,
      difficulty: "medium"
    };
    room.options = shuffle(challenge.options.map((text) => ({
      id: nanoid(8),
      text,
      isCorrect: false,
      ownerIds: []
    })));
    if (question) {
      room.question = {
        ...room.question,
        id: contentQuestionId(question, room.question.id),
        category: contentCategory(question, room.question.category),
        difficulty: contentDifficulty(question)
      };
    }
    room.phaseEndsAt = Date.now() + room.settings.voteSeconds * 1000;
    room.timer = setTimeout(() => this.finishVoting(room.code), room.settings.voteSeconds * 1000);
    this.emitRoom(room);
    this.scheduleBotVotes(room);
  }

  startSplitStealRound(room, question = null) {
    const scenario = contentPrompt(
      question,
      SPLIT_STEAL_SCENARIOS[Math.floor(Math.random() * SPLIT_STEAL_SCENARIOS.length)]
    );

    room.phase = "voting";
    room.modeData = { scenario };
    room.question = {
      id: `split_steal_${room.round}`,
      category: "قسمة أو سرقة",
      prompt: scenario,
      difficulty: "medium"
    };
    room.options = [
      { id: "split", text: "قسمة", isCorrect: false, ownerIds: [] },
      { id: "steal", text: "سرقة", isCorrect: false, ownerIds: [] }
    ];
    if (question) {
      room.question = {
        ...room.question,
        id: contentQuestionId(question, room.question.id),
        category: contentCategory(question, room.question.category),
        difficulty: contentDifficulty(question)
      };
    }
    room.phaseEndsAt = Date.now() + room.settings.voteSeconds * 1000;
    room.timer = setTimeout(() => this.finishVoting(room.code), room.settings.voteSeconds * 1000);
    this.emitRoom(room);
    this.scheduleBotVotes(room);
  }

  startMinorityWinsRound(room, question = null) {
    const content = contentPayload(question);
    const challenge = question
      ? {
        prompt: contentPrompt(question, question.prompt),
        options: content.options || []
      }
      : MINORITY_WINS_ROUNDS[Math.floor(Math.random() * MINORITY_WINS_ROUNDS.length)];

    room.phase = "voting";
    room.modeData = challenge;
    room.question = {
      id: `minority_wins_${room.round}`,
      category: "الأقلية تربح",
      prompt: challenge.prompt,
      difficulty: "medium"
    };
    room.options = shuffle(challenge.options.map((text) => ({
      id: nanoid(8),
      text,
      isCorrect: false,
      ownerIds: []
    })));
    if (question) {
      room.question = {
        ...room.question,
        id: contentQuestionId(question, room.question.id),
        category: contentCategory(question, room.question.category),
        difficulty: contentDifficulty(question)
      };
    }
    room.phaseEndsAt = Date.now() + room.settings.voteSeconds * 1000;
    room.timer = setTimeout(() => this.finishVoting(room.code), room.settings.voteSeconds * 1000);
    this.emitRoom(room);
    this.scheduleBotVotes(room);
  }

  startReverseTrapRound(room, question = null) {
    const content = contentPayload(question);
    const challenge = question
      ? {
        prompt: contentPrompt(question, question.prompt),
        trap: content.trap || question.correctAnswer,
        options: content.options || [],
        explanation: content.explanation || ""
      }
      : REVERSE_TRAP_ROUNDS[Math.floor(Math.random() * REVERSE_TRAP_ROUNDS.length)];

    room.phase = "voting";
    room.modeData = challenge;
    room.question = {
      id: `reverse_trap_${room.round}`,
      category: "الفخ المعكوس",
      prompt: challenge.prompt,
      difficulty: "medium"
    };
    room.options = shuffle(challenge.options.map((text) => ({
      id: nanoid(8),
      text,
      isCorrect: text !== challenge.trap,
      isTrap: text === challenge.trap,
      ownerIds: []
    })));
    if (question) {
      room.question = {
        ...room.question,
        id: contentQuestionId(question, room.question.id),
        category: contentCategory(question, room.question.category),
        difficulty: contentDifficulty(question)
      };
    }
    room.phaseEndsAt = Date.now() + room.settings.voteSeconds * 1000;
    room.timer = setTimeout(() => this.finishVoting(room.code), room.settings.voteSeconds * 1000);
    this.emitRoom(room);
    this.scheduleBotVotes(room);
  }

  startDirectChoiceRound(room, mode, question = null) {
    const rounds = DIRECT_CHOICE_ROUNDS[mode] || [];
    const content = contentPayload(question);
    const challenge = question
      ? {
        category: question.category,
        prompt: contentPrompt(question, question.prompt),
        correct: content.correct || question.correctAnswer,
        options: content.options || [],
        explanation: content.explanation || ""
      }
      : rounds[Math.floor(Math.random() * rounds.length)];

    room.phase = "voting";
    room.modeData = {
      ...challenge,
      modeType: "direct_choice"
    };
    room.question = {
      id: `${mode}_${room.round}`,
      category: challenge.category,
      prompt: challenge.prompt,
      difficulty: "medium"
    };
    room.options = shuffle(challenge.options.map((text) => ({
      id: nanoid(8),
      text,
      isCorrect: text === challenge.correct,
      ownerIds: []
    })));
    if (question) {
      room.question = {
        ...room.question,
        id: contentQuestionId(question, room.question.id),
        category: contentCategory(question, room.question.category),
        difficulty: contentDifficulty(question)
      };
    }
    room.phaseEndsAt = Date.now() + room.settings.voteSeconds * 1000;
    room.timer = setTimeout(() => this.finishVoting(room.code), room.settings.voteSeconds * 1000);
    this.emitRoom(room);
    this.scheduleBotVotes(room);
  }

  startScienceDayRound(room, question = null) {
    if (!question) {
      throw new Error("لا توجد أسئلة نشطة لليوم العلمي.");
    }

    const content = contentPayload(question);
    const correct = content.correct || question.correctAnswer;
    const options = Array.isArray(content.options) ? content.options : [];
    if (!correct || options.length < 2) {
      throw new Error("أسئلة اليوم العلمي تحتاج خيارات وإجابة صحيحة.");
    }

    const selectedSet = cleanScienceDaySet(room.settings.scienceDaySet);
    const eventRound = scienceDaySetNumber(selectedSet);
    const questionInRound = scienceDayQuestionNumber(room.round);
    const startedAt = Date.now();
    room.settings.voteSeconds = SCIENCE_DAY_QUESTION_SECONDS;

    room.phase = "voting";
    room.modeData = {
      modeType: SCIENCE_DAY_MODE,
      selectedSet,
      setLabel: scienceDaySetLabel(selectedSet),
      eventRound,
      questionInRound,
      questionsPerRound: SCIENCE_DAY_QUESTIONS_PER_SET,
      totalEventRounds: SCIENCE_DAY_TOTAL_SETS,
      startedAt,
      explanation: content.explanation || ""
    };
    room.question = {
      id: contentQuestionId(question, `science_day_${room.round}`),
      category: contentCategory(question, "اليوم العلمي"),
      prompt: contentPrompt(question, question.prompt),
      correctAnswer: correct,
      difficulty: contentDifficulty(question)
    };
    room.options = options.map((text) => ({
      id: nanoid(8),
      text,
      isCorrect: text === correct,
      ownerIds: []
    }));
    room.phaseEndsAt = startedAt + room.settings.voteSeconds * 1000;
    room.timer = setTimeout(() => this.finishVoting(room.code), room.settings.voteSeconds * 1000);
    this.emitRoom(room);
  }

  startMindMatchRound(room, question = null) {
    const content = contentPayload(question);
    const challenge = question
      ? {
        category: question.category,
        prompt: contentPrompt(question, question.prompt),
        options: content.options || []
      }
      : MIND_MATCH_ROUNDS[Math.floor(Math.random() * MIND_MATCH_ROUNDS.length)];

    room.phase = "voting";
    room.modeData = challenge;
    room.question = {
      id: `mind_match_${room.round}`,
      category: challenge.category,
      prompt: challenge.prompt,
      difficulty: "medium"
    };
    room.options = shuffle(challenge.options.map((text) => ({
      id: nanoid(8),
      text,
      isCorrect: false,
      ownerIds: []
    })));
    if (question) {
      room.question = {
        ...room.question,
        id: contentQuestionId(question, room.question.id),
        category: contentCategory(question, room.question.category),
        difficulty: contentDifficulty(question)
      };
    }
    room.phaseEndsAt = Date.now() + room.settings.voteSeconds * 1000;
    room.timer = setTimeout(() => this.finishVoting(room.code), room.settings.voteSeconds * 1000);
    this.emitRoom(room);
    this.scheduleBotVotes(room);
  }

  startClosestNumberRound(room, question = null) {
    const content = contentPayload(question);
    const challenge = question
      ? {
        category: question.category,
        prompt: contentPrompt(question, question.prompt),
        answer: content.answer,
        unit: content.unit || "",
        explanation: content.explanation || ""
      }
      : CLOSEST_NUMBER_ROUNDS[Math.floor(Math.random() * CLOSEST_NUMBER_ROUNDS.length)];

    room.phase = "answering";
    room.modeData = challenge;
    room.question = {
      id: `closest_number_${room.round}`,
      category: challenge.category,
      prompt: challenge.prompt,
      difficulty: "medium"
    };
    if (question) {
      room.question = {
        ...room.question,
        id: contentQuestionId(question, room.question.id),
        category: contentCategory(question, room.question.category),
        difficulty: contentDifficulty(question)
      };
    }
    room.phaseEndsAt = Date.now() + room.settings.answerSeconds * 1000;
    room.timer = setTimeout(() => this.finishAnswering(room.code), room.settings.answerSeconds * 1000);
    this.emitRoom(room);
    this.scheduleBotAnswers(room);
  }

  startHotTakeRound(room, question = null) {
    const prompt = contentPrompt(
      question,
      HOT_TAKE_PROMPTS[Math.floor(Math.random() * HOT_TAKE_PROMPTS.length)]
    );

    room.phase = "answering";
    room.modeData = { prompt };
    room.question = {
      id: `hot_take_${room.round}`,
      category: "أقوى إجابة",
      prompt,
      difficulty: "medium"
    };
    if (question) {
      room.question = {
        ...room.question,
        id: contentQuestionId(question, room.question.id),
        category: contentCategory(question, room.question.category),
        difficulty: contentDifficulty(question)
      };
    }
    room.phaseEndsAt = Date.now() + room.settings.answerSeconds * 1000;
    room.timer = setTimeout(() => this.finishAnswering(room.code), room.settings.answerSeconds * 1000);
    this.emitRoom(room);
    this.scheduleBotAnswers(room);
  }

  scheduleBotAnswers(room) {
    const bots = this.eligibleAnswerers(room).filter((player) => player.isBot);

    bots.forEach((bot, index) => {
      this.queueBotTask(room, () => {
        const liveRoom = this.rooms.get(room.code);
        if (!liveRoom || liveRoom.phase !== "answering" || !liveRoom.players.has(bot.id) || liveRoom.submissions.has(bot.id)) {
          return;
        }

        liveRoom.submissions.set(bot.id, {
          playerId: bot.id,
          text: this.botAnswerText(liveRoom, bot),
          submittedAt: Date.now()
        });
        this.incrementCounter("botAnswerSubmissions");

        this.emitRoom(liveRoom);

        if (liveRoom.submissions.size >= this.eligibleAnswerers(liveRoom).length) {
          setTimeout(() => this.finishAnswering(liveRoom.code), 550);
        }
      }, 900 + index * 700 + Math.floor(Math.random() * 900));
    });
  }

  scheduleBotVotes(room) {
    const bots = this.eligibleVoters(room).filter((player) => player.isBot);

    bots.forEach((bot, index) => {
      this.queueBotTask(room, () => {
        const liveRoom = this.rooms.get(room.code);
        const canVote = liveRoom ? this.eligibleVoters(liveRoom).some((player) => player.id === bot.id) : false;
        if (!liveRoom || liveRoom.phase !== "voting" || !liveRoom.players.has(bot.id) || liveRoom.votes.has(bot.id) || !canVote) {
          return;
        }

        const allowedOptions = liveRoom.options.filter((option) => !option.ownerIds.includes(bot.id));
        const correctOption = allowedOptions.find((option) => option.isCorrect);
        const fakeOptions = allowedOptions.filter((option) => !option.isCorrect);
        const wantsCorrect = Math.random() < BOT_CORRECT_VOTE_RATE;
        const choice = wantsCorrect && correctOption
          ? correctOption
          : fakeOptions[Math.floor(Math.random() * fakeOptions.length)] || correctOption || allowedOptions[0];

        if (!choice) {
          return;
        }

        liveRoom.votes.set(bot.id, {
          playerId: bot.id,
          optionId: choice.id,
          votedAt: Date.now()
        });
        this.incrementCounter("botVoteSubmissions");

        this.emitRoom(liveRoom);

        if (this.currentMode(liveRoom) !== SCIENCE_DAY_MODE && liveRoom.votes.size >= this.eligibleVoters(liveRoom).length) {
          setTimeout(() => this.finishVoting(liveRoom.code), 550);
        }
      }, 1000 + index * 800 + Math.floor(Math.random() * 1200));
    });
  }

  botAnswerText(room, bot) {
    const mode = this.currentMode(room);

    if (mode === "imposter") {
      if (bot.id === room.modeData?.imposterId) {
        return shuffle(["دافئ", "سريع", "قديم", "أزرق", "عال", "لامع"])[0];
      }
      return shuffle(["واضح", "مشهور", "يومي", "كلاسيكي", "قوي", "محلي"])[0];
    }

    if (mode === "last_survivor") {
      const existing = new Set([...room.submissions.values()].map((submission) => normalizeAnswer(submission.text)));
      const candidate = shuffle(LAST_SURVIVOR_BOT_ANSWERS).find((answer) => !existing.has(normalizeAnswer(answer)));
      return candidate || `إجابة ${Math.floor(10 + Math.random() * 90)}`;
    }

    if (mode === "closest_number") {
      const answer = Number(room.modeData?.answer || 10);
      const spread = Math.max(2, Math.round(Math.abs(answer) * 0.25));
      return String(Math.max(0, answer + Math.floor(Math.random() * (spread * 2 + 1)) - spread));
    }

    if (mode === "hot_take" || mode === "judge_pick") {
      return shuffle(HOT_TAKE_BOT_ANSWERS)[0];
    }

    if (Math.random() < BOT_CORRECT_ANSWER_RATE) {
      return room.question.correctAnswer;
    }

    const existing = new Set([...room.submissions.values()].map((submission) => normalizeAnswer(submission.text)));
    const correct = room.question.correctAnswer;
    const candidates = shuffle(BOT_FAKE_ANSWERS).filter((answer) => {
      const normalized = normalizeAnswer(answer);
      return normalized && !answersMatch(answer, correct) && !existing.has(normalized);
    });

    return candidates[0] || `إجابة غامضة ${Math.floor(10 + Math.random() * 90)}`;
  }

  queueBotTask(room, task, delay) {
    const timer = setTimeout(task, delay);
    room.botTimers.push(timer);
  }

  finishAnswering(code) {
    const room = this.rooms.get(code);
    if (!room || room.phase !== "answering") {
      return;
    }

    const mode = this.currentMode(room);

    if (mode === "imposter") {
      this.finishImposterAnswering(room);
      return;
    }

    this.promoteAnswerDrafts(room);

    if (mode === "last_survivor") {
      this.finishLastSurvivorAnswering(room);
      return;
    }

    if (mode === "judge_pick") {
      this.finishJudgePickAnswering(room);
      return;
    }

    if (mode === "closest_number") {
      this.finishClosestNumberAnswering(room);
      return;
    }

    if (mode === "hot_take") {
      this.finishHotTakeAnswering(room);
      return;
    }

    this.clearTimer(room);

    const correct = room.question.correctAnswer;
    const fakeGroups = new Map();
    const correctWriterIds = new Set(room.correctWriterIds || []);

    for (const submission of room.submissions.values()) {
      const normalized = normalizeAnswer(submission.text);

      if (answersMatch(submission.text, correct)) {
        correctWriterIds.add(submission.playerId);
        continue;
      }

      if (!normalized) {
        continue;
      }

      if (!fakeGroups.has(normalized)) {
        fakeGroups.set(normalized, {
          id: nanoid(8),
          text: submission.text,
          isCorrect: false,
          ownerIds: []
        });
      }

      fakeGroups.get(normalized).ownerIds.push(submission.playerId);
    }

    const options = [
      ...fakeGroups.values(),
      {
        id: nanoid(8),
        text: correct,
        isCorrect: true,
        ownerIds: []
      }
    ];

    room.options = shuffle(options);
    room.correctWriterIds = [...correctWriterIds];
    room.phase = "voting";
    room.phaseEndsAt = Date.now() + room.settings.voteSeconds * 1000;
    room.timer = setTimeout(() => this.finishVoting(room.code), room.settings.voteSeconds * 1000);
    this.emitRoom(room);
    this.scheduleBotVotes(room);
  }

  finishImposterAnswering(room) {
    this.clearTimer(room);

    room.options = this.activePlayers(room).map((player) => {
      const clue = this.combinedImposterClue(room, player.id);
      return {
        id: `suspect_${player.id}`,
        text: player.name,
        clue,
        isCorrect: player.id === room.modeData.imposterId,
        ownerIds: [player.id],
        suspectId: player.id
      };
    });
    room.phase = "voting";
    room.phaseEndsAt = Date.now() + room.settings.voteSeconds * 1000;
    room.timer = setTimeout(() => this.finishVoting(room.code), room.settings.voteSeconds * 1000);
    this.emitRoom(room);
    this.scheduleBotVotes(room);
  }

  finishLastSurvivorAnswering(room) {
    this.clearTimer(room);

    const activePlayers = this.activePlayers(room);
    const answers = new Map();
    const eliminated = [];
    const awards = this.baseAwards(room);

    for (const player of activePlayers) {
      const submission = room.submissions.get(player.id);
      const normalized = normalizeAnswer(submission?.text);

      if (!normalized) {
        eliminated.push({ playerId: player.id, name: player.name, reason: "لم يجب", answer: "" });
        continue;
      }

      if (!answers.has(normalized)) {
        answers.set(normalized, []);
      }
      answers.get(normalized).push({ player, text: submission.text });
    }

    for (const answerGroup of answers.values()) {
      if (answerGroup.length > 1) {
        for (const entry of answerGroup) {
          eliminated.push({
            playerId: entry.player.id,
            name: entry.player.name,
            reason: "إجابة مكررة",
            answer: entry.text
          });
        }
      } else {
        const survivor = answerGroup[0].player;
        const award = awards.get(survivor.id);
        award.correctVote += 1;
        award.total += 1;
      }
    }

    for (const item of eliminated) {
      room.eliminatedPlayerIds.add(item.playerId);
    }

    for (const award of awards.values()) {
      const player = room.players.get(award.playerId);
      if (player) {
        player.score += award.total;
        award.score = player.score;
      }
    }

    const remaining = this.activePlayers(room);
    const isOnlySurvivorMode = (room.settings.modes || []).length === 1;
    const matchFinished = isOnlySurvivorMode && (remaining.length <= 1 || room.round >= room.settings.rounds);
    room.modeData = {
      ...room.modeData,
      matchFinished
    };
    room.results = {
      correctAnswer: remaining.length === 1 ? remaining[0].name : "المستمرون في الفرصة الأخيرة",
      summary: remaining.length === 1 ? `${remaining[0].name} فاز بالفرصة الأخيرة.` : `بقي ${remaining.length} لاعبين في المنافسة.`,
      isFinal: matchFinished || room.round >= room.settings.rounds,
      eliminated,
      awards: [...awards.values()].sort((a, b) => b.total - a.total),
      revealedOptions: activePlayers.map((player) => {
        const submission = room.submissions.get(player.id);
        const eliminatedEntry = eliminated.find((item) => item.playerId === player.id);
        return {
          id: player.id,
          text: submission?.text || "بدون إجابة",
          isCorrect: !eliminatedEntry,
          ownerIds: [player.id],
          ownerNames: [player.name],
          voterNames: [eliminatedEntry?.reason || "نجا"]
        };
      })
    };
    room.phase = "results";
    room.phaseEndsAt = null;
    this.emitRoom(room);
  }

  finishHotTakeAnswering(room) {
    this.clearTimer(room);

    room.options = shuffle([...room.submissions.values()]
      .filter((submission) => normalizeAnswer(submission.text))
      .map((submission) => ({
        id: nanoid(8),
        text: submission.text,
        isCorrect: false,
        ownerIds: [submission.playerId]
      })));

    if (room.options.length === 0) {
      const awards = this.baseAwards(room);
      room.results = {
        correctAnswer: "لا توجد إجابات",
        summary: "لم يرسل أحد إجابة في هذه الجولة.",
        isFinal: room.round >= room.settings.rounds,
        votes: [],
        awards: [...awards.values()],
        revealedOptions: []
      };
      room.phase = "results";
      room.phaseEndsAt = null;
      this.emitRoom(room);
      return;
    }

    room.phase = "voting";
    room.phaseEndsAt = Date.now() + room.settings.voteSeconds * 1000;
    room.timer = setTimeout(() => this.finishVoting(room.code), room.settings.voteSeconds * 1000);
    this.emitRoom(room);
    this.scheduleBotVotes(room);
  }

  promoteAnswerDrafts(room) {
    const eligibleIds = new Set(this.eligibleAnswerers(room).map((player) => player.id));

    for (const draft of room.answerDrafts?.values?.() || []) {
      if (!eligibleIds.has(draft.playerId) || room.submissions.has(draft.playerId)) {
        continue;
      }

      const text = cleanAnswerText(draft.text);
      if (!text) {
        continue;
      }

      room.submissions.set(draft.playerId, {
        playerId: draft.playerId,
        text,
        submittedAt: draft.updatedAt || Date.now(),
        autoSubmitted: true
      });
      this.incrementCounter("answerSubmissions");
    }

    room.answerDrafts = new Map();
  }

  finishJudgePickAnswering(room) {
    this.clearTimer(room);

    const playerOptions = [...room.submissions.values()]
      .filter((submission) => normalizeAnswer(submission.text))
      .map((submission) => ({
        id: nanoid(8),
        text: submission.text,
        isCorrect: false,
        ownerIds: [submission.playerId],
        source: "player"
      }));

    const gameAnswer = room.modeData?.gameAnswer || shuffle(room.modeData?.gameAnswers || [])[0] || "";
    const gameOptions = gameAnswer ? [{
      id: nanoid(8),
      text: gameAnswer,
      isCorrect: false,
      ownerIds: [],
      source: "game"
    }] : [];

    room.options = shuffle([...playerOptions, ...gameOptions]);

    if (room.options.length === 0) {
      const awards = this.baseAwards(room);
      room.results = {
        correctAnswer: "لا توجد إجابات",
        summary: "لم يرسل اللاعبون إجابات للحكم.",
        isFinal: room.round >= room.settings.rounds,
        votes: [],
        awards: [...awards.values()],
        revealedOptions: []
      };
      room.phase = "results";
      room.phaseEndsAt = null;
      this.emitRoom(room);
      return;
    }

    room.phase = "voting";
    room.phaseEndsAt = Date.now() + room.settings.voteSeconds * 1000;
    room.timer = setTimeout(() => this.finishVoting(room.code), room.settings.voteSeconds * 1000);
    this.emitRoom(room);
    this.scheduleBotVotes(room);
  }

  finishClosestNumberAnswering(room) {
    this.clearTimer(room);

    const awards = this.baseAwards(room);
    const answer = Number(room.modeData.answer);
    const unit = room.modeData.unit || "";
    const entries = this.activePlayers(room).map((player) => {
      const submission = room.submissions.get(player.id);
      const guess = parseNumericAnswer(submission?.text);
      return {
        player,
        text: submission?.text || "بدون إجابة",
        guess,
        distance: Number.isFinite(guess) ? Math.abs(guess - answer) : Infinity
      };
    });
    const bestDistance = Math.min(...entries.map((entry) => entry.distance));
    const winners = entries.filter((entry) => entry.distance === bestDistance && Number.isFinite(entry.distance));

    for (const winner of winners) {
      const award = awards.get(winner.player.id);
      if (award) {
        award.correctVote += 2;
        award.total += 2;
      }
    }

    this.applyAwards(room, awards);
    room.results = {
      correctAnswer: `${answer}${unit ? ` ${unit}` : ""}`,
      summary: winners.length
        ? `${winners.map((entry) => entry.player.name).join("، ")} الأقرب للرقم الصحيح. ${room.modeData.explanation || ""}`
        : `لم توجد أرقام صحيحة. ${room.modeData.explanation || ""}`,
      isFinal: room.round >= room.settings.rounds,
      votes: [],
      awards: [...awards.values()].sort((a, b) => b.total - a.total),
      revealedOptions: entries.map((entry) => ({
        id: entry.player.id,
        text: entry.text,
        isCorrect: winners.some((winner) => winner.player.id === entry.player.id),
        ownerIds: [entry.player.id],
        ownerNames: [entry.player.name],
        voterNames: [Number.isFinite(entry.distance) ? `الفارق ${entry.distance}` : "ليس رقمًا"]
      }))
    };
    room.phase = "results";
    room.phaseEndsAt = null;
    this.emitRoom(room);
  }

  finishVoting(code) {
    const room = this.rooms.get(code);
    if (!room || room.phase !== "voting") {
      return;
    }

    const mode = this.currentMode(room);

    if (mode === "imposter") {
      this.finishImposterVoting(room);
      return;
    }

    if (mode === "fake_fact") {
      this.finishCorrectOptionVoting(room);
      return;
    }

    if (mode === "judge_pick") {
      this.finishJudgePickVoting(room);
      return;
    }

    if (mode === "target_guess") {
      this.finishTargetGuessVoting(room);
      return;
    }

    if (mode === "split_steal") {
      this.finishSplitStealVoting(room);
      return;
    }

    if (mode === "minority_wins") {
      this.finishMinorityWinsVoting(room);
      return;
    }

    if (mode === "reverse_trap") {
      this.finishReverseTrapVoting(room);
      return;
    }

    if (mode === "mind_match") {
      this.finishMindMatchVoting(room);
      return;
    }

    if (mode === "hot_take") {
      this.finishHotTakeVoting(room);
      return;
    }

    if (mode === SCIENCE_DAY_MODE) {
      this.finishScienceDayVoting(room);
      return;
    }

    if (DIRECT_CHOICE_ROUNDS[mode]) {
      this.finishCorrectOptionVoting(room);
      return;
    }

    this.clearTimer(room);

    const awards = new Map();
    const ensureAward = (playerId) => {
      if (!awards.has(playerId)) {
        const player = room.players.get(playerId);
        awards.set(playerId, {
          playerId,
          name: player?.name || "غير معروف",
          avatar: player?.avatar,
          correctVote: 0,
          fakeVotes: 0,
          correctSubmission: 0,
          total: 0,
          score: player?.score || 0
        });
      }
      return awards.get(playerId);
    };

    const scoringPlayers = mode === PRIZES_MODE ? this.prizeContestants(room) : [...room.players.values()];
    for (const player of scoringPlayers) {
      ensureAward(player.id);
    }

    for (const vote of room.votes.values()) {
      const option = room.options.find((item) => item.id === vote.optionId);
      if (!option) {
        continue;
      }

      if (option.isCorrect) {
        const award = ensureAward(vote.playerId);
        award.correctVote += 1;
        award.total += 1;
      } else {
        for (const ownerId of option.ownerIds) {
          if (ownerId === vote.playerId) {
            continue;
          }
          const award = ensureAward(ownerId);
          award.fakeVotes += 1;
          award.total += 1;
        }
      }
    }

    for (const award of awards.values()) {
      const player = room.players.get(award.playerId);
      if (player) {
        player.score += award.total;
        award.score = player.score;
      }
    }

    const votes = [...room.votes.values()].map((vote) => {
      const option = room.options.find((item) => item.id === vote.optionId);
      const voter = room.players.get(vote.playerId);
      return {
        voterId: vote.playerId,
        voterName: voter?.name || "غير معروف",
        optionId: option?.id,
        optionText: option?.text || "",
        isCorrect: Boolean(option?.isCorrect),
        ownerIds: option?.ownerIds || [],
        ownerNames: (option?.ownerIds || []).map((id) => room.players.get(id)?.name || "غير معروف")
      };
    });

    room.results = {
      correctAnswer: room.question.correctAnswer,
      correctWriterIds: room.correctWriterIds,
      votes,
      awards: [...awards.values()].sort((a, b) => b.total - a.total),
      revealedOptions: room.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: option.isCorrect,
        ownerIds: option.ownerIds,
        ownerNames: option.ownerIds.map((id) => room.players.get(id)?.name || "غير معروف"),
        voterNames: votes.filter((vote) => vote.optionId === option.id).map((vote) => vote.voterName)
      }))
    };

    room.phase = "results";
    room.phaseEndsAt = null;
    this.emitRoom(room);
  }

  finishImposterVoting(room) {
    this.clearTimer(room);

    const awards = this.baseAwards(room);
    const votes = this.publicVotes(room);
    const imposterId = room.modeData.imposterId;
    const scoringVotes = [...room.votes.values()].filter((vote) => vote.playerId !== imposterId);
    const voteCounts = new Map();

    for (const vote of scoringVotes) {
      voteCounts.set(vote.optionId, (voteCounts.get(vote.optionId) || 0) + 1);
    }

    const imposterOption = room.options.find((option) => option.suspectId === imposterId);
    const imposterVoteCount = voteCounts.get(imposterOption?.id) || 0;
    const highestOtherVoteCount = Math.max(0, ...room.options
      .filter((option) => option.suspectId !== imposterId)
      .map((option) => voteCounts.get(option.id) || 0));
    const imposterCaught = imposterVoteCount > highestOtherVoteCount && imposterVoteCount > 0;
    const imposter = room.players.get(imposterId);
    const secretWord = room.modeData?.secretWord || "غير معروف";

    for (const vote of scoringVotes) {
      const option = room.options.find((item) => item.id === vote.optionId);
      if (!option) {
        continue;
      }

      if (option?.suspectId === imposterId) {
        const award = awards.get(vote.playerId);
        if (award) {
          award.correctVote += 2;
          award.total += 2;
        }
        continue;
      }

      if (imposter && awards.has(imposter.id)) {
        const award = awards.get(imposter.id);
        award.fakeVotes += 1;
        award.total += 1;
      }
    }

    if (!imposterCaught && imposter && awards.has(imposter.id)) {
      const award = awards.get(imposter.id);
      award.fakeVotes += 1;
      award.total += 1;
    }

    this.applyAwards(room, awards);
    room.results = {
      correctAnswer: `${imposter?.name || "غير معروف"} · ${secretWord}`,
      summary: imposterCaught
        ? `الكلمة السرية: ${secretWord}. تم اكتشاف الدخيل. صوت الدخيل لا يؤثر على النقاط.`
        : `الكلمة السرية: ${secretWord}. الدخيل نجا وكسب نقاط الخداع. صوت الدخيل لا يؤثر على النقاط.`,
      isFinal: room.round >= room.settings.rounds,
      votes,
      awards: [...awards.values()].sort((a, b) => b.total - a.total),
      revealedOptions: room.options.map((option) => ({
        id: option.id,
        text: option.text,
        clue: option.clue,
        isCorrect: option.suspectId === imposterId,
        ownerIds: [option.suspectId],
        ownerNames: [option.text],
        voterNames: votes.filter((vote) => vote.optionId === option.id).map((vote) => vote.voterName)
      }))
    };
    room.phase = "results";
    room.phaseEndsAt = null;
    this.emitRoom(room);
  }

  finishJudgePickVoting(room) {
    this.clearTimer(room);

    const awards = this.baseAwards(room);
    const votes = this.publicVotes(room);
    const judgeVote = room.votes.get(room.modeData.judgeId);
    const winningOption = room.options.find((option) => option.id === judgeVote?.optionId);
    const winningPlayerOption = winningOption && winningOption.source !== "game" && winningOption.ownerIds.length > 0;
    const winningGameOption = winningOption?.source === "game";
    const winningIds = new Set(winningOption ? [winningOption.id] : []);

    if (winningPlayerOption) {
      for (const ownerId of winningOption.ownerIds) {
        const award = awards.get(ownerId);
        if (award) {
          award.correctSubmission += 1;
          award.total += 1;
        }
      }
    } else if (winningGameOption) {
      const judgeAward = awards.get(room.modeData.judgeId);
      if (judgeAward) {
        judgeAward.correctVote += 3;
        judgeAward.total += 3;
      }
    }

    this.applyAwards(room, awards);
    room.results = {
      correctAnswer: winningGameOption ? `اختيار اللعبة: ${winningOption.text}` : winningOption?.text || "الحكم لم يختر",
      summary: winningPlayerOption
        ? "الحكم اختار جواب لاعب، لذلك صاحب الجواب أخذ +1."
        : winningGameOption
          ? "الحكم اختار جواب اللعبة الصحيح وأخذ +3."
          : "لم يصوت الحكم في الوقت المحدد، لذلك لا توجد نقاط في هذه الجولة.",
      isFinal: room.round >= room.settings.rounds,
      votes,
      awards: [...awards.values()].sort((a, b) => b.total - a.total),
      revealedOptions: room.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: winningIds.has(option.id),
        source: option.source,
        ownerIds: option.ownerIds,
        ownerNames: option.ownerIds.map((id) => room.players.get(id)?.name || "غير معروف"),
        voterNames: votes.filter((vote) => vote.optionId === option.id).map((vote) => vote.voterName)
      }))
    };
    room.phase = "results";
    room.phaseEndsAt = null;
    this.emitRoom(room);
  }

  finishTargetGuessVoting(room) {
    this.clearTimer(room);

    const awards = this.baseAwards(room);
    const votes = this.publicVotes(room);
    const targetId = room.modeData.targetId;
    const target = room.players.get(targetId);
    const targetVote = room.votes.get(targetId);
    const correctOptionId = targetVote?.optionId;
    const correctOption = room.options.find((option) => option.id === correctOptionId);

    if (correctOptionId) {
      let wrongGuessers = 0;
      for (const vote of room.votes.values()) {
        if (vote.playerId !== targetId && vote.optionId === correctOptionId) {
          const award = awards.get(vote.playerId);
          if (award) {
            award.correctVote += 2;
            award.total += 2;
          }
        } else if (vote.playerId !== targetId) {
          wrongGuessers += 1;
        }
      }

      const targetAward = awards.get(targetId);
      if (targetAward) {
        targetAward.correctSubmission += 1;
        targetAward.fakeVotes += wrongGuessers;
        targetAward.total += 1 + wrongGuessers;
      }
    }

    this.applyAwards(room, awards);
    room.results = {
      correctAnswer: correctOption ? `${target?.name || "الهدف"} اختار ${correctOption.text}` : "الهدف لم يختر",
      summary: correctOption
        ? "من توقع اختيار الهدف أخذ +2. الهدف أخذ +1 لاختياره و+1 عن كل لاعب لم يتوقعه."
        : "لم يصوت الهدف في الوقت المحدد.",
      isFinal: room.round >= room.settings.rounds,
      votes,
      awards: [...awards.values()].sort((a, b) => b.total - a.total),
      revealedOptions: room.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: option.id === correctOptionId,
        ownerIds: [],
        ownerNames: [],
        voterNames: votes.filter((vote) => vote.optionId === option.id).map((vote) => vote.voterName)
      }))
    };
    room.phase = "results";
    room.phaseEndsAt = null;
    this.emitRoom(room);
  }

  finishSplitStealVoting(room) {
    this.clearTimer(room);

    const awards = this.baseAwards(room);
    const votes = this.publicVotes(room);
    const stealVotes = [...room.votes.values()].filter((vote) => vote.optionId === "steal");
    const splitVotes = [...room.votes.values()].filter((vote) => vote.optionId === "split");
    let summary = "";

    if (stealVotes.length === 0 && splitVotes.length > 0) {
      summary = "الجميع تعاون. كل من اختار القسمة حصل على نقاط قوية.";
      for (const vote of splitVotes) {
        const award = awards.get(vote.playerId);
        if (award) {
          award.correctVote += 2;
          award.total += 2;
        }
      }
    } else if (stealVotes.length === 1) {
      summary = "لاعب واحد سرق الصفقة وأخذ الجائزة الأكبر، ومن اختار القسمة أخذ نقاط ثقة بسيطة.";
      const award = awards.get(stealVotes[0].playerId);
      if (award) {
        award.fakeVotes += 3;
        award.total += 3;
      }
      for (const vote of splitVotes) {
        const splitAward = awards.get(vote.playerId);
        if (splitAward) {
          splitAward.correctSubmission += 1;
          splitAward.total += 1;
        }
      }
    } else if (stealVotes.length > 1) {
      summary = "أكثر من لاعب حاول السرقة، فتقسمت المكافأة وخفّت قيمتها. ومن اختار القسمة أخذ نقاط ثقة بسيطة.";
      for (const vote of stealVotes) {
        const award = awards.get(vote.playerId);
        if (award) {
          award.fakeVotes += 1;
          award.total += 1;
        }
      }
      for (const vote of splitVotes) {
        const splitAward = awards.get(vote.playerId);
        if (splitAward) {
          splitAward.correctSubmission += 1;
          splitAward.total += 1;
        }
      }
    } else {
      summary = "لم يصوت أحد في الوقت المحدد.";
    }

    const winningOptionIds = new Set(stealVotes.length ? ["steal"] : splitVotes.length ? ["split"] : []);
    this.applyAwards(room, awards);
    room.results = {
      correctAnswer: stealVotes.length ? "سرقة" : splitVotes.length ? "قسمة" : "لا نتيجة",
      summary,
      isFinal: room.round >= room.settings.rounds,
      votes,
      awards: [...awards.values()].sort((a, b) => b.total - a.total),
      revealedOptions: room.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: winningOptionIds.has(option.id),
        ownerIds: [],
        ownerNames: [],
        voterNames: votes.filter((vote) => vote.optionId === option.id).map((vote) => vote.voterName)
      }))
    };
    room.phase = "results";
    room.phaseEndsAt = null;
    this.emitRoom(room);
  }

  finishMinorityWinsVoting(room) {
    this.clearTimer(room);

    const voteCounts = new Map();
    for (const vote of room.votes.values()) {
      voteCounts.set(vote.optionId, (voteCounts.get(vote.optionId) || 0) + 1);
    }
    const positiveCounts = room.options.map((option) => voteCounts.get(option.id) || 0).filter((count) => count > 0);
    const lowest = positiveCounts.length ? Math.min(...positiveCounts) : 0;
    const winningIds = new Set(room.options
      .filter((option) => (voteCounts.get(option.id) || 0) === lowest && lowest > 0)
      .map((option) => option.id));

    const awards = this.baseAwards(room);
    for (const vote of room.votes.values()) {
      if (winningIds.has(vote.optionId)) {
        const award = awards.get(vote.playerId);
        if (award) {
          award.correctVote += 2;
          award.total += 2;
        }
      }
    }

    this.applyAwards(room, awards);
    const votes = this.publicVotes(room);
    const winners = room.options.filter((option) => winningIds.has(option.id)).map((option) => option.text);
    room.results = {
      correctAnswer: winners.length ? winners.join("، ") : "لا توجد أقلية",
      summary: winners.length ? "الاختيارات الأقل تصويتًا فازت." : "لم يصوت عدد كافٍ.",
      isFinal: room.round >= room.settings.rounds,
      votes,
      awards: [...awards.values()].sort((a, b) => b.total - a.total),
      revealedOptions: room.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: winningIds.has(option.id),
        ownerIds: [],
        ownerNames: [],
        voterNames: votes.filter((vote) => vote.optionId === option.id).map((vote) => vote.voterName)
      }))
    };
    room.phase = "results";
    room.phaseEndsAt = null;
    this.emitRoom(room);
  }

  finishReverseTrapVoting(room) {
    this.clearTimer(room);

    const awards = this.baseAwards(room);
    const votes = this.publicVotes(room);
    const trapOption = room.options.find((option) => option.isTrap);

    for (const vote of room.votes.values()) {
      const option = room.options.find((item) => item.id === vote.optionId);
      if (option && !option.isTrap) {
        const award = awards.get(vote.playerId);
        if (award) {
          award.correctVote += 1;
          award.total += 1;
        }
      }
    }

    this.applyAwards(room, awards);
    room.results = {
      correctAnswer: `الفخ: ${trapOption?.text || room.modeData.trap}`,
      summary: room.modeData.explanation || "من تجنب الفخ حصل على النقاط.",
      isFinal: room.round >= room.settings.rounds,
      votes,
      awards: [...awards.values()].sort((a, b) => b.total - a.total),
      revealedOptions: room.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: !option.isTrap,
        ownerIds: [],
        ownerNames: [],
        voterNames: votes.filter((vote) => vote.optionId === option.id).map((vote) => vote.voterName)
      }))
    };
    room.phase = "results";
    room.phaseEndsAt = null;
    this.emitRoom(room);
  }

  finishMindMatchVoting(room) {
    this.clearTimer(room);

    const voteCounts = new Map();
    for (const vote of room.votes.values()) {
      voteCounts.set(vote.optionId, (voteCounts.get(vote.optionId) || 0) + 1);
    }

    const highest = Math.max(0, ...room.options.map((option) => voteCounts.get(option.id) || 0));
    const majorityIds = new Set(room.options
      .filter((option) => (voteCounts.get(option.id) || 0) === highest && highest > 0)
      .map((option) => option.id));

    for (const option of room.options) {
      option.isCorrect = majorityIds.has(option.id);
    }

    const awards = this.baseAwards(room);
    for (const vote of room.votes.values()) {
      if (majorityIds.has(vote.optionId)) {
        const award = awards.get(vote.playerId);
        if (award) {
          award.correctVote += 1;
          award.total += 1;
        }
      }
    }

    this.applyAwards(room, awards);
    const votes = this.publicVotes(room);
    const winners = room.options.filter((option) => majorityIds.has(option.id)).map((option) => option.text);
    room.results = {
      correctAnswer: winners.length ? winners.join("، ") : "لا توجد أغلبية",
      summary: winners.length ? `الأغلبية اختارت: ${winners.join("، ")}.` : "لم يصوت عدد كافٍ لصناعة أغلبية.",
      isFinal: room.round >= room.settings.rounds,
      votes,
      awards: [...awards.values()].sort((a, b) => b.total - a.total),
      revealedOptions: room.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: majorityIds.has(option.id),
        ownerIds: [],
        ownerNames: [],
        voterNames: votes.filter((vote) => vote.optionId === option.id).map((vote) => vote.voterName)
      }))
    };
    room.phase = "results";
    room.phaseEndsAt = null;
    this.emitRoom(room);
  }

  finishHotTakeVoting(room) {
    this.clearTimer(room);

    const voteCounts = new Map();
    for (const vote of room.votes.values()) {
      voteCounts.set(vote.optionId, (voteCounts.get(vote.optionId) || 0) + 1);
    }

    const highest = Math.max(0, ...room.options.map((option) => voteCounts.get(option.id) || 0));
    const winningIds = new Set(room.options
      .filter((option) => (voteCounts.get(option.id) || 0) === highest && highest > 0)
      .map((option) => option.id));

    for (const option of room.options) {
      option.isCorrect = winningIds.has(option.id);
    }

    const awards = this.baseAwards(room);
    for (const vote of room.votes.values()) {
      const option = room.options.find((item) => item.id === vote.optionId);
      if (!option) {
        continue;
      }

      for (const ownerId of option.ownerIds) {
        if (ownerId !== vote.playerId && awards.has(ownerId)) {
          const award = awards.get(ownerId);
          award.fakeVotes += 1;
          award.total += 1;
        }
      }
    }

    for (const option of room.options.filter((item) => winningIds.has(item.id))) {
      for (const ownerId of option.ownerIds) {
        if (awards.has(ownerId)) {
          const award = awards.get(ownerId);
          award.correctSubmission += 1;
          award.total += 1;
        }
      }
    }

    this.applyAwards(room, awards);
    const votes = this.publicVotes(room);
    const winners = room.options.filter((option) => winningIds.has(option.id));
    room.results = {
      correctAnswer: winners.length ? winners.map((option) => option.text).join("، ") : "بدون فائز",
      summary: winners.length ? "هذه الإجابات أخذت أعلى تصويت." : "لم تصل أي إجابة لتصويت كافٍ.",
      isFinal: room.round >= room.settings.rounds,
      votes,
      awards: [...awards.values()].sort((a, b) => b.total - a.total),
      revealedOptions: room.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: winningIds.has(option.id),
        ownerIds: option.ownerIds,
        ownerNames: option.ownerIds.map((id) => room.players.get(id)?.name || "غير معروف"),
        voterNames: votes.filter((vote) => vote.optionId === option.id).map((vote) => vote.voterName)
      }))
    };
    room.phase = "results";
    room.phaseEndsAt = null;
    this.emitRoom(room);
  }

  finishScienceDayVoting(room) {
    this.clearTimer(room);

    const awards = this.baseAwards(room);
    const correctOption = room.options.find((option) => option.isCorrect);
    const durationMs = Math.max(1, Number(room.settings.voteSeconds || 0) * 1000);
    const startedAt = Number(room.modeData?.startedAt) || Math.max(0, Number(room.phaseEndsAt || Date.now()) - durationMs);
    const voteCounts = new Map();

    for (const vote of room.votes.values()) {
      voteCounts.set(vote.optionId, (voteCounts.get(vote.optionId) || 0) + 1);
    }

    for (const vote of room.votes.values()) {
      const option = room.options.find((item) => item.id === vote.optionId);
      if (option?.isCorrect) {
        const award = awards.get(vote.playerId);
        if (award) {
          const responseMs = Math.max(0, Math.min(durationMs, Number(vote.votedAt || startedAt) - startedAt));
          const speedBonus = Math.ceil(((durationMs - responseMs) / durationMs) * SCIENCE_DAY_SPEED_BONUS);
          const total = SCIENCE_DAY_CORRECT_POINTS + speedBonus;
          const player = room.players.get(vote.playerId);

          award.correctVote += SCIENCE_DAY_CORRECT_POINTS;
          award.fakeVotes += speedBonus;
          award.total += total;
          award.scienceDay = {
            basePoints: SCIENCE_DAY_CORRECT_POINTS,
            speedBonus,
            responseMs,
            responseSeconds: Number((responseMs / 1000).toFixed(1)),
            total
          };

          if (player) {
            player.scienceDayCorrectCount = (player.scienceDayCorrectCount || 0) + 1;
            player.scienceDayTotalMs = (player.scienceDayTotalMs || 0) + responseMs;
          }
        }
      }
    }

    this.applyAwards(room, awards);

    const selectedSet = cleanScienceDaySet(room.modeData?.selectedSet || room.settings.scienceDaySet);
    const eventRound = room.modeData?.eventRound || scienceDaySetNumber(selectedSet);
    const questionInRound = room.modeData?.questionInRound || scienceDayQuestionNumber(room.round);
    const roundComplete = questionInRound >= SCIENCE_DAY_QUESTIONS_PER_SET;
    const isFinal = room.round >= room.settings.rounds;

    room.results = {
      correctAnswer: correctOption?.text || "",
      summary: room.modeData?.explanation || "الإجابة الصحيحة تعطي 2 نقطة، والسرعة تضيف حتى 1 نقطة إضافية.",
      isFinal,
      votes: [],
      awards: [],
      scienceDay: {
        selectedSet,
        setLabel: scienceDaySetLabel(selectedSet),
        eventRound,
        questionInRound,
        questionsPerRound: SCIENCE_DAY_QUESTIONS_PER_SET,
        totalEventRounds: SCIENCE_DAY_TOTAL_SETS,
        roundComplete,
        nextRoundWillReset: false
      },
      revealedOptions: room.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: option.isCorrect,
        ownerIds: [],
        ownerNames: [],
        voteCount: voteCounts.get(option.id) || 0,
        voterNames: []
      }))
    };
    room.phase = "results";
    room.phaseEndsAt = null;
    this.emitRoom(room);
  }

  finishCorrectOptionVoting(room) {
    this.clearTimer(room);

    const awards = this.baseAwards(room);
    const votes = this.publicVotes(room);
    const correctOption = room.options.find((option) => option.isCorrect);

    for (const vote of room.votes.values()) {
      const option = room.options.find((item) => item.id === vote.optionId);
      if (option?.isCorrect) {
        const award = awards.get(vote.playerId);
        award.correctVote += 1;
        award.total += 1;
      }
    }

    this.applyAwards(room, awards);
    room.results = {
      correctAnswer: correctOption?.text || "",
      summary: room.modeData?.explanation || "الإجابات الصحيحة حصلت على نقاط.",
      isFinal: room.round >= room.settings.rounds,
      votes,
      awards: [...awards.values()].sort((a, b) => b.total - a.total),
      revealedOptions: room.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: option.isCorrect,
        ownerIds: [],
        ownerNames: [],
        voterNames: votes.filter((vote) => vote.optionId === option.id).map((vote) => vote.voterName)
      }))
    };
    room.phase = "results";
    room.phaseEndsAt = null;
    this.emitRoom(room);
  }

  baseAwards(room) {
    const awards = new Map();
    for (const player of room.players.values()) {
      awards.set(player.id, {
        playerId: player.id,
        name: player.name,
        avatar: player.avatar,
        correctVote: 0,
        fakeVotes: 0,
        correctSubmission: 0,
        total: 0,
        score: player.score
      });
    }
    return awards;
  }

  applyAwards(room, awards) {
    for (const award of awards.values()) {
      const player = room.players.get(award.playerId);
      if (player) {
        player.score += award.total;
        award.score = player.score;
      }
    }
  }

  publicVotes(room) {
    return [...room.votes.values()].map((vote) => {
      const option = room.options.find((item) => item.id === vote.optionId);
      const voter = room.players.get(vote.playerId);
      return {
        voterId: vote.playerId,
        voterName: voter?.name || "غير معروف",
        optionId: option?.id,
        optionText: option?.text || "",
        isCorrect: Boolean(option?.isCorrect),
        ownerIds: option?.ownerIds || [],
        ownerNames: (option?.ownerIds || []).map((id) => id === "ai" ? "الذكاء الاصطناعي" : room.players.get(id)?.name || "غير معروف")
      };
    });
  }

  closeRoom(room, message, { excludeSocketId = null } = {}) {
    this.clearTimer(room);

    for (const player of room.players.values()) {
      if (player.reconnectTimer) {
        clearTimeout(player.reconnectTimer);
        player.reconnectTimer = null;
      }

      const playerSocket = player.socketId ? this.io.sockets?.sockets?.get(player.socketId) : null;
      if (playerSocket?.id && playerSocket.id !== excludeSocketId) {
        playerSocket.emit("room:kicked", { message });
      }

      playerSocket?.leave?.(room.code);
      playerSocket?.leave?.(this.privatePlayerRoom(room, player.id));
      if (playerSocket?.data?.roomCode === room.code) {
        delete playerSocket.data.roomCode;
        delete playerSocket.data.playerId;
      }
    }

    this.rooms.delete(room.code);
    this.incrementCounter("roomsClosed");
    this.recordRoomEvent("closed", room);
  }

  removePlayer(socket) {
    const code = socket.data.roomCode;
    const room = code ? this.rooms.get(code) : null;
    const playerId = this.playerId(socket);

    if (!room) {
      return;
    }

    const player = room.players.get(playerId);
    if (!player || player.socketId !== socket.id) {
      return;
    }

    player.connected = false;
    player.disconnectedAt = Date.now();
    player.socketId = null;
    this.incrementCounter("disconnections");

    if (room.phase === "lobby") {
      this.assignHostIfNeeded(room);
      this.addSystemMessage(room, `${player.name} انقطع اتصاله. كود الغرفة يبقى شغال إلى أن يخرج المضيف من زر الخروج.`);
      this.emitRoom(room);
      return;
    }

    const reconnectGrace = RECONNECT_GRACE_MS;
    this.addSystemMessage(room, `${player.name} انقطع اتصاله. عنده ${Math.round(reconnectGrace / 1000)} ثانية للرجوع.`);
    this.emitRoom(room);
    this.checkPhaseCompletion(room);

    player.reconnectTimer = setTimeout(() => {
      if (!this.rooms.has(room.code)) {
        return;
      }
      const current = room.players.get(player.id);
      if (current?.connected === false && room.phase === "lobby") {
        this.removePlayerFromRoom(room, player.id, `${player.name} غادر الغرفة.`, {
          preserveEmptyLobby: true
        });
        return;
      }
      if (current?.connected === false) {
        this.removePlayerFromRoom(room, player.id, `${player.name} غادر الغرفة.`);
      }
    }, reconnectGrace);
  }

  removePlayerFromRoom(room, playerId, message, { notify = false, preserveEmptyLobby = false } = {}) {
    const player = room.players.get(playerId);
    if (!player) {
      return null;
    }

    if (notify) {
      this.io.to(this.privatePlayerRoom(room, player.id)).emit("room:kicked", { message });
    }

    if (player.reconnectTimer) {
      clearTimeout(player.reconnectTimer);
      player.reconnectTimer = null;
    }
    if (!player.isBot) {
      this.incrementCounter("playersLeft");
    }
    if (notify) {
      this.incrementCounter("kickRemovals");
    }

    const playerSocket = player.socketId ? this.io.sockets?.sockets?.get(player.socketId) : null;
    playerSocket?.leave?.(room.code);
    playerSocket?.leave?.(this.privatePlayerRoom(room, player.id));
    if (playerSocket?.data?.roomCode === room.code) {
      delete playerSocket.data.roomCode;
      delete playerSocket.data.playerId;
    }

    room.players.delete(player.id);
    room.submissions.delete(player.id);
    room.answerDrafts?.delete(player.id);
    room.votes.delete(player.id);
    this.clearKickVotesFor(room, player.id);

    const removedHost = room.hostId === player.id;
    if (removedHost) {
      room.hostId = null;
    }

    const remainingHumans = [...room.players.values()].filter((item) => !item.isBot);
    if (remainingHumans.length === 0) {
      if (preserveEmptyLobby && room.phase === "lobby") {
        this.addSystemMessage(room, message);
        this.emitRoom(room);
        return player;
      }

      this.clearTimer(room);
      this.rooms.delete(room.code);
      this.incrementCounter("roomsClosed");
      this.recordRoomEvent("closed", room);
      return player;
    }

    if (removedHost && isPrizesRoom(room)) {
      this.closeRoom(room, "مراقب جوائز غادر الغرفة، انتهت المباراة.");
      return player;
    }

    this.assignHostIfNeeded(room);
    this.addSystemMessage(room, message);
    this.emitRoom(room);
    this.checkPhaseCompletion(room);
    return player;
  }

  checkPhaseCompletion(room) {
    if (!this.rooms.has(room.code)) {
      return;
    }

    if (room.phase === "answering" && this.currentMode(room) === "imposter") {
      const turn = this.currentImposterTurn(room);
      if (!turn || !this.isActiveImposterSpeaker(room, turn.playerId)) {
        setTimeout(() => this.advanceImposterTurn(room.code), 150);
      }
      return;
    }

    if (room.phase === "answering" && room.submissions.size >= this.eligibleAnswerers(room).length) {
      setTimeout(() => this.finishAnswering(room.code), 550);
    }

    if (room.phase === "voting" && this.currentMode(room) !== SCIENCE_DAY_MODE && room.votes.size >= this.eligibleVoters(room).length) {
      setTimeout(() => this.finishVoting(room.code), 550);
    }
  }

  addSystemMessage(room, message) {
    room.messages.push({
      id: nanoid(8),
      type: "system",
      message,
      createdAt: Date.now()
    });
    room.messages = room.messages.slice(-60);
  }

  cleanSettings(input) {
    const categories = this.cleanCategories(input);
    const modes = this.cleanModes(input);
    if (modes.includes(SCIENCE_DAY_MODE)) {
      return {
        mode: SCIENCE_DAY_MODE,
        modes: [SCIENCE_DAY_MODE],
        category: "all",
        categories: [],
        rounds: SCIENCE_DAY_QUESTIONS_PER_SET,
        scienceDaySet: cleanScienceDaySet(input.scienceDaySet),
        answerSeconds: this.config.answerSeconds,
        voteSeconds: SCIENCE_DAY_QUESTION_SECONDS
      };
    }

    if (modes.includes(PRIZES_MODE)) {
      return {
        mode: PRIZES_MODE,
        modes: [PRIZES_MODE],
        category: "all",
        categories: [],
        rounds: PRIZES_ROUNDS,
        answerSeconds: this.config.answerSeconds,
        voteSeconds: this.config.voteSeconds
      };
    }

    const mode = modes[0] || "kalak";
    const rounds = this.cleanRoundCount(input.rounds, modes.length);

    return {
      mode,
      modes,
      category: categories.length === 1 ? categories[0] : "all",
      categories,
      rounds,
      answerSeconds: this.config.answerSeconds,
      voteSeconds: this.config.voteSeconds
    };
  }

  cleanModes(input = {}) {
    const value = input.modes ?? input.mode;
    const raw = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(",")
        : [];

    const modes = [...new Set(raw
      .map((mode) => String(mode).trim())
      .filter((mode) => MODE_IDS.has(mode)))];

    return modes.length ? modes : ["kalak"];
  }

  cleanRoundCount(value, modeCount = 1) {
    const step = Math.max(1, modeCount);
    const maxRounds = Math.max(step, Math.floor(MAX_TOTAL_ROUNDS / step) * step);
    const requested = clampNumber(value, step, maxRounds, step);
    const rounded = Math.round(requested / step) * step;
    return clampNumber(rounded, step, maxRounds, step);
  }

  cleanCategories(input = {}) {
    const value = input.categories ?? input.category;
    const raw = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(",")
        : [];

    return [...new Set(raw
      .map((category) => String(category).trim())
      .filter((category) => category && category !== "all"))];
  }

  activePlayers(room) {
    return [...room.players.values()].filter((player) => player.connected !== false && !room.eliminatedPlayerIds.has(player.id));
  }

  eligibleAnswerers(room) {
    const players = this.activePlayers(room);
    if (this.currentMode(room) === "judge_pick") {
      return players.filter((player) => player.id !== room.modeData?.judgeId);
    }
    if (this.currentMode(room) === PRIZES_MODE) {
      return players.filter((player) => player.id !== room.hostId && !player.isBot);
    }
    return players;
  }

  eligibleVoters(room) {
    if (this.currentMode(room) === "judge_pick") {
      return this.activePlayers(room).filter((player) => player.id === room.modeData?.judgeId);
    }
    if (this.currentMode(room) === SCIENCE_DAY_MODE || this.currentMode(room) === PRIZES_MODE) {
      return this.activePlayers(room).filter((player) => player.id !== room.hostId && !player.isBot);
    }
    return this.activePlayers(room);
  }

  currentImposterTurn(room) {
    if (this.currentMode(room) !== "imposter" || room.phase !== "answering") {
      return null;
    }

    const data = room.modeData || {};
    const turnOrder = Array.isArray(data.turnOrder) ? data.turnOrder : [];
    if (!turnOrder.length) {
      return null;
    }

    const passesPerPlayer = Number(data.passesPerPlayer) || IMPOSTER_CLUE_PASSES;
    const totalTurns = Number(data.totalTurns) || turnOrder.length * passesPerPlayer;
    const turnIndex = Math.max(0, Math.min(Number(data.turnIndex) || 0, Math.max(0, totalTurns - 1)));
    const playerId = turnOrder[turnIndex % turnOrder.length];
    const player = room.players.get(playerId);

    return {
      playerId,
      player,
      turnIndex,
      turnNumber: Math.min(totalTurns, turnIndex + 1),
      totalTurns,
      pass: Math.floor(turnIndex / turnOrder.length) + 1,
      passesPerPlayer,
      clueSeconds: Number(data.clueSeconds) || IMPOSTER_CLUE_SECONDS
    };
  }

  isActiveImposterSpeaker(room, playerId) {
    return this.activePlayers(room).some((player) => player.id === playerId);
  }

  canSubmitAnswer(room, playerId) {
    if (this.currentMode(room) === "imposter" && room.phase === "answering") {
      return this.currentImposterTurn(room)?.playerId === playerId;
    }

    return this.eligibleAnswerers(room).some((player) => player.id === playerId);
  }

  imposterCluesFor(room, playerId) {
    const clues = room.modeData?.clues?.[playerId];
    return Array.isArray(clues) ? clues.filter(Boolean) : [];
  }

  imposterClueCount(room, playerId) {
    return this.imposterCluesFor(room, playerId).length;
  }

  combinedImposterClue(room, playerId) {
    const clues = this.imposterCluesFor(room, playerId);
    return clues.length ? clues.join("، ") : IMPOSTER_EMPTY_CLUE;
  }

  imposterClueHistory(room) {
    const data = room.modeData || {};
    const turnOrder = Array.isArray(data.turnOrder) ? data.turnOrder : [];
    const passesPerPlayer = Number(data.passesPerPlayer) || IMPOSTER_CLUE_PASSES;
    const history = [];

    for (let passIndex = 0; passIndex < passesPerPlayer; passIndex += 1) {
      for (let orderIndex = 0; orderIndex < turnOrder.length; orderIndex += 1) {
        const playerId = turnOrder[orderIndex];
        const player = room.players.get(playerId);
        const clue = this.imposterCluesFor(room, playerId)[passIndex];
        if (!player || !clue) {
          continue;
        }

        history.push({
          playerId,
          playerName: player.name,
          avatar: player.avatar,
          pass: passIndex + 1,
          turnNumber: history.length + 1,
          text: clue
        });
      }
    }

    return history;
  }

  kickVotersFor(room, targetId) {
    return [...room.players.values()].filter((player) => player.id !== targetId && !player.isBot && player.connected !== false);
  }

  clearKickVotesFor(room, playerId) {
    room.kickVotes.delete(playerId);

    for (const [targetId, votes] of room.kickVotes.entries()) {
      votes.delete(playerId);
      if (!room.players.has(targetId) || votes.size === 0) {
        room.kickVotes.delete(targetId);
      }
    }
  }

  publicKickVotes(room, currentPlayerId) {
    return [...room.players.values()].map((target) => {
      const voters = this.kickVotersFor(room, target.id);
      const allowedIds = new Set(voters.map((player) => player.id));
      const votes = [...(room.kickVotes.get(target.id) || new Set())].filter((id) => allowedIds.has(id));

      return {
        targetId: target.id,
        count: votes.length,
        required: voters.length,
        voted: currentPlayerId ? votes.includes(currentPlayerId) : false,
        canVote: Boolean(currentPlayerId && allowedIds.has(currentPlayerId) && !votes.includes(currentPlayerId))
      };
    });
  }

  playerId(socket) {
    return socket.data.playerId || socket.id;
  }

  privatePlayerRoom(room, playerId) {
    return `${room.code}:player:${playerId}`;
  }

  requireRoom(socket) {
    const room = this.rooms.get(socket.data.roomCode);
    const playerId = this.playerId(socket);
    if (!room || !room.players.has(playerId)) {
      throw new Error("ادخل غرفة أولًا.");
    }
    return room;
  }

  requireHost(room, socket) {
    if (room.hostId !== this.playerId(socket)) {
      throw new Error("هذا الأمر للمضيف فقط.");
    }
  }

  clearTimer(room) {
    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = null;
    }

    for (const timer of room.botTimers || []) {
      clearTimeout(timer);
    }
    room.botTimers = [];
  }

  recordRoomActivity(room) {
    room.lastActivityAt = Date.now();
    if ((room.phase === "finished" || room.results?.isFinal) && room.gameStartedAt && !room.statsFinalRecorded) {
      room.statsFinalRecorded = true;
      room.finishedAt = room.lastActivityAt;
      this.incrementCounter("gamesFinished");
    }
  }

  emitRoom(room) {
    this.recordRoomActivity(room);
    for (const player of room.players.values()) {
      if (!player.isBot) {
        this.io.to(this.privatePlayerRoom(room, player.id)).emit("room:state", this.publicRoom(room, player.id));
      }
    }
  }

  publicRoom(room, currentPlayerId) {
    const votesByPlayer = new Set(room.votes.keys());
    const submissionsByPlayer = new Set(room.submissions.keys());
    const eligibleVoteIds = new Set(this.eligibleVoters(room).map((player) => player.id));
    const imposterAnswering = this.currentMode(room) === "imposter" && room.phase === "answering";
    const passesPerPlayer = Number(room.modeData?.passesPerPlayer) || IMPOSTER_CLUE_PASSES;

    return {
      code: room.code,
      phase: room.phase,
      round: room.round,
      settings: room.settings,
      activeMode: this.currentMode(room),
      playerCount: room.players.size,
      hostId: room.hostId,
      me: currentPlayerId ? {
        playerId: currentPlayerId,
        isHost: room.hostId === currentPlayerId,
        knowsCorrect: room.correctWriterIds.includes(currentPlayerId),
        selectedOptionId: room.votes.get(currentPlayerId)?.optionId || ""
      } : null,
      players: [...room.players.values()]
        .sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt)
        .map((player) => ({
          id: player.id,
          name: player.name,
          avatar: player.avatar,
          score: player.score,
          scienceDayCorrectCount: player.scienceDayCorrectCount || 0,
          scienceDayTimeSeconds: Number(((player.scienceDayTotalMs || 0) / 1000).toFixed(1)),
          isBot: Boolean(player.isBot),
          connected: player.connected !== false,
          eliminated: room.eliminatedPlayerIds.has(player.id),
          isHost: room.hostId === player.id,
          submitted: imposterAnswering
            ? this.imposterClueCount(room, player.id) >= passesPerPlayer
            : submissionsByPlayer.has(player.id),
          canSubmit: this.canSubmitAnswer(room, player.id),
          imposterClueCount: imposterAnswering ? this.imposterClueCount(room, player.id) : undefined,
          voted: votesByPlayer.has(player.id),
          canVote: eligibleVoteIds.has(player.id),
          joinedAt: player.joinedAt
        }))
        .map(({ joinedAt, ...player }) => player),
      question: this.publicQuestion(room, currentPlayerId),
      imposterTurn: this.publicImposterTurn(room, currentPlayerId),
      phaseEndsAt: room.phaseEndsAt,
      options: this.publicOptions(room, currentPlayerId),
      kickVotes: this.publicKickVotes(room, currentPlayerId),
      results: room.phase === "results" || room.phase === "finished" ? room.results : null,
      messages: room.messages
    };
  }

  publicImposterTurn(room, currentPlayerId) {
    const turn = this.currentImposterTurn(room);
    if (!turn) {
      return null;
    }

    const data = room.modeData || {};
    const turnOrder = Array.isArray(data.turnOrder) ? data.turnOrder : [];
    const players = turnOrder
      .map((playerId, index) => {
        const player = room.players.get(playerId);
        if (!player) {
          return null;
        }

        const clueCount = this.imposterClueCount(room, player.id);
        return {
          id: player.id,
          name: player.name,
          avatar: player.avatar,
          position: index + 1,
          clueCount,
          isCurrent: player.id === turn.playerId,
          done: clueCount >= turn.passesPerPlayer,
          connected: player.connected !== false,
          eliminated: room.eliminatedPlayerIds.has(player.id)
        };
      })
      .filter(Boolean);

    return {
      playerId: turn.playerId,
      playerName: turn.player?.name || "لاعب غير معروف",
      avatar: turn.player?.avatar,
      pass: turn.pass,
      passesPerPlayer: turn.passesPerPlayer,
      turnNumber: turn.turnNumber,
      totalTurns: turn.totalTurns,
      clueSeconds: turn.clueSeconds,
      isMyTurn: turn.playerId === currentPlayerId,
      myClueCount: currentPlayerId ? this.imposterClueCount(room, currentPlayerId) : 0,
      history: this.imposterClueHistory(room),
      players
    };
  }

  publicQuestion(room, currentPlayerId) {
    if (!room.question) {
      return null;
    }

    const question = {
      id: room.question.id,
      category: room.question.category,
      prompt: promptWithAnswerFormatNote(room.question, this.currentMode(room)),
      difficulty: room.question.difficulty,
      correctAnswer: ["results", "finished"].includes(room.phase) ? room.question.correctAnswer : undefined
    };

    if (this.currentMode(room) === "imposter" && ["answering", "voting"].includes(room.phase)) {
      question.isImposter = currentPlayerId === room.modeData?.imposterId;
      question.secretWord = question.isImposter ? null : room.modeData?.secretWord;
      question.imposterRules = {
        clueSeconds: Number(room.modeData?.clueSeconds) || IMPOSTER_CLUE_SECONDS,
        passesPerPlayer: Number(room.modeData?.passesPerPlayer) || IMPOSTER_CLUE_PASSES
      };
    }

    if (this.currentMode(room) === "judge_pick" && ["answering", "voting"].includes(room.phase)) {
      question.isJudge = currentPlayerId === room.modeData?.judgeId;
    }

    return question;
  }

  publicOptions(room, currentPlayerId) {
    if (room.phase === "voting") {
      return room.options.map((option) => ({
        id: option.id,
        text: option.text,
        clue: option.clue,
        isOwn: option.ownerIds.includes(currentPlayerId)
      }));
    }

    if (room.phase === "results" || room.phase === "finished") {
      return room.results?.revealedOptions || [];
    }

    return [];
  }
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  Check,
  CircleAlert,
  Crown,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Play,
  Send,
  Settings,
  Share2,
  Sparkles,
  Square,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  X
} from "lucide-react";
import { api } from "../lib/api.js";
import { fallbackGameModes } from "../lib/modes.js";
import { normalizeRoundCount, roundLimits, selectedModeIds } from "../lib/rounds.js";
import { createSocket } from "../lib/socket.js";
import { Avatar, AvatarPicker } from "../components/Avatar.jsx";
import { Chat } from "../components/Chat.jsx";
import { Scoreboard } from "../components/Scoreboard.jsx";
import { Timer } from "../components/Timer.jsx";
import { CategoryPicker } from "../components/CategoryPicker.jsx";
import { GameModePicker } from "../components/GameModePicker.jsx";

const defaultAvatar = {
  persona: "a1",
  skin: "#c9865a",
  hair: "#15120f",
  outfit: "#12d6c5",
  hairStyle: "short",
  eyes: "focused",
  mouth: "smile",
  accessory: "headset"
};
const phaseLabels = {
  lobby: "الانتظار",
  choosingCategory: "اختيار التصنيف",
  answering: "الإجابات",
  voting: "التصويت",
  results: "النتائج",
  finished: "النهاية"
};

const roomCodeLength = 5;
const activeMatchPhases = new Set(["choosingCategory", "answering", "voting", "results"]);
const focusedGamePhases = new Set([...activeMatchPhases, "finished"]);
const joinRetryDelays = [350, 800, 1400, 2200];
const SCIENCE_DAY_MODE = "science_day";
const PRIZES_MODE = "prizes";
const PRIZES_ROUNDS = 5;
const SCIENCE_DAY_TOTAL_SETS = 2;
const SCIENCE_DAY_QUESTIONS_PER_SET = 7;
const SCIENCE_DAY_TOTAL_QUESTIONS = SCIENCE_DAY_TOTAL_SETS * SCIENCE_DAY_QUESTIONS_PER_SET;
const SCIENCE_DAY_QUESTION_SECONDS = 30;
const SCIENCE_DAY_SET_OPTIONS = [
  { id: "set1", label: "المجموعة الأولى" },
  { id: "set2", label: "المجموعة الثانية" }
];
const SCIENCE_DAY_LIMU_LOGO = "/assets/limu-pga-mark.png";
const SCIENCE_DAY_BRAND_IMAGE = "/assets/science-day-mark.png";
const arabicNumberFormatter = new Intl.NumberFormat("ar-LY");
const finalConfetti = Array.from({ length: 38 }, (_, index) => ({
  x: (index * 23) % 100,
  delay: (index % 13) * 90,
  duration: 2400 + (index % 5) * 260,
  drift: ((index % 7) - 3) * 18,
  spin: 140 + (index % 6) * 44,
  size: 6 + (index % 4) * 2,
  color: ["#f6b84a", "#12d6c5", "#ff3f98", "#62df6c", "#ffe79a"][index % 5]
}));

function formatArabicNumber(value) {
  return arabicNumberFormatter.format(Number(value || 0));
}

function isScienceDayRoom(room) {
  return getActiveMode(room) === SCIENCE_DAY_MODE;
}

function isPrizesRoom(room) {
  return getActiveMode(room) === PRIZES_MODE;
}

function isMonitorOnlyRoom(room) {
  return isScienceDayRoom(room) || isPrizesRoom(room);
}

function monitorContestants(room) {
  return (room?.players || []).filter((player) => !player.isHost && !player.isBot);
}

function scienceDayContestants(room) {
  return monitorContestants(room);
}

function scienceDaySetOption(value) {
  return SCIENCE_DAY_SET_OPTIONS.find((option) => option.id === value) || SCIENCE_DAY_SET_OPTIONS[0];
}

function scienceDaySetNumber(value) {
  return scienceDaySetOption(value).id === "set2" ? 2 : 1;
}

function scienceDayMeta(room) {
  const resultMeta = room?.results?.scienceDay;
  if (resultMeta) {
    return resultMeta;
  }

  const round = Math.max(1, Number(room?.round || 1));
  const setOption = scienceDaySetOption(room?.settings?.scienceDaySet);
  return {
    selectedSet: setOption.id,
    setLabel: setOption.label,
    eventRound: scienceDaySetNumber(setOption.id),
    questionInRound: ((round - 1) % SCIENCE_DAY_QUESTIONS_PER_SET) + 1,
    questionsPerRound: SCIENCE_DAY_QUESTIONS_PER_SET,
    totalEventRounds: SCIENCE_DAY_TOTAL_SETS,
    roundComplete: round % SCIENCE_DAY_QUESTIONS_PER_SET === 0
  };
}

function getActiveMode(room) {
  return room?.activeMode || room?.settings?.mode || selectedModeIds(room?.settings?.modes)[0];
}

function normalizeRoomCodeInput(value) {
  const raw = String(value || "").trim().toUpperCase();
  const playMatch = raw.match(/(?:^|\/)PLAY\/([A-Z0-9]{1,5})(?=$|[/?#\s])/);
  const tailMatch = raw.match(/([A-Z0-9]{5})(?=$|[/?#\s])/);

  if (playMatch) {
    return playMatch[1].slice(0, roomCodeLength);
  }

  if (tailMatch && raw.length > roomCodeLength) {
    return tailMatch[1];
  }

  return raw.replace(/[^A-Z0-9]/g, "").slice(0, roomCodeLength);
}

function roomInviteUrl(code) {
  const cleanCode = normalizeRoomCodeInput(code);
  if (!cleanCode) {
    return "";
  }

  const origin = globalThis.location?.origin || "";
  return origin ? `${origin}/play/${cleanCode}` : `/play/${cleanCode}`;
}

function gameModeName(gameModes, modeId) {
  return gameModes.find((mode) => mode.id === modeId)?.name || "طور اللعبة";
}

function loadPlayer(state) {
  return {
    name: state?.name || localStorage.getItem("kalak:name") || "",
    avatar: state?.avatar || JSON.parse(localStorage.getItem("kalak:avatar") || "null") || defaultAvatar
  };
}

function persistPlayer(player) {
  const cleanName = player.name.trim() || `لاعب ${Math.floor(1000 + Math.random() * 9000)}`;
  localStorage.setItem("kalak:name", cleanName);
  localStorage.setItem("kalak:avatar", JSON.stringify(player.avatar));
  return { ...player, name: cleanName };
}

const roomSessionKeys = [
  "kalak:room",
  "kalak:roomCode",
  "kalak:sessionId",
  "kalak:playerId"
];

function storageGet(storage, key) {
  try {
    return storage?.getItem?.(key) || "";
  } catch {
    return "";
  }
}

function storageSet(storage, key, value) {
  try {
    storage?.setItem?.(key, value);
  } catch {
    // Ignore private-mode or quota storage failures.
  }
}

function storageRemove(storage, key) {
  try {
    storage?.removeItem?.(key);
  } catch {
    // Ignore private-mode storage failures.
  }
}

function readRoomSessionCache() {
  const code = normalizeRoomCodeInput(
    storageGet(sessionStorage, "kalak:roomCode") || storageGet(localStorage, "kalak:roomCode")
  );
  const sessionId = String(
    storageGet(sessionStorage, "kalak:sessionId") || storageGet(localStorage, "kalak:sessionId")
  ).trim();
  const playerId = String(
    storageGet(sessionStorage, "kalak:playerId") || storageGet(localStorage, "kalak:playerId") || sessionId
  ).trim();

  return { code, sessionId, playerId };
}

function writeRoomSessionCache({ code, sessionId, playerId }) {
  const cleanCode = normalizeRoomCodeInput(code);
  const cleanSessionId = String(sessionId || playerId || "").trim();
  const cleanPlayerId = String(playerId || cleanSessionId).trim();

  if (!cleanCode || !cleanSessionId) {
    return;
  }

  storageSet(sessionStorage, "kalak:roomCode", cleanCode);
  storageSet(sessionStorage, "kalak:sessionId", cleanSessionId);
  storageSet(sessionStorage, "kalak:playerId", cleanPlayerId);
}

function clearRoomSessionCache() {
  for (const key of roomSessionKeys) {
    storageRemove(localStorage, key);
    storageRemove(sessionStorage, key);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function dismissKeyboard(scope) {
  const activeElement = scope?.querySelector?.("input:focus, textarea:focus, select:focus")
    || globalThis.document?.activeElement;

  if (typeof activeElement?.blur === "function") {
    activeElement.blur();
  }
}

function makeSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function useKalakSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const instance = createSocket();
    setSocket(instance);
    instance.on("connect", () => setConnected(true));
    instance.on("disconnect", () => setConnected(false));
    return () => instance.disconnect();
  }, []);

  return { socket, connected };
}

function ack(socket, event, payload = {}) {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error("الاتصال غير جاهز."));
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error("الاتصال بطيء. حاول مرة ثانية."));
    }, 9000);

    socket.emit(event, payload, (response) => {
      clearTimeout(timeout);
      if (response?.ok) {
        resolve(response);
      } else {
        const error = new Error(response?.error || "فشل تنفيذ الأمر.");
        error.code = response?.errorCode || "";
        reject(error);
      }
    });
  });
}

function isRoomUnavailable(error) {
  return error?.code === "ROOM_UNAVAILABLE";
}

function isSocketNotReady(error) {
  return !error?.code && /connected|connection|اتصال|الاتصال/i.test(error?.message || "");
}

function reconnectSocket(socket) {
  if (!socket) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let settled = false;
    let timeout = null;

    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      resolve(result);
    };
    const onConnect = () => finish(true);
    const onConnectError = () => finish(false);

    timeout = setTimeout(() => finish(Boolean(socket.connected)), 2500);
    socket.once("connect", onConnect);
    socket.once("connect_error", onConnectError);
    socket.disconnect();
    setTimeout(() => socket.connect(), 80);
  });
}

async function joinRoomReliably(socket, event, payload = {}) {
  let lastError = null;

  for (let attempt = 0; attempt <= joinRetryDelays.length; attempt += 1) {
    try {
      return await ack(socket, event, payload);
    } catch (caught) {
      lastError = caught;
      if (!(isRoomUnavailable(caught) || isSocketNotReady(caught)) || attempt >= joinRetryDelays.length) {
        throw caught;
      }

      await delay(joinRetryDelays[attempt]);
      await reconnectSocket(socket);
    }
  }

  throw lastError;
}

export default function Game() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, connected } = useKalakSocket();
  const lastAutoKey = useRef("");
  const lastRoundKey = useRef("");
  const lastImposterTurnKey = useRef("");
  const roundSplashTimer = useRef(null);
  const playZoneRef = useRef(null);
  const [sessionId, setSessionId] = useState(() => {
    const cached = readRoomSessionCache();
    const code = normalizeRoomCodeInput(roomCode);
    return cached.sessionId && code && cached.code === code ? cached.sessionId : makeSessionId();
  });
  const [room, setRoom] = useState(null);
  const [roundSplash, setRoundSplash] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPanel, setDrawerPanel] = useState("score");
  const [categories, setCategories] = useState([]);
  const [gameModes, setGameModes] = useState(fallbackGameModes);
  const [config, setConfig] = useState({ minPlayers: 3, maxPlayers: 6 });
  const [player, setPlayer] = useState(() => loadPlayer(location.state));
  const [joinCode, setJoinCode] = useState("");
  const [answer, setAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inviteRoomMode, setInviteRoomMode] = useState("");
  const directInviteCode = location.state?.mode !== "join"
    ? normalizeRoomCodeInput(roomCode)
    : "";
  const isInviteEntry = Boolean(directInviteCode);
  const scienceDayInviteEntry = isInviteEntry && inviteRoomMode === SCIENCE_DAY_MODE;
  const prizesInviteEntry = isInviteEntry && inviteRoomMode === PRIZES_MODE;

  useEffect(() => {
    api("/categories").then(setCategories).catch(() => setCategories([]));
    api("/game-modes").then(setGameModes).catch(() => {});
    api("/config").then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;

    if (!directInviteCode || room?.code) {
      setInviteRoomMode("");
      return () => {
        active = false;
      };
    }

    setInviteRoomMode("");
    api(`/rooms/${directInviteCode}`).then((previewRoom) => {
      if (!active) {
        return;
      }

      const previewMode = getActiveMode(previewRoom);
      setInviteRoomMode([SCIENCE_DAY_MODE, PRIZES_MODE].includes(previewMode) ? previewMode : "");
    }).catch(() => {
      if (active) {
        setInviteRoomMode("");
      }
    });

    return () => {
      active = false;
    };
  }, [directInviteCode, room?.code]);

  useEffect(() => {
    function openRoomMenu() {
      if (!room) {
        return;
      }

      setDrawerPanel("actions");
      setDrawerOpen(true);
    }

    globalThis.addEventListener?.("kalak:open-room-menu", openRoomMenu);
    return () => globalThis.removeEventListener?.("kalak:open-room-menu", openRoomMenu);
  }, [room]);

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timer = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!room) {
      setJoinCode("");
    }
  }, [room]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const onState = (nextRoom) => {
      setRoom(nextRoom);
      setError("");
      if (nextRoom?.code && nextRoom?.me?.playerId) {
        writeRoomSessionCache({
          code: nextRoom.code,
          sessionId: nextRoom.me.playerId,
          playerId: nextRoom.me.playerId
        });
        setSessionId((current) => current === nextRoom.me.playerId ? current : nextRoom.me.playerId);
      }
      const activeMode = getActiveMode(nextRoom);
      const roundKey = `${nextRoom.round}:${activeMode}`;
      const canShowSplash = nextRoom.round > 0 && ["answering", "voting"].includes(nextRoom.phase);

      if (canShowSplash && roundKey !== lastRoundKey.current) {
        lastRoundKey.current = roundKey;
        clearTimeout(roundSplashTimer.current);
        setRoundSplash({
          key: roundKey,
          round: nextRoom.round,
          rounds: nextRoom.settings.rounds,
          mode: activeMode,
          scienceDaySet: nextRoom.settings.scienceDaySet
        });
        roundSplashTimer.current = setTimeout(() => {
          setRoundSplash((current) => current?.key === roundKey ? null : current);
        }, 2100);
      }

      if (nextRoom.phase === "lobby" || nextRoom.phase === "finished") {
        lastRoundKey.current = "";
        clearTimeout(roundSplashTimer.current);
        setRoundSplash(null);
      }

      if (nextRoom.phase !== "answering") {
        setAnswer("");
        setNotice("");
        lastImposterTurnKey.current = "";
      } else if (nextRoom.imposterTurn) {
        const imposterTurnKey = `${nextRoom.round}:${nextRoom.imposterTurn.turnNumber}:${nextRoom.imposterTurn.playerId}`;
        if (imposterTurnKey !== lastImposterTurnKey.current) {
          lastImposterTurnKey.current = imposterTurnKey;
          setAnswer("");
          setNotice("");
        }
      }
      if (nextRoom.phase !== "voting") {
        setSelectedOption("");
      } else {
        setSelectedOption(nextRoom.me?.selectedOptionId || "");
      }
    };

    const onError = (payload) => setError(payload.error || "حدث خطأ غير متوقع.");
    const onKicked = (payload) => {
      clearRoomSessionCache();
      setRoom(null);
      setSelectedOption("");
      setAnswer("");
      setError(payload.message || "تم إخراجك من الغرفة بتصويت اللاعبين.");
    };
    socket.on("room:state", onState);
    socket.on("game:error", onError);
    socket.on("room:kicked", onKicked);

    return () => {
      socket.off("room:state", onState);
      socket.off("game:error", onError);
      socket.off("room:kicked", onKicked);
    };
  }, [room?.code, socket]);

  useEffect(() => () => clearTimeout(roundSplashTimer.current), []);

  useEffect(() => {
    if (!room || !activeMatchPhases.has(room.phase)) {
      return undefined;
    }

    setDrawerOpen(false);
    if (!globalThis.matchMedia?.("(max-width: 760px)").matches) {
      return undefined;
    }

    const scrollTimer = setTimeout(() => {
      const target = playZoneRef.current?.querySelector(".stage-panel") || playZoneRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);

    return () => clearTimeout(scrollTimer);
  }, [room?.phase, room?.round, room?.activeMode]);

  useEffect(() => {
    if (!socket || !connected) {
      return;
    }

    const state = location.state;
    const routeCode = normalizeRoomCodeInput(roomCode);
    const cachedSession = readRoomSessionCache();
    const cachedCode = cachedSession.code && routeCode && cachedSession.code === routeCode
      ? cachedSession.code
      : "";
    const activeCode = room?.code || (state?.mode === "join" ? roomCode : "") || state?.code || cachedCode;
    const code = normalizeRoomCodeInput(activeCode);

    if (state?.mode === "create" && !room) {
      const nextPlayer = persistPlayer(loadPlayer(state));
      setPlayer(nextPlayer);
      const key = `create:${socket.id}:${sessionId}`;
      if (lastAutoKey.current === key) {
        return;
      }
      lastAutoKey.current = key;
      perform(() => ack(socket, "room:create", {
        name: nextPlayer.name,
        avatar: nextPlayer.avatar,
        sessionId
      }).then((response) => {
        navigate(`/play/${response.room.code}`, { replace: true, state: null });
      }), "create");
      return;
    }

    if (!code) {
      return;
    }

    const cachedSessionId = cachedSession.code === code ? cachedSession.sessionId : "";
    const nextSessionId = cachedSessionId || sessionId;
    const shouldAutoJoin = Boolean(room || state?.mode === "join" || state?.code || cachedSessionId);
    if (!shouldAutoJoin) {
      return;
    }

    const nextPlayer = persistPlayer(loadPlayer(state));
    setPlayer(nextPlayer);
    if (nextSessionId !== sessionId) {
      setSessionId(nextSessionId);
    }
    const shouldRestore = Boolean(room?.code === code || cachedSessionId);
    const event = shouldRestore ? "room:restore" : "room:join";
    const key = `${event}:${socket.id}:${code}:${nextSessionId}`;
    if (lastAutoKey.current === key) {
      return;
    }
    lastAutoKey.current = key;

    perform(() => joinRoomReliably(socket, event, {
      code,
      name: nextPlayer.name,
      avatar: nextPlayer.avatar,
      sessionId: nextSessionId
    }).then((response) => {
      navigate(`/play/${response.room.code}`, { replace: true, state: null });
    }).catch((caught) => {
      if (caught?.code === "SESSION_MISSING" || caught?.code === "ROOM_UNAVAILABLE") {
        clearRoomSessionCache();
      }
      throw caught;
    }), shouldRestore ? "restore" : "join");
  }, [connected, location.state, navigate, room?.code, roomCode, sessionId, socket]);

  useEffect(() => {
    if (room || location.state?.mode === "join") {
      return;
    }

    const code = normalizeRoomCodeInput(roomCode);
    if (code && joinCode !== code) {
      setJoinCode(code);
    }
  }, [joinCode, location.state, room, roomCode]);

  const me = useMemo(() => room?.players.find((item) => item.id === room.me?.playerId), [room]);
  const isHost = Boolean(room?.me?.isHost);
  useEffect(() => {
    const activeMode = room ? getActiveMode(room) : inviteRoomMode;

    window.dispatchEvent(new CustomEvent("kalak:room-active", {
      detail: {
        active: Boolean(room),
        code: room?.code || "",
        phase: room?.phase || "",
        mode: activeMode || "",
        waitingOnly: room
          ? Boolean(isMonitorOnlyRoom(room) && room.phase === "lobby" && !room.me?.isHost)
          : [SCIENCE_DAY_MODE, PRIZES_MODE].includes(activeMode)
      }
    }));
  }, [inviteRoomMode, room?.activeMode, room?.code, room?.me?.isHost, room?.phase, room?.settings?.mode]);

  useEffect(() => () => {
    window.dispatchEvent(new CustomEvent("kalak:room-active", {
      detail: { active: false, code: "", phase: "", mode: "", waitingOnly: false }
    }));
  }, []);

  async function perform(action, actionName = "action") {
    setBusy(true);
    setPendingAction(actionName);
    setError("");
    try {
      await action();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
      setPendingAction("");
    }
  }

  function startFreshRoomSession() {
    clearRoomSessionCache();
    lastAutoKey.current = "";
    setAnswer("");
    setSelectedOption("");
    setNotice("");
    const nextSessionId = makeSessionId();
    setSessionId(nextSessionId);
    return nextSessionId;
  }

  function createRoom(event) {
    event?.preventDefault();
    dismissKeyboard(event?.currentTarget?.form || event?.currentTarget?.closest?.("form"));
    if (!socket || !connected) {
      setError("الاتصال غير جاهز.");
      return;
    }
    const nextSessionId = startFreshRoomSession();
    const nextPlayer = persistPlayer(player);
    setPlayer(nextPlayer);
    perform(() => ack(socket, "room:create", {
      name: nextPlayer.name,
      avatar: nextPlayer.avatar,
      sessionId: nextSessionId
    }).then((response) => {
      navigate(`/play/${response.room.code}`, { replace: true, state: null });
    }), "create");
  }

  function joinRoom(event) {
    event.preventDefault();
    dismissKeyboard(event.currentTarget);
    if (!socket || !connected) {
      setError("الاتصال غير جاهز.");
      return;
    }
    const code = normalizeRoomCodeInput(joinCode || roomCode);
    if (code.length !== roomCodeLength) {
      setJoinCode(code);
      setError("اكتب كود غرفة صحيح من 5 خانات.");
      return;
    }
    setJoinCode(code);
    const nextSessionId = startFreshRoomSession();
    const nextPlayer = persistPlayer(player);
    setPlayer(nextPlayer);
    perform(() => joinRoomReliably(socket, "room:join", {
      code,
      name: nextPlayer.name,
      avatar: nextPlayer.avatar,
      sessionId: nextSessionId
    }).then((response) => {
      navigate(`/play/${response.room.code}`, { replace: true, state: null });
    }), "join");
  }

  function updateSettings(next) {
    if (!socket || !connected) {
      setError("الاتصال غير جاهز.");
      return;
    }
    perform(() => ack(socket, "room:updateSettings", next), "settings");
  }

  function addBot() {
    if (!socket || !connected) {
      setError("الاتصال غير جاهز.");
      return;
    }
    perform(() => ack(socket, "room:addBot"), "bot");
  }

  function endGame() {
    if (!socket || !connected) {
      setError("الاتصال غير جاهز.");
      return;
    }
    perform(() => ack(socket, "game:end"), "end");
  }

  function kickVote(playerId) {
    if (!socket || !connected) {
      setError("الاتصال غير جاهز.");
      return;
    }
    perform(() => ack(socket, "player:kickVote", { playerId }), "kick");
  }

  function updateAnswerDraft(value) {
    setAnswer(value);

    if (!socket || !connected || room?.phase !== "answering" || me?.submitted || me?.canSubmit === false) {
      return;
    }

    socket.emit("answer:draft", { text: value });
  }

  function submitAnswer(event) {
    event.preventDefault();
    if (!socket || !connected) {
      setError("الاتصال غير جاهز.");
      return;
    }
    if (!answer.trim()) {
      return;
    }
    dismissKeyboard(event.currentTarget);
    perform(() => ack(socket, "answer:submit", { text: answer }).then((response) => {
      if (response.correctAnswerHit) {
        setRoom(response.room);
        setNotice(response.message || "إجابتك صحيحة. اكتب الآن إجابة غلط مقنعة.");
        setAnswer("");
        return;
      }
      setNotice("");
    }), "answer");
  }

  function vote(optionId) {
    if (!socket || !connected) {
      setError("الاتصال غير جاهز.");
      return;
    }
    setSelectedOption(optionId);
    perform(() => ack(socket, "vote:submit", { optionId }), "vote");
  }

  function chooseCategory(category) {
    if (!socket || !connected) {
      setError("الاتصال غير جاهز.");
      return;
    }

    perform(() => ack(socket, "category:choose", { category }), "category");
  }

  async function sendChat(message) {
    if (!socket || !connected) {
      const error = new Error("الاتصال غير جاهز.");
      setError(error.message);
      throw error;
    }
    setChatBusy(true);
    setError("");
    try {
      await ack(socket, "chat:send", { message });
    } catch (caught) {
      setError(caught.message);
      throw caught;
    } finally {
      setChatBusy(false);
    }
  }

  async function copyCode() {
    const inviteUrl = roomInviteUrl(room?.code);
    if (!inviteUrl) {
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: "فلتة",
          text: `ادخل غرفة فلتة ${room.code}`,
          url: inviteUrl
        });
        setNotice("تم فتح مشاركة رابط الغرفة.");
        return;
      } catch (caught) {
        if (caught?.name === "AbortError") {
          return;
        }
      }
    }

    if (!navigator.clipboard?.writeText) {
      setNotice(`رابط الغرفة: ${inviteUrl}`);
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setNotice("تم نسخ رابط الغرفة. أرسله في واتساب أو أي مكان.");
    } catch {
      setNotice(`رابط الغرفة: ${inviteUrl}`);
    }
  }

  useEffect(() => {
    function shareRoomFromTopbar() {
      if (room?.phase !== "lobby" && !isMonitorOnlyRoom(room)) {
        return;
      }

      void copyCode();
    }

    globalThis.addEventListener?.("kalak:share-room", shareRoomFromTopbar);
    return () => globalThis.removeEventListener?.("kalak:share-room", shareRoomFromTopbar);
  }, [room?.code, room?.phase]);

  function leaveRoom() {
    const leavingCode = room?.code || "";
    const leavingPlayerId = room?.me?.playerId || "";
    setDrawerOpen(false);
    setRoom(null);
    setJoinCode("");
    startFreshRoomSession();
    navigate("/play", { replace: true });

    if (!socket || !connected) {
      return;
    }

    setBusy(true);
    setPendingAction("leave");
    ack(socket, "room:leave", { code: leavingCode, playerId: leavingPlayerId })
      .catch(() => {})
      .finally(() => {
        setBusy(false);
        setPendingAction("");
      });
  }

  if (!room) {
    return (
      <main className={`game-screen setup-screen ${scienceDayInviteEntry ? "science-day-theme science-day-invite-entry" : ""}`}>
        <section className="setup-copy">
          {scienceDayInviteEntry ? (
            <div className="science-day-entry-brand">
              <ScienceDayBrandLockup />
            </div>
          ) : null}
          <div className="hero-kicker">
            {connected ? <Check size={18} /> : <Loader2 className="spin" size={18} />}
            <span>{connected ? "متصل" : "جاري الاتصال"}</span>
          </div>
          <h1>{scienceDayInviteEntry ? "اليوم العلمي" : prizesInviteEntry ? "جوائز" : isInviteEntry ? "اكتب اسمك" : "ادخل اللعب"}</h1>
          <p>
            {scienceDayInviteEntry
              ? "اكتب اسمك واختار بطاقتك للدخول مباشرة إلى فعالية اليوم العلمي."
              : prizesInviteEntry
              ? "اكتب اسمك واختار بطاقتك للدخول إلى تحدي جوائز، وبعدها انتظر المراقب يبدأ أول سؤال."
              : isInviteEntry
              ? "الرابط جاهز، اختار بطاقتك واضغط دخول للغرفة."
              : "اختار بطاقتك مرة واحدة، وبعدها افتح غرفة أو ادخل بكود."}
          </p>
        </section>

        <section className="panel home-entry-card setup-entry-card">
          <div className="panel-heading">
            <Users size={20} />
            <h2>بطاقتك</h2>
          </div>

          <PlayerFields player={player} setPlayer={setPlayer} />

          <div className={`home-action-grid ${isInviteEntry ? "invite-action-grid" : ""}`}>
            {!isInviteEntry ? (
              <button className="primary-button" type="button" onClick={createRoom} disabled={!connected || busy}>
                <ActionIcon loading={pendingAction === "create"} icon={Play} />
                <span>{pendingAction === "create" ? "جاري الإنشاء" : "إنشاء"}</span>
              </button>
            ) : null}

            <form className={`join-inline ${isInviteEntry ? "invite-join-form" : ""}`} onSubmit={joinRoom}>
              {isInviteEntry ? (
                <div className="invite-ready-card">
                  <Share2 size={18} />
                  <span>{scienceDayInviteEntry ? "رابط اليوم العلمي جاهز" : prizesInviteEntry ? "رابط جوائز جاهز" : "رابط الغرفة جاهز"}</span>
                </div>
              ) : (
                <label>
                  كود الغرفة
                  <input
                    className="room-code-input"
                    value={joinCode}
                    onChange={(event) => setJoinCode(normalizeRoomCodeInput(event.target.value))}
                    dir="ltr"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="one-time-code"
                    spellCheck={false}
                    enterKeyHint="go"
                    maxLength={160}
                    placeholder="اكتب كود الغرفة هنا"
                  />
                </label>
              )}
              <button className="secondary-button" type="submit" disabled={!connected || busy}>
                <ActionIcon loading={pendingAction === "join" || pendingAction === "restore"} icon={ArrowLeft} />
                <span>{pendingAction === "join" || pendingAction === "restore" ? "جاري الدخول" : "دخول"}</span>
              </button>
            </form>
          </div>

        </section>
        {error ? <Toast type="error" icon={CircleAlert} message={error} onClose={() => setError("")} /> : null}
        {notice ? <Toast type="success" icon={Check} message={notice} onClose={() => setNotice("")} /> : null}
      </main>
    );
  }

  const activeGamePhase = activeMatchPhases.has(room.phase);
  const inMatch = focusedGamePhases.has(room.phase);
  const scienceDay = isScienceDayRoom(room);
  const prizes = isPrizesRoom(room);
  const monitorOnly = scienceDay || prizes;
  const monitorWaiting = monitorOnly && room.phase === "lobby" && !isHost;
  const showRoomShare = (!monitorOnly && room.phase === "lobby") || (monitorOnly && isHost);
  const showMobileRoomCode = !monitorOnly && room.phase === "lobby";
  const headerTitle = inMatch
    ? null
    : scienceDay
    ? "اليوم العلمي"
    : prizes
    ? "جوائز"
    : <>غرفة <b dir="ltr">{room.code}</b></>;

  return (
    <main className={`game-screen ${inMatch ? "match-focus-screen" : ""} ${room.phase === "finished" ? "finished-focus-screen" : ""} ${scienceDay ? "science-day-theme" : ""} ${prizes ? "prizes-theme" : ""} ${monitorWaiting ? "science-day-waiting-route" : ""}`}>
      <section className="room-header">
        <div>
          <div className="hero-kicker">
            <span className={`status-dot ${connected ? "online" : ""}`} />
            <span>{phaseLabels[room.phase]}</span>
          </div>
          {headerTitle ? <h1>{headerTitle}</h1> : null}
        </div>
        <div className="room-actions">
          <button className="icon-text-button mobile-menu-trigger" type="button" onClick={() => setDrawerOpen(true)}>
            <Menu size={17} />
            <span>القائمة</span>
          </button>
          <div className="desktop-room-actions">
            {isHost && room.phase !== "lobby" ? (
              <button className="secondary-button" type="button" onClick={endGame} disabled={busy}>
                <ActionIcon loading={pendingAction === "end"} icon={Square} size={16} />
                <span>{pendingAction === "end" ? "جاري الإنهاء" : "إنهاء اللعبة"}</span>
              </button>
            ) : null}
            {showRoomShare ? (
              <button className="icon-text-button" type="button" onClick={copyCode}>
                <Share2 size={17} />
                <span>مشاركة الرابط</span>
              </button>
            ) : null}
            <button className="icon-text-button danger-action" type="button" onClick={leaveRoom} disabled={pendingAction === "leave"}>
              <ActionIcon loading={pendingAction === "leave"} icon={LogOut} size={17} />
              <span>{pendingAction === "leave" ? "جاري الخروج" : "خروج"}</span>
            </button>
          </div>
        </div>
      </section>

      {showMobileRoomCode ? (
        <button className="mobile-room-share-card" type="button" onClick={copyCode}>
          <Share2 size={16} />
          <span>كود الغرفة</span>
          <strong dir="ltr">{room.code}</strong>
        </button>
      ) : null}

      {!connected ? (
        <div className="connection-banner">
          <Loader2 className="spin" size={18} />
          <span>الاتصال انقطع. نحاول نرجعك لنفس الغرفة...</span>
        </div>
      ) : pendingAction === "restore" ? (
        <div className="connection-banner">
          <Loader2 className="spin" size={18} />
          <span>جاري استرجاع جلستك في الغرفة...</span>
        </div>
      ) : null}

      {error ? (
        <Toast type="error" icon={CircleAlert} message={error} onClose={() => setError("")} />
      ) : null}

      {notice ? (
        <Toast type="success" icon={Check} message={notice} onClose={() => setNotice("")} />
      ) : null}

      <RoundSplash splash={roundSplash} gameModes={gameModes} />

      {scienceDay && activeGamePhase && isHost ? (
        <ScienceDayInviteCard
          code={room.code}
          playerCount={scienceDayContestants(room).filter((player) => player.connected !== false).length}
          onShare={copyCode}
          selectedSet={room.settings.scienceDaySet}
          compact
        />
      ) : null}

      <section className="game-layout">
        <div className="play-zone" ref={playZoneRef}>
          {!inMatch && ["answering", "voting", "results"].includes(room.phase) ? (
            <RoundStrip room={room} gameModes={gameModes} />
          ) : null}

          {monitorWaiting ? (
            <ScienceDayWaitingScreen playerName={me?.name || player.name} modeName={prizes ? "جوائز" : "اليوم العلمي"} showBrand={scienceDay} />
          ) : room.phase === "lobby" ? (
            <Lobby
              room={room}
              categories={categories}
              gameModes={gameModes}
              config={config}
              isHost={isHost}
              busy={busy}
              connected={connected}
              pendingAction={pendingAction}
              onUpdate={updateSettings}
              onAddBot={addBot}
              onShare={copyCode}
              onStart={() => perform(() => ack(socket, "game:start"), "start")}
            />
          ) : null}

          {room.phase === "choosingCategory" ? (
            <CategoryChoice
              room={room}
              connected={connected}
              busy={busy}
              pendingAction={pendingAction}
              onChoose={chooseCategory}
            />
          ) : null}

          {room.phase === "answering" ? (
            <Answering
              room={room}
              me={me}
              answer={answer}
              setAnswer={updateAnswerDraft}
              onSubmit={submitAnswer}
              busy={busy}
              connected={connected}
              pendingAction={pendingAction}
            />
          ) : null}

          {room.phase === "voting" ? (
            <Voting
              room={room}
              me={me}
              isHost={isHost}
              selectedOption={selectedOption}
              onVote={vote}
              onNext={() => perform(() => ack(socket, "round:next"), "next")}
              busy={busy}
              connected={connected}
              pendingAction={pendingAction}
            />
          ) : null}

          {room.phase === "results" ? (
            <Results
              room={room}
              isHost={isHost}
              busy={busy}
              connected={connected}
              pendingAction={pendingAction}
              onNext={() => perform(() => ack(socket, "round:next"), "next")}
            />
          ) : null}

          {room.phase === "finished" ? (
            <Finished room={room} currentPlayerId={room.me?.playerId} onHome={() => navigate("/play")} />
          ) : null}
        </div>

        <aside className="side-zone">
          <MatchExtras
            room={room}
            busy={busy}
            connected={connected}
            pendingAction={pendingAction}
            chatBusy={chatBusy}
            onKickVote={kickVote}
            onSendChat={sendChat}
          />
        </aside>
      </section>

      <MatchDrawer
        open={drawerOpen}
        panel={drawerPanel}
        setPanel={setDrawerPanel}
        onClose={() => setDrawerOpen(false)}
        room={room}
        isHost={isHost}
        busy={busy}
        connected={connected}
        pendingAction={pendingAction}
        chatBusy={chatBusy}
        onKickVote={kickVote}
        onSendChat={sendChat}
        onCopyCode={copyCode}
        onEndGame={endGame}
        onLeave={leaveRoom}
      />
    </main>
  );
}

function ActionIcon({ loading, icon: Icon, size = 18 }) {
  return loading ? <Loader2 className="spin" size={size} /> : <Icon size={size} />;
}

function MatchExtras({ room, busy, connected, pendingAction, chatBusy, onKickVote, onSendChat }) {
  const scoreboardPlayers = isMonitorOnlyRoom(room) ? monitorContestants(room) : room.players;

  return (
    <>
      <Scoreboard players={scoreboardPlayers} compact />
      <PlayersPanel room={room} busy={busy} connected={connected} pendingAction={pendingAction} onKickVote={onKickVote} />
      <Chat messages={room.messages} onSend={onSendChat} connected={connected} sending={chatBusy} />
    </>
  );
}

function MatchDrawer({
  open,
  panel,
  setPanel,
  onClose,
  room,
  isHost,
  busy,
  connected,
  pendingAction,
  chatBusy,
  onKickVote,
  onSendChat,
  onCopyCode,
  onEndGame,
  onLeave
}) {
  const monitorOnly = isMonitorOnlyRoom(room);
  const canShareRoom = (!monitorOnly && room.phase === "lobby") || (monitorOnly && isHost);
  const tabs = [
    { id: "score", label: "الترتيب", icon: Trophy },
    { id: "players", label: "اللاعبون", icon: Users },
    { id: "chat", label: "الدردشة", icon: MessageCircle },
    { id: "actions", label: "خيارات", icon: Settings }
  ];

  return (
    <>
      <button className={`drawer-backdrop ${open ? "open" : ""}`} type="button" aria-label="إغلاق القائمة" onClick={onClose} />
      <aside className={`match-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="drawer-head">
          <strong>{tabs.find((tab) => tab.id === panel)?.label || "القائمة"}</strong>
          <button className="icon-button" type="button" onClick={onClose} aria-label="إغلاق القائمة">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-tabs" role="tablist" aria-label="قائمة المباراة">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              className={panel === id ? "active" : ""}
              key={id}
              type="button"
              role="tab"
              aria-selected={panel === id}
              onClick={() => setPanel(id)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="drawer-body">
          {panel === "score" ? <Scoreboard players={isMonitorOnlyRoom(room) ? monitorContestants(room) : room.players} compact /> : null}
          {panel === "players" ? (
            <PlayersPanel room={room} busy={busy} connected={connected} pendingAction={pendingAction} onKickVote={onKickVote} />
          ) : null}
          {panel === "chat" ? <Chat messages={room.messages} onSend={onSendChat} connected={connected} sending={chatBusy} /> : null}
          {panel === "actions" ? (
            <div className="drawer-action-list">
              {canShareRoom ? (
                <button className="icon-text-button" type="button" onClick={onCopyCode}>
                  <Share2 size={17} />
                  <span>مشاركة الرابط</span>
                </button>
              ) : null}
              {isHost && room.phase !== "lobby" ? (
                <button className="secondary-button" type="button" onClick={onEndGame} disabled={busy}>
                  <ActionIcon loading={pendingAction === "end"} icon={Square} size={16} />
                  <span>{pendingAction === "end" ? "جاري الإنهاء" : "إنهاء اللعبة"}</span>
                </button>
              ) : null}
              <button className="icon-text-button danger-action" type="button" onClick={onLeave} disabled={pendingAction === "leave"}>
                <ActionIcon loading={pendingAction === "leave"} icon={LogOut} size={17} />
                <span>{pendingAction === "leave" ? "جاري الخروج" : "خروج"}</span>
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}

function RoundSplash({ splash, gameModes }) {
  if (!splash) {
    return null;
  }

  const isScienceDay = splash.mode === SCIENCE_DAY_MODE;
  const setOption = scienceDaySetOption(splash.scienceDaySet);
  const eventRound = scienceDaySetNumber(setOption.id);
  const questionInRound = ((Math.max(1, splash.round) - 1) % SCIENCE_DAY_QUESTIONS_PER_SET) + 1;

  return (
    <div className="round-splash" aria-live="polite">
      <div className={`round-splash-card ${isScienceDay ? "science-day-round-splash-card" : ""}`}>
        {isScienceDay ? (
          <>
            <span className="round-splash-kicker">اليوم العلمي</span>
            <strong>{`${formatArabicNumber(questionInRound)}/${formatArabicNumber(SCIENCE_DAY_QUESTIONS_PER_SET)}`}</strong>
            <h2>{setOption.label}</h2>
            <span className="round-splash-meta">
              السؤال {formatArabicNumber(questionInRound)} من {formatArabicNumber(SCIENCE_DAY_QUESTIONS_PER_SET)}
              {" · "}
              المجموعة {formatArabicNumber(eventRound)} من {formatArabicNumber(SCIENCE_DAY_TOTAL_SETS)}
            </span>
          </>
        ) : (
          <>
            <span className="round-splash-kicker">الجولة الآن</span>
            <strong>{splash.round}</strong>
            <h2>{gameModeName(gameModes, splash.mode)}</h2>
            <span className="round-splash-meta">{`${splash.round}/${splash.rounds}`}</span>
          </>
        )}
      </div>
    </div>
  );
}

function RoundStrip({ room, gameModes }) {
  const mode = getActiveMode(room);
  const progress = Math.min(100, Math.max(0, (room.round / room.settings.rounds) * 100));
  const scienceDay = mode === SCIENCE_DAY_MODE;
  const meta = scienceDayMeta(room);

  return (
    <div className="round-strip">
      <div className="round-strip-main">
        <span className="round-number">{room.round}</span>
        <div>
          <span>{scienceDay ? `${meta.setLabel || "المجموعة"} ${meta.eventRound}/${meta.totalEventRounds}` : "الطور الحالي"}</span>
          <strong>{scienceDay ? `السؤال ${meta.questionInRound}/${meta.questionsPerRound}` : gameModeName(gameModes, mode)}</strong>
        </div>
      </div>
      <div className="round-progress">
        <i style={{ width: `${progress}%` }} />
      </div>
      <span className="counter-chip">{scienceDay ? `${room.round}/${room.settings.rounds || SCIENCE_DAY_QUESTIONS_PER_SET}` : `الجولة ${room.round}/${room.settings.rounds}`}</span>
    </div>
  );
}

function PlayerFields({ player, setPlayer }) {
  return (
    <div className="identity-composer setup-identity">
      <AvatarPicker
        avatar={player.avatar}
        onChange={(avatar) => setPlayer((current) => ({ ...current, avatar }))}
      />
      <label>
        الاسم
        <input
          value={player.name}
          onChange={(event) => setPlayer((current) => ({ ...current, name: event.target.value }))}
          maxLength={28}
          placeholder="اسم اللاعب"
          autoComplete="nickname"
          enterKeyHint="next"
        />
      </label>
    </div>
  );
}

function QuestionPrompt({ text }) {
  const [title = "", ...notes] = String(text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const note = notes.join(" ");

  return (
    <h2 className="question-title">
      {title}
      {note ? <small className="question-note">{note}</small> : null}
    </h2>
  );
}

function ScienceDayBrandLockup({ compact = false }) {
  return (
    <div className={`science-day-brand-lockup ${compact ? "compact" : ""}`} aria-label="الجامعة الليبية الدولية واليوم العلمي">
      <div className="science-day-logo-item">
        <div className="science-day-limu-mark">
          <img src={SCIENCE_DAY_LIMU_LOGO} alt="" aria-hidden="true" />
        </div>
        <span className="science-day-logo-label">الجامعة الليبية الدولية</span>
      </div>
      <div className="science-day-logo-item">
        <div className="science-day-event-mark">
          <img src={SCIENCE_DAY_BRAND_IMAGE} alt="" aria-hidden="true" />
        </div>
        <span className="science-day-logo-label">اليوم العلمي</span>
      </div>
    </div>
  );
}

function ScienceDayWaitingScreen({ playerName, modeName = "اليوم العلمي", showBrand = true }) {
  return (
    <section className="science-day-waiting-card" aria-live="polite">
      {showBrand ? <ScienceDayBrandLockup /> : (
        <div className="prizes-waiting-mark">
          <Trophy size={34} />
          <span>{modeName}</span>
        </div>
      )}
      <div className="science-day-waiting-copy">
        <span className="eyebrow">تم تسجيلك</span>
        <h2>{playerName ? `أهلًا ${playerName}` : "أهلًا بك"}</h2>
        <p>تم تسجيل دخولك، وسيبدأ تحدي {modeName} عند إطلاقه من المراقب.</p>
      </div>
      <div className="science-day-waiting-status">
        <Loader2 className="spin" size={18} />
        <span>جاهز للانطلاق</span>
      </div>
    </section>
  );
}

function ScienceDayInviteCard({
  code,
  playerCount,
  onShare,
  compact = false,
  selectedSet = "set1",
  canEditSet = false,
  onSetChange = null,
  modeName = "اليوم العلمي",
  eyebrow = "اليوم العلمي",
  title = "امسح QR وادخل مباشرة",
  description = "الرابط يفتح شاشة الاسم فقط، وبعدها يدخل الطالب للفعالية بدون إنشاء غرفة جديدة.",
  showBrand = true,
  showSetPicker = true,
  playerLabel = "مشارك متصل"
}) {
  const inviteUrl = roomInviteUrl(code);
  const selectedSetOption = scienceDaySetOption(selectedSet);
  const [qrCode, setQrCode] = useState("");

  useEffect(() => {
    let active = true;
    if (!inviteUrl) {
      setQrCode("");
      return () => {
        active = false;
      };
    }

    import("qrcode").then((module) => {
      const qrcode = module.default || module;
      return qrcode.toDataURL(inviteUrl, {
        width: 260,
        margin: 1,
        color: {
          dark: "#061114",
          light: "#ffffff"
        }
      });
    }).then((value) => {
      if (active) {
        setQrCode(value);
      }
    }).catch(() => {
      if (active) {
        setQrCode("");
      }
    });

    return () => {
      active = false;
    };
  }, [inviteUrl]);

  return (
    <div className={`science-day-invite ${compact ? "compact" : ""}`}>
      <div className="science-day-invite-copy">
        {showBrand ? <ScienceDayBrandLockup compact={compact} /> : null}
        <span className="eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="science-day-link-row">
          <code dir="ltr">{inviteUrl}</code>
          <button className="secondary-button" type="button" onClick={onShare}>
            <Share2 size={17} />
            <span>مشاركة</span>
          </button>
        </div>
      </div>
      <div className="science-day-qr">
        {qrCode ? <img src={qrCode} alt={`QR لدخول ${modeName}`} /> : <Loader2 className="spin" size={38} />}
        <span>{playerCount} {playerLabel}</span>
        {showSetPicker ? (
          <div className="science-day-set-picker" role="group" aria-label="اختيار مجموعة أسئلة اليوم العلمي">
            {SCIENCE_DAY_SET_OPTIONS.map((option) => (
              <label className={`science-day-set-option ${selectedSetOption.id === option.id ? "selected" : ""}`} key={option.id}>
                <input
                  type="checkbox"
                  checked={selectedSetOption.id === option.id}
                  disabled={!canEditSet}
                  onChange={() => onSetChange?.(option.id)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Lobby({ room, categories, gameModes, config, isHost, busy, connected, pendingAction, onUpdate, onAddBot, onShare, onStart }) {
  const connectedPlayers = room.players.filter((player) => player.connected !== false);
  const scienceDay = isScienceDayRoom(room);
  const prizes = isPrizesRoom(room);
  const monitorOnly = scienceDay || prizes;
  const contestants = monitorOnly ? monitorContestants(room) : room.players;
  const connectedContestants = contestants.filter((player) => player.connected !== false);
  const canStart = scienceDay || (prizes ? connectedContestants.length >= config.minPlayers : connectedPlayers.length >= config.minPlayers);
  const canAddBot = !monitorOnly && isHost && room.players.length < config.maxPlayers;
  const selectedModes = selectedModeIds(room.settings.modes ?? room.settings.mode);
  const limits = roundLimits(selectedModes.length);
  const canDecreaseRounds = connected && isHost && room.settings.rounds > limits.min;
  const canIncreaseRounds = connected && isHost && room.settings.rounds < limits.max;

  function updateModes(nextModes) {
    if (scienceDay) {
      return;
    }

    const modes = selectedModeIds(nextModes);
    const exclusiveMode = modes.includes(SCIENCE_DAY_MODE)
      ? SCIENCE_DAY_MODE
      : modes.includes(PRIZES_MODE)
      ? PRIZES_MODE
      : "";
    if (exclusiveMode) {
      const nonExclusiveModes = modes.filter((mode) => mode !== SCIENCE_DAY_MODE && mode !== PRIZES_MODE);
      const wasExclusive = selectedModes.length === 1 && [SCIENCE_DAY_MODE, PRIZES_MODE].includes(selectedModes[0]);
      if (wasExclusive && nonExclusiveModes.length > 0) {
        const nextRounds = normalizeRoundCount(nonExclusiveModes.length, nonExclusiveModes.length);
        onUpdate({ modes: nonExclusiveModes, rounds: nextRounds });
        return;
      }

      if (exclusiveMode === PRIZES_MODE) {
        onUpdate({
          modes: [PRIZES_MODE],
          rounds: PRIZES_ROUNDS,
          categories: []
        });
        return;
      }

      onUpdate({
        modes: [SCIENCE_DAY_MODE],
        rounds: SCIENCE_DAY_QUESTIONS_PER_SET,
        categories: [],
        scienceDaySet: scienceDaySetOption(room.settings.scienceDaySet).id
      });
      return;
    }

    const currentCycles = Math.max(1, Math.round(Number(room.settings.rounds) / Math.max(1, selectedModes.length)));
    onUpdate({
      modes,
      rounds: normalizeRoundCount(currentCycles * modes.length, modes.length)
    });
  }

  function updateRounds(direction) {
    const nextRounds = Number(room.settings.rounds) + (limits.step * direction);
    onUpdate({ rounds: normalizeRoundCount(nextRounds, selectedModes.length) });
  }

  return (
    <section className="panel stage-panel">
      <div className="stage-heading">
        <div>
          <span className="eyebrow">غرفة الانتظار</span>
          <h2>اللاعبون جاهزون؟</h2>
        </div>
        <span className="counter-chip">
          <Users size={16} />
          {scienceDay ? `${connectedContestants.length} مشارك` : prizes ? `${connectedContestants.length}/${config.maxPlayers}` : `${room.players.length}/${config.maxPlayers}`}
        </span>
      </div>

      {scienceDay ? (
        <ScienceDayInviteCard
          code={room.code}
          playerCount={connectedContestants.length}
          onShare={onShare}
          selectedSet={room.settings.scienceDaySet}
          canEditSet={isHost && connected && !busy}
          onSetChange={(scienceDaySet) => onUpdate({ scienceDaySet })}
        />
      ) : prizes ? (
        <ScienceDayInviteCard
          code={room.code}
          playerCount={connectedContestants.length}
          onShare={onShare}
          modeName="جوائز"
          eyebrow="جوائز"
          title="امسح QR وانضم للتحدي"
          description="الرابط يفتح شاشة الاسم فقط. اللاعبون يدخلون وينتظرون المراقب، ثم تبدأ 5 أسئلة بنظام شن الصح."
          showBrand={false}
          showSetPicker={false}
          playerLabel="لاعب متصل"
        />
      ) : null}

      {isHost && !monitorOnly ? (
        <div className="bot-controls">
          <button className="secondary-button" type="button" onClick={onAddBot} disabled={!connected || !canAddBot || busy}>
            <ActionIcon loading={pendingAction === "bot"} icon={UserPlus} />
            <span>{pendingAction === "bot" ? "جاري الإضافة" : "إضافة لاعب آلي"}</span>
          </button>
          <span className="mini-chip">
            <Bot size={14} />
            <span>لاعبون آليون للتجربة يجيبون ويصوتون تلقائيًا</span>
          </span>
        </div>
      ) : null}

      <div className="player-grid">
        {room.players.map((player) => (
          <div className="player-tile" key={player.id}>
            <Avatar avatar={player.avatar} name={player.name} />
            <strong>{player.name}</strong>
            <div className="player-tile-actions">
              {player.isBot ? (
                <span className="mini-chip bot-chip">
                  <Bot size={13} />
                  <span>آلي</span>
                </span>
              ) : null}
              {player.connected === false ? <span className="mini-chip offline-chip">غير متصل</span> : null}
              {player.isHost && monitorOnly ? <span className="mini-chip">مراقب</span> : null}
              {player.isHost ? <Crown size={16} /> : null}
            </div>
          </div>
        ))}
      </div>

      <div className="settings-band">
        <div className="section-title">
          <Settings size={18} />
          <h2>الإعدادات</h2>
        </div>
        {monitorOnly ? (
          <div className="settings-categories science-day-mode-lock">
            <span className="field-label">طور اللعبة</span>
            <div className="science-day-locked-mode">
              <span className="science-day-locked-icon">
                <Sparkles size={18} />
              </span>
              <div>
                <strong>{scienceDay ? "اليوم العلمي" : "جوائز"}</strong>
                <span>{scienceDay ? "طور الفعالية الحالي" : "5 أسئلة بنظام شن الصح"}</span>
              </div>
              <span className="mini-chip">مثبت</span>
            </div>
          </div>
        ) : (
          <div className="settings-categories">
            <span className="field-label">طور اللعبة</span>
            <GameModePicker
              modes={gameModes}
              selected={selectedModes}
              onChange={updateModes}
              disabled={!connected || !isHost}
            />
          </div>
        )}
        {scienceDay ? (
          <div className="science-day-rule-grid">
            <div>
              <strong>مجموعتان</strong>
              <span>اختر المجموعة الأولى أو الثانية من بطاقة QR.</span>
            </div>
            <div>
              <strong>{SCIENCE_DAY_TOTAL_QUESTIONS} سؤال</strong>
              <span>كل تشغيل يعرض {SCIENCE_DAY_QUESTIONS_PER_SET} أسئلة فقط، ومدة كل سؤال {SCIENCE_DAY_QUESTION_SECONDS} ثانية.</span>
            </div>
            <div>
              <strong>نتائج واضحة</strong>
              <span>الطلاب يشاهدون النسب والأعداد والإجابة الصحيحة بدون أسماء.</span>
            </div>
          </div>
        ) : prizes ? (
          <div className="science-day-rule-grid">
            <div>
              <strong>5 أسئلة</strong>
              <span>تحدي قصير وثقيل. كل سؤال يأخذ {room.settings.answerSeconds || 30} ثانية للإجابة ثم {room.settings.voteSeconds || 30} ثانية للتصويت.</span>
            </div>
            <div>
              <strong>3 إلى 6 لاعبين</strong>
              <span>العداد يحسب اللاعبين فقط، والمراقب لا يأخذ مكان لاعب.</span>
            </div>
            <div>
              <strong>مراقب فقط</strong>
              <span>منشئ الغرفة يشغّل الأسئلة وينهي الجولة، لكنه لا يجاوب ولا يصوّت ولا يظهر في الترتيب.</span>
            </div>
          </div>
        ) : null}
        {!monitorOnly && selectedModes.includes("kalak") ? <div className="settings-categories">
          <span className="field-label">أنواع الأسئلة الخاصة بطور شن الصح</span>
          <CategoryPicker
            categories={categories}
            selected={room.settings.categories || []}
            onChange={(nextCategories) => onUpdate({ categories: nextCategories })}
            disabled={!connected || !isHost}
          />
        </div> : null}
        {!monitorOnly ? <div className="settings-grid round-settings-grid">
          <div className="round-stepper" aria-label="الجولات">
            <span className="field-label">الجولات</span>
            <button
              className="round-step-button"
              type="button"
              disabled={!canIncreaseRounds || busy}
              onClick={() => updateRounds(1)}
              aria-label="زيادة الجولات"
            >
              <ChevronUp size={34} />
            </button>
            <strong className="round-step-value">{room.settings.rounds}</strong>
            <button
              className="round-step-button"
              type="button"
              disabled={!canDecreaseRounds || busy}
              onClick={() => updateRounds(-1)}
              aria-label="تقليل الجولات"
            >
              <ChevronDown size={34} />
            </button>
          </div>
        </div> : null}
      </div>

      {isHost ? (
        <button className="primary-button wide-button" type="button" onClick={onStart} disabled={!connected || !canStart || busy}>
          <ActionIcon loading={pendingAction === "start"} icon={Play} />
          <span>{pendingAction === "start" ? "جاري البدء" : canStart ? (scienceDay ? "بدء اليوم العلمي" : prizes ? "بدء جوائز" : "بدء اللعبة") : `تحتاج ${config.minPlayers} لاعبين متصلين`}</span>
        </button>
      ) : (
        <div className="waiting-strip">
          <Loader2 className="spin" size={18} />
          <span>بانتظار المضيف</span>
        </div>
      )}
    </section>
  );
}

function CategoryChoice({ room, connected, busy, pendingAction, onChoose }) {
  const selection = room.categorySelection || {};
  const categories = Array.isArray(selection.categories) ? selection.categories : [];
  const chooserName = selection.chooserName || "اللاعب";
  const isChooser = Boolean(selection.isChooser);
  const round = selection.round || room.round + 1;
  const rounds = selection.rounds || room.settings.rounds;
  const canChoose = connected && isChooser && !busy;
  const headingLabel = isChooser
    ? `الجولة ${formatArabicNumber(round)}/${formatArabicNumber(rounds)}`
    : `دور ${chooserName}`;

  return (
    <section className="panel stage-panel category-choice-stage">
      <div className="stage-heading">
        <div className="category-choice-heading">
          <span className="eyebrow">{headingLabel}</span>
        </div>
        <Timer
          className="answer-timer"
          deadline={room.phaseEndsAt}
          durationSeconds={selection.durationSeconds || 40}
        />
      </div>

      <div className="options-grid category-choice-grid">
        {categories.map((category, index) => (
          <button
            className="answer-option category-choice-button"
            key={category}
            type="button"
            disabled={!canChoose}
            onClick={(event) => {
              event.currentTarget.blur();
              onChoose(category);
            }}
          >
            <span className="option-index">
              {pendingAction === "category" && isChooser ? <Loader2 className="spin" size={16} /> : index + 1}
            </span>
            <span className="option-body">
              <strong>{category}</strong>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Answering({ room, me, answer, setAnswer, onSubmit, busy, connected, pendingAction }) {
  const submitted = Boolean(me?.submitted);
  const activeMode = getActiveMode(room);
  const isImposterMode = activeMode === "imposter";
  const knowsCorrect = (activeMode === "kalak" || activeMode === PRIZES_MODE) && room.me?.knowsCorrect && !submitted;
  const canSubmit = me?.canSubmit !== false;
  const placeholder = knowsCorrect
    ? "اكتب إجابة غلط مقنعة عشان تخدع اللاعبين"
    : activeMode === "judge_pick"
    ? "اكتب إجابة تقنع الحكم"
    : isImposterMode ? "اكتب وصفًا للكلمة" : "اكتب إجابة صحيحة أو خدعة مقنعة";

  if (isImposterMode && room.imposterTurn) {
    return (
      <ImposterAnswering
        room={room}
        me={me}
        answer={answer}
        setAnswer={setAnswer}
        onSubmit={onSubmit}
        busy={busy}
        connected={connected}
        pendingAction={pendingAction}
      />
    );
  }

  return (
    <section className="panel stage-panel question-stage">
      <div className="stage-heading">
        <div>
          <span className="eyebrow">{room.question.category} · الجولة {room.round}/{room.settings.rounds}</span>
          <QuestionPrompt text={room.question.prompt} />
        </div>
        <Timer
          className="answer-timer"
          deadline={room.phaseEndsAt}
          durationSeconds={room.settings.answerSeconds}
        />
      </div>

      {isImposterMode ? (
        <div className={`role-card ${room.question.isImposter ? "danger-role" : ""}`}>
          <span>{room.question.isImposter ? "أنت الدخيل" : "الكلمة السرية"}</span>
          <strong>{room.question.isImposter ? "حاول تندمج" : room.question.secretWord}</strong>
        </div>
      ) : null}

      {knowsCorrect ? (
        <div className="role-card success-role">
          <span>إجابتك صحيحة</span>
          <strong>اكتب الآن خدعة غلط تقنع اللاعبين</strong>
        </div>
      ) : null}

      {!canSubmit ? (
        <div className="locked-answer">
          <Crown size={28} />
          <strong>{room.question.isJudge ? "أنت الحكم" : "انتظر اللاعبين"}</strong>
          <span>انتظر الإجابات، ثم اختر الفائز في التصويت.</span>
        </div>
      ) : submitted ? (
        <div className="locked-answer">
          <Check size={28} />
          <strong>تم إرسال إجابتك</strong>
        </div>
      ) : (
        <form className="answer-form" onSubmit={onSubmit}>
          <textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            maxLength={160}
            placeholder={placeholder}
            enterKeyHint="send"
          />
          <button className="primary-button" type="submit" disabled={!connected || busy || !answer.trim()}>
            <ActionIcon loading={pendingAction === "answer"} icon={Send} />
            <span>{pendingAction === "answer" ? "جاري الإرسال" : "إرسال"}</span>
          </button>
        </form>
      )}

      <ProgressStrip players={room.players} kind="submitted" answering />
    </section>
  );
}

function ImposterAnswering({ room, me, answer, setAnswer, onSubmit, busy, connected, pendingAction }) {
  const turn = room.imposterTurn;
  const isMyTurn = Boolean(turn.isMyTurn && me?.canSubmit !== false);
  const currentPlayerLabel = turn.playerName || "اللاعب الحالي";

  return (
    <section className="panel stage-panel question-stage imposter-turn-stage">
      <div className="stage-heading">
        <div>
          <span className="eyebrow">{room.question.category} · الجولة {room.round}/{room.settings.rounds}</span>
          <QuestionPrompt text={room.question.prompt} />
        </div>
        <Timer
          className="answer-timer"
          deadline={room.phaseEndsAt}
          durationSeconds={turn.clueSeconds}
        />
      </div>

      <div className={`role-card ${room.question.isImposter ? "danger-role" : ""}`}>
        <span>{room.question.isImposter ? "أنت الدخيل" : "الكلمة السرية"}</span>
        <strong>{room.question.isImposter ? "حاول تندمج" : room.question.secretWord}</strong>
      </div>

      <div className="imposter-turn-card">
        <div className="imposter-speaker">
          {turn.avatar ? <Avatar avatar={turn.avatar} name={currentPlayerLabel} /> : null}
          <div>
            <span className="eyebrow">الدور الآن</span>
            <strong>{currentPlayerLabel}</strong>
          </div>
        </div>
      </div>

      {isMyTurn ? (
        <form className="answer-form imposter-clue-form" onSubmit={onSubmit}>
          <input
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            maxLength={20}
            placeholder="اكتب وصفًا"
            inputMode="text"
            enterKeyHint="send"
            autoComplete="off"
            autoFocus
          />
          <div className="imposter-clue-actions">
            <button className="primary-button" type="submit" disabled={!connected || busy || !answer.trim()}>
              <ActionIcon loading={pendingAction === "answer"} icon={Send} />
              <span>{pendingAction === "answer" ? "جاري الإرسال" : "إرسال"}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="locked-answer imposter-waiting">
          <Crown size={28} />
          <strong>دور {currentPlayerLabel}</strong>
          <span>اسمع وانتظر دورك.</span>
        </div>
      )}

      <ImposterTurnOrder turn={turn} />
      <ImposterClueHistory history={turn.history || []} />
    </section>
  );
}

function ImposterTurnOrder({ turn }) {
  return (
    <div className="imposter-turn-order" aria-label="ترتيب وصف الدخيل">
      {turn.players.map((player) => (
        <div className={`imposter-turn-player ${player.isCurrent ? "current" : ""} ${player.done ? "done" : ""}`} key={player.id}>
          <span className="option-index">{player.position}</span>
          <strong>{player.name}</strong>
        </div>
      ))}
    </div>
  );
}

function ImposterClueHistory({ history }) {
  return (
    <div className="imposter-clue-history">
      <div className="section-title">
        <MessageCircle size={17} />
        <h3>الأوصاف السابقة</h3>
      </div>
      {history.length ? (
        <div className="imposter-clue-list">
          {history.map((item) => (
            <div className="imposter-clue-row" key={`${item.playerId}-${item.pass}`}>
              <p>{item.text}</p>
              <small>{item.playerName}</small>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-clue-history">ما في أوصاف بعد.</div>
      )}
    </div>
  );
}

function Voting({ room, me, isHost, selectedOption, onVote, onNext, busy, connected, pendingAction }) {
  const scienceDay = isScienceDayRoom(room);
  const prizes = isPrizesRoom(room);
  const isImposterMode = getActiveMode(room) === "imposter";
  const meta = scienceDayMeta(room);
  const monitorOnly = (scienceDay || prizes) && me?.canVote === false;
  const activeOption = selectedOption || me?.selectedOptionId || "";
  const canChangeScienceAnswer = scienceDay && me?.voted && me?.canVote !== false;
  return (
    <section className={`panel stage-panel ${scienceDay ? "science-day-stage" : ""}`}>
      {scienceDay && !isHost ? (
        <div className="science-day-stage-brand">
          <ScienceDayBrandLockup compact />
        </div>
      ) : null}
      <div className="stage-heading">
        <div>
          <span className="eyebrow">
            {scienceDay
              ? `${meta.setLabel || "المجموعة"} ${meta.eventRound}/${meta.totalEventRounds} · السؤال ${meta.questionInRound}/${meta.questionsPerRound}`
              : `${room.question.category} · الجولة ${room.round}/${room.settings.rounds}`}
          </span>
          <QuestionPrompt text={room.question.prompt} />
        </div>
        <Timer
          className="answer-timer"
          deadline={room.phaseEndsAt}
          durationSeconds={room.settings.voteSeconds}
        />
      </div>

      {monitorOnly ? (
        <div className="science-day-monitor-note">
          <Crown size={18} />
          <span>{scienceDay ? "أنت مراقب اليوم العلمي. تابع الإجابات والوقت، وبعد النتائج انقلهم للسؤال التالي." : "أنت مراقب جوائز. تابع الإجابات والوقت، وبعد النتائج انقل اللاعبين للسؤال التالي."}</span>
        </div>
      ) : null}

      {scienceDay && !monitorOnly ? (
        <div className="science-day-change-note">
          {canChangeScienceAnswer ? "اختيارك محفوظ. تقدر تغيّره قبل انتهاء الوقت." : "اختر الإجابة، وتقدر تبدّلها قبل انتهاء الوقت."}
        </div>
      ) : null}

      {scienceDay && isHost ? (
        <button className="secondary-button science-day-next-button" type="button" onClick={onNext} disabled={!connected || busy}>
          <ActionIcon loading={pendingAction === "next"} icon={Sparkles} />
          <span>{pendingAction === "next" ? "جاري عرض النتائج" : "إنهاء السؤال وعرض النتائج"}</span>
        </button>
      ) : null}

      <div className="options-grid">
        {room.options.map((option, index) => (
          <button
            className={`answer-option ${activeOption === option.id ? "selected" : ""}`}
            key={option.id}
            type="button"
            disabled={!connected || busy || (!scienceDay && me?.voted) || option.isOwn || me?.canVote === false}
            onClick={(event) => {
              event.currentTarget.blur();
              onVote(option.id);
            }}
          >
            <span className="option-index">{pendingAction === "vote" && activeOption === option.id ? <Loader2 className="spin" size={16} /> : index + 1}</span>
            <span className="option-body">
              <strong>{isImposterMode ? option.clue || "بدون وصف" : option.text}</strong>
              {isImposterMode ? <small>{option.text}</small> : option.clue ? <small>{option.clue}</small> : null}
            </span>
            {option.isOwn ? <span className="mini-chip">إجابتك</span> : null}
          </button>
        ))}
      </div>

      <ProgressStrip players={room.players} kind="voted" voting anonymous={scienceDay} />
    </section>
  );
}

function revealLabel(room, option = {}) {
  const mode = getActiveMode(room);

  if (mode === "imposter") {
    return "الدخيل";
  }

  if (mode === "fake_fact") {
    return "الخيار الصحيح";
  }

  if (mode === "last_survivor") {
    return "ناجٍ";
  }

  if (mode === "judge_pick") {
    return option.source === "game" ? "اختيار اللعبة - الحكم +3" : "اختيار الحكم";
  }

  if (mode === "target_guess") {
    return "اختيار الهدف";
  }

  if (mode === "split_steal") {
    return "نتيجة الصفقة";
  }

  if (mode === "minority_wins") {
    return "اختيار الأقلية";
  }

  if (mode === "reverse_trap") {
    return "اختيار آمن";
  }

  return "الإجابة الصحيحة";
}

function revealOwnerLabel(room, option) {
  const mode = getActiveMode(room);

  if (mode === "imposter") {
    return option.ownerNames.join("، ");
  }

  if (mode === "last_survivor") {
    return option.ownerNames.length ? `اللاعب: ${option.ownerNames.join("، ")}` : "بدون صاحب";
  }

  if (mode === "judge_pick") {
    if (option.source === "game") {
      return "جواب من اللعبة";
    }
    return option.ownerNames.length ? `اللاعب: ${option.ownerNames.join("، ")}` : "بدون صاحب";
  }

  return option.ownerNames.length ? `كتبها: ${option.ownerNames.join("، ")}` : "بدون صاحب";
}

function awardDetails(award, scienceDay) {
  if (scienceDay) {
    const parts = [];
    const basePoints = award.scienceDay?.basePoints || 0;
    const speedBonus = award.scienceDay?.speedBonus || 0;
    if (basePoints > 0) {
      parts.push(`صحيح ${basePoints}`);
    }
    if (speedBonus > 0) {
      parts.push(`سرعة ${speedBonus}`);
    }
    if (award.scienceDay?.responseSeconds !== undefined) {
      parts.push(`${award.scienceDay.responseSeconds}ث`);
    }
    return parts.join(" · ");
  }

  return [
    award.correctVote > 0 ? `صحيح ${award.correctVote}` : "",
    award.fakeVotes > 0 ? `خداع ${award.fakeVotes}` : "",
    award.correctSubmission > 0 ? `إجابة ${award.correctSubmission}` : ""
  ].filter(Boolean).join(" · ");
}

function resultVoteTotal(room) {
  const revealedTotal = (room.results?.revealedOptions || []).reduce((sum, option) => (
    sum + (Number.isFinite(option.voteCount) ? option.voteCount : option.voterNames?.length || 0)
  ), 0);

  if (revealedTotal > 0) {
    return revealedTotal;
  }

  const explicitVotes = room.results?.votes;
  if (Array.isArray(explicitVotes) && explicitVotes.length > 0) {
    return explicitVotes.length;
  }

  return 0;
}

function voteSummaryLabel(option, totalVotes) {
  const count = Number.isFinite(option.voteCount) ? option.voteCount : option.voterNames?.length || 0;
  const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
  return `${formatArabicNumber(count)} صوت · ${formatArabicNumber(percentage)}%`;
}

function Results({ room, isHost, busy, connected, pendingAction, onNext }) {
  const isFinal = room.results?.isFinal || room.round >= room.settings.rounds;
  const scienceDay = isScienceDayRoom(room);
  const isImposterMode = getActiveMode(room) === "imposter";
  const scienceMeta = scienceDay ? scienceDayMeta(room) : null;
  const visibleAwards = scienceDay ? [] : (room.results.awards || []).filter((award) => award.total > 0);
  const totalVotes = resultVoteTotal(room);
  const nextLabel = isFinal ? "إنهاء المباراة" : "الجولة التالية";

  return (
    <section className={`panel stage-panel results-stage ${scienceDay ? "science-day-stage" : ""}`}>
      {scienceDay && !isHost ? (
        <div className="science-day-stage-brand">
          <ScienceDayBrandLockup compact />
        </div>
      ) : null}
      <div className="stage-heading">
        <div>
          <span className="eyebrow">
            {scienceDay ? `نتيجة ${scienceMeta.setLabel || "المجموعة"} · السؤال ${scienceMeta.questionInRound}/${scienceMeta.questionsPerRound}` : "كشف الجولة"}
          </span>
          <QuestionPrompt text={room.question.prompt} />
        </div>
        <span className="correct-chip">
          <Check size={17} />
          {room.results.correctAnswer}
        </span>
      </div>

      {room.results.summary && !scienceDay ? <p className="result-summary">{room.results.summary}</p> : null}

      <div className="reveal-list">
        {room.results.revealedOptions.map((option) => (
          <div className={`reveal-row ${option.isCorrect ? "correct" : ""}`} key={option.id}>
            <div>
              <strong>{isImposterMode ? option.clue || "بدون وصف" : option.text}</strong>
              {scienceDay && !option.isCorrect ? null : (
                <span>
                  {isImposterMode
                    ? option.text
                    : option.isCorrect
                      ? revealLabel(room, option)
                      : revealOwnerLabel(room, option)}
                </span>
              )}
            </div>
            <div className="voter-stack anonymous-vote-summary">
              <span>{voteSummaryLabel(option, totalVotes)}</span>
            </div>
          </div>
        ))}
      </div>

      {visibleAwards.length ? (
        <div className="awards-grid">
          {visibleAwards.map((award) => {
            const details = awardDetails(award, scienceDay);
            return (
              <div className="award-card" key={award.playerId}>
                <strong>{award.name}</strong>
                <span>+{award.total}</span>
                {details ? <small>{details}</small> : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {isHost ? (
        <button className="primary-button wide-button" type="button" onClick={onNext} disabled={!connected || busy}>
          <ActionIcon loading={pendingAction === "next"} icon={Sparkles} />
          <span>{pendingAction === "next" ? "جاري النقل" : nextLabel}</span>
        </button>
      ) : null}
    </section>
  );
}

function Finished({ room, currentPlayerId, onHome }) {
  const scienceDay = isScienceDayRoom(room);
  const prizes = isPrizesRoom(room);
  const scienceMeta = scienceDay ? scienceDayMeta(room) : null;
  const leaderboardPlayers = scienceDay || prizes ? monitorContestants(room) : room.players;
  const rankedPlayers = leaderboardPlayers.map((player, index) => ({
    ...player,
    rank: index + 1
  }));
  const topThree = rankedPlayers.slice(0, 3);
  const podiumPlayers = [topThree[1], topThree[0], topThree[2]].filter(Boolean);
  const winner = topThree[0];
  const currentPlayer = rankedPlayers.find((player) => player.id === currentPlayerId);
  const showCurrentPlayer = Boolean(currentPlayer && currentPlayer.rank > 3);
  const winnerScore = formatArabicNumber(winner?.score || 0);

  return (
    <section className="panel stage-panel final-stage">
      <div className="final-confetti" aria-hidden="true">
        {finalConfetti.map((piece, index) => (
          <span
            key={index}
            style={{
              "--x": `${piece.x}%`,
              "--delay": `${piece.delay}ms`,
              "--duration": `${piece.duration}ms`,
              "--drift": `${piece.drift}px`,
              "--spin": `${piece.spin}deg`,
              "--size": `${piece.size}px`,
              "--color": piece.color
            }}
          />
        ))}
      </div>

      <div className="final-board-heading">
        <span className="final-board-kicker">
          <Trophy size={18} />
          {scienceDay ? "نتيجة المجموعة" : "الترتيب النهائي"}
        </span>
        <h2>{winner ? "منصة الفائزين" : "انتهت الجولة"}</h2>
        <p>
          {winner
            ? scienceDay
              ? `${scienceMeta?.setLabel || "المجموعة"} · المتصدر ${winner.name} بـ ${winnerScore} نقطة`
              : `المتصدر ${winner.name} بـ ${winnerScore} نقطة`
            : "لا توجد نقاط مسجلة بعد."}
        </p>
      </div>

      <div className={`final-podium ${topThree.length < 3 ? "compact" : ""}`} aria-label="أفضل ثلاثة لاعبين">
        {podiumPlayers.map((player) => (
          <article className={`final-podium-card rank-${player.rank} ${player.id === currentPlayerId ? "is-current" : ""}`} key={player.id}>
            <div className="final-medal">
              {player.rank === 1 ? <Crown size={20} /> : <Trophy size={18} />}
              <span>{formatArabicNumber(player.rank)}</span>
            </div>
            <Avatar avatar={player.avatar} size={player.rank === 1 ? "xl" : "lg"} />
            <div className="final-player-copy">
              <strong>
                <span>{player.name}</span>
                {player.id === currentPlayerId ? <em>(أنت)</em> : null}
              </strong>
              <span>{formatArabicNumber(player.score)} نقطة</span>
            </div>
          </article>
        ))}
      </div>

      {showCurrentPlayer ? (
        <div className="final-current-player">
          <span className="final-current-rank">#{formatArabicNumber(currentPlayer.rank)}</span>
          <Avatar avatar={currentPlayer.avatar} name={currentPlayer.name} />
          <strong>
            <span>{currentPlayer.name}</span>
            <em>(أنت)</em>
          </strong>
          <span>{formatArabicNumber(currentPlayer.score)} نقطة</span>
        </div>
      ) : null}

      {scienceDay ? (
        <div className="science-day-finished-note">
          <Check size={20} />
          <span>تم إنهاء هذه المجموعة. لبدء المجموعة الأخرى، يختار المشرف المجموعة من QR ثم يدخل الطلاب مرة ثانية.</span>
        </div>
      ) : null}
      <button className="secondary-button wide-button" type="button" onClick={onHome}>
        <ArrowLeft size={18} />
        <span>العودة</span>
      </button>
    </section>
  );
}

function Toast({ type, icon: Icon, message, onClose }) {
  return (
    <div className={`toast ${type}`} role={type === "error" ? "alert" : "status"}>
      <Icon size={17} />
      <span>{message}</span>
      <button className="toast-close" type="button" onClick={onClose} aria-label="إغلاق الرسالة">
        <X size={15} />
      </button>
    </div>
  );
}

function ProgressStrip({ players, kind, voting = false, answering = false, anonymous = false }) {
  const activePlayers = players.filter((player) => {
    if (player.eliminated) {
      return false;
    }
    if (voting && player.canVote === false) {
      return false;
    }
    if (answering && player.canSubmit === false) {
      return false;
    }
    return true;
  });
  const done = activePlayers.filter((player) => player[kind]).length;
  const percentage = activePlayers.length ? Math.round((done / activePlayers.length) * 100) : 0;

  return (
    <div className="progress-strip">
      <span>
        {formatArabicNumber(done)}/{formatArabicNumber(activePlayers.length)}
        {anonymous ? ` · ${formatArabicNumber(percentage)}%` : ""}
      </span>
      <div className="progress-track">
        <i style={{ width: `${activePlayers.length ? (done / activePlayers.length) * 100 : 0}%` }} />
      </div>
      {!anonymous ? (
        <div className="mini-player-list">
          {activePlayers.map((player) => (
            <span className={player[kind] ? "ready" : ""} key={player.id}>{player.name}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PlayersPanel({ room, busy, connected, pendingAction, onKickVote }) {
  const currentPlayerId = room.me?.playerId;
  const kickVotes = new Map((room.kickVotes || []).map((vote) => [vote.targetId, vote]));

  return (
    <section className="players-panel">
      <div className="section-title">
        <Users size={18} />
        <h2>اللاعبون</h2>
      </div>
      <div className="player-list">
        {room.players.map((player) => {
          const kick = kickVotes.get(player.id);
          const hasVotes = kick && kick.count > 0;
          const canVoteKick = kick?.canVote && player.id !== currentPlayerId;

          return (
            <div className="player-row" key={player.id}>
              <Avatar avatar={player.avatar} name={player.name} />
              <span className="player-name">{player.name}</span>
              {player.eliminated ? <span className="mini-chip eliminated-chip">خارج</span> : null}
              {player.connected === false ? <span className="mini-chip offline-chip">غير متصل</span> : null}
              {player.isBot ? (
                <span className="mini-chip bot-chip">
                  <Bot size={13} />
                  <span>آلي</span>
                </span>
              ) : null}
              {player.isHost ? <Crown size={15} /> : null}
              {hasVotes ? (
                <span className="mini-chip kick-count">طرد {kick.count}/{kick.required}</span>
              ) : null}
              {canVoteKick ? (
                <button
                  className="kick-vote-button"
                  type="button"
                  aria-label={`تصويت لطرد ${player.name}`}
                  title="تصويت للطرد"
                  disabled={!connected || busy}
                  onClick={() => onKickVote(player.id)}
                >
                  {pendingAction === "kick" ? <Loader2 className="spin" size={14} /> : <UserMinus size={14} />}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

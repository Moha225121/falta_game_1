import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  Check,
  Clipboard,
  Crown,
  Gamepad2,
  Loader2,
  Play,
  Send,
  Settings,
  Sparkles,
  Square,
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
  answering: "الإجابات",
  voting: "التصويت",
  results: "النتائج",
  finished: "النهاية"
};

function getActiveMode(room) {
  return room?.activeMode || room?.settings?.mode || selectedModeIds(room?.settings?.modes)[0];
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
    socket.emit(event, payload, (response) => {
      if (response?.ok) {
        resolve(response);
      } else {
        reject(new Error(response?.error || "فشل تنفيذ الأمر."));
      }
    });
  });
}

export default function Game() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, connected } = useKalakSocket();
  const autoActionDone = useRef(false);
  const lastRoundKey = useRef("");
  const roundSplashTimer = useRef(null);
  const [room, setRoom] = useState(null);
  const [roundSplash, setRoundSplash] = useState(null);
  const [categories, setCategories] = useState([]);
  const [gameModes, setGameModes] = useState(fallbackGameModes);
  const [config, setConfig] = useState({ minPlayers: 3, maxPlayers: 6 });
  const [player, setPlayer] = useState(() => loadPlayer(location.state));
  const [joinCode, setJoinCode] = useState(roomCode || "");
  const [answer, setAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api("/categories").then(setCategories).catch(() => setCategories([]));
    api("/game-modes").then(setGameModes).catch(() => {});
    api("/config").then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const onState = (nextRoom) => {
      setRoom(nextRoom);
      setError("");
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
          mode: activeMode
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
      }
      if (nextRoom.phase !== "voting") {
        setSelectedOption("");
      }
    };

    const onError = (payload) => setError(payload.error || "حدث خطأ غير متوقع.");
    const onKicked = (payload) => {
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
  }, [socket]);

  useEffect(() => () => clearTimeout(roundSplashTimer.current), []);

  useEffect(() => {
    if (!socket || !connected || autoActionDone.current || room) {
      return;
    }

    const state = location.state;
    if (!state?.mode && !roomCode) {
      return;
    }

    autoActionDone.current = true;
    const nextPlayer = persistPlayer(loadPlayer(state));
    setPlayer(nextPlayer);

    if (state?.mode === "create") {
      perform(() => ack(socket, "room:create", {
        name: nextPlayer.name,
        avatar: nextPlayer.avatar
      }).then((response) => {
        navigate(`/play/${response.room.code}`, { replace: true });
      }));
      return;
    }

    const code = roomCode || state?.code;
    if (code) {
      perform(() => ack(socket, "room:join", {
        code,
        name: nextPlayer.name,
        avatar: nextPlayer.avatar
      }));
    }
  }, [connected, location.state, navigate, room, roomCode, socket]);

  const me = useMemo(() => room?.players.find((item) => item.id === room.me?.playerId), [room]);
  const isHost = Boolean(room?.me?.isHost);

  async function perform(action) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  function createRoom(event) {
    event?.preventDefault();
    if (!socket) {
      return;
    }
    const nextPlayer = persistPlayer(player);
    setPlayer(nextPlayer);
    perform(() => ack(socket, "room:create", {
      name: nextPlayer.name,
      avatar: nextPlayer.avatar
    }).then((response) => {
      navigate(`/play/${response.room.code}`, { replace: true });
    }));
  }

  function joinRoom(event) {
    event.preventDefault();
    if (!socket || !joinCode.trim()) {
      return;
    }
    const nextPlayer = persistPlayer(player);
    setPlayer(nextPlayer);
    perform(() => ack(socket, "room:join", {
      code: joinCode.trim().toUpperCase(),
      name: nextPlayer.name,
      avatar: nextPlayer.avatar
    }).then((response) => {
      navigate(`/play/${response.room.code}`, { replace: true });
    }));
  }

  function updateSettings(next) {
    if (!socket) {
      return;
    }
    perform(() => ack(socket, "room:updateSettings", next));
  }

  function addBot() {
    if (!socket) {
      return;
    }
    perform(() => ack(socket, "room:addBot"));
  }

  function endGame() {
    if (!socket) {
      return;
    }
    perform(() => ack(socket, "game:end"));
  }

  function kickVote(playerId) {
    if (!socket) {
      return;
    }
    perform(() => ack(socket, "player:kickVote", { playerId }));
  }

  function submitAnswer(event) {
    event.preventDefault();
    if (!socket || !answer.trim()) {
      return;
    }
    perform(() => ack(socket, "answer:submit", { text: answer }).then((response) => {
      if (response.correctAnswerHit) {
        setRoom(response.room);
        setNotice(response.message || "إجابتك صحيحة. اكتب الآن إجابة غلط مقنعة.");
        setAnswer("");
        return;
      }
      setNotice("");
    }));
  }

  function vote(optionId) {
    if (!socket) {
      return;
    }
    setSelectedOption(optionId);
    perform(() => ack(socket, "vote:submit", { optionId }));
  }

  function sendChat(message) {
    if (!socket) {
      return;
    }
    ack(socket, "chat:send", { message }).catch((caught) => setError(caught.message));
  }

  function copyCode() {
    navigator.clipboard?.writeText(room.code).catch(() => {});
  }

  if (!room) {
    return (
      <main className="game-screen setup-screen">
        <section className="setup-copy">
          <div className="hero-kicker">
            {connected ? <Check size={18} /> : <Loader2 className="spin" size={18} />}
            <span>{connected ? "متصل" : "جاري الاتصال"}</span>
          </div>
          <h1>ادخل اللعب</h1>
          <p>اختار بطاقتك مرة واحدة، وبعدها افتح غرفة أو ادخل بكود.</p>
        </section>

        <section className="panel home-entry-card setup-entry-card">
          <div className="panel-heading">
            <Users size={20} />
            <h2>بطاقتك</h2>
          </div>

          <PlayerFields player={player} setPlayer={setPlayer} />

          <div className="home-action-grid">
            <button className="primary-button" type="button" onClick={createRoom} disabled={!connected || busy}>
              <Play size={18} />
              <span>إنشاء</span>
            </button>

            <form className="join-inline" onSubmit={joinRoom}>
              <label>
                كود الغرفة
                <input
                  className="room-code-input"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  maxLength={5}
                  dir="ltr"
                  placeholder="A7K2Q"
                />
              </label>
              <button className="secondary-button" type="submit" disabled={!connected || busy}>
                <ArrowLeft size={18} />
                <span>دخول</span>
              </button>
            </form>
          </div>
        </section>
        {error ? <div className="toast error">{error}</div> : null}
      </main>
    );
  }

  return (
    <main className="game-screen">
      <section className="room-header">
        <div>
          <div className="hero-kicker">
            <span className={`status-dot ${connected ? "online" : ""}`} />
            <span>{phaseLabels[room.phase]}</span>
          </div>
          <h1>غرفة <b dir="ltr">{room.code}</b></h1>
        </div>
        <div className="room-actions">
          {isHost && room.phase !== "lobby" ? (
            <button className="secondary-button" type="button" onClick={endGame} disabled={busy}>
              <Square size={16} />
              <span>إنهاء اللعبة</span>
            </button>
          ) : null}
          <button className="icon-text-button" type="button" onClick={copyCode}>
            <Clipboard size={17} />
            <span>نسخ الكود</span>
          </button>
        </div>
      </section>

      {error ? (
        <div className="toast error">
          <X size={16} />
          <span>{error}</span>
        </div>
      ) : null}

      {notice ? (
        <div className="toast success">
          <Check size={16} />
          <span>{notice}</span>
        </div>
      ) : null}

      <RoundSplash splash={roundSplash} gameModes={gameModes} />

      <section className="game-layout">
        <div className="play-zone">
          {["answering", "voting", "results"].includes(room.phase) ? (
            <RoundStrip room={room} gameModes={gameModes} />
          ) : null}

          {room.phase === "lobby" ? (
            <Lobby
              room={room}
              categories={categories}
              gameModes={gameModes}
              config={config}
              isHost={isHost}
              busy={busy}
              onUpdate={updateSettings}
              onAddBot={addBot}
              onStart={() => perform(() => ack(socket, "game:start"))}
            />
          ) : null}

          {room.phase === "answering" ? (
            <Answering
              room={room}
              me={me}
              answer={answer}
              setAnswer={setAnswer}
              onSubmit={submitAnswer}
              busy={busy}
            />
          ) : null}

          {room.phase === "voting" ? (
            <Voting
              room={room}
              me={me}
              selectedOption={selectedOption}
              onVote={vote}
              busy={busy}
            />
          ) : null}

          {room.phase === "results" ? (
            <Results
              room={room}
              isHost={isHost}
              busy={busy}
              onNext={() => perform(() => ack(socket, "round:next"))}
            />
          ) : null}

          {room.phase === "finished" ? (
            <Finished room={room} onHome={() => navigate("/")} />
          ) : null}
        </div>

        <aside className="side-zone">
          <Scoreboard players={room.players} compact />
          <PlayersPanel room={room} busy={busy} onKickVote={kickVote} />
          <Chat messages={room.messages} onSend={sendChat} />
        </aside>
      </section>
    </main>
  );
}

function RoundSplash({ splash, gameModes }) {
  if (!splash) {
    return null;
  }

  return (
    <div className="round-splash" aria-live="polite">
      <div className="round-splash-card">
        <span className="round-splash-kicker">الجولة الآن</span>
        <strong>{splash.round}</strong>
        <h2>{gameModeName(gameModes, splash.mode)}</h2>
        <span className="round-splash-meta">{splash.round}/{splash.rounds}</span>
      </div>
    </div>
  );
}

function RoundStrip({ room, gameModes }) {
  const mode = getActiveMode(room);
  const progress = Math.min(100, Math.max(0, (room.round / room.settings.rounds) * 100));

  return (
    <div className="round-strip">
      <div className="round-strip-main">
        <span className="round-number">{room.round}</span>
        <div>
          <span>الطور الحالي</span>
          <strong>{gameModeName(gameModes, mode)}</strong>
        </div>
      </div>
      <div className="round-progress">
        <i style={{ width: `${progress}%` }} />
      </div>
      <span className="counter-chip">الجولة {room.round}/{room.settings.rounds}</span>
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
        />
      </label>
    </div>
  );
}

function Lobby({ room, categories, gameModes, config, isHost, busy, onUpdate, onAddBot, onStart }) {
  const canStart = room.players.length >= config.minPlayers;
  const canAddBot = isHost && room.players.length < config.maxPlayers;
  const selectedModes = selectedModeIds(room.settings.modes ?? room.settings.mode);
  const limits = roundLimits(selectedModes.length);

  function updateModes(nextModes) {
    const modes = selectedModeIds(nextModes);
    const currentCycles = Math.max(1, Math.round(Number(room.settings.rounds) / Math.max(1, selectedModes.length)));
    onUpdate({
      modes,
      rounds: normalizeRoundCount(currentCycles * modes.length, modes.length)
    });
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
          {room.players.length}/{config.maxPlayers}
        </span>
      </div>

      {isHost ? (
        <div className="bot-controls">
          <button className="secondary-button" type="button" onClick={onAddBot} disabled={!canAddBot || busy}>
            <UserPlus size={18} />
            <span>إضافة لاعب آلي</span>
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
        <div className="settings-categories">
          <span className="field-label">طور اللعبة</span>
          <GameModePicker
            modes={gameModes}
            selected={selectedModes}
            onChange={updateModes}
            disabled={!isHost}
          />
        </div>
        {selectedModes.includes("kalak") ? <div className="settings-categories">
          <span className="field-label">أنواع الأسئلة</span>
          <CategoryPicker
            categories={categories}
            selected={room.settings.categories || []}
            onChange={(nextCategories) => onUpdate({ categories: nextCategories })}
            disabled={!isHost}
          />
        </div> : null}
        <div className="settings-grid">
          <label>
            الجولات
            <input
              type="number"
              min={limits.min}
              max={limits.max}
              step={limits.step}
              value={room.settings.rounds}
              disabled={!isHost}
              onChange={(event) => onUpdate({ rounds: normalizeRoundCount(event.target.value, selectedModes.length) })}
            />
          </label>
          <label>
            وقت الإجابة
            <input
              type="number"
              min="20"
              max="60"
              value={room.settings.answerSeconds}
              disabled={!isHost}
              onChange={(event) => onUpdate({ answerSeconds: event.target.value })}
            />
          </label>
          <label>
            وقت التصويت
            <input
              type="number"
              min="15"
              max="45"
              value={room.settings.voteSeconds}
              disabled={!isHost}
              onChange={(event) => onUpdate({ voteSeconds: event.target.value })}
            />
          </label>
        </div>
      </div>

      {isHost ? (
        <button className="primary-button wide-button" type="button" onClick={onStart} disabled={!canStart || busy}>
          <Play size={18} />
          <span>{canStart ? "بدء اللعبة" : `تحتاج ${config.minPlayers} لاعبين`}</span>
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

function Answering({ room, me, answer, setAnswer, onSubmit, busy }) {
  const submitted = Boolean(me?.submitted);
  const activeMode = getActiveMode(room);
  const isImposterMode = activeMode === "imposter";
  const knowsCorrect = activeMode === "kalak" && room.me?.knowsCorrect && !submitted;
  const canSubmit = me?.canSubmit !== false;
  const placeholder = knowsCorrect
    ? "اكتب إجابة غلط مقنعة عشان تخدع اللاعبين"
    : activeMode === "judge_pick"
    ? "اكتب إجابة تقنع الحكم"
    : isImposterMode ? "اكتب وصفًا من كلمة واحدة" : "اكتب إجابة صحيحة أو خدعة مقنعة";

  return (
    <section className="panel stage-panel question-stage">
      <div className="stage-heading">
        <div>
          <span className="eyebrow">{room.question.category} · الجولة {room.round}/{room.settings.rounds}</span>
          <h2>{room.question.prompt}</h2>
        </div>
        <Timer
          className="answer-timer"
          deadline={room.phaseEndsAt}
          durationSeconds={room.settings.answerSeconds}
          label="وقت الإجابة"
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
            autoFocus
          />
          <button className="primary-button" type="submit" disabled={busy || !answer.trim()}>
            <Send size={18} />
            <span>إرسال</span>
          </button>
        </form>
      )}

      <ProgressStrip players={room.players} kind="submitted" answering />
    </section>
  );
}

function Voting({ room, me, selectedOption, onVote, busy }) {
  return (
    <section className="panel stage-panel">
      <div className="stage-heading">
        <div>
          <span className="eyebrow">{room.question.category} · الجولة {room.round}/{room.settings.rounds}</span>
          <h2>{room.question.prompt}</h2>
        </div>
        <Timer
          className="answer-timer"
          deadline={room.phaseEndsAt}
          durationSeconds={room.settings.voteSeconds}
          label="وقت التصويت"
        />
      </div>

      <div className="options-grid">
        {room.options.map((option, index) => (
          <button
            className={`answer-option ${selectedOption === option.id ? "selected" : ""}`}
            key={option.id}
            type="button"
            disabled={busy || me?.voted || option.isOwn || me?.canVote === false}
            onClick={() => onVote(option.id)}
          >
            <span className="option-index">{index + 1}</span>
            <span className="option-body">
              <strong>{option.text}</strong>
              {option.clue ? <small>الوصف: {option.clue}</small> : null}
            </span>
            {option.isOwn ? <span className="mini-chip">إجابتك</span> : null}
          </button>
        ))}
      </div>

      <ProgressStrip players={room.players} kind="voted" voting />
    </section>
  );
}

function revealLabel(room, option = {}) {
  const mode = getActiveMode(room);

  if (mode === "imposter") {
    return "الدخيل";
  }

  if (mode === "spot_ai") {
    return "إجابة الذكاء الاصطناعي";
  }

  if (mode === "fake_fact") {
    return "الخيار الصحيح";
  }

  if (mode === "last_survivor") {
    return "ناجٍ";
  }

  if (mode === "judge_pick") {
    return option.source === "game" ? "اختيار اللعبة - الحكم +200" : "اختيار الحكم";
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

  if (mode === "spot_ai") {
    return option.ownerNames.length ? `كتبها: ${option.ownerNames.join("، ")}` : "بدون صاحب";
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

function Results({ room, isHost, busy, onNext }) {
  const isFinal = room.results?.isFinal || room.round >= room.settings.rounds;

  return (
    <section className="panel stage-panel results-stage">
      <div className="stage-heading">
        <div>
          <span className="eyebrow">كشف الجولة</span>
          <h2>{room.question.prompt}</h2>
        </div>
        <span className="correct-chip">
          <Check size={17} />
          {room.results.correctAnswer}
        </span>
      </div>

      {room.results.summary ? <p className="result-summary">{room.results.summary}</p> : null}

      <div className="reveal-list">
        {room.results.revealedOptions.map((option) => (
          <div className={`reveal-row ${option.isCorrect ? "correct" : ""}`} key={option.id}>
            <div>
              <strong>{option.text}</strong>
              <span>
                {option.isCorrect
                  ? revealLabel(room, option)
                  : revealOwnerLabel(room, option)}
              </span>
            </div>
            <div className="voter-stack">
              {option.voterNames.length ? option.voterNames.map((name) => (
                <span key={name}>{name}</span>
              )) : <span>لا أصوات</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="awards-grid">
        {room.results.awards.map((award) => (
          <div className="award-card" key={award.playerId}>
            <strong>{award.name}</strong>
            <span>+{award.total}</span>
            <small>
              صحيح {award.correctVote} · خداع {award.fakeVotes} · إجابة صحيحة {award.correctSubmission}
            </small>
          </div>
        ))}
      </div>

      {isHost ? (
        <button className="primary-button wide-button" type="button" onClick={onNext} disabled={busy}>
          <Sparkles size={18} />
          <span>{isFinal ? "إنهاء المباراة" : "الجولة التالية"}</span>
        </button>
      ) : null}
    </section>
  );
}

function Finished({ room, onHome }) {
  const winner = room.players[0];

  return (
    <section className="panel stage-panel final-stage">
      <div className="winner-block">
        <Crown size={42} />
        <span>الفائز</span>
        <h2>{winner?.name}</h2>
        <strong>{winner?.score || 0} نقطة</strong>
      </div>
      <Scoreboard players={room.players} />
      <button className="secondary-button wide-button" type="button" onClick={onHome}>
        <ArrowLeft size={18} />
        <span>العودة</span>
      </button>
    </section>
  );
}

function ProgressStrip({ players, kind, voting = false, answering = false }) {
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

  return (
    <div className="progress-strip">
      <span>{done}/{activePlayers.length}</span>
      <div className="progress-track">
        <i style={{ width: `${activePlayers.length ? (done / activePlayers.length) * 100 : 0}%` }} />
      </div>
      <div className="mini-player-list">
        {activePlayers.map((player) => (
          <span className={player[kind] ? "ready" : ""} key={player.id}>{player.name}</span>
        ))}
      </div>
    </div>
  );
}

function PlayersPanel({ room, busy, onKickVote }) {
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
                  disabled={busy}
                  onClick={() => onKickVote(player.id)}
                >
                  <UserMinus size={14} />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

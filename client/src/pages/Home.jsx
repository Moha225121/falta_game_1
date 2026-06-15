import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, LogIn, Users } from "lucide-react";
import { api } from "../lib/api.js";
import { cleanRoomSessionOnEntry, clearRoomSessionCache } from "../lib/roomSession.js";
import { getLocalItem, readJsonLocalItem, setLocalItem } from "../lib/storage.js";
import { AvatarPicker } from "../components/Avatar.jsx";

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

function savedPlayer() {
  return {
    name: getLocalItem("kalak:name") || "",
    avatar: readJsonLocalItem("kalak:avatar", defaultAvatar) || defaultAvatar
  };
}

function normalizeRoomCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
}

export default function Home() {
  const navigate = useNavigate();
  const [config, setConfig] = useState({ minPlayers: 3, maxPlayers: 6 });
  const [{ name, avatar }, setPlayer] = useState(savedPlayer);
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    cleanRoomSessionOnEntry();
    api("/config").then(setConfig).catch(() => {});
  }, []);

  function persistPlayer(next = { name, avatar }) {
    const cleanName = next.name.trim() || `لاعب ${Math.floor(1000 + Math.random() * 9000)}`;
    setLocalItem("kalak:name", cleanName);
    setLocalItem("kalak:avatar", JSON.stringify(next.avatar));
    return { ...next, name: cleanName };
  }

  function createRoom(event) {
    event?.preventDefault();
    clearRoomSessionCache();
    const player = persistPlayer();
    navigate("/play", {
      state: {
        mode: "create",
        name: player.name,
        avatar: player.avatar
      }
    });
  }

  function joinRoom(event) {
    event.preventDefault();
    const code = normalizeRoomCode(joinCode);
    if (!code) {
      return;
    }
    clearRoomSessionCache();
    const player = persistPlayer();
    navigate(`/play/${code}`, {
      state: {
        mode: "join",
        name: player.name,
        avatar: player.avatar
      }
    });
  }

  return (
    <main className="hero-screen">
      <section className="hero-copy">
        <div className="hero-kicker">
          <Users size={18} />
          <span>{config.minPlayers}-{config.maxPlayers} لاعبين</span>
        </div>
        <h1>فلتة</h1>
        <p>خمن، اخدع، واكشف الصح قبل أصحابك.</p>
      </section>

      <section className="panel home-entry-card">
        <div className="panel-heading">
          <Users size={20} />
          <h2>بطاقتك</h2>
        </div>

        <div className="identity-composer">
          <AvatarPicker
            avatar={avatar}
            onChange={(nextAvatar) => setPlayer((current) => ({ ...current, avatar: nextAvatar }))}
          />
          <label>
            الاسم
            <input
              value={name}
              onChange={(event) => setPlayer((current) => ({ ...current, name: event.target.value }))}
              maxLength={28}
              placeholder="اسم اللاعب"
            />
          </label>
        </div>

        <div className="home-action-grid">
          <button className="primary-button" type="button" onClick={createRoom}>
            <Gamepad2 size={18} />
            <span>إنشاء غرفة</span>
          </button>

          <form className="join-inline" onSubmit={joinRoom}>
            <label>
              كود الغرفة
              <input
                className="room-code-input"
                value={joinCode}
                onChange={(event) => setJoinCode(normalizeRoomCode(event.target.value))}
                maxLength={5}
                dir="ltr"
                placeholder="اكتب كود الغرفة"
              />
            </label>
            <button className="secondary-button" type="submit">
              <LogIn size={18} />
              <span>دخول الغرفة</span>
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

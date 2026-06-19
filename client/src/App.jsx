import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Menu, Share2 } from "lucide-react";
import Home from "./pages/Home.jsx";
import Game from "./pages/Game.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin-panel");
  const isRoomRoute = /^\/play\/[^/]+/.test(location.pathname);
  const [activeRoom, setActiveRoom] = useState({ active: false, code: "", phase: "", mode: "" });
  const showRoomMenu = isRoomRoute && activeRoom.active;
  const showRoomShare = showRoomMenu && (activeRoom.phase === "lobby" || activeRoom.mode === "science_day");

  useEffect(() => {
    function updateRoomMenu(event) {
      const detail = event.detail || {};
      setActiveRoom({
        active: Boolean(detail.active),
        code: detail.code || "",
        phase: detail.phase || "",
        mode: detail.mode || ""
      });
    }

    window.addEventListener("kalak:room-active", updateRoomMenu);
    return () => window.removeEventListener("kalak:room-active", updateRoomMenu);
  }, []);

  useEffect(() => {
    if (!isRoomRoute) {
      setActiveRoom({ active: false, code: "", phase: "", mode: "" });
    }
  }, [isRoomRoute]);

  function openRoomMenu() {
    window.dispatchEvent(new CustomEvent("kalak:open-room-menu"));
  }

  function shareRoomLink() {
    window.dispatchEvent(new CustomEvent("kalak:share-room"));
  }

  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/admin-panel" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <div className={`app-shell ${showRoomMenu ? "room-route-shell" : ""}`}>
      <header className="topbar">
        <div className="brand" aria-label="فلتة">
          <img className="brand-logo" src="/assets/falta-logo.png" alt="فلتة" />
        </div>
        {showRoomMenu ? (
          <div className="topbar-room-controls">
            {showRoomShare ? (
              <button className="topbar-room-share" type="button" onClick={shareRoomLink} aria-label={`مشاركة رابط الغرفة ${activeRoom.code}`}>
                <Share2 size={18} />
                <span>كود {activeRoom.code}</span>
              </button>
            ) : null}
            <button className="topbar-room-menu" type="button" onClick={openRoomMenu} aria-label="فتح قائمة الغرفة">
              <Menu size={18} />
              <span>القائمة</span>
            </button>
          </div>
        ) : null}
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<Game />} />
        <Route path="/play/:roomCode" element={<Game />} />
        <Route path="/admin" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

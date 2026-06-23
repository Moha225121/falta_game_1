import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import Game from "./pages/Game.jsx";

const Admin = lazy(() => import("./pages/Admin.jsx"));

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin-panel");
  const isRoomRoute = /^\/play\/[^/]+/.test(location.pathname);
  const [activeRoom, setActiveRoom] = useState({ active: false, code: "", phase: "", mode: "", waitingOnly: false });
  const showRoomMenu = isRoomRoute && activeRoom.active && !activeRoom.waitingOnly;
  const scienceDayRoom = activeRoom.mode === "science_day";

  useEffect(() => {
    function updateRoomMenu(event) {
      const detail = event.detail || {};
      setActiveRoom({
        active: Boolean(detail.active),
        code: detail.code || "",
        phase: detail.phase || "",
        mode: detail.mode || "",
        waitingOnly: Boolean(detail.waitingOnly)
      });
    }

    window.addEventListener("kalak:room-active", updateRoomMenu);
    return () => window.removeEventListener("kalak:room-active", updateRoomMenu);
  }, []);

  useEffect(() => {
    if (!isRoomRoute) {
      setActiveRoom({ active: false, code: "", phase: "", mode: "", waitingOnly: false });
    }
  }, [isRoomRoute]);

  function openRoomMenu() {
    window.dispatchEvent(new CustomEvent("kalak:open-room-menu"));
  }

  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/admin-panel" element={<Suspense fallback={null}><Admin /></Suspense>} />
        <Route path="*" element={<Navigate to="/play" replace />} />
      </Routes>
    );
  }

  return (
    <div className={`app-shell ${showRoomMenu ? "room-route-shell" : ""} ${scienceDayRoom ? "science-day-shell" : ""}`}>
      <header className="topbar">
        <div className="brand" aria-label={scienceDayRoom ? "الجامعة الليبية الدولية" : "فلتة"}>
          <img
            className="brand-logo"
            src={scienceDayRoom ? "/assets/limu-logo.png" : "/assets/falta-logo.png"}
            alt={scienceDayRoom ? "الجامعة الليبية الدولية" : "فلتة"}
          />
        </div>
        {showRoomMenu ? (
          <div className="topbar-room-controls">
            <button className="topbar-room-menu" type="button" onClick={openRoomMenu} aria-label="فتح قائمة الغرفة">
              <Menu size={18} />
              <span>القائمة</span>
            </button>
          </div>
        ) : null}
      </header>
      <Routes>
        <Route path="/" element={<Navigate to="/play" replace />} />
        <Route path="/play" element={<Game />} />
        <Route path="/play/:roomCode" element={<Game />} />
        <Route path="/admin" element={<Navigate to="/play" replace />} />
        <Route path="*" element={<Navigate to="/play" replace />} />
      </Routes>
    </div>
  );
}

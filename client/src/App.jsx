import { useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Gamepad2, Menu } from "lucide-react";
import Home from "./pages/Home.jsx";
import Game from "./pages/Game.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin-panel");
  const isRoomRoute = /^\/play\/[^/]+/.test(location.pathname);
  const [hasActiveRoom, setHasActiveRoom] = useState(false);
  const showRoomMenu = isRoomRoute && hasActiveRoom;

  useEffect(() => {
    function updateRoomMenu(event) {
      setHasActiveRoom(Boolean(event.detail?.active));
    }

    window.addEventListener("kalak:room-active", updateRoomMenu);
    return () => window.removeEventListener("kalak:room-active", updateRoomMenu);
  }, []);

  useEffect(() => {
    if (!isRoomRoute) {
      setHasActiveRoom(false);
    }
  }, [isRoomRoute]);

  function openRoomMenu() {
    window.dispatchEvent(new CustomEvent("kalak:open-room-menu"));
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
          <span>فلتة</span>
        </div>
        <nav>
          <NavLink to="/play">
            <Gamepad2 size={17} />
            <span>اللعب</span>
          </NavLink>
        </nav>
        {showRoomMenu ? (
          <button className="topbar-room-menu" type="button" onClick={openRoomMenu} aria-label="فتح قائمة الغرفة">
            <Menu size={18} />
            <span>القائمة</span>
          </button>
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

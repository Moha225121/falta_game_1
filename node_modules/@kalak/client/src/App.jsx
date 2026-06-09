import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Gamepad2, Sparkles } from "lucide-react";
import Home from "./pages/Home.jsx";
import Game from "./pages/Game.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin-panel");

  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/admin-panel" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="فلتة">
          <span className="brand-mark">
            <Sparkles size={20} />
          </span>
          <span>فلتة</span>
        </div>
        <nav>
          <NavLink to="/play">
            <Gamepad2 size={17} />
            <span>اللعب</span>
          </NavLink>
        </nav>
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

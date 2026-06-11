import { Trophy } from "lucide-react";
import { Avatar } from "./Avatar.jsx";

export function Scoreboard({ players = [], compact = false }) {
  return (
    <section className={`scoreboard ${compact ? "compact" : ""}`}>
      <div className="section-title">
        <Trophy size={18} />
        <h2>الترتيب</h2>
      </div>
      <div className="score-list">
        {players.map((player, index) => (
          <div className="score-row" key={player.id}>
            <span className="rank">{index + 1}</span>
            <Avatar avatar={player.avatar} name={player.name} />
            <span className="score-name">{player.name}</span>
            {player.isHost ? <span className="mini-chip">المضيف</span> : null}
            <strong>{player.score}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

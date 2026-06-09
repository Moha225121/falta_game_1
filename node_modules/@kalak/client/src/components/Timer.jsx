import { Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function remainingMs(deadline) {
  if (!deadline) {
    return 0;
  }
  return Math.max(0, Number(deadline) - Date.now());
}

function format(ms) {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function Timer({ deadline, durationSeconds, label = "", className = "" }) {
  const [remaining, setRemaining] = useState(() => remainingMs(deadline));

  useEffect(() => {
    setRemaining(remainingMs(deadline));
    const interval = setInterval(() => setRemaining(remainingMs(deadline)), 250);
    return () => clearInterval(interval);
  }, [deadline]);

  const progress = useMemo(() => {
    if (!deadline || !durationSeconds) {
      return 0;
    }
    return Math.max(0, Math.min(1, remaining / (durationSeconds * 1000)));
  }, [deadline, durationSeconds, remaining]);

  return (
    <div
      className={`timer ${className} ${progress <= 0.25 ? "urgent" : ""}`.trim()}
      style={{ "--progress": `${progress * 360}deg` }}
      aria-label={label ? `${label} ${format(remaining)}` : format(remaining)}
    >
      <span className="timer-ring">
        <Clock3 size={18} />
      </span>
      <span className="timer-copy">
        {label ? <small>{label}</small> : null}
        <strong>{format(remaining)}</strong>
      </span>
    </div>
  );
}

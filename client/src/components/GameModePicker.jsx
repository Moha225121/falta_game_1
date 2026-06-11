import { Check, Gamepad2 } from "lucide-react";

export function GameModePicker({ modes = [], selected = ["kalak"], onChange, disabled = false }) {
  const selectedModes = Array.isArray(selected) ? selected : [selected].filter(Boolean);

  function toggleMode(modeId) {
    if (disabled) {
      return;
    }

    const active = selectedModes.includes(modeId);
    const nextModes = active
      ? selectedModes.filter((id) => id !== modeId)
      : [...selectedModes, modeId];

    onChange(nextModes.length ? nextModes : [modeId]);
  }

  return (
    <div className="mode-picker">
      {modes.map((mode) => {
        const active = selectedModes.includes(mode.id);
        return (
          <button
            className={`mode-card ${active ? "active" : ""}`}
            type="button"
            key={mode.id}
            onClick={() => toggleMode(mode.id)}
            disabled={disabled}
          >
            <span className="mode-icon"><Gamepad2 size={18} /></span>
            <span>
              <strong>{mode.name}</strong>
              <small>{mode.description}</small>
              {mode.points ? <em>{mode.points}</em> : null}
            </span>
            <span className="mode-check">{active ? <Check size={17} /> : null}</span>
          </button>
        );
      })}
    </div>
  );
}

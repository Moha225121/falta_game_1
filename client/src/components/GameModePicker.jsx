import { Check } from "lucide-react";

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
      {modes.map((mode, index) => {
        const active = selectedModes.includes(mode.id);
        return (
          <button
            className={`mode-card mode-card-${mode.id} ${active ? "active" : ""}`}
            type="button"
            key={mode.id}
            onClick={() => toggleMode(mode.id)}
            disabled={disabled}
          >
            <span className="mode-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="mode-copy">
              <span className="mode-title-line">
                <strong>{mode.name}</strong>
                {active ? <span className="mode-selected-label">محدد</span> : null}
              </span>
              <small>{mode.description}</small>
              {mode.points ? <span className="mode-points">{mode.points}</span> : null}
            </span>
            <span className="mode-check">{active ? <Check size={17} /> : null}</span>
          </button>
        );
      })}
    </div>
  );
}

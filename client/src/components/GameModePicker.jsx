import { useState } from "react";
import { Check, Info } from "lucide-react";

export function GameModePicker({ modes = [], selected = ["kalak"], onChange, disabled = false }) {
  const selectedModes = Array.isArray(selected) ? selected : [selected].filter(Boolean);
  const [openInfo, setOpenInfo] = useState("");

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
        const infoOpen = openInfo === mode.id;
        return (
          <div
            className={`mode-card mode-card-${mode.id} ${active ? "active" : ""} ${disabled ? "disabled" : ""} ${infoOpen ? "info-open" : ""}`}
            key={mode.id}
          >
            <button
              className="mode-select-button"
              type="button"
              onClick={() => toggleMode(mode.id)}
              disabled={disabled}
            >
              <strong>{mode.name}</strong>
              <span className="mode-check">{active ? <Check size={17} /> : null}</span>
            </button>
            <button
              className="mode-info-button"
              type="button"
              aria-label={`معلومات عن ${mode.name}`}
              aria-expanded={infoOpen}
              onClick={() => setOpenInfo((current) => current === mode.id ? "" : mode.id)}
            >
              <Info size={16} />
            </button>
            {infoOpen ? (
              <div className="mode-info-panel">
                <p>{mode.description}</p>
                {mode.points ? <span>{mode.points}</span> : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

import { useState } from "react";
import { Check, Flag, Info } from "lucide-react";

export function GameModePicker({ modes = [], selected = ["kalak"], onChange, disabled = false }) {
  const selectedModes = Array.isArray(selected) ? selected : [selected].filter(Boolean);
  const orderedModes = [...modes].sort((first, second) => {
    if (first.id === "prizes") {
      return -1;
    }
    if (second.id === "prizes") {
      return 1;
    }
    return 0;
  });
  const [openInfoId, setOpenInfoId] = useState("");

  function toggleInfo(modeId, event) {
    event.preventDefault();
    event.stopPropagation();
    setOpenInfoId((current) => current === modeId ? "" : modeId);
  }

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
      {orderedModes.map((mode) => {
        const active = selectedModes.includes(mode.id);
        const infoOpen = openInfoId === mode.id;
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
              <span className="mode-title-stack">
                <strong>{mode.name}</strong>
                {mode.id === "prizes" ? (
                  <span className="mode-event-flag">
                    <Flag size={13} />
                    خاص
                  </span>
                ) : null}
              </span>
              <span className="mode-check">{active ? <Check size={17} /> : null}</span>
            </button>
            <button
              className="mode-info-button"
              type="button"
              aria-label={`معلومات عن ${mode.name}`}
              aria-expanded={infoOpen}
              aria-controls={infoOpen ? `mode-info-${mode.id}` : undefined}
              onClick={(event) => toggleInfo(mode.id, event)}
            >
              <Info size={16} />
            </button>
            {infoOpen ? (
              <div className="mode-info-inline" id={`mode-info-${mode.id}`}>
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

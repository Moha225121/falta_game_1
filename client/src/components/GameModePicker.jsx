import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, Info } from "lucide-react";

export function GameModePicker({ modes = [], selected = ["kalak"], onChange, disabled = false }) {
  const selectedModes = Array.isArray(selected) ? selected : [selected].filter(Boolean);
  const [openInfo, setOpenInfo] = useState({ modeId: "", style: null, placement: "bottom" });
  const openMode = modes.find((mode) => mode.id === openInfo.modeId);

  function closeInfo() {
    setOpenInfo({ modeId: "", style: null, placement: "bottom" });
  }

  function popoverPosition(button) {
    if (typeof window === "undefined") {
      return { style: null, placement: "bottom" };
    }

    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 360;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 640;
    const edge = 16;
    const gap = 12;
    const width = Math.min(320, Math.max(240, viewportWidth - edge * 2));
    const anchorCenter = rect.left + rect.width / 2;
    const left = Math.min(
      Math.max(anchorCenter, edge + width / 2),
      viewportWidth - edge - width / 2
    );
    const tailLeft = Math.min(
      Math.max(anchorCenter - (left - width / 2), 18),
      width - 18
    );
    const estimatedHeight = 172;
    const showAbove = rect.bottom + gap + estimatedHeight > viewportHeight - edge
      && rect.top > estimatedHeight + edge;
    const top = showAbove ? rect.top - gap : rect.bottom + gap;

    return {
      placement: showAbove ? "top" : "bottom",
      style: {
        "--popover-top": `${top}px`,
        "--popover-left": `${left}px`,
        "--popover-width": `${width}px`,
        "--popover-tail-left": `${tailLeft}px`,
        "--popover-y": showAbove ? "-100%" : "0px"
      }
    };
  }

  function toggleInfo(modeId, event) {
    event.stopPropagation();
    setOpenInfo((current) => {
      if (current.modeId === modeId) {
        return { modeId: "", style: null, placement: "bottom" };
      }

      return {
        modeId,
        ...popoverPosition(event.currentTarget)
      };
    });
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
    <>
      <div className="mode-picker">
        {modes.map((mode) => {
          const active = selectedModes.includes(mode.id);
          const infoOpen = openInfo.modeId === mode.id;
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
                aria-controls={infoOpen ? `mode-info-${mode.id}` : undefined}
                onClick={(event) => toggleInfo(mode.id, event)}
              >
                <Info size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {openMode && typeof document !== "undefined" ? createPortal(
        <div className="mode-info-cloud-layer" role="presentation" onClick={closeInfo}>
          <div
            className="mode-info-popover"
            id={`mode-info-${openInfo.modeId}`}
            role="dialog"
            aria-modal="false"
            aria-label={`معلومات عن ${openMode.name}`}
            data-placement={openInfo.placement}
            style={openInfo.style || undefined}
            onClick={(event) => event.stopPropagation()}
          >
            <strong>{openMode.name}</strong>
            <p>{openMode.description}</p>
            {openMode.points ? <span>{openMode.points}</span> : null}
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}

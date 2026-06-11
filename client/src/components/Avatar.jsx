import { useState } from "react";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";

const skinOptions = ["#c9865a", "#a96f45", "#8d5338", "#e0ad7f", "#6a3d2f"];
const hairColorOptions = ["#15120f", "#4a2d20", "#d6a94d", "#2457c5", "#df3e8f"];
const outfitOptions = ["#12d6c5", "#ff3f98", "#f6b84a", "#62df6c", "#8c6cff", "#ff5d69"];
const hairStyles = ["short", "wave", "curls", "fade", "cap"];
const eyeStyles = ["focused", "happy", "sharp", "bright"];
const mouthStyles = ["smile", "grin", "smirk", "calm"];
const accessoryOptions = ["none", "glasses", "headset", "visor"];

export const avatarPresets = [
  { id: "a1", skin: "#c9865a", hair: "#15120f", outfit: "#12d6c5", hairStyle: "short", eyes: "focused", mouth: "smile", accessory: "headset" },
  { id: "a2", skin: "#a96f45", hair: "#2457c5", outfit: "#ff3f98", hairStyle: "fade", eyes: "sharp", mouth: "smirk", accessory: "visor" },
  { id: "a3", skin: "#e0ad7f", hair: "#4a2d20", outfit: "#f6b84a", hairStyle: "wave", eyes: "happy", mouth: "grin", accessory: "none" },
  { id: "a4", skin: "#8d5338", hair: "#df3e8f", outfit: "#8c6cff", hairStyle: "curls", eyes: "bright", mouth: "smirk", accessory: "glasses" },
  { id: "a5", skin: "#6a3d2f", hair: "#d6a94d", outfit: "#62df6c", hairStyle: "cap", eyes: "focused", mouth: "smile", accessory: "headset" },
  { id: "a6", skin: "#c9865a", hair: "#4a2d20", outfit: "#ff5d69", hairStyle: "wave", eyes: "sharp", mouth: "calm", accessory: "glasses" },
  { id: "a7", skin: "#a96f45", hair: "#15120f", outfit: "#8c6cff", hairStyle: "curls", eyes: "happy", mouth: "smile", accessory: "none" },
  { id: "a8", skin: "#e0ad7f", hair: "#df3e8f", outfit: "#12d6c5", hairStyle: "cap", eyes: "bright", mouth: "grin", accessory: "visor" },
  { id: "a9", skin: "#8d5338", hair: "#2457c5", outfit: "#f6b84a", hairStyle: "fade", eyes: "focused", mouth: "calm", accessory: "glasses" },
  { id: "a10", skin: "#c9865a", hair: "#d6a94d", outfit: "#62df6c", hairStyle: "short", eyes: "sharp", mouth: "smirk", accessory: "none" },
  { id: "a11", skin: "#6a3d2f", hair: "#4a2d20", outfit: "#ff3f98", hairStyle: "wave", eyes: "bright", mouth: "smile", accessory: "visor" },
  { id: "a12", skin: "#a96f45", hair: "#d6a94d", outfit: "#ff5d69", hairStyle: "cap", eyes: "happy", mouth: "calm", accessory: "headset" }
];

const defaultAvatar = avatarPresets[0];

function hasValue(options, value) {
  return options.includes(value);
}

function normalizeAvatar(avatar = {}) {
  return {
    persona: avatar.persona || avatar.id || "a1",
    skin: hasValue(skinOptions, avatar.skin) ? avatar.skin : defaultAvatar.skin,
    hair: hasValue(hairColorOptions, avatar.hair) ? avatar.hair : defaultAvatar.hair,
    outfit: hasValue(outfitOptions, avatar.outfit || avatar.color) ? (avatar.outfit || avatar.color) : defaultAvatar.outfit,
    hairStyle: hasValue(hairStyles, avatar.hairStyle) ? avatar.hairStyle : defaultAvatar.hairStyle,
    eyes: hasValue(eyeStyles, avatar.eyes) ? avatar.eyes : defaultAvatar.eyes,
    mouth: hasValue(mouthStyles, avatar.mouth) ? avatar.mouth : defaultAvatar.mouth,
    accessory: hasValue(accessoryOptions, avatar.accessory) ? avatar.accessory : defaultAvatar.accessory
  };
}

function Hair({ style, hair, outfit }) {
  if (style === "wave") {
    return <path d="M24 45 C23 27 36 15 54 17 C70 19 79 31 77 45 C67 35 54 38 43 28 C39 36 31 37 24 45Z" fill={hair} />;
  }

  if (style === "curls") {
    return (
      <g fill={hair}>
        <circle cx="28" cy="38" r="9" />
        <circle cx="39" cy="28" r="10" />
        <circle cx="52" cy="25" r="11" />
        <circle cx="65" cy="31" r="10" />
        <circle cx="73" cy="42" r="8" />
        <path d="M25 43 C31 32 49 29 72 42 L73 52 C58 42 43 42 27 52Z" />
      </g>
    );
  }

  if (style === "fade") {
    return (
      <g fill={hair}>
        <path d="M27 41 C27 25 40 17 54 18 C68 20 76 31 75 43 C61 35 45 37 27 41Z" />
        <rect x="24" y="42" width="7" height="19" rx="4" />
        <rect x="69" y="42" width="7" height="19" rx="4" />
      </g>
    );
  }

  if (style === "cap") {
    return (
      <g>
        <path d="M25 42 C27 24 41 17 55 18 C69 20 77 30 76 43 C58 38 42 38 25 42Z" fill={hair} />
        <path d="M23 37 C30 21 69 18 78 38 C64 33 39 33 23 37Z" fill={outfit} />
        <path d="M49 36 C62 36 73 39 84 45 C73 47 61 44 50 39Z" fill="#071115" opacity="0.34" />
      </g>
    );
  }

  return <path d="M25 43 C25 27 37 18 52 18 C68 18 77 31 76 45 C63 39 48 39 35 31 C32 36 28 39 25 43Z" fill={hair} />;
}

function Eyes({ style }) {
  if (style === "happy") {
    return (
      <g stroke="#17110f" strokeLinecap="round" strokeWidth="3" fill="none">
        <path d="M36 52 Q40 48 44 52" />
        <path d="M56 52 Q60 48 64 52" />
      </g>
    );
  }

  if (style === "sharp") {
    return (
      <g>
        <path d="M33 46 L45 48" stroke="#17110f" strokeLinecap="round" strokeWidth="3" />
        <path d="M67 46 L55 48" stroke="#17110f" strokeLinecap="round" strokeWidth="3" />
        <ellipse cx="40" cy="53" rx="4" ry="5" fill="#17110f" />
        <ellipse cx="60" cy="53" rx="4" ry="5" fill="#17110f" />
      </g>
    );
  }

  if (style === "bright") {
    return (
      <g>
        <circle cx="40" cy="53" r="5" fill="#17110f" />
        <circle cx="60" cy="53" r="5" fill="#17110f" />
        <circle cx="38" cy="51" r="1.5" fill="#fff7df" />
        <circle cx="58" cy="51" r="1.5" fill="#fff7df" />
      </g>
    );
  }

  return (
    <g>
      <ellipse cx="40" cy="53" rx="4" ry="5" fill="#17110f" />
      <ellipse cx="60" cy="53" rx="4" ry="5" fill="#17110f" />
      <path d="M35 45 Q40 43 45 45" stroke="#17110f" strokeLinecap="round" strokeWidth="2.5" fill="none" />
      <path d="M55 45 Q60 43 65 45" stroke="#17110f" strokeLinecap="round" strokeWidth="2.5" fill="none" />
    </g>
  );
}

function Mouth({ style }) {
  if (style === "grin") {
    return (
      <g>
        <rect x="40" y="66" width="20" height="8" rx="4" fill="#f7f3e7" />
        <path d="M40 66 Q50 78 60 66" stroke="#17110f" strokeLinecap="round" strokeWidth="2.5" fill="none" />
      </g>
    );
  }

  if (style === "smirk") {
    return <path d="M41 68 Q50 73 60 66" stroke="#17110f" strokeLinecap="round" strokeWidth="3" fill="none" />;
  }

  if (style === "calm") {
    return <path d="M43 69 L57 69" stroke="#17110f" strokeLinecap="round" strokeWidth="3" />;
  }

  return <path d="M40 67 Q50 75 60 67" stroke="#17110f" strokeLinecap="round" strokeWidth="3" fill="none" />;
}

function Accessory({ style, outfit }) {
  if (style === "glasses") {
    return (
      <g stroke="#071115" strokeWidth="2.4" fill="rgba(255,255,255,0.14)">
        <rect x="31" y="48" width="16" height="11" rx="5" />
        <rect x="53" y="48" width="16" height="11" rx="5" />
        <path d="M47 53 H53" />
      </g>
    );
  }

  if (style === "headset") {
    return (
      <g fill="none" stroke="#071115" strokeLinecap="round" strokeWidth="3">
        <path d="M23 55 C22 36 33 24 50 24 C67 24 78 36 77 55" />
        <rect x="18" y="51" width="9" height="17" rx="4" fill={outfit} stroke="none" />
        <rect x="73" y="51" width="9" height="17" rx="4" fill={outfit} stroke="none" />
        <path d="M73 66 C69 73 62 76 55 75" />
      </g>
    );
  }

  if (style === "visor") {
    return (
      <g>
        <path d="M31 49 H69 Q72 49 72 53 V57 Q72 60 69 60 H31 Q28 60 28 57 V53 Q28 49 31 49Z" fill="#071115" />
        <path d="M33 52 H67" stroke={outfit} strokeLinecap="round" strokeWidth="3" />
      </g>
    );
  }

  return null;
}

export function Avatar({ avatar, size = "md" }) {
  const current = normalizeAvatar(avatar);

  return (
    <span
      className={`avatar avatar-${size}`}
      style={{ "--avatar-color": current.outfit, "--avatar-accent": current.hair }}
    >
      <svg className="avatar-face" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="49" fill="#071115" opacity="0.58" />
        <circle cx="50" cy="50" r="45" fill={current.outfit} opacity="0.22" />
        <path d="M27 95 C29 80 38 72 50 72 C62 72 71 80 73 95Z" fill={current.outfit} />
        <rect x="42" y="66" width="16" height="17" rx="7" fill={current.skin} />
        <circle cx="25" cy="54" r="7" fill={current.skin} />
        <circle cx="75" cy="54" r="7" fill={current.skin} />
        <ellipse cx="50" cy="50" rx="28" ry="33" fill={current.skin} />
        <circle cx="38" cy="61" r="4" fill="#ff9f98" opacity="0.25" />
        <circle cx="62" cy="61" r="4" fill="#ff9f98" opacity="0.25" />
        <Hair style={current.hairStyle} hair={current.hair} outfit={current.outfit} />
        <Eyes style={current.eyes} />
        <Mouth style={current.mouth} />
        <Accessory style={current.accessory} outfit={current.outfit} />
      </svg>
    </span>
  );
}

function SwatchButton({ value, active, onClick }) {
  return (
    <button
      className={`swatch ${active ? "active" : ""}`}
      style={{ "--swatch": value }}
      type="button"
      aria-label="لون الأفاتار"
      onClick={onClick}
    />
  );
}

function PreviewButton({ active, avatar, onClick }) {
  return (
    <button className={`avatar-choice ${active ? "active" : ""}`} type="button" aria-label="شكل الأفاتار" onClick={onClick}>
      <Avatar avatar={avatar} size="sm" />
    </button>
  );
}

function samePreset(preset, avatar) {
  return ["skin", "hair", "outfit", "hairStyle", "eyes", "mouth", "accessory"]
    .every((key) => preset[key] === avatar[key]);
}

function currentPresetIndex(avatar) {
  const index = avatarPresets.findIndex((preset) => preset.id === avatar.persona || samePreset(preset, avatar));
  return index >= 0 ? index : 0;
}

export function AvatarPicker({ avatar, onChange }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const current = normalizeAvatar(avatar);
  const presetIndex = currentPresetIndex(current);

  function selectPreset(index) {
    const preset = avatarPresets[(index + avatarPresets.length) % avatarPresets.length];
    onChange({ ...preset, persona: preset.id });
  }

  return (
    <div className={`avatar-picker ${advancedOpen ? "advanced-open" : ""}`}>
      <div className="avatar-carousel" aria-label="اختيار الأفاتار">
        <button
          className="avatar-nav"
          type="button"
          aria-label="الأفاتار السابق"
          title="السابق"
          onClick={() => selectPreset(presetIndex - 1)}
        >
          <ChevronRight size={22} />
        </button>

        <div className="avatar-preview-board">
          <Avatar avatar={current} size="xl" />
          <div className="avatar-dots" aria-label="أشكال الأفاتار">
            {avatarPresets.map((preset, index) => (
              <button
                className={index === presetIndex ? "active" : ""}
                key={preset.id}
                type="button"
                aria-label={`أفاتار ${index + 1}`}
                onClick={() => selectPreset(index)}
              />
            ))}
          </div>
        </div>

        <button
          className="avatar-nav"
          type="button"
          aria-label="الأفاتار التالي"
          title="التالي"
          onClick={() => selectPreset(presetIndex + 1)}
        >
          <ChevronLeft size={22} />
        </button>
      </div>

      <button
        className="avatar-tune-button"
        type="button"
        aria-label="تخصيص الأفاتار"
        title="تخصيص"
        aria-pressed={advancedOpen}
        onClick={() => setAdvancedOpen((open) => !open)}
      >
        <SlidersHorizontal size={18} />
      </button>

      {advancedOpen ? <div className="avatar-tools" aria-label="تخصيص الأفاتار">
        <div className="swatches">
          {skinOptions.map((skin) => (
            <SwatchButton
              key={skin}
              value={skin}
              active={current.skin === skin}
              onClick={() => onChange({ ...current, persona: "custom", skin })}
            />
          ))}
        </div>

        <div className="avatar-choice-grid">
          {hairStyles.map((hairStyle) => (
            <PreviewButton
              key={hairStyle}
              avatar={{ ...current, hairStyle }}
              active={current.hairStyle === hairStyle}
              onClick={() => onChange({ ...current, persona: "custom", hairStyle })}
            />
          ))}
        </div>

        <div className="swatches">
          {hairColorOptions.map((hair) => (
            <SwatchButton
              key={hair}
              value={hair}
              active={current.hair === hair}
              onClick={() => onChange({ ...current, persona: "custom", hair })}
            />
          ))}
        </div>

        <div className="avatar-choice-grid">
          {eyeStyles.map((eyes) => (
            <PreviewButton
              key={eyes}
              avatar={{ ...current, eyes }}
              active={current.eyes === eyes}
              onClick={() => onChange({ ...current, persona: "custom", eyes })}
            />
          ))}
        </div>

        <div className="avatar-choice-grid">
          {mouthStyles.map((mouth) => (
            <PreviewButton
              key={mouth}
              avatar={{ ...current, mouth }}
              active={current.mouth === mouth}
              onClick={() => onChange({ ...current, persona: "custom", mouth })}
            />
          ))}
        </div>

        <div className="avatar-choice-grid">
          {accessoryOptions.map((accessory) => (
            <PreviewButton
              key={accessory}
              avatar={{ ...current, accessory }}
              active={current.accessory === accessory}
              onClick={() => onChange({ ...current, persona: "custom", accessory })}
            />
          ))}
        </div>

        <div className="swatches">
          {outfitOptions.map((outfit) => (
            <SwatchButton
              key={outfit}
              value={outfit}
              active={current.outfit === outfit}
              onClick={() => onChange({ ...current, persona: "custom", outfit })}
            />
          ))}
        </div>
      </div> : null}
    </div>
  );
}

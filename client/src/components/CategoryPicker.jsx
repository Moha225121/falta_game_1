import { Check, Layers3 } from "lucide-react";

export function CategoryPicker({ categories = [], selected = [], onChange, disabled = false }) {
  const selectedSet = new Set(selected);
  const allActive = selected.length === 0;

  function toggle(category) {
    if (disabled) {
      return;
    }

    if (category === "all") {
      onChange([]);
      return;
    }

    const next = selectedSet.has(category)
      ? selected.filter((item) => item !== category)
      : [...selected, category];

    onChange(next);
  }

  return (
    <div className="category-picker">
      <button
        className={`category-card ${allActive ? "active" : ""}`}
        type="button"
        onClick={() => toggle("all")}
        disabled={disabled}
      >
        <span className="category-icon"><Layers3 size={18} /></span>
        <strong>كل الأنواع</strong>
        <span className="category-check">{allActive ? <Check size={17} /> : null}</span>
      </button>

      {categories.map((category) => {
        const active = selectedSet.has(category);
        return (
          <button
            className={`category-card ${active ? "active" : ""}`}
            type="button"
            key={category}
            onClick={() => toggle(category)}
            disabled={disabled}
          >
            <span className="category-icon"><Layers3 size={18} /></span>
            <strong>{category}</strong>
            <span className="category-check">{active ? <Check size={17} /> : null}</span>
          </button>
        );
      })}
    </div>
  );
}

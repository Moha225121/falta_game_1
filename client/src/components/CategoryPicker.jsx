import { Check, Layers3 } from "lucide-react";

export function CategoryPicker({ categories = [], selected = [], onChange, disabled = false }) {
  const categoryList = [...new Set(categories.map((category) => String(category).trim()).filter(Boolean))];
  const selectedCategories = selected.filter((category) => categoryList.includes(category));
  const selectedSet = new Set(selectedCategories.length > 0 ? selectedCategories : categoryList);

  function toggle(category) {
    if (disabled) {
      return;
    }

    const nextSet = new Set(selectedSet);

    if (nextSet.has(category)) {
      if (nextSet.size === 1) {
        return;
      }
      nextSet.delete(category);
    } else {
      nextSet.add(category);
    }

    onChange(categoryList.filter((item) => nextSet.has(item)));
  }

  return (
    <div className="category-picker">
      {categoryList.map((category) => {
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

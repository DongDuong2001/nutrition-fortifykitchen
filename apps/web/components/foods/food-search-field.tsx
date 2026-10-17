import React from "react";

export interface FoodSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  /** Phone sheet: the field must not shrink inside a flex column. */
  className?: string;
}

/** The "Tìm món" search field shared by the add sheet and Khám phá. */
export function FoodSearchField({ value, onChange, inputRef, className = "" }: FoodSearchFieldProps) {
  return (
    <label
      data-tour="food-search"
      data-align-group="add-list"
      data-align-edge="left"
      className={`flex items-center gap-3 bg-page border border-card-border rounded-full px-4 min-h-[48px] focus-within:border-blue focus-within:ring-2 focus-within:ring-blue ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-secondary shrink-0" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <span className="sr-only">Tìm món</span>
      <input
        ref={inputRef}
        type="search"
        aria-label="Tìm món"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tìm món: cơm, trứng, chà là…"
        className="flex-1 bg-transparent border-0 outline-none focus-visible:outline-none text-text text-base min-h-[44px] [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
      />
      {value && (
        <button
          type="button"
          aria-label="Xóa tìm kiếm"
          onClick={() => onChange("")}
          className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-secondary hover:text-text cursor-pointer border-0 bg-transparent shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </label>
  );
}

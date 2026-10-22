import React from "react";

export interface FoodSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  /** Phone sheet: the field must not shrink inside a flex column. */
  className?: string;
  /** "sheet": the + sheet's V3 field (no border, a 2 px cobalt ring while focused, a filled-circle clear button). Default: the Khám phá field. */
  tone?: "default" | "sheet";
}

/** The "Tìm món" search field shared by the add sheet and Khám phá. */
export function FoodSearchField({ value, onChange, inputRef, className = "", tone = "default" }: FoodSearchFieldProps) {
  const sheet = tone === "sheet";
  return (
    <label
      data-tour="food-search"
      data-align-group="add-list"
      data-align-edge="left"
      className={`flex items-center bg-surface rounded-full min-h-12 ${
        sheet
          ? "gap-2 pl-4 pr-1 focus-within:shadow-[inset_0_0_0_2px_var(--color-cobalt)]"
          : "gap-3 px-4 border border-card-border focus-within:border-cobalt focus-within:ring-2 focus-within:ring-cobalt"
      } ${className}`}
    >
      <svg width={sheet ? 20 : 18} height={sheet ? 20 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sheet ? 1.8 : 2} strokeLinecap="round" className="text-secondary shrink-0" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <span className="sr-only">Tìm món</span>
      <input
        ref={inputRef}
        type="search"
        // cc-64 (N9): the keyboard's key says Tìm; no capitals, autocorrect or spell check on food names
        enterKeyHint="search"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Tìm món"
        data-testid="food-search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tìm món: cơm, trứng, chà là…"
        className="min-w-0 flex-1 bg-transparent border-0 outline-none focus-visible:outline-none text-text text-base min-h-11 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
      />
      {value && (
        <button
          type="button"
          aria-label="Xóa tìm kiếm"
          onClick={() => onChange("")}
          className={`w-11 h-11 rounded-full flex items-center justify-center text-secondary hover:text-text cursor-pointer border-0 bg-transparent shrink-0 ${sheet ? "" : "-mr-2"}`}
        >
          {sheet ? (
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="currentColor" />
              <path d="M9 9l6 6M15 9l-6 6" stroke="var(--color-surface)" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          )}
        </button>
      )}
    </label>
  );
}

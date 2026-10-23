import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";

export interface RadioOption<K extends string> {
  id: K;
  label: string;
}

/** One group of choices (V3Language): a white card, a Saira section header and 56 px radio rows with a cobalt check on the chosen one. */
export function RadioCard<K extends string>({
  titleId,
  title,
  options,
  value,
  onChange,
  alignGroup = "language-row",
}: {
  titleId: string;
  title: string;
  options: RadioOption<K>[];
  value: K;
  onChange: (id: K) => void;
  alignGroup?: string;
}) {
  return (
    <Card as="section" padding={false} className="px-4 pt-3 pb-0">
      <SectionTitle id={titleId} className="mb-2">
        {title}
      </SectionTitle>
      <div role="radiogroup" aria-labelledby={titleId}>
        {options.map((r) => {
          const isSelected = value === r.id;
          return (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-align-group={alignGroup}
              onClick={() => onChange(r.id)}
              className="m-tint flex min-h-14 w-full cursor-pointer items-center gap-3 border-0 border-t border-divider bg-transparent py-2 text-left text-body-lg font-semibold text-text first:border-t-0"
            >
              <span className="flex-1">{r.label}</span>
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center">
                {isSelected && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-cobalt">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

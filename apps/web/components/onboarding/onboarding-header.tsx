import Link from "next/link";

/** Slanted step bars (Cobalt Sign motif). Done steps are cobalt, the rest use the empty tone. */
export function StepBars({ current, total, tone }: { current: number; total: number; tone: "dark" | "light" }) {
  const empty = tone === "dark" ? "bg-level-empty-dark" : "bg-level-empty";
  return (
    <div
      aria-hidden="true"
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1 rounded-[1px] ${i < current ? "bg-blue" : empty}`}
          style={{ transform: "skewX(-14deg)" }}
        />
      ))}
    </div>
  );
}

export interface OnboardingHeaderProps {
  backHref: string;
  stepText: string;
  progress: { current: number; total: number };
  title: string;
  subtitle?: string;
}

/**
 * Local sub-screen header for setup steps (Cobalt Sign). 44 px back button, step
 * progress bars and the Saira title. No bottom nav. Swap for the shared AppHeader in ui-04b.
 */
export function OnboardingHeader({ backHref, stepText, progress, title, subtitle }: OnboardingHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-b-[20px] bg-ink px-5 pt-4 pb-6 text-white">
      <div className="flex min-h-[44px] items-center justify-between">
        <Link
          href={backHref}
          aria-label="Quay lại"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-white no-underline"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <span className="text-[13px] text-muted-on-dark">{stepText}</span>
      </div>

      <StepBars current={progress.current} total={progress.total} tone="dark" />

      <h1 className="m-0 font-display text-[28px] font-black italic uppercase leading-tight">{title}</h1>
      {subtitle && <p className="m-0 text-sm leading-relaxed text-muted-subtitle">{subtitle}</p>}
    </header>
  );
}

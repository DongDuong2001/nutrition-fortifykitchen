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

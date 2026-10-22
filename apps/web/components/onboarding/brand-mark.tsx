/**
 * The H1T MICRO wordmark of the auth screens (V3 SignIn: 20 px, MICRO in cobalt). `onInkFromLg`: the desktop split screens put
 * it on the ink panel from 1024 px, where it turns white and sky.
 */
export function BrandMark({ className = "", onInkFromLg = false }: { className?: string; onInkFromLg?: boolean }) {
  return (
    <div
      role="img"
      aria-label="H1T MICRO"
      className={`font-display text-xl font-black italic uppercase leading-none tracking-display text-text ${onInkFromLg ? "lg:text-on-dark" : ""} ${className}`}
    >
      H1T <span className={onInkFromLg ? "text-cobalt lg:text-sky" : "text-cobalt"}>MICRO</span>
    </div>
  );
}

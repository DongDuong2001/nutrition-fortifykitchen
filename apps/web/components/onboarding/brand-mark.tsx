/** Small H1T MICRO wordmark used on the auth screens (Cobalt Sign). */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="H1T MICRO"
      className={`font-display italic font-black text-headline leading-none uppercase tracking-tight text-on-dark ${className}`}
    >
      H1T <span className="text-sky">MICRO</span>
    </div>
  );
}

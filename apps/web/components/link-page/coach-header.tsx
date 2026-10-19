import type { ReactNode } from "react";
import { COACH, COACH_SOCIAL } from "@/lib/coach-links";

type SocialId = (typeof COACH_SOCIAL)[number]["id"];

const ICONS: Record<SocialId, ReactNode> = {
  facebook: (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M13.5 8H15V5.5h-1.8C11.4 5.5 10.5 6.7 10.5 8.4V10H9v2.4h1.5V19h3v-6.6h1.8l.3-2.4h-2.1V8.6c0-.4.2-.6.6-.6" />
    </svg>
  ),
  youtube: (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="12" rx="4" />
      <path d="M10.5 9.5v5l4-2.5z" />
    </svg>
  ),
  tiktok: (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 4c.5 2.6 2.3 4.2 5 4.5" />
    </svg>
  ),
};

const AVATAR_CLASS = "h-14 w-14 flex-none rounded-full lg:h-16 lg:w-16";

/** The coach: photo (initials until one arrives), name, the three social links and the tagline. */
export function CoachHeader() {
  return (
    <header className="flex flex-col items-center gap-[10px] text-center lg:gap-3">
      <div className="flex flex-col items-center gap-3 lg:gap-[14px]">
        {COACH.photo ? (
          <img src={COACH.photo} alt={`Ảnh đại diện ${COACH.name}`} width={64} height={64} className={`${AVATAR_CLASS} object-cover`} />
        ) : (
          <div
            role="img"
            aria-label={`Ảnh đại diện ${COACH.name}`}
            className={`${AVATAR_CLASS} flex items-center justify-center bg-ink font-display text-[1.25rem] font-extrabold italic text-sky lg:text-[1.5rem]`}
          >
            {COACH.initials}
          </div>
        )}
        <h1 className="m-0 font-display text-display-sm font-extrabold italic uppercase leading-[0.95] text-ink lg:text-[2.5rem]">{COACH.name}</h1>
      </div>
      <div className="flex items-center justify-center gap-[2px] lg:gap-1">
        {COACH_SOCIAL.map((s) => (
          <a key={s.id} href={s.href} aria-label={s.label} className="flex h-11 w-11 items-center justify-center text-secondary">
            {ICONS[s.id]}
          </a>
        ))}
      </div>
      <p className="m-0 text-sm font-bold text-secondary-strong lg:text-callout">{COACH.tagline}</p>
    </header>
  );
}

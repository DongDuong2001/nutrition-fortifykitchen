import React from "react";

export type StatusTone = "cobalt" | "amber";

const TONE_CLASS: Record<StatusTone, string> = {
  cobalt: "bg-cobalt/12 text-cobalt",
  amber: "bg-amber/12 text-amber",
};

/** The 72 px tinted circle with a 36 px line glyph (V3-SPEC §3.6). Decorative: the title says what the screen is. */
export function StatusMark({ tone, children, className = "" }: { tone: StatusTone; children: React.ReactNode; className?: string }) {
  return (
    <div aria-hidden="true" className={`flex h-[72px] w-[72px] flex-none items-center justify-center rounded-full ${TONE_CLASS[tone]} ${className}`}>
      {children}
    </div>
  );
}

/** A 36 px stroke glyph in the circle (currentColor, 1.8 px line). */
export function StatusGlyph({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

/** The 34 px Saira title of a status screen. */
export const STATUS_TITLE_CLASS = "m-0 text-balance font-display text-display font-black italic uppercase leading-[1.1] tracking-display text-text";

export interface StatusScreenProps {
  /** `form`: the content is one form inside the main (the expired link asks for the email). */
  as?: "main" | "form";
  formProps?: React.FormHTMLAttributes<HTMLFormElement>;
  /** The glyph inside the circle (a `StatusGlyph`), or none. */
  icon?: React.ReactNode;
  tone?: StatusTone;
  /** One line above the title ("Hồ sơ đã lưu"). */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  /** Under the title, secondary text. */
  body?: React.ReactNode;
  /** Between the header and the actions. */
  children?: React.ReactNode;
  /** The buttons at the bottom. */
  actions?: React.ReactNode;
}

/**
 * Status screens (V3-SPEC §3.6: check email, expired, offline): on the grey page, no ink, centred content: the 72 px tinted
 * circle, the 34 px title, the body, then the buttons at the bottom (`mt-auto`). From 1024 px it is a centred 420 px column.
 */
export function StatusScreen({ as = "main", formProps, icon, tone = "cobalt", eyebrow, title, body, children, actions }: StatusScreenProps) {
  const content = (
    <>
      <header className="flex flex-none flex-col items-center gap-4 text-center">
        {icon && <StatusMark tone={tone}>{icon}</StatusMark>}
        <div className="flex flex-col items-center gap-2">
          {eyebrow && <p className="m-0 text-callout font-semibold text-secondary">{eyebrow}</p>}
          <h1 className={STATUS_TITLE_CLASS}>{title}</h1>
          {body && <div className="m-0 text-callout leading-normal text-secondary">{body}</div>}
        </div>
      </header>
      {children}
      {actions && <div className="mt-auto flex flex-col gap-3 pt-6 lg:mt-8">{actions}</div>}
    </>
  );
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col bg-page px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))] text-text lg:max-w-[420px] lg:justify-center lg:py-12">
      {as === "form" ? (
        <form noValidate {...formProps} className="flex flex-1 flex-col lg:flex-none">
          {content}
        </form>
      ) : (
        content
      )}
    </main>
  );
}

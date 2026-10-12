import React from "react";

export interface AuthShellProps {
  /** Ink block at the top: brand, headline and any icon. */
  hero: React.ReactNode;
  children: React.ReactNode;
  /** Desktop only (≥1024 px): ink panel on the left, form on the right. */
  split?: boolean;
}

/**
 * Onboarding and auth frame (Cobalt Sign). Ink hero block with the header radius,
 * then the paper body with the actions. No bottom nav.
 */
export function AuthShell({ hero, children, split = false }: AuthShellProps) {
  return (
    <div className={`flex min-h-dvh flex-col ${split ? "lg:flex-row" : ""}`}>
      <section
        className={`bg-ink text-on-dark rounded-b-[20px] px-6 pt-11 pb-6 ${
          split ? "lg:flex-1 lg:rounded-none lg:px-8 lg:py-8 lg:flex lg:flex-col lg:justify-center" : ""
        }`}
      >
        <div className={split ? "flex flex-col gap-8" : "mx-auto flex w-full max-w-[420px] flex-col gap-6"}>
          {hero}
        </div>
      </section>

      <div className={`flex flex-1 flex-col px-6 py-6 ${split ? "lg:justify-center lg:px-8 lg:py-8" : ""}`}>
        <div className="mx-auto flex w-full max-w-[420px] flex-col gap-3">{children}</div>
      </div>
    </div>
  );
}

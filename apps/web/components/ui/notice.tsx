import React from "react";
import Link from "next/link";
import { IconButton } from "@/components/ui/icon-button";

export interface NoticeAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface NoticeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** info: a white card with an edge (a one-time message); promo: a card with a cobalt bar (a tip) */
  tone?: "info" | "promo";
  children: React.ReactNode;
  /** One link or button under the text (info only) */
  action?: NoticeAction;
  /** A 44 px ✕ that dismisses it (info only) */
  onClose?: () => void;
  closeLabel?: string;
}

const ACTION =
  "inline-flex min-h-11 items-center rounded-full border-0 bg-transparent px-1 text-cap font-bold text-cobalt no-underline cursor-pointer";

/**
 * The one notice card (cc-66 D7). info is the Hôm nay Level card's shape: 13 px text, an optional action under it and an
 * optional ✕. promo is the training tip: the card surface with a 4 px cobalt bar on the left. Spacing outside it
 * (margins, flex-none) comes from className.
 */
export function Notice({ tone = "info", children, action, onClose, closeLabel = "Đóng thông báo", className = "", ...props }: NoticeProps) {
  if (tone === "promo") {
    return (
      <div className={`bg-card rounded-card border border-transparent shadow-ring lg:shadow-card flex items-start gap-3 text-text ${className}`} {...props}>
        <span className="w-1 self-stretch rounded-full bg-cobalt shrink-0" aria-hidden="true" />
        <div>{children}</div>
      </div>
    );
  }
  return (
    <div className={`flex items-start gap-1 rounded-xl border border-card-border bg-card py-1 pl-3 pr-1 ${className}`} {...props}>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-0">
        <p className="m-0 py-2 text-cap leading-snug text-text">{children}</p>
        {action &&
          (action.href ? (
            <Link href={action.href} className={ACTION}>
              {action.label}
            </Link>
          ) : (
            <button type="button" onClick={action.onClick} className={ACTION}>
              {action.label}
            </button>
          ))}
      </div>
      {onClose && (
        <IconButton label={closeLabel} onClick={onClose} className="text-secondary hover:bg-surface">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </IconButton>
      )}
    </div>
  );
}

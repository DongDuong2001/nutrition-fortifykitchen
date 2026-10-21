import React from "react";
import Link from "next/link";

export type PillButtonVariant = "primary" | "secondary" | "destructive" | "tertiary" | "danger";
/** lg: the 52 px full-width call to action; md and sm: 44 px pills in a row or a card (md 14 px text, sm 13 px). */
export type PillButtonSize = "lg" | "md" | "sm";

export interface PillButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PillButtonVariant;
  size?: PillButtonSize;
  href?: string;
  /** With href: the link replaces the current history entry (a link inside a sheet, lib/sheet-history). */
  replace?: boolean;
  /** Defaults to true for lg, false for md and sm. */
  fullWidth?: boolean;
  children: React.ReactNode;
}

/**
 * H1T MICRO Pill Button (Cobalt Sign).
 * The lg primary pill's pressed state uses the skewX(-14deg) motif while keeping the text unslanted; md and sm press
 * with the plain 0.97 scale. tertiary is the grey pill (surface fill, no edge, semibold) for a quiet action such as Bỏ lọc.
 */
const SIZE_CLASSES: Record<PillButtonSize, string> = {
  lg: "h-[52px] px-6 text-base",
  md: "min-h-11 px-5 text-sm",
  sm: "min-h-11 px-4 text-cap",
};

export function PillButton({
  variant = "primary",
  size = "lg",
  href,
  replace,
  fullWidth = size === "lg",
  className = "",
  disabled,
  children,
  ...props
}: PillButtonProps) {
  const baseClasses = `group inline-flex items-center justify-center rounded-full ${SIZE_CLASSES[size]} active:scale-[0.97] transition-press disabled:opacity-50 disabled:pointer-events-none select-none box-border no-underline cursor-pointer motion-reduce:active:transform-none motion-reduce:active:scale-100`;

  // The skew motif belongs to the big call to action only
  const isPrimary = variant === "primary" && size === "lg";

  const variantClasses = {
    primary: `font-bold bg-cobalt text-on-accent hover:bg-cobalt/90 border-0 shadow-sm ${isPrimary ? "active:-skew-x-[14deg]" : ""}`,
    secondary:
      "font-bold bg-card text-text border border-card-border hover:bg-surface",
    destructive: "font-bold bg-destructive text-on-accent hover:bg-destructive/90 border-0 shadow-sm",
    tertiary: "font-semibold bg-surface text-text border-0",
    // A bordered pill whose action loses something (Bỏ món này): the secondary shape with destructive text
    danger: "font-bold bg-card text-destructive-text border border-card-border hover:bg-surface",
  }[variant];

  const widthClass = fullWidth ? "w-full" : "w-auto";

  // gap-[inherit]: a gap set on the button (icon + label) reaches the label row inside the skew span
  const content = isPrimary ? (
    <span className="inline-flex items-center justify-center gap-[inherit] group-active:skew-x-[14deg] motion-reduce:group-active:transform-none">
      {children}
    </span>
  ) : (
    children
  );

  if (href && !disabled) {
    return (
      <Link
        href={href}
        replace={replace}
        className={`${baseClasses} ${variantClasses} ${widthClass} ${className}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${widthClass} ${className}`}
      {...props}
    >
      {content}
    </button>
  );
}

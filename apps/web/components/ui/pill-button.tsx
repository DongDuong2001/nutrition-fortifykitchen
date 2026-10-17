import React from "react";
import Link from "next/link";

export type PillButtonVariant = "primary" | "secondary" | "destructive";

export interface PillButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PillButtonVariant;
  href?: string;
  fullWidth?: boolean;
  children: React.ReactNode;
}

/**
 * H1T MICRO Pill Button (Cobalt Sign).
 * Primary pill pressed state uses skewX(-14deg) motif while keeping text unslanted.
 */
export function PillButton({
  variant = "primary",
  href,
  fullWidth = true,
  className = "",
  disabled,
  children,
  ...props
}: PillButtonProps) {
  const baseClasses =
    "group inline-flex items-center justify-center rounded-full h-[52px] px-6 text-base font-bold transition-transform duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none box-border no-underline cursor-pointer motion-reduce:active:transform-none";

  const isPrimary = variant === "primary";

  const variantClasses = {
    primary:
      "bg-blue text-on-accent hover:bg-blue/90 border-0 shadow-sm active:-skew-x-[14deg]",
    secondary:
      "bg-card text-text border border-card-border hover:bg-surface",
    destructive: "bg-red text-on-accent hover:bg-red/90 border-0 shadow-sm",
  }[variant];

  const widthClass = fullWidth ? "w-full" : "w-auto";

  const content = isPrimary ? (
    <span className="inline-flex items-center justify-center group-active:skew-x-[14deg] motion-reduce:group-active:transform-none">
      {children}
    </span>
  ) : (
    children
  );

  if (href && !disabled) {
    return (
      <Link
        href={href}
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

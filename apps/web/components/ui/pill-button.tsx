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
    "inline-flex items-center justify-center rounded-full h-[52px] px-6 text-base font-bold transition-transform duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none box-border no-underline cursor-pointer";

  const variantClasses = {
    primary: "bg-blue text-white hover:bg-blue/90 border-0 shadow-sm",
    secondary:
      "bg-white text-text border border-black/12 hover:bg-black/[0.02]",
    destructive: "bg-red text-white hover:bg-red/90 border-0 shadow-sm",
  }[variant];

  const widthClass = fullWidth ? "w-full" : "w-auto";

  if (href && !disabled) {
    return (
      <Link
        href={href}
        className={`${baseClasses} ${variantClasses} ${widthClass} ${className}`}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

import React from "react";
import Link from "next/link";

export interface RowProps {
  /** A 22 px icon before the label (stroke 1,8, currentColor) */
  icon?: React.ReactNode;
  label: React.ReactNode;
  value?: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  showChevron?: boolean;
  withBorderTop?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function Row({
  icon,
  label,
  value,
  hint,
  href,
  onClick,
  showChevron = true,
  withBorderTop = true,
  className = "",
  children,
}: RowProps) {
  const content = (
    <>
      {icon && (
        <span aria-hidden="true" className="mr-2 inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center text-secondary">
          {icon}
        </span>
      )}
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <span className="text-callout text-text font-normal truncate">{label}</span>
        {hint && <span className="text-cap text-secondary leading-tight">{hint}</span>}
      </div>

      {value && (
        <span className="font-semibold text-text text-callout tabular-nums shrink-0">
          {value}
        </span>
      )}

      {children}

      {showChevron && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-secondary shrink-0"
          aria-hidden="true"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      )}
    </>
  );

  const containerClasses = `flex items-center gap-2 min-h-12 py-1.5 text-text no-underline select-none transition-colors ${
    withBorderTop ? "border-t border-divider" : ""
  } ${className}`;

  if (href) {
    return (
      <Link href={href} className={`${containerClasses} active:scale-[0.99] transition-press`}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left bg-transparent border-0 cursor-pointer ${containerClasses} m-tint`}
      >
        {content}
      </button>
    );
  }

  return <div className={containerClasses}>{content}</div>;
}

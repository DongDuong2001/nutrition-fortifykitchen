import React from "react";
import Link from "next/link";

export interface RowProps {
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
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <span className="text-[15px] text-text font-normal truncate">{label}</span>
        {hint && <span className="text-[13px] text-secondary leading-tight">{hint}</span>}
      </div>

      {value && (
        <span className="font-semibold text-text text-[15px] tabular-nums shrink-0">
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
          stroke="#5B6170"
          strokeWidth="2"
          strokeLinecap="round"
          className="shrink-0"
          aria-hidden="true"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      )}
    </>
  );

  const containerClasses = `flex items-center gap-2 min-h-[44px] py-1.5 text-text no-underline select-none transition-colors ${
    withBorderTop ? "border-t border-divider" : ""
  } ${className}`;

  if (href) {
    return (
      <Link href={href} className={`${containerClasses} active:scale-[0.99]`}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left bg-transparent border-0 cursor-pointer ${containerClasses} active:scale-[0.99]`}
      >
        {content}
      </button>
    );
  }

  return <div className={containerClasses}>{content}</div>;
}

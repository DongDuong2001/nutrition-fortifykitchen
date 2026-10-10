import React from "react";
import Link from "next/link";

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  backHref?: string;
  onBack?: () => void;
  backLabel?: string;
  dateText?: string;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  stepText?: string;
  stepProgress?: { current: number; total: number };
  children?: React.ReactNode;
  className?: string;
}

export function Header({
  title,
  subtitle,
  showLogo = false,
  backHref,
  onBack,
  backLabel = "Quay lại",
  dateText,
  onPrevDate,
  onNextDate,
  stepText,
  stepProgress,
  children,
  className = "",
}: HeaderProps) {
  return (
    <header
      className={`bg-ink text-white rounded-b-[20px] p-4 pb-5 flex flex-col gap-2.5 w-full max-w-[390px] mx-auto select-none ${className}`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between min-h-[44px]">
        {backHref || onBack ? (
          backHref ? (
            <Link
              href={backHref}
              aria-label={backLabel}
              className="w-11 h-11 -ml-3 rounded-lg text-white flex items-center justify-center no-underline hover:text-sky transition-colors active:scale-[0.97]"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </Link>
          ) : (
            <button
              type="button"
              onClick={onBack}
              aria-label={backLabel}
              className="w-11 h-11 -ml-3 rounded-lg bg-transparent border-0 text-white flex items-center justify-center cursor-pointer hover:text-sky transition-colors active:scale-[0.97]"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
          )
        ) : showLogo ? (
          <div className="font-saira italic font-black text-xl uppercase tracking-tight">
            H1T <span className="text-sky">MICRO</span>
          </div>
        ) : (
          <div />
        )}

        {/* Date switcher */}
        {dateText && (
          <div className="flex items-center">
            <button
              type="button"
              onClick={onPrevDate}
              aria-label="Ngày trước"
              className="w-11 h-11 rounded-lg bg-transparent border-0 text-white flex items-center justify-center cursor-pointer hover:text-sky transition-colors active:scale-[0.97]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <div className="text-sm font-semibold px-1">{dateText}</div>
            <button
              type="button"
              onClick={onNextDate}
              aria-label="Ngày sau"
              className="w-11 h-11 rounded-lg bg-transparent border-0 text-white flex items-center justify-center cursor-pointer hover:text-sky transition-colors active:scale-[0.97]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Step indicator */}
        {stepText && <div className="text-[13px] text-[#A3A8B5]">{stepText}</div>}
      </div>

      {/* Step progress bar if provided */}
      {stepProgress && (
        <div
          aria-hidden="true"
          className="grid gap-1 my-1"
          style={{ gridTemplateColumns: `repeat(${stepProgress.total}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: stepProgress.total }).map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-[2px] ${
                i < stepProgress.current ? "bg-blue" : "bg-neutral-800"
              }`}
            />
          ))}
        </div>
      )}

      {/* Title */}
      {title && (
        <h1 className="m-0 font-saira italic font-extrabold text-[28px] uppercase tracking-tight text-white leading-tight">
          {title}
        </h1>
      )}

      {/* Subtitle */}
      {subtitle && (
        <p className="m-0 text-sm text-[#C9CDD6] leading-relaxed">{subtitle}</p>
      )}

      {/* Custom Header Children (e.g. calorie ring, macros) */}
      {children}
    </header>
  );
}

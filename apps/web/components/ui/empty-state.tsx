import React from "react";

/**
 * The one empty state (cc-66 D7): a bold 16 px title, a 14 px secondary line, then any actions, centred in a column.
 * gap 2 (8 px) by default; 3 (12 px) when it holds a full-width action.
 */
export function EmptyState({
  icon,
  title,
  children,
  actions,
  gap = 2,
  className = "",
}: {
  /** A glyph above the title (decorative) */
  icon?: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  gap?: 2 | 3;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center text-center py-6 ${gap === 3 ? "gap-3" : "gap-2"} ${className}`}>
      {icon}
      <div className="text-base font-bold">{title}</div>
      {children && <div className="text-sm text-secondary">{children}</div>}
      {actions}
    </div>
  );
}

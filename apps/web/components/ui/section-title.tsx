import React from "react";

const SIZES = {
  /** 16 px: a section inside a screen (the default) */
  md: "text-base",
  /** 17 px: the title of a sheet or a card that stands alone */
  lg: "text-body-lg",
  /** 13 px: a small group label inside a card */
  sm: "text-cap",
} as const;

/** The one section title: bold Manrope, sentence case (design/UI-RULES.md). Never all caps. */
export function SectionTitle({
  as: Tag = "h2",
  size = "md",
  children,
  className = "",
  ...props
}: { as?: "h2" | "h3" | "p"; size?: keyof typeof SIZES; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`m-0 ${SIZES[size]} font-bold leading-snug text-text ${className}`} {...props}>
      {children}
    </Tag>
  );
}

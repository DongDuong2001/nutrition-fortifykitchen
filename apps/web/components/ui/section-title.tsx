import React from "react";

const SIZES = {
  /** V3 section header (V3-SPEC §2, §3.5): Saira italic 800, 17 px, uppercase, one per group of rows */
  md: "font-display italic font-extrabold text-body-lg uppercase tracking-[0.01em] leading-tight",
  /** Same as md (the title of a sheet or a card that stands alone took 17 px before V3) */
  lg: "font-display italic font-extrabold text-body-lg uppercase tracking-[0.01em] leading-tight",
  /** 13 px: a small group label inside a card (Manrope bold, sentence case) */
  sm: "text-cap font-bold leading-snug",
} as const;

/** The one section title. md and lg are the V3 section header; sm is a small label inside a card. */
export function SectionTitle({
  as: Tag = "h2",
  size = "md",
  children,
  className = "",
  ...props
}: { as?: "h2" | "h3" | "p"; size?: keyof typeof SIZES; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`m-0 ${SIZES[size]} text-text ${className}`} {...props}>
      {children}
    </Tag>
  );
}

/** V3 name for the section header (SectionTitle md): Saira italic 17 px uppercase. */
export function SectionHeader(props: Omit<React.ComponentProps<typeof SectionTitle>, "size">) {
  return <SectionTitle {...props} size="md" />;
}

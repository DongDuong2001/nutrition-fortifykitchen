import React from "react";

/** The one section title: 16 px bold Manrope, sentence case (design/UI-RULES.md). Never all caps. */
export function SectionTitle({
  as: Tag = "h2",
  children,
  className = "",
  ...props
}: { as?: "h2" | "h3" | "p"; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`m-0 text-base font-bold leading-snug text-text ${className}`} {...props}>
      {children}
    </Tag>
  );
}

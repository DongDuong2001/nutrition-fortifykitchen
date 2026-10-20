import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  as?: "div" | "section" | "article" | "li";
  /** false: no inner padding, for a card whose rows reach its edges (a list, a scroller tile) */
  padding?: boolean;
}

/**
 * H1T MICRO Card (Cobalt Sign).
 * White surface with a semi-transparent ink ring (shadow-ring) on the white page; a soft shadow from 1024 px.
 */
export function Card({
  as = "div",
  padding = true,
  className = "",
  children,
  ...props
}: CardProps) {
  const Component = as as React.ElementType;
  return (
    <Component
      className={`bg-card rounded-card border border-transparent shadow-ring ${padding ? "p-4" : ""} text-text lg:shadow-card ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

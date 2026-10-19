import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  as?: "div" | "section" | "article";
}

/**
 * H1T MICRO Card (Cobalt Sign).
 * White surface with a 1px border-card-border on the white page; a soft shadow from 1024 px.
 */
export function Card({
  as: Component = "div",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <Component
      className={`bg-card border border-card-border rounded-card p-4 text-text lg:shadow-card ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

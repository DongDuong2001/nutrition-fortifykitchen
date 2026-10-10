import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  as?: "div" | "section" | "article";
}

/**
 * H1T MICRO Card (Cobalt Sign).
 * White surface with 1px #E0DACF border on paper background.
 */
export function Card({
  as: Component = "div",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <Component
      className={`bg-card border border-card-border rounded-[18px] p-4 text-text ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

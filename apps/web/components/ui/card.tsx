import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  as?: "div" | "section" | "article";
}

export function Card({
  as: Component = "div",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <Component
      className={`bg-card border border-black/[0.08] rounded-[18px] p-4 text-text ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

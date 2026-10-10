import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "emerald" | "amber" | "rose" | "slate";
}

export function Badge({ children, variant = "slate" }: BadgeProps) {
  const styles = {
    emerald: "bg-[#10B981] text-black border-black",
    amber: "bg-[#F59E0B] text-black border-black",
    rose: "bg-[#F43F5E] text-white border-black",
    slate: "bg-[#0B0F17] text-[#F8FAFC] border-black",
  }[variant];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-[4px] text-[11px] font-black uppercase tracking-wider border-2 shadow-[2px_2px_0px_0px_#000] ${styles}`}
    >
      {children}
    </span>
  );
}

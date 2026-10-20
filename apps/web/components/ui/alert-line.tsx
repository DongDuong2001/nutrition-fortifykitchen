"use client";

import React, { useRef } from "react";
import { Expand } from "@/components/ui/expand";

// The parent column's gap, taken back while the line is closed and given again inside it, so nothing jumps
const GAP = { 0: ["", ""], 2: ["-mt-2", "pt-2"], 3: ["-mt-3", "pt-3"], 4: ["-mt-4", "pt-4"], 6: ["-mt-6", "pt-6"] } as const;

/**
 * cc-64 (A4): an error or warning line that opens and closes with Expand (200 in / 150 out, opacity under reduced
 * motion) instead of pushing the form in one frame. The role=alert element is inside, so it is announced when it
 * opens; while it closes it keeps the text it last had. `gap` is the flex gap of the column it sits in.
 */
export function AlertLine({
  show,
  gap = 0,
  id,
  className,
  as: Tag = "p",
  children,
}: {
  show: boolean;
  gap?: keyof typeof GAP;
  id?: string;
  className?: string;
  as?: "p" | "span" | "div";
  children: React.ReactNode;
}) {
  const last = useRef<React.ReactNode>(null);
  if (show) last.current = children;
  const [pull, push] = GAP[gap];
  return (
    <Expand open={show} wrapClassName={pull} className={push}>
      <Tag id={id} role="alert" className={className}>
        {show ? children : last.current}
      </Tag>
    </Expand>
  );
}

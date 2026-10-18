"use client";

import React from "react";
import { Presence, usePresence } from "@/components/ui/presence";

/**
 * cc-55: the content of an expanding row (accordion). It opens with the shared .m-expand motion (grid rows 0fr → 1fr
 * and a fade) and closes the same way before it unmounts. Put .m-chevron on the button's chevron: it turns while the
 * button has aria-expanded="true". `className` is the content's own layout (padding included).
 */
export function Expand({ open, id, className, children }: { open: boolean; id?: string; className?: string; children: React.ReactNode }) {
  return (
    <Presence>
      {open && (
        <ExpandBody id={id} className={className}>
          {children}
        </ExpandBody>
      )}
    </Presence>
  );
}

function ExpandBody({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  const state = usePresence();
  return (
    <div id={id} data-state={state} inert={state === "closed"} className="m-expand">
      <div>
        <div className={className}>{children}</div>
      </div>
    </div>
  );
}

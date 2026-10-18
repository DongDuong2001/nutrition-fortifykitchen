"use client";

import React, { useEffect, useRef, useState } from "react";
import { Presence, usePresence } from "@/components/ui/presence";

/**
 * cc-55: the content of an expanding row (accordion). It opens with the shared .m-expand motion (grid rows 0fr → 1fr
 * and a fade) and closes the same way before it unmounts. Put .m-chevron on the button's chevron: it turns while the
 * button has aria-expanded="true". `className` is the content's own layout (padding included).
 */
export function Expand({ open, id, className, children }: { open: boolean; id?: string; className?: string; children: React.ReactNode }) {
  // A row that is open when the screen first shows is just there: only a change after that plays the motion
  const openAtMount = useRef(open);
  useEffect(() => {
    openAtMount.current = false;
  }, []);
  return (
    <Presence>
      {open && (
        <ExpandBody id={id} className={className} instant={openAtMount.current}>
          {children}
        </ExpandBody>
      )}
    </Presence>
  );
}

function ExpandBody({ id, className, instant, children }: { id?: string; className?: string; instant: boolean; children: React.ReactNode }) {
  const state = usePresence();
  // data-instant switches the transition off for the first frame (no enter from @starting-style), then leaves it on
  const [skip, setSkip] = useState(instant);
  useEffect(() => {
    if (skip) setSkip(false);
  }, [skip]);
  return (
    <div id={id} data-state={state} data-instant={skip ? "" : undefined} inert={state === "closed"} className="m-expand">
      <div>
        <div className={className}>{children}</div>
      </div>
    </div>
  );
}

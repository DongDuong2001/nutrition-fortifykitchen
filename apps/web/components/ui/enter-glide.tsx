import React, { useState } from "react";
import { glideDirection } from "@/lib/motion";

type Dir = -1 | 0 | 1;

/**
 * The glide of a screen change that is not a push: a bottom-nav tab or a Tổng quan sub-tab (its own module, since every tab loads it and only the lists load SwitchGlide). Keyed on `id`, so the new screen
 * is a new element that enters with the CSS .m-tab-in (12 px off to the side of the tab order, opacity, 200 ms, a transition
 * from @starting-style); the old one is simply gone, it does not slide out. No snapshots (a view transition snapshots the
 * whole screen twice, which a phone with 2 GB feels), no animation on first mount. `order` is the place of the tab in the
 * row: the new screen comes from the right when it grew.
 */
export function EnterGlide({ id, order = 0, children, className = "" }: { id: string; order?: number; children: React.ReactNode; className?: string }) {
  const [state, setState] = useState<{ id: string; order: number; dir: Dir; changed: boolean }>({ id, order, dir: 0, changed: false });
  if (state.id !== id) setState({ id, order, dir: glideDirection(state.order, order), changed: true });
  return (
    <div
      key={id}
      data-glide-enter={id}
      data-glide-dir={state.changed ? state.dir : undefined}
      style={state.changed ? ({ "--m-tab-dir": state.dir } as React.CSSProperties) : undefined}
      className={`${className} ${state.changed ? "m-tab-in" : ""}`.trim()}
    >
      {children}
    </div>
  );
}

import * as React from "react";

function createIcon(svgPath, viewBox = "0 0 24 24") {
  return function Icon({ className = "w-5 h-5", size = 20, color = "currentColor", ...props }) {
    return React.createElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox,
        width: size,
        height: size,
        fill: "none",
        stroke: color,
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        className,
        ...props,
      },
      React.createElement("path", { d: svgPath })
    );
  };
}

export const FlameIcon = createIcon("M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z");
export const SparklesIcon = createIcon("m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z");
export const PlusIcon = createIcon("M5 12h14m-7-7v14");
export const CheckIcon = createIcon("M20 6 9 17l-5-5");
export const CalendarIcon = createIcon("M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z");
export const UtensilsIcon = createIcon("M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2m0 14v6m6-6v6M4 2v4a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3V2M7 11v11");
export const SearchIcon = createIcon("m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z");

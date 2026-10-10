import * as React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  color?: string;
}

export type IconComponent = React.FC<IconProps>;

function createSvgIcon(svgContent: React.ReactNode, viewBox = "0 0 24 24"): IconComponent {
  return function Icon({ className = "w-5 h-5", size = 20, color = "currentColor", ...props }: IconProps) {
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
      svgContent
    );
  };
}

export const HomeIcon = createSvgIcon(
  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
);

export const BarChartIcon = createSvgIcon(
  <path d="M12 20V10M18 20V4M6 20v-4" />
);

export const DumbbellIcon = createSvgIcon(
  <>
    <path d="m6.5 6.5 11 11" />
    <path d="m21 21-1-1a2 2 0 0 0-2.8 0l-.7.7a2 2 0 0 1-2.8 0l-7.4-7.4a2 2 0 0 1 0-2.8l.7-.7a2 2 0 0 0 0-2.8L6 3" />
    <path d="m3 6 1.4 1.4" />
    <path d="m18 21 1.4-1.4" />
  </>
);

export const UserIcon = createSvgIcon(
  <>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>
);

export const PlusIcon = createSvgIcon(
  <path d="M5 12h14m-7-7v14" />
);

export const CheckIcon = createSvgIcon(
  <path d="M20 6 9 17l-5-5" />
);

export const ChevronRightIcon = createSvgIcon(
  <path d="m9 18 6-6-6-6" />
);

export const ChevronLeftIcon = createSvgIcon(
  <path d="m15 18-6-6 6-6" />
);

export const CalendarIcon = createSvgIcon(
  <>
    <path d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
  </>
);

export const SearchIcon = createSvgIcon(
  <>
    <path d="m21 21-4.35-4.35" />
    <circle cx="11" cy="11" r="8" />
  </>
);

export const CloseIcon = createSvgIcon(
  <path d="M18 6 6 18M6 6l12 12" />
);

export const FlameIcon = createSvgIcon(
  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z" />
);

export const SparklesIcon = createSvgIcon(
  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
);

export const UtensilsIcon = createSvgIcon(
  <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2m0 14v6m6-6v6M4 2v4a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3V2M7 11v11" />
);

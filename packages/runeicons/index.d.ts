import * as React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  color?: string;
}

export type IconComponent = React.FC<IconProps>;

export const FlameIcon: IconComponent;
export const SparklesIcon: IconComponent;
export const PlusIcon: IconComponent;
export const CheckIcon: IconComponent;
export const CalendarIcon: IconComponent;
export const UtensilsIcon: IconComponent;
export const SearchIcon: IconComponent;

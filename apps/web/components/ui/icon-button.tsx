import React from "react";
import Link from "next/link";

export type IconButtonTone = "ghost" | "surface" | "card";

interface Common {
  /** The screen-reader name; an icon-only control always has one */
  label: string;
  tone?: IconButtonTone;
  className?: string;
  children: React.ReactNode;
}

type AsButton = Common & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children" | "className"> & { href?: undefined };
type AsLink = Common & { href: string; replace?: boolean; prefetch?: boolean } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "aria-label" | "children" | "className" | "href">;

const TONES: Record<IconButtonTone, string> = {
  ghost: "border-0 bg-transparent",
  surface: "border-0 bg-surface",
  card: "border border-card-border bg-card",
};

/**
 * The 44 px round icon-only button (cc-66 D6): a glyph centred in a 44 px circle, a required label, the 0.97 press.
 * Colour, hover and placement come from className (ghost on ink takes text-on-dark, for one).
 */
export function IconButton(props: AsButton | AsLink) {
  const { label, tone = "ghost", className = "", children } = props;
  const classes = `inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full p-0 ${TONES[tone]} active:scale-[0.97] transition-press motion-reduce:active:scale-100 ${className}`;
  if (props.href !== undefined) {
    const { label: _l, tone: _t, className: _c, children: _ch, href, ...rest } = props;
    return (
      <Link href={href} aria-label={label} className={`no-underline ${classes}`} {...rest}>
        {children}
      </Link>
    );
  }
  const { label: _l, tone: _t, className: _c, children: _ch, type = "button", ...rest } = props;
  return (
    <button type={type} aria-label={label} className={classes} {...rest}>
      {children}
    </button>
  );
}

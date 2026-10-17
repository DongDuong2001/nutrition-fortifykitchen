import React from "react";

// 22 px stroke icons for the install steps (currentColor, aria-hidden). Shared by the sheet and /install.
const ICON = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function ShareIcon() {
  return (
    <svg {...ICON}>
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

export function AddSquareIcon() {
  return (
    <svg {...ICON}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg {...ICON}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function BoltIcon() {
  return (
    <svg {...ICON}>
      <path d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z" />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg {...ICON}>
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg {...ICON}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg {...ICON}>
      <path d="M12 4v11M8 11l4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  );
}

export function CopyIcon() {
  return (
    <svg {...ICON}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

export function GlobeIcon() {
  return (
    <svg {...ICON}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </svg>
  );
}

export function ChevronLeftIcon() {
  return (
    <svg {...ICON}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg {...ICON}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** ••• (three dots in a row) */
export function DotsIcon() {
  return (
    <svg {...ICON} fill="currentColor" stroke="none">
      <circle cx="5.5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="18.5" cy="12" r="1.8" />
    </svg>
  );
}

/** ⋮ (three dots in a column) */
export function DotsVerticalIcon() {
  return (
    <svg {...ICON} fill="currentColor" stroke="none">
      <circle cx="12" cy="5.5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="18.5" r="1.8" />
    </svg>
  );
}

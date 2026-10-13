import React from "react";

/** 22 px, stroke 1,8, currentColor: the icons of the Cài đặt rows. Decorative (the row label names the action). */
function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const SETTINGS_ICONS = {
  target: (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </Svg>
  ),
  account: (
    <Svg>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c.8-3.6 3.7-5.5 7.5-5.5s6.7 1.9 7.5 5.5" />
    </Svg>
  ),
  language: (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9s1.3-6.3 3.9-9z" />
    </Svg>
  ),
  bell: (
    <Svg>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 21h4" />
    </Svg>
  ),
  database: (
    <Svg>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </Svg>
  ),
  install: (
    <Svg>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M12 8v6m-2.500-2.500L12 14l2.500-2.500M11 18h2" />
    </Svg>
  ),
  trash: (
    <Svg>
      <path d="M4 7h16M10 3h4M6 7l1 13h10l1-13M10 11v6M14 11v6" />
    </Svg>
  ),
} as const;

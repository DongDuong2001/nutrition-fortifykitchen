import React from "react";
import {
  IconTarget,
  IconUser,
  IconGlobe,
  IconBell,
  IconDatabase,
  IconMobile,
  IconTrash,
  IconFileText,
  IconShield,
} from "@/components/ui/icons";

/** 22 px, stroke 1,8, currentColor: the icons of the Cài đặt rows. Decorative (the row label names the action). */
export const SETTINGS_ICONS = {
  target: <IconTarget size={22} />,
  account: <IconUser size={22} />,
  language: <IconGlobe size={22} />,
  bell: <IconBell size={22} />,
  database: <IconDatabase size={22} />,
  install: <IconMobile size={22} />,
  trash: <IconTrash size={22} />,
  document: <IconFileText size={22} />,
  shield: <IconShield size={22} />,
} as const;


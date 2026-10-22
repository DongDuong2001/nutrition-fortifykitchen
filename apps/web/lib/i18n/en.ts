import type { Message, MessageKey } from "./vi";

/**
 * English: every key vi has (the type refuses a missing one). The voice is the Vietnamese one: short, plain, friendly,
 * "you", no jargon. Nutrient names are already English and stay as they are; food names stay Vietnamese (name_vi).
 */
export const en: Record<MessageKey, Message> = {
  "settings.title": "Settings",
  "settings.hero.targets": "Daily targets",
  "settings.hero.protein": "protein {range}",
  "settings.yours": "Yours",
  "settings.targets": "Daily targets",
  "settings.coach": "Coach",
  "settings.coach.linked": "{name} · Level {level}",
  "settings.coach.none": "Enter a code so a coach can follow you",
  "settings.clients": "Clients",
  "settings.clients.hint": "Your clients' levels and diaries",
  "settings.account": "Account",
  "settings.account.signedOut": "Not signed in",
  "settings.pro.text": "See the plans and what your account gets",
  "settings.pro.cta": "See plans",
  "settings.danger": "Danger zone",
  "settings.delete": "Delete account",
  "settings.delete.hint": "You confirm before anything is deleted",
};

import type { ResolvedScheme } from "@/context/AppTheme";

/** Fond principal des écrans (aligné header / tab bar). */
export function appScreenBackground(scheme: ResolvedScheme): string {
  return scheme === "dark" ? "#0a0a0a" : "#fafafa";
}

/** Couleurs explicites (sans NativeWind `dark:`) pour listes / scroll / safe area. */
export type AppChrome = {
  bg: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  card: string;
  cardPressed: string;
  inputBg: string;
  chip: string;
  checkBorder: string;
  emptyDay: string;
  doneDay: string;
  selectedDayBorder: string;
  selectedDayBg: string;
  selectedDayText: string;
  dayText: string;
  legendBg: string;
  /** Placeholder / légendes discrètes */
  hint: string;
};

export function getAppChrome(scheme: ResolvedScheme): AppChrome {
  const dark = scheme === "dark";
  return {
    bg: dark ? "#0a0a0a" : "#fafafa",
    text: dark ? "#fafafa" : "#171717",
    textMuted: dark ? "#a3a3a3" : "#737373",
    textSubtle: dark ? "#d4d4d4" : "#525252",
    border: dark ? "#262626" : "#e5e5e5",
    card: dark ? "#171717" : "#ffffff",
    cardPressed: dark ? "#262626" : "#f5f5f5",
    inputBg: dark ? "#171717" : "#ffffff",
    chip: dark ? "#262626" : "#e5e5e5",
    checkBorder: dark ? "#525252" : "#d4d4d4",
    emptyDay: dark ? "rgba(38,38,38,0.95)" : "rgba(229,229,229,0.65)",
    doneDay: dark ? "rgba(16,185,129,0.35)" : "rgba(16,185,129,0.22)",
    selectedDayBorder: "#3b82f6",
    selectedDayBg: dark ? "rgba(59,130,246,0.22)" : "rgba(59,130,246,0.12)",
    selectedDayText: dark ? "#93c5fd" : "#1d4ed8",
    dayText: dark ? "#fafafa" : "#262626",
    legendBg: dark ? "#171717" : "#ffffff",
    hint: dark ? "#737373" : "#a3a3a3",
  };
}

import type { DateYMD } from "@/types";

export type CalendarCell =
  | { kind: "empty" }
  | { kind: "day"; date: DateYMD; dayOfMonth: number };

export function dateYMDFromParts(
  year: number,
  monthIndex: number,
  day: number,
): DateYMD {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/**
 * Flat list of cells (length multiple of 7).
 * Week starts Monday (`getDay`: Sun=0 → pad offset via `(d + 6) % 7`).
 */
export function buildMonthGrid(year: number, monthIndex: number): CalendarCell[] {
  const first = new Date(year, monthIndex, 1);
  const pad = (first.getDay() + 6) % 7;
  const dim = new Date(year, monthIndex + 1, 0).getDate();
  const out: CalendarCell[] = [];
  for (let i = 0; i < pad; i++) {
    out.push({ kind: "empty" });
  }
  for (let d = 1; d <= dim; d++) {
    out.push({
      kind: "day",
      dayOfMonth: d,
      date: dateYMDFromParts(year, monthIndex, d),
    });
  }
  while (out.length % 7 !== 0) {
    out.push({ kind: "empty" });
  }
  return out;
}

/** Monday-first row headers (English initials). */
export const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

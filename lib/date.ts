import type { DateYMD } from "@/types";

/** Local calendar date as `YYYY-MM-DD` (device timezone). */
export function localDateYMD(date = new Date()): DateYMD {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

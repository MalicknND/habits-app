import type { DateYMD } from "@/types";

/** Local calendar date as `YYYY-MM-DD` (device timezone). */
export function localDateYMD(date = new Date()): DateYMD {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Local midnight for a calendar day string. */
export function parseYMD(ymd: DateYMD): Date {
  const [ys, ms, ds] = ymd.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  return new Date(y, m - 1, d);
}

/** Move by whole calendar days in local time. */
export function addDays(date: Date, delta: number): Date {
  const x = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  x.setDate(x.getDate() + delta);
  return x;
}

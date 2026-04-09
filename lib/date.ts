import type { DateYMD, TimeHHmm } from "@/types";

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

/** Format local time as `HH:mm` (24h). */
export function toTimeHHmm(d: Date): TimeHHmm {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Parse `HH:mm` against today's calendar date in local time.
 * Returns `null` if invalid.
 */
export function parseTodayTimeHHmm(s: string, base = new Date()): Date | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

/** Map stored `HH:mm` to a `Date` on `base`’s local calendar day (fallback 09:00). */
export function dateFromTimeHHmm(hm: TimeHHmm, base = new Date()): Date {
  const d = parseTodayTimeHHmm(hm, base);
  if (d) return d;
  const f = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  f.setHours(9, 0, 0, 0);
  return f;
}

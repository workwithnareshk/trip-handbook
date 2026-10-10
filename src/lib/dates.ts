// Date helpers. All trip dates are plain YYYY-MM-DD strings and times are
// HH:mm strings in India Standard Time (Asia/Kolkata), so no timezone maths is
// needed beyond working out "now" in IST.

export const TRIP_TZ = "Asia/Kolkata";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidDate(value: string | undefined): value is string {
  if (!value || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidTime(value: string | undefined): value is string {
  return !!value && TIME_RE.test(value);
}

/** Inclusive list of dates between two YYYY-MM-DD strings. */
export function dateRange(start: string, end: string): string[] {
  if (!isValidDate(start) || !isValidDate(end) || start > end) return [];
  const out: string[] = [];
  const [y, m, d] = start.split("-").map(Number);
  const cur = new Date(Date.UTC(y, m - 1, d));
  for (let i = 0; i < 60; i++) {
    const iso = cur.toISOString().slice(0, 10);
    out.push(iso);
    if (iso === end) break;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/** Current date and time in IST, independent of the device timezone. */
export function nowInIST(now: Date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TRIP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

/** Whole days from date a to date b (b - a). */
export function daysBetween(a: string, b: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

function utcDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

/** "Wed, 14 Oct" */
export function formatDayShort(date: string): string {
  if (!isValidDate(date)) return date;
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(utcDate(date));
}

/** "Wednesday, 14 October 2026" */
export function formatDayLong(date: string): string {
  if (!isValidDate(date)) return date;
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(utcDate(date));
}

/** "14 Oct 2026" */
export function formatDate(date: string | undefined): string {
  if (!date) return "";
  if (!isValidDate(date)) return date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(utcDate(date));
}

/** "10:00 AM" from "10:00". */
export function formatTime(time: string | undefined): string {
  if (!isValidTime(time)) return "";
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const clamped = Math.max(0, Math.min(mins, 23 * 60 + 59));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

export function formatDuration(mins: number | undefined): string {
  if (!mins || mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

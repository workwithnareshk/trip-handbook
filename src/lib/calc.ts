// Pure calculations shared by the dashboard, itinerary, bookings and
// expenses screens. Kept free of React / IndexedDB so they are easy to test.

import { isValidTime, timeToMinutes } from "./dates";
import type {
  Booking,
  ChecklistItem,
  Expense,
  ExpenseCategory,
  ItineraryActivity,
  TripData,
} from "./types";

// ---- Checklists ----

export type Progress = { done: number; total: number; percent: number };

export function checklistProgress(items: ChecklistItem[]): Progress {
  const total = items.length;
  const done = items.filter((i) => i.checked).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function combineProgress(parts: Progress[]): Progress {
  const done = parts.reduce((s, p) => s + p.done, 0);
  const total = parts.reduce((s, p) => s + p.total, 0);
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Re-number `order` so it matches array position. */
export function renumber<T extends { order: number }>(items: T[]): T[] {
  return items.map((item, i) => (item.order === i ? item : { ...item, order: i }));
}

/** Move the item with `id` up (-1) or down (+1) within the ordered list. */
export function moveItem<T extends { id: string; order: number }>(items: T[], id: string, delta: -1 | 1): T[] {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((i) => i.id === id);
  const target = idx + delta;
  if (idx < 0 || target < 0 || target >= sorted.length) return renumber(sorted);
  [sorted[idx], sorted[target]] = [sorted[target], sorted[idx]];
  return renumber(sorted);
}

// ---- Bookings ----

const OPEN_STATUSES = new Set(["not-started", "researching", "pending"]);

export function isBookingConfirmed(b: Booking): boolean {
  return b.status === "booked" || b.status === "paid";
}

/** Fields we expect to be filled once a booking is confirmed. */
export function missingDetails(b: Booking): string[] {
  const missing: string[] = [];
  if (b.status === "cancelled") return missing;
  if (!b.referenceNumber) missing.push(b.category === "flight" ? "PNR" : "Reference");
  if (b.category === "flight") {
    if (!b.flight?.airline) missing.push("Airline");
    if (!b.flight?.arrivalTime) missing.push("Arrival time");
  } else if (b.category === "cab") {
    if (!b.phone) missing.push("Driver phone");
    if (!b.cab?.driverName) missing.push("Driver name");
  } else if (b.category === "accommodation" || b.category === "houseboat") {
    if (!b.phone) missing.push("Phone");
    if (!b.location) missing.push("Address");
  }
  if (b.amount === undefined) missing.push("Amount");
  return missing;
}

export type BookingSummary = {
  confirmed: number;
  pending: number;
  cancelled: number;
  withMissingDetails: number;
};

export function bookingSummary(bookings: Booking[]): BookingSummary {
  let confirmed = 0;
  let pending = 0;
  let cancelled = 0;
  let withMissingDetails = 0;
  for (const b of bookings) {
    if (b.status === "cancelled") cancelled++;
    else if (isBookingConfirmed(b)) confirmed++;
    else if (OPEN_STATUSES.has(b.status)) pending++;
    if (missingDetails(b).length > 0) withMissingDetails++;
  }
  return { confirmed, pending, cancelled, withMissingDetails };
}

export function bookingBalance(b: Pick<Booking, "amount" | "amountPaid">): number {
  if (b.amount === undefined) return 0;
  return Math.max(0, round2(b.amount - (b.amountPaid ?? 0)));
}

// ---- Money ----

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type MoneySummary = {
  /** Sum of recorded expense transactions. */
  recordedExpenses: number;
  /** Total of quoted/estimated amounts on active (non-cancelled) bookings. */
  bookingCommitments: number;
  /** Advances recorded on active bookings (`amountPaid`). */
  advancesPaid: number;
  /** Amount still owed on active bookings. */
  outstandingBalances: number;
  /**
   * Advances marked on bookings that have not been logged as expenses
   * linked to that booking. Counted once in the projection so nothing is
   * double counted whether or not the user also logs the payment.
   */
  unloggedAdvances: number;
  /** recordedExpenses + unloggedAdvances + outstandingBalances. */
  projectedTotal: number;
  budget?: number;
  /** budget - projectedTotal, when a budget is set. */
  budgetRemaining?: number;
  byCategory: Record<ExpenseCategory, number>;
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "flights",
  "accommodation",
  "cab",
  "tickets",
  "food",
  "shopping",
  "fuel-tolls",
  "other",
];

export function moneySummary(expenses: Expense[], bookings: Booking[], budget?: number): MoneySummary {
  const byCategory = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, 0])) as Record<ExpenseCategory, number>;
  let recordedExpenses = 0;
  const loggedByBooking = new Map<string, number>();
  for (const e of expenses) {
    recordedExpenses += e.amount;
    byCategory[e.category] = round2((byCategory[e.category] ?? 0) + e.amount);
    if (e.bookingId) loggedByBooking.set(e.bookingId, (loggedByBooking.get(e.bookingId) ?? 0) + e.amount);
  }

  let bookingCommitments = 0;
  let advancesPaid = 0;
  let outstandingBalances = 0;
  let unloggedAdvances = 0;
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const paid = b.amountPaid ?? 0;
    bookingCommitments += b.amount ?? 0;
    advancesPaid += paid;
    outstandingBalances += bookingBalance(b);
    unloggedAdvances += Math.max(0, paid - (loggedByBooking.get(b.id) ?? 0));
  }

  const projectedTotal = round2(recordedExpenses + unloggedAdvances + outstandingBalances);
  return {
    recordedExpenses: round2(recordedExpenses),
    bookingCommitments: round2(bookingCommitments),
    advancesPaid: round2(advancesPaid),
    outstandingBalances: round2(outstandingBalances),
    unloggedAdvances: round2(unloggedAdvances),
    projectedTotal,
    budget,
    budgetRemaining: budget === undefined ? undefined : round2(budget - projectedTotal),
    byCategory,
  };
}

// ---- Itinerary ----

export function activitiesForDay(activities: ItineraryActivity[], date: string): ItineraryActivity[] {
  return activities.filter((a) => a.date === date).sort((a, b) => a.order - b.order);
}

/** Start/end in minutes, using duration when there is no end time. */
export function activityWindow(a: ItineraryActivity): { start: number; end: number } | null {
  if (!isValidTime(a.startTime)) return null;
  const start = timeToMinutes(a.startTime);
  let end: number | null = null;
  if (isValidTime(a.endTime)) end = timeToMinutes(a.endTime);
  else if (a.durationMinutes && a.durationMinutes > 0) end = start + a.durationMinutes;
  if (end === null || end <= start) return null;
  return { start, end };
}

/** Ids of activities whose planned time windows overlap another on the same day. */
export function findOverlaps(activities: ItineraryActivity[]): Set<string> {
  const out = new Set<string>();
  const byDay = new Map<string, { id: string; start: number; end: number }[]>();
  for (const a of activities) {
    if (a.status === "skipped") continue;
    const w = activityWindow(a);
    if (!w) continue;
    const list = byDay.get(a.date) ?? [];
    list.push({ id: a.id, ...w });
    byDay.set(a.date, list);
  }
  for (const list of byDay.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[i].start < list[j].end && list[j].start < list[i].end) {
          out.add(list[i].id);
          out.add(list[j].id);
        }
      }
    }
  }
  return out;
}

export type NextUp =
  | { kind: "before-trip"; daysToGo: number; activity?: ItineraryActivity }
  | { kind: "during-trip"; activity?: ItineraryActivity }
  | { kind: "after-trip" };

/**
 * What comes next, based on the current IST date/time. Untimed activities
 * on today count as "next" once all earlier timed ones have passed, in their
 * itinerary order.
 */
export function nextUp(
  activities: ItineraryActivity[],
  now: { date: string; time: string },
  tripStart: string,
  tripEnd: string,
  daysToGo: number,
): NextUp {
  const planned = activities
    .filter((a) => a.status === "planned")
    .sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? -1 : 1));

  if (now.date < tripStart) return { kind: "before-trip", daysToGo, activity: planned[0] };
  if (now.date > tripEnd) return { kind: "after-trip" };

  const nowMins = timeToMinutes(now.time);
  const later = planned.find((a) => a.date > now.date);
  const todays = planned.filter((a) => a.date === now.date);
  // Untimed items listed before a timed item that has already started are
  // treated as done-by-now; the plan order is the source of truth.
  let lastStarted = -1;
  todays.forEach((a, i) => {
    if (isValidTime(a.startTime) && timeToMinutes(a.startTime) <= nowMins) lastStarted = i;
  });
  const activity =
    todays.find((a, i) => {
      if (i < lastStarted) return false;
      if (!isValidTime(a.startTime)) return i > lastStarted;
      const w = activityWindow(a);
      return (w ? w.end : timeToMinutes(a.startTime)) >= nowMins;
    }) ?? later;
  return { kind: "during-trip", activity };
}

/** Driver phone from the active cab booking, falling back to the driver contact. */
export function driverPhone(data: Pick<TripData, "bookings" | "contacts">): string | undefined {
  const cab = data.bookings.find((b) => b.category === "cab" && b.status !== "cancelled" && b.phone);
  return cab?.phone || data.contacts.find((c) => c.id === "ct_driver")?.phone;
}

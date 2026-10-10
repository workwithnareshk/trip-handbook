import { describe, expect, it } from "vitest";
import {
  bookingBalance,
  bookingSummary,
  checklistProgress,
  driverPhone,
  findOverlaps,
  missingDetails,
  moneySummary,
  moveItem,
  nextUp,
} from "./calc";
import { seedData } from "./seed";
import type { Booking, Expense, ItineraryActivity } from "./types";

const seed = seedData("2026-10-10T00:00:00.000Z");

function act(id: string, date: string, order: number, extra: Partial<ItineraryActivity> = {}): ItineraryActivity {
  return {
    id,
    tripId: "t",
    date,
    title: id,
    category: "other",
    status: "planned",
    optional: false,
    bookingRequired: false,
    bookingIds: [],
    checklist: [],
    order,
    createdAt: "",
    updatedAt: "",
    ...extra,
  };
}

function booking(id: string, extra: Partial<Booking> = {}): Booking {
  return {
    id,
    tripId: "t",
    category: "other",
    title: id,
    status: "pending",
    amountKind: "quoted",
    attachmentIds: [],
    checklist: [],
    createdAt: "",
    updatedAt: "",
    ...extra,
  };
}

function expense(id: string, amount: number, extra: Partial<Expense> = {}): Expense {
  return { id, tripId: "t", date: "2026-10-14", title: id, category: "food", amount, createdAt: "", updatedAt: "", ...extra };
}

describe("checklists", () => {
  it("computes progress", () => {
    const items = [
      { id: "a", title: "a", checked: true, order: 0 },
      { id: "b", title: "b", checked: false, order: 1 },
      { id: "c", title: "c", checked: false, order: 2 },
    ];
    expect(checklistProgress(items)).toEqual({ done: 1, total: 3, percent: 33 });
    expect(checklistProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });

  it("reorders with stable ids", () => {
    const items = [
      { id: "a", order: 0 },
      { id: "b", order: 1 },
      { id: "c", order: 2 },
    ];
    expect(moveItem(items, "c", -1).map((i) => i.id)).toEqual(["a", "c", "b"]);
    expect(moveItem(items, "a", -1).map((i) => i.id)).toEqual(["a", "b", "c"]);
    expect(moveItem(items, "a", 1).map((i) => i.order)).toEqual([0, 1, 2]);
  });
});

describe("itinerary", () => {
  it("flags overlapping planned times on the same day only", () => {
    const list = [
      act("a", "2026-10-15", 0, { startTime: "09:00", endTime: "11:00" }),
      act("b", "2026-10-15", 1, { startTime: "10:30", durationMinutes: 60 }),
      act("c", "2026-10-15", 2, { startTime: "11:30", endTime: "12:00" }),
      act("d", "2026-10-16", 0, { startTime: "09:30", endTime: "10:00" }),
      act("e", "2026-10-15", 3, { startTime: "09:15", endTime: "09:45", status: "skipped" }),
    ];
    expect([...findOverlaps(list)].sort()).toEqual(["a", "b"]);
  });

  it("returns the first activity before the trip", () => {
    const res = nextUp(seed.activities, { date: "2026-10-10", time: "09:00" }, "2026-10-14", "2026-10-18", 4);
    expect(res.kind).toBe("before-trip");
    expect(res.kind === "before-trip" && res.activity?.id).toBe("act_14_flight");
  });

  it("finds the next activity during the trip", () => {
    const res = nextUp(seed.activities, { date: "2026-10-18", time: "13:00" }, "2026-10-14", "2026-10-18", 0);
    expect(res.kind === "during-trip" && res.activity?.id).toBe("act_18_flight");
  });

  it("reports after the trip", () => {
    expect(nextUp(seed.activities, { date: "2026-10-20", time: "09:00" }, "2026-10-14", "2026-10-18", -6).kind).toBe("after-trip");
  });
});

describe("bookings", () => {
  it("summarises statuses and missing details on the seed data", () => {
    const s = bookingSummary(seed.bookings);
    expect(s.confirmed).toBe(0);
    expect(s.pending).toBe(seed.bookings.length);
    expect(s.withMissingDetails).toBe(seed.bookings.length);
    expect(missingDetails(seed.bookings[0])).toContain("PNR");
  });

  it("computes non-negative balances", () => {
    expect(bookingBalance({ amount: 5000, amountPaid: 2000 })).toBe(3000);
    expect(bookingBalance({ amount: 5000, amountPaid: 6000 })).toBe(0);
    expect(bookingBalance({ amount: undefined, amountPaid: 100 })).toBe(0);
  });

  it("prefers the cab booking phone for the driver", () => {
    expect(driverPhone({ bookings: [], contacts: [{ ...seed.contacts[1], phone: "9999999999" }] })).toBe("9999999999");
    expect(
      driverPhone({ bookings: [booking("c", { category: "cab", phone: "8888888888" })], contacts: seed.contacts }),
    ).toBe("8888888888");
  });
});

describe("money", () => {
  it("totals expenses by category", () => {
    const m = moneySummary([expense("a", 100), expense("b", 250.5, { category: "cab" })], []);
    expect(m.recordedExpenses).toBe(350.5);
    expect(m.byCategory.food).toBe(100);
    expect(m.byCategory.cab).toBe(250.5);
    expect(m.budgetRemaining).toBeUndefined();
  });

  it("does not double count a booking advance that is also logged as an expense", () => {
    const cab = booking("cab", { amount: 20000, amountPaid: 5000 });
    const logged = moneySummary([expense("adv", 5000, { bookingId: "cab", category: "cab" })], [cab], 50000);
    const notLogged = moneySummary([], [cab], 50000);
    // Either way the projected trip cost is the full quote.
    expect(logged.projectedTotal).toBe(20000);
    expect(notLogged.projectedTotal).toBe(20000);
    expect(logged.unloggedAdvances).toBe(0);
    expect(notLogged.unloggedAdvances).toBe(5000);
    expect(logged.outstandingBalances).toBe(15000);
    expect(logged.budgetRemaining).toBe(30000);
  });

  it("ignores cancelled bookings and handles overspend", () => {
    const m = moneySummary(
      [expense("x", 1200)],
      [booking("a", { amount: 1000, amountPaid: 0 }), booking("b", { status: "cancelled", amount: 9999, amountPaid: 500 })],
      2000,
    );
    expect(m.bookingCommitments).toBe(1000);
    expect(m.advancesPaid).toBe(0);
    expect(m.projectedTotal).toBe(2200);
    expect(m.budgetRemaining).toBe(-200);
  });
});

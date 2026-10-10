import { describe, expect, it } from "vitest";
import { createBackup, mergeData, parseBackup } from "./backup";
import { seedData } from "./seed";

const seed = seedData("2026-10-10T00:00:00.000Z");

describe("backup", () => {
  it("round-trips the full data set", () => {
    const text = JSON.stringify(createBackup(seed, new Date("2026-10-10T00:00:00Z")));
    const res = parseBackup(text);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toEqual(seed);
    expect(res.warnings).toEqual([]);
    expect(res.preview.counts.bookings).toBe(seed.bookings.length);
    expect(res.preview.tripName).toBe(seed.trip.name);
  });

  it("rejects non-JSON, foreign and future files", () => {
    expect(parseBackup("not json").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ hello: "world" })).ok).toBe(false);
    const future = { ...createBackup(seed), schemaVersion: 999 };
    const res = parseBackup(JSON.stringify(future));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/newer version/);
  });

  it("rejects a backup with a broken trip", () => {
    const b = JSON.parse(JSON.stringify(createBackup(seed)));
    b.data.trip.startDate = "14/10/2026";
    expect(parseBackup(JSON.stringify(b)).ok).toBe(false);
  });

  it("skips invalid records with a warning and fills missing arrays", () => {
    const b = JSON.parse(JSON.stringify(createBackup(seed)));
    b.data.expenses = [
      { id: "e1", date: "2026-10-14", title: "Lunch", category: "food", amount: 450 },
      { id: "e2", date: "2026-10-14", title: "Bad", category: "food", amount: -1 },
      { id: "e1", date: "2026-10-14", title: "Dup", category: "food", amount: 1 },
    ];
    delete b.data.bookings[0].checklist;
    delete b.data.memories;
    const res = parseBackup(JSON.stringify(b));
    expect(res.ok ? "ok" : res.error).toBe("ok");
    if (!res.ok) return;
    expect(res.data.expenses.map((e) => e.id)).toEqual(["e1"]);
    expect(res.data.expenses[0].tripId).toBe(seed.trip.id);
    expect(res.data.bookings[0].checklist).toEqual([]);
    expect(res.data.memories).toEqual([]);
    expect(res.warnings[0]).toMatch(/2 invalid or duplicate expenses/);
  });

  it("rejects a collection that is not a list", () => {
    const b = JSON.parse(JSON.stringify(createBackup(seed)));
    b.data.bookings = { nope: true };
    expect(parseBackup(JSON.stringify(b)).ok).toBe(false);
  });

  it("merges by id, letting imported records win", () => {
    const incoming = {
      ...seed,
      bookings: [{ ...seed.bookings[0], referenceNumber: "ABC123" }],
      expenses: [{ id: "x", tripId: seed.trip.id, date: "2026-10-15", title: "Tea", category: "food" as const, amount: 40, createdAt: "", updatedAt: "" }],
    };
    const merged = mergeData(seed, incoming);
    expect(merged.bookings.length).toBe(seed.bookings.length);
    expect(merged.bookings.find((b) => b.id === seed.bookings[0].id)?.referenceNumber).toBe("ABC123");
    expect(merged.expenses.length).toBe(1);
  });
});

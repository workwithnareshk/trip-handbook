import { describe, expect, it } from "vitest";
import { seedData } from "./seed";

describe("seed data", () => {
  const data = seedData("2026-10-10T00:00:00.000Z");

  it("has the correct trip dates and flight times", () => {
    expect(data.trip.startDate).toBe("2026-10-14");
    expect(data.trip.endDate).toBe("2026-10-18");
    const out = data.bookings.find((b) => b.id === "bk_flight_out")!;
    const ret = data.bookings.find((b) => b.id === "bk_flight_ret")!;
    expect(out.flight?.departureTime).toBe("10:00");
    expect(ret.flight?.departureTime).toBe("16:30");
  });

  it("does not invent confirmations", () => {
    for (const b of data.bookings) {
      expect(["booked", "paid"]).not.toContain(b.status);
      expect(b.referenceNumber).toBeUndefined();
      expect(b.amount).toBeUndefined();
      expect(b.phone).toBeUndefined();
    }
    for (const c of data.contacts) {
      if (c.id !== "ct_emergency") expect(c.phone).toBeUndefined();
    }
  });

  it("does not include the CBL race", () => {
    expect(JSON.stringify(data).toLowerCase()).not.toContain("cbl");
  });

  it("uses unique ids everywhere", () => {
    const ids = [
      ...data.activities,
      ...data.bookings,
      ...data.places,
      ...data.contacts,
      ...data.checklists,
      ...data.checklists.flatMap((c) => c.items),
      ...data.bookings.flatMap((b) => b.checklist),
    ].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("links activities only to existing bookings", () => {
    const bookingIds = new Set(data.bookings.map((b) => b.id));
    for (const a of data.activities) for (const id of a.bookingIds) expect(bookingIds.has(id)).toBe(true);
  });
});

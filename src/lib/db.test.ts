import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { clearEverything, deleteRecord, loadAll, putRecord, resetDbConnection } from "./db";

describe("IndexedDB layer", () => {
  beforeEach(async () => {
    await clearEverything();
    await resetDbConnection();
  });

  it("seeds on first load and persists changes", async () => {
    const first = await loadAll();
    expect(first.bookings.length).toBeGreaterThan(0);
    const act = { ...first.activities[0], title: "Changed" };
    await putRecord("activities", act);
    await deleteRecord("bookings", "bk_stay_17");
    await resetDbConnection();
    const second = await loadAll();
    expect(second.activities.find((a) => a.id === act.id)?.title).toBe("Changed");
    expect(second.bookings.find((b) => b.id === "bk_stay_17")).toBeUndefined();
  });
});

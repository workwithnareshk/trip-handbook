import { describe, expect, it } from "vitest";
import { dateRange, daysBetween, formatDayShort, formatTime, isValidDate, isValidTime, nowInIST } from "./dates";

describe("dates", () => {
  it("validates dates and times", () => {
    expect(isValidDate("2026-10-14")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("14-10-2026")).toBe(false);
    expect(isValidTime("16:30")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
  });

  it("builds the five trip days", () => {
    expect(dateRange("2026-10-14", "2026-10-18")).toEqual([
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ]);
    expect(dateRange("2026-10-18", "2026-10-14")).toEqual([]);
  });

  it("formats 12-hour times", () => {
    expect(formatTime("10:00")).toBe("10:00 AM");
    expect(formatTime("16:30")).toBe("4:30 PM");
    expect(formatTime("00:05")).toBe("12:05 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
    expect(formatTime(undefined)).toBe("");
  });

  it("formats day labels", () => {
    expect(formatDayShort("2026-10-14")).toMatch(/Wed/);
    expect(formatDayShort("2026-10-18")).toMatch(/Sun/);
  });

  it("computes IST now regardless of device timezone", () => {
    // 2026-10-13T20:00Z is 14 Oct 01:30 IST
    expect(nowInIST(new Date("2026-10-13T20:00:00Z"))).toEqual({ date: "2026-10-14", time: "01:30" });
  });

  it("counts days between", () => {
    expect(daysBetween("2026-10-10", "2026-10-14")).toBe(4);
  });
});

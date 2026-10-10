import { describe, expect, it } from "vitest";
import { formatINR, isValidPhone, isValidUrl, mapsSearchHref, parseAmount, telHref, whatsappHref, whatsappNumber } from "./format";

describe("money", () => {
  it("formats INR with Indian grouping", () => {
    expect(formatINR(125000)).toBe("₹1,25,000.00");
  });
  it("parses amounts", () => {
    expect(parseAmount("")).toBeUndefined();
    expect(parseAmount("1,500")).toBe(1500);
    expect(parseAmount("₹ 99.5")).toBe(99.5);
    expect(parseAmount("-5")).toBeNaN();
    expect(parseAmount("abc")).toBeNaN();
  });
});

describe("phones", () => {
  it("validates phone numbers", () => {
    expect(isValidPhone("112")).toBe(true);
    expect(isValidPhone("98765 43210")).toBe(true);
    expect(isValidPhone("call me")).toBe(false);
    expect(isValidPhone("")).toBe(false);
  });
  it("builds tel links", () => {
    expect(telHref("+91 98765-43210")).toBe("tel:+919876543210");
    expect(telHref("112")).toBe("tel:112");
    expect(telHref("abc")).toBeUndefined();
  });
  it("builds WhatsApp numbers only from mobile-like numbers", () => {
    expect(whatsappNumber("98765 43210")).toBe("919876543210");
    expect(whatsappNumber("098765 43210")).toBe("919876543210");
    expect(whatsappNumber("+91 98765 43210")).toBe("919876543210");
    expect(whatsappNumber("919876543210")).toBe("919876543210");
    expect(whatsappNumber("112")).toBeUndefined();
    expect(whatsappNumber("0484 1234567")).toBeUndefined();
    expect(whatsappHref("9876543210", "Hi")).toBe("https://wa.me/919876543210?text=Hi");
  });
});

describe("links", () => {
  it("validates urls", () => {
    expect(isValidUrl("https://example.org")).toBe(true);
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
    expect(isValidUrl("not a url")).toBe(false);
  });
  it("builds keyless maps links", () => {
    expect(mapsSearchHref("Fort Kochi")).toBe("https://www.google.com/maps/search/?api=1&query=Fort%20Kochi");
    expect(mapsSearchHref("  ")).toBeUndefined();
  });
});

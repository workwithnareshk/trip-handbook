// Small formatting / validation helpers for money, phones, URLs and maps.

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export function formatINR(amount: number | undefined): string {
  return inr.format(amount ?? 0);
}

/** Parse a user-typed amount. Returns undefined for blank, NaN for invalid. */
export function parseAmount(raw: string): number | undefined {
  const cleaned = raw.replace(/[,₹\s]/g, "");
  if (cleaned === "") return undefined;
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return NaN;
  return Number(cleaned);
}

export function isValidAmount(value: number | undefined): boolean {
  return value === undefined || (Number.isFinite(value) && value >= 0);
}

/** Digits only, keeping a leading + as a marker that a country code is present. */
function digits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * A phone is usable for tel: links when it has 3–15 digits (3 allows short
 * codes such as 112) and only phone-like characters.
 */
export function isValidPhone(phone: string | undefined): boolean {
  if (!phone) return false;
  const trimmed = phone.trim();
  if (!/^\+?[\d\s\-()]+$/.test(trimmed)) return false;
  const n = digits(trimmed).length;
  return n >= 3 && n <= 15;
}

export function telHref(phone: string | undefined): string | undefined {
  if (!isValidPhone(phone)) return undefined;
  const trimmed = phone!.trim();
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits(trimmed)}`;
}

/**
 * Number in international format for wa.me, or undefined if it cannot be
 * one. Ten-digit Indian mobiles (starting 6–9) get the 91 country code;
 * other numbers must already include a country code.
 */
export function whatsappNumber(phone: string | undefined): string | undefined {
  if (!isValidPhone(phone)) return undefined;
  const trimmed = phone!.trim();
  let d = digits(trimmed);
  if (!trimmed.startsWith("+")) {
    if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
    if (d.length === 10 && /^[6-9]/.test(d)) d = `91${d}`;
    else if (!(d.length === 12 && d.startsWith("91"))) return undefined;
  }
  if (d.length < 10 || d.length > 15) return undefined;
  return d;
}

export function whatsappHref(phone: string | undefined, text?: string): string | undefined {
  const n = whatsappNumber(phone);
  if (!n) return undefined;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function isValidUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Google Maps search link; no API key needed. */
export function mapsSearchHref(query: string | undefined): string | undefined {
  const q = query?.trim();
  if (!q) return undefined;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Google Maps directions link. Origin is optional (defaults to current location). */
export function mapsDirectionsHref(destination: string | undefined, origin?: string): string | undefined {
  const dest = destination?.trim();
  if (!dest) return undefined;
  const params = new URLSearchParams({ api: "1", destination: dest });
  if (origin?.trim()) params.set("origin", origin.trim());
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// JSON backup: export, validation and import (replace or merge).
// Attachment files (PDFs, photos) are NOT included; only their ids travel,
// so a restored record on another device shows "File not on this device".

import { COLLECTIONS } from "./db";
import { isValidDate } from "./dates";
import type { CollectionName, Trip, TripData } from "./types";
import { SCHEMA_VERSION } from "./types";

export const BACKUP_APP_ID = "kerala-trip-handbook";

export type BackupFile = {
  app: typeof BACKUP_APP_ID;
  schemaVersion: number;
  exportedAt: string;
  includesAttachments: false;
  data: TripData;
};

export function createBackup(data: TripData, now: Date = new Date()): BackupFile {
  return {
    app: BACKUP_APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    includesAttachments: false,
    data,
  };
}

export function backupFileName(now: Date = new Date()): string {
  return `kerala-trip-backup-${now.toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
}

export type BackupPreview = {
  exportedAt: string;
  schemaVersion: number;
  counts: Record<CollectionName, number>;
  tripName: string;
};

export type ParseResult =
  | { ok: true; data: TripData; preview: BackupPreview; warnings: string[] }
  | { ok: false; error: string };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const optStr = (v: unknown) => v === undefined || v === null || typeof v === "string";
const optNum = (v: unknown) => v === undefined || v === null || (typeof v === "number" && Number.isFinite(v) && v >= 0);

// Required string fields per collection (beyond id). Kept minimal so older
// or hand-edited backups still import; missing arrays are filled in.
const REQUIRED: Record<CollectionName, string[]> = {
  activities: ["date", "title", "category", "status"],
  bookings: ["category", "title", "status"],
  expenses: ["date", "title", "category"],
  places: ["name"],
  contacts: ["label"],
  checklists: ["title"],
  memories: ["date"],
};

function normaliseItems(v: unknown): unknown[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((i) => isObj(i) && isStr(i.id) && isStr(i.title))
    .map((i, idx) => {
      const o = i as Obj;
      return { ...o, checked: o.checked === true, order: typeof o.order === "number" ? o.order : idx };
    });
}

function nullsToUndefined(o: Obj): Obj {
  const out: Obj = {};
  for (const [k, v] of Object.entries(o)) if (v !== null) out[k] = v;
  return out;
}

export function parseBackup(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file is not valid JSON. Choose a backup exported from this app." };
  }
  if (!isObj(json) || json.app !== BACKUP_APP_ID || !isObj(json.data)) {
    return { ok: false, error: "This file is not a Kerala Trip Handbook backup." };
  }
  const version = json.schemaVersion;
  if (typeof version !== "number" || version < 1) return { ok: false, error: "The backup has no valid schema version." };
  if (version > SCHEMA_VERSION) {
    return { ok: false, error: `This backup is from a newer version of the app (schema ${version}). Update the app before importing.` };
  }

  const d = json.data;
  const warnings: string[] = [];
  const trip = d.trip;
  if (!isObj(trip) || !isStr(trip.id) || !isStr(trip.name) || !isValidDate(trip.startDate as string) || !isValidDate(trip.endDate as string)) {
    return { ok: false, error: "The trip details in this backup are missing or invalid." };
  }

  const out: Partial<TripData> = {
    trip: {
      airportTargetStart: "12:00",
      airportTargetEnd: "12:30",
      dayLabels: {},
      currency: "INR",
      timezone: "Asia/Kolkata",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...nullsToUndefined(trip),
    } as Trip,
  };
  if (out.trip!.budget !== undefined && !optNum(out.trip!.budget)) out.trip!.budget = undefined;

  for (const c of COLLECTIONS) {
    const raw = d[c];
    if (raw === undefined) {
      out[c] = [] as never;
      continue;
    }
    if (!Array.isArray(raw)) return { ok: false, error: `“${c}” in the backup should be a list.` };
    const seen = new Set<string>();
    const records: Obj[] = [];
    let skipped = 0;
    for (const r of raw) {
      if (!isObj(r) || !isStr(r.id) || seen.has(r.id) || !REQUIRED[c].every((k) => isStr(r[k]))) {
        skipped++;
        continue;
      }
      if (c === "expenses" && !(typeof r.amount === "number" && Number.isFinite(r.amount) && r.amount >= 0)) {
        skipped++;
        continue;
      }
      if (c === "bookings" && (!optNum(r.amount) || !optNum(r.amountPaid) || !optStr(r.phone))) {
        skipped++;
        continue;
      }
      seen.add(r.id);
      const rec: Obj = { ...nullsToUndefined(r), tripId: isStr(r.tripId) ? r.tripId : trip.id };
      if (c === "activities") {
        rec.bookingIds = Array.isArray(r.bookingIds) ? r.bookingIds.filter(isStr) : [];
        rec.checklist = normaliseItems(r.checklist);
        rec.optional = r.optional === true;
        rec.bookingRequired = r.bookingRequired === true;
        rec.order = typeof r.order === "number" ? r.order : records.length;
      }
      if (c === "bookings") {
        rec.attachmentIds = Array.isArray(r.attachmentIds) ? r.attachmentIds.filter(isStr) : [];
        rec.checklist = normaliseItems(r.checklist);
        rec.amountKind = r.amountKind === "estimated" ? "estimated" : "quoted";
      }
      if (c === "checklists") {
        rec.items = normaliseItems(r.items);
        rec.order = typeof r.order === "number" ? r.order : records.length;
      }
      if (c === "memories") {
        rec.attachmentIds = Array.isArray(r.attachmentIds) ? r.attachmentIds.filter(isStr) : [];
        rec.note = isStr(r.note) ? r.note : "";
      }
      if (c === "places") rec.visited = r.visited === true;
      if (c === "contacts") rec.order = typeof r.order === "number" ? r.order : records.length;
      records.push(rec);
    }
    if (skipped) warnings.push(`${skipped} invalid or duplicate ${c} record${skipped > 1 ? "s were" : " was"} skipped.`);
    out[c] = records as never;
  }

  const data = out as TripData;
  return {
    ok: true,
    data,
    warnings,
    preview: {
      exportedAt: isStr(json.exportedAt) ? json.exportedAt : "",
      schemaVersion: version,
      tripName: data.trip.name,
      counts: Object.fromEntries(COLLECTIONS.map((c) => [c, data[c].length])) as Record<CollectionName, number>,
    },
  };
}

/** Merge: imported records replace ones with the same id; others are kept. */
export function mergeData(current: TripData, incoming: TripData): TripData {
  const merged = { trip: { ...current.trip, ...incoming.trip, dayLabels: { ...current.trip.dayLabels, ...incoming.trip.dayLabels } } } as TripData;
  for (const c of COLLECTIONS) {
    const map = new Map<string, unknown>();
    for (const r of current[c]) map.set(r.id, r);
    for (const r of incoming[c]) map.set(r.id, r);
    (merged as Record<string, unknown>)[c] = [...map.values()];
  }
  return merged;
}

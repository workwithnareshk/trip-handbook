// IndexedDB persistence. Every entity lives in its own object store keyed by
// a stable id. Attachment blobs are kept in a separate store so the structured
// data stays small and exportable as JSON.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { seedData } from "./seed";
import type {
  Attachment,
  AttachmentMeta,
  CollectionName,
  Trip,
  TripData,
} from "./types";
import { SCHEMA_VERSION } from "./types";

type StoreFor<T> = { key: string; value: T };

interface HandbookDB extends DBSchema {
  meta: { key: string; value: { key: string; value: unknown } };
  trip: StoreFor<Trip>;
  activities: StoreFor<TripData["activities"][number]>;
  bookings: StoreFor<TripData["bookings"][number]>;
  expenses: StoreFor<TripData["expenses"][number]>;
  places: StoreFor<TripData["places"][number]>;
  contacts: StoreFor<TripData["contacts"][number]>;
  checklists: StoreFor<TripData["checklists"][number]>;
  memories: StoreFor<TripData["memories"][number]>;
  attachments: StoreFor<Attachment>;
}

export const DB_NAME = "kerala-trip-handbook";
export const COLLECTIONS: CollectionName[] = [
  "activities",
  "bookings",
  "expenses",
  "places",
  "contacts",
  "checklists",
  "memories",
];

let dbPromise: Promise<IDBPDatabase<HandbookDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<HandbookDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HandbookDB>(DB_NAME, SCHEMA_VERSION, {
      upgrade(db) {
        for (const name of ["meta", "trip", ...COLLECTIONS, "attachments"] as const) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: name === "meta" ? "key" : "id" });
          }
        }
      },
    });
  }
  return dbPromise;
}

/** For tests: forget the cached connection. */
export async function resetDbConnection(): Promise<void> {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}

/** Load all data, seeding the known trip details on first run. */
export async function loadAll(): Promise<TripData> {
  const db = await getDb();
  const seeded = await db.get("meta", "seeded");
  if (!seeded) {
    await replaceAll(seedData());
    await db.put("meta", { key: "seeded", value: new Date().toISOString() });
  }
  const trips = await db.getAll("trip");
  const trip = trips[0] ?? seedData().trip;
  const [activities, bookings, expenses, places, contacts, checklists, memories] = await Promise.all(
    COLLECTIONS.map((c) => db.getAll(c)),
  );
  return {
    trip,
    activities,
    bookings,
    expenses,
    places,
    contacts,
    checklists,
    memories,
  } as TripData;
}

export async function saveTrip(trip: Trip): Promise<void> {
  const db = await getDb();
  await db.put("trip", trip);
}

export async function putRecord<C extends CollectionName>(
  collection: C,
  record: TripData[C][number],
): Promise<void> {
  const db = await getDb();
  // The union of store value types is too wide for idb's generics here.
  await db.put(collection, record as never);
}

export async function putRecords<C extends CollectionName>(
  collection: C,
  records: TripData[C][number][],
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(collection, "readwrite");
  await Promise.all([...records.map((r) => tx.store.put(r as never)), tx.done]);
}

export async function deleteRecord(collection: CollectionName, id: string): Promise<void> {
  const db = await getDb();
  await db.delete(collection, id);
}

/** Replace all structured data in one transaction. Attachments are untouched. */
export async function replaceAll(data: TripData): Promise<void> {
  const db = await getDb();
  const stores = ["trip", ...COLLECTIONS] as const;
  const tx = db.transaction(stores, "readwrite");
  const ops: Promise<unknown>[] = [];
  for (const s of stores) ops.push(tx.objectStore(s).clear());
  ops.push(tx.objectStore("trip").put(data.trip));
  for (const c of COLLECTIONS) {
    for (const r of data[c]) ops.push(tx.objectStore(c).put(r as never));
  }
  await Promise.all([...ops, tx.done]);
}

/** Wipe everything, including attachments, and re-seed on next load. */
export async function clearEverything(): Promise<void> {
  const db = await getDb();
  const stores = ["meta", "trip", ...COLLECTIONS, "attachments"] as const;
  const tx = db.transaction(stores, "readwrite");
  await Promise.all([...stores.map((s) => tx.objectStore(s).clear()), tx.done]);
}

// ---- Attachments ----

export async function saveAttachment(file: File | Blob, name: string, id: string): Promise<AttachmentMeta> {
  const db = await getDb();
  const record: Attachment = {
    id,
    name,
    type: file.type || "application/octet-stream",
    size: file.size,
    blob: file,
    createdAt: new Date().toISOString(),
  };
  await db.put("attachments", record);
  const { blob: _blob, ...meta } = record;
  void _blob;
  return meta;
}

export async function getAttachment(id: string): Promise<Attachment | undefined> {
  const db = await getDb();
  return db.get("attachments", id);
}

export async function deleteAttachment(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("attachments", id);
}

export async function listAttachmentMeta(): Promise<AttachmentMeta[]> {
  const db = await getDb();
  const all = await db.getAll("attachments");
  return all.map(({ blob: _b, ...meta }) => {
    void _b;
    return meta;
  });
}

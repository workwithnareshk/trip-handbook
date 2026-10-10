"use client";

// App-wide data store: loads everything from IndexedDB once, keeps it in
// React state, and writes every change straight back to IndexedDB.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as db from "./db";
import { nowIso } from "./ids";
import type { CollectionName, Trip, TripData } from "./types";
import { useToast } from "@/components/Toast";

type Status = "loading" | "ready" | "error";

type StoreValue = {
  status: Status;
  error?: string;
  data: TripData | null;
  updateTrip: (patch: Partial<Trip>) => Promise<boolean>;
  upsert: <C extends CollectionName>(collection: C, record: TripData[C][number], message?: string) => Promise<boolean>;
  upsertMany: <C extends CollectionName>(collection: C, records: TripData[C][number][], message?: string) => Promise<boolean>;
  remove: (collection: CollectionName, id: string, message?: string) => Promise<boolean>;
  replaceData: (data: TripData) => Promise<boolean>;
  clearAll: () => Promise<boolean>;
  reload: () => Promise<void>;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string>();
  const [data, setData] = useState<TripData | null>(null);

  const reload = useCallback(async () => {
    try {
      setStatus("loading");
      if (typeof indexedDB === "undefined") throw new Error("This browser does not support offline storage (IndexedDB).");
      const loaded = await db.loadAll();
      setData(loaded);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const fail = useCallback(
    (e: unknown) => {
      toast.show(`Could not save: ${e instanceof Error ? e.message : String(e)}`, "error");
      return false;
    },
    [toast],
  );

  const updateTrip = useCallback(
    async (patch: Partial<Trip>) => {
      if (!data) return false;
      const trip = { ...data.trip, ...patch, updatedAt: nowIso() };
      setData((d) => (d ? { ...d, trip } : d));
      try {
        await db.saveTrip(trip);
        toast.show("Trip details saved");
        return true;
      } catch (e) {
        return fail(e);
      }
    },
    [data, toast, fail],
  );

  const upsertMany = useCallback(
    async <C extends CollectionName>(collection: C, records: TripData[C][number][], message = "Saved") => {
      const stamped = records.map((r) => ({ ...r, updatedAt: nowIso() }));
      setData((d) => {
        if (!d) return d;
        const list = [...(d[collection] as TripData[C][number][])];
        for (const r of stamped) {
          const idx = list.findIndex((x) => x.id === r.id);
          if (idx >= 0) list[idx] = r;
          else list.push(r);
        }
        return { ...d, [collection]: list };
      });
      try {
        await db.putRecords(collection, stamped);
        if (message) toast.show(message);
        return true;
      } catch (e) {
        return fail(e);
      }
    },
    [toast, fail],
  );

  const upsert = useCallback(
    <C extends CollectionName>(collection: C, record: TripData[C][number], message = "Saved") =>
      upsertMany(collection, [record], message),
    [upsertMany],
  );

  const remove = useCallback(
    async (collection: CollectionName, id: string, message = "Deleted") => {
      setData((d) => (d ? { ...d, [collection]: (d[collection] as { id: string }[]).filter((r) => r.id !== id) } : d));
      try {
        await db.deleteRecord(collection, id);
        if (message) toast.show(message);
        return true;
      } catch (e) {
        return fail(e);
      }
    },
    [toast, fail],
  );

  const replaceData = useCallback(
    async (next: TripData) => {
      try {
        await db.replaceAll(next);
        setData(next);
        toast.show("Backup restored");
        return true;
      } catch (e) {
        return fail(e);
      }
    },
    [toast, fail],
  );

  const clearAll = useCallback(async () => {
    try {
      await db.clearEverything();
      await reload();
      toast.show("All trip data cleared. The original trip outline was restored.");
      return true;
    } catch (e) {
      return fail(e);
    }
  }, [reload, toast, fail]);

  const value = useMemo<StoreValue>(
    () => ({ status, error, data, updateTrip, upsert, upsertMany, remove, replaceData, clearAll, reload }),
    [status, error, data, updateTrip, upsert, upsertMany, remove, replaceData, clearAll, reload],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/** Store data that is guaranteed loaded; use inside <DataGate>. */
export function useData(): TripData {
  const { data } = useStore();
  if (!data) throw new Error("useData called before data loaded");
  return data;
}

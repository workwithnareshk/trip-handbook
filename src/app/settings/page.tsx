"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Download, HardDrive, Printer, Smartphone, Trash2, Upload } from "lucide-react";
import { DEVICE_ONLY_NOTE } from "@/components/Attachments";
import { Button, Card, Dialog, Notice, PageHeader, TextField, buttonClass } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { backupFileName, createBackup, mergeData, parseBackup, type ParseResult } from "@/lib/backup";
import { formatDate, isValidDate, isValidTime } from "@/lib/dates";
import { listAttachmentMeta } from "@/lib/db";
import { formatBytes, formatINR, parseAmount } from "@/lib/format";
import { useData, useStore } from "@/lib/store";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings & backup" />
      <Notice tone="green">
        <strong>This data is stored on this device.</strong> There is no account or cloud copy. Export a backup before changing phones or clearing browser data.
      </Notice>
      <div className="mt-4 space-y-4">
        <TripDetails />
        <BackupSection />
        <InstallSection />
        <StorageSection />
        <DangerZone />
      </div>
    </>
  );
}

function TripDetails() {
  const data = useData();
  const { updateTrip } = useStore();
  const [form, setForm] = useState({
    name: data.trip.name,
    startDate: data.trip.startDate,
    endDate: data.trip.endDate,
    budget: data.trip.budget === undefined ? "" : String(data.trip.budget),
    airportTargetStart: data.trip.airportTargetStart,
    airportTargetEnd: data.trip.airportTargetEnd,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Add a trip name.";
    if (!isValidDate(form.startDate)) e.startDate = "Use a valid date.";
    if (!isValidDate(form.endDate)) e.endDate = "Use a valid date.";
    else if (form.endDate < form.startDate) e.endDate = "End date is before the start date.";
    const budget = parseAmount(form.budget);
    if (Number.isNaN(budget)) e.budget = "Enter a positive amount or leave blank.";
    if (!isValidTime(form.airportTargetStart)) e.airportTargetStart = "Use a valid time.";
    if (!isValidTime(form.airportTargetEnd)) e.airportTargetEnd = "Use a valid time.";
    setErrors(e);
    if (Object.keys(e).length) return;
    void updateTrip({
      name: form.name.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      budget,
      airportTargetStart: form.airportTargetStart,
      airportTargetEnd: form.airportTargetEnd,
    });
  };

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-palm-900">Trip details</h2>
      <form
        className="grid grid-cols-2 gap-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          save();
        }}
      >
        <TextField className="col-span-2" label="Trip name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <TextField label="Start date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} error={errors.startDate} />
        <TextField label="End date" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} error={errors.endDate} />
        <TextField className="col-span-2" label="Budget (₹, optional)" inputMode="decimal" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} error={errors.budget} />
        <TextField label="Reach COK from" type="time" value={form.airportTargetStart} onChange={(e) => setForm({ ...form, airportTargetStart: e.target.value })} error={errors.airportTargetStart} />
        <TextField label="Reach COK by" type="time" value={form.airportTargetEnd} onChange={(e) => setForm({ ...form, airportTargetEnd: e.target.value })} error={errors.airportTargetEnd} />
        <p className="col-span-2 text-xs text-muted">Departure-day airport target is a planning target only, not a live traffic estimate. Times are India Standard Time.</p>
        <div className="col-span-2">
          <Button type="submit" variant="primary">
            Save trip details
          </Button>
        </div>
      </form>
    </Card>
  );
}

function BackupSection() {
  const data = useData();
  const { replaceData } = useStore();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(createBackup(data), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = backupFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.show("Backup downloaded");
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setParsed({ ok: false, error: "This file is too large to be a trip backup." });
      return;
    }
    setParsed(parseBackup(await file.text()));
    if (fileInput.current) fileInput.current.value = "";
  };

  const apply = async (mode: "replace" | "merge") => {
    if (!parsed?.ok) return;
    const next = mode === "replace" ? parsed.data : mergeData(data, parsed.data);
    if (await replaceData(next)) setParsed(null);
  };

  return (
    <Card>
      <h2 className="mb-1 font-semibold text-palm-900">Backup and restore</h2>
      <p className="mb-3 text-sm text-muted">
        The JSON backup contains the itinerary, bookings, expenses, checklists, places, contacts and memory notes. Attached files and photos are not included.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={exportJson}>
          <Download size={18} aria-hidden /> Export JSON backup
        </Button>
        <Button onClick={() => fileInput.current?.click()}>
          <Upload size={18} aria-hidden /> Import backup
        </Button>
        <Link href="/print/" className={buttonClass("secondary")}>
          <Printer size={18} aria-hidden /> Printable summary
        </Link>
      </div>
      <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} onChange={(e) => void onFile(e.target.files?.[0])} aria-label="Choose backup file" />

      <Dialog
        open={!!parsed}
        onClose={() => setParsed(null)}
        title={parsed?.ok ? "Check the backup" : "Cannot import this file"}
        footer={
          parsed?.ok ? (
            <>
              <Button onClick={() => setParsed(null)}>Cancel</Button>
              <Button onClick={() => void apply("merge")}>Merge</Button>
              <Button variant="danger" onClick={() => void apply("replace")}>
                Replace all
              </Button>
            </>
          ) : (
            <Button onClick={() => setParsed(null)}>Close</Button>
          )
        }
      >
        {parsed && !parsed.ok && <p className="text-sm text-rose-800">{parsed.error}</p>}
        {parsed?.ok && (
          <div className="space-y-3 text-sm">
            <p>
              <strong>{parsed.preview.tripName}</strong>
              {parsed.preview.exportedAt && <> · exported {formatDate(parsed.preview.exportedAt.slice(0, 10))}</>}
            </p>
            <table className="w-full text-left">
              <thead>
                <tr className="text-muted">
                  <th className="py-1 font-medium">Records</th>
                  <th className="py-1 font-medium">In backup</th>
                  <th className="py-1 font-medium">On this device</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(parsed.preview.counts).map(([k, v]) => (
                  <tr key={k} className="border-t border-sand-100">
                    <td className="py-1 capitalize">{k}</td>
                    <td className="py-1">{v}</td>
                    <td className="py-1">{(data as unknown as Record<string, unknown[]>)[k].length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.warnings.map((w) => (
              <Notice key={w}>{w}</Notice>
            ))}
            <p className="text-muted">
              <strong>Merge</strong> adds the backup’s records and overwrites ones with the same ID, keeping everything else. <strong>Replace all</strong> swaps
              the data on this device for the backup. Attached files on this device are not touched.
            </p>
          </div>
        )}
      </Dialog>
    </Card>
  );
}

function InstallSection() {
  const [promptEvent, setPromptEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-palm-900">
        <Smartphone size={18} aria-hidden /> Install on your phone
      </h2>
      {installed ? (
        <p className="text-sm text-muted">The handbook is installed and opens like an app.</p>
      ) : (
        <>
          <p className="text-sm text-muted">
            Installing keeps the handbook on your home screen and lets it open without mobile data after the first load.
          </p>
          {promptEvent ? (
            <Button
              className="mt-2"
              variant="primary"
              onClick={async () => {
                await promptEvent.prompt();
                setPromptEvent(null);
              }}
            >
              Install app
            </Button>
          ) : (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              <li>Open this page in Chrome on Android.</li>
              <li>Tap the ⋮ menu, then <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li>
              <li>Open it once while online so every screen is saved for offline use.</li>
            </ol>
          )}
        </>
      )}
    </Card>
  );
}

function StorageSection() {
  const [info, setInfo] = useState<{ usage?: number; quota?: number; persisted?: boolean; files: number; fileBytes: number } | null>(null);
  const toast = useToast();

  const refresh = async () => {
    const files = await listAttachmentMeta().catch(() => []);
    const est = navigator.storage?.estimate ? await navigator.storage.estimate() : {};
    const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : undefined;
    setInfo({ usage: est.usage, quota: est.quota, persisted, files: files.length, fileBytes: files.reduce((s, f) => s + f.size, 0) });
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-palm-900">
        <HardDrive size={18} aria-hidden /> Storage on this device
      </h2>
      {info && (
        <ul className="space-y-1 text-sm">
          {info.usage !== undefined && (
            <li>
              Using {formatBytes(info.usage)}
              {info.quota ? ` of about ${formatBytes(info.quota)} available to this site` : ""}
            </li>
          )}
          <li>
            {info.files} attached file{info.files === 1 ? "" : "s"} ({formatBytes(info.fileBytes)})
          </li>
          <li>{info.persisted ? "Protected from automatic clean-up by the browser." : "The browser may clear this data if the phone runs low on space."}</li>
        </ul>
      )}
      <p className="mt-2 text-xs text-muted">{DEVICE_ONLY_NOTE}</p>
      {info && !info.persisted && navigator.storage?.persist && (
        <Button
          className="mt-2"
          onClick={async () => {
            const ok = await navigator.storage.persist();
            toast.show(ok ? "Storage protected" : "The browser did not allow this. Installing the app usually helps.", ok ? "success" : "error");
            void refresh();
          }}
        >
          Ask the browser to keep this data
        </Button>
      )}
    </Card>
  );
}

function DangerZone() {
  const { clearAll } = useStore();
  const data = useData();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const money = data.expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <Card className="border-rose-200">
      <h2 className="mb-1 font-semibold text-rose-800">Clear all trip data</h2>
      <p className="text-sm text-muted">Deletes everything on this device, including attached files and photos, and restores the original trip outline.</p>
      <Button className="mt-2" variant="danger" onClick={() => setOpen(true)}>
        <Trash2 size={18} aria-hidden /> Clear all trip data
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setTyped("");
        }}
        title="Clear all trip data?"
        footer={
          <>
            <Button
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={typed.trim().toUpperCase() !== "DELETE"}
              onClick={async () => {
                await clearAll();
                setOpen(false);
                setTyped("");
              }}
            >
              Delete everything
            </Button>
          </>
        }
      >
        <p className="text-sm">
          This removes {data.bookings.length} bookings, {data.expenses.length} expenses ({formatINR(money)}), all checklists, contacts, notes and files from this device. It cannot be undone. Export a backup first if you might need it.
        </p>
        <TextField className="mt-3" label="Type DELETE to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </Dialog>
    </Card>
  );
}

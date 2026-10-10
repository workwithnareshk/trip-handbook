"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { bookingBalance } from "@/lib/calc";
import { isValidDate, isValidTime } from "@/lib/dates";
import { formatINR, isValidAmount, isValidPhone, isValidUrl, parseAmount } from "@/lib/format";
import { newId, nowIso } from "@/lib/ids";
import { BOOKING_CATEGORIES, BOOKING_CATEGORY_LABEL, BOOKING_STATUSES, BOOKING_STATUS_LABEL } from "@/lib/labels";
import { defaultChecklistFor } from "@/lib/seed";
import { useData, useStore } from "@/lib/store";
import type { Booking, BookingCategory, BookingStatus } from "@/lib/types";
import { AttachmentList } from "./Attachments";
import { BookingActions } from "./BookingCard";
import { ChecklistEditor } from "./ChecklistEditor";
import { Button, Card, CheckboxField, ConfirmDialog, Notice, SelectField, TextArea, TextField } from "./ui";

export function blankBooking(tripId: string, category: BookingCategory = "other"): Booking {
  const now = nowIso();
  const id = newId("bk");
  return {
    id,
    tripId,
    category,
    title: "",
    status: "not-started",
    amountKind: "quoted",
    attachmentIds: [],
    checklist: defaultChecklistFor(category, `${id}_chk`),
    createdAt: now,
    updatedAt: now,
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-3 font-semibold text-palm-900">{title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

/** Amount input that keeps the raw text so partially typed values are not lost. */
function MoneyField({
  label,
  value,
  onChange,
  error,
  hint,
}: {
  label: string;
  value: number | undefined;
  onChange: (raw: string) => void;
  error?: string;
  hint?: string;
}) {
  const [raw, setRaw] = useState(value === undefined ? "" : String(value));
  return (
    <TextField
      label={label}
      inputMode="decimal"
      placeholder="₹"
      value={raw}
      onChange={(e) => {
        setRaw(e.target.value);
        onChange(e.target.value);
      }}
      error={error}
      hint={hint}
    />
  );
}

export function BookingForm({ initial, isNew }: { initial: Booking; isNew: boolean }) {
  const router = useRouter();
  const data = useData();
  const { upsert, upsertMany, remove } = useStore();
  const [form, setForm] = useState<Booking>(initial);
  const [amountRaw, setAmountRaw] = useState({ amount: "", amountPaid: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof Booking>(key: K, value: Booking[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setCab = (patch: Partial<NonNullable<Booking["cab"]>>) => setForm((f) => ({ ...f, cab: { ...f.cab, ...patch } }));
  const setFlight = (patch: Partial<NonNullable<Booking["flight"]>>) =>
    setForm((f) => ({ ...f, flight: { ...f.flight, ...patch } }));

  const setMoney = (key: "amount" | "amountPaid", raw: string) => {
    setAmountRaw((r) => ({ ...r, [key]: raw }));
    const v = parseAmount(raw);
    set(key, Number.isNaN(v) ? form[key] : v);
  };

  const changeCategory = (category: BookingCategory) => {
    // Swap in the default checklist only if the current one is untouched.
    const untouched = form.checklist.every((c) => !c.checked);
    const defaults = defaultChecklistFor(form.category, "x").map((c) => c.title).join("|");
    const current = [...form.checklist].sort((a, b) => a.order - b.order).map((c) => c.title).join("|");
    setForm((f) => ({
      ...f,
      category,
      checklist: untouched && (current === defaults || f.checklist.length === 0) ? defaultChecklistFor(category, `${f.id}_chk_${Date.now()}`) : f.checklist,
    }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Add a name for this booking.";
    for (const k of ["startDate", "endDate", "paymentDueDate", "cancellationDeadline"] as const) {
      if (form[k] && !isValidDate(form[k])) e[k] = "Use a valid date.";
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) e.endDate = "End date is before the start date.";
    if (form.phone && !isValidPhone(form.phone)) e.phone = "Use digits only, e.g. 98765 43210 or +91 98765 43210.";
    if (form.url && !isValidUrl(form.url)) e.url = "Use a full link starting with https://";
    for (const k of ["amount", "amountPaid"] as const) {
      if (Number.isNaN(parseAmount(amountRaw[k])) || !isValidAmount(form[k])) e[k] = "Enter a positive amount in rupees.";
    }
    for (const k of ["departureTime", "arrivalTime"] as const) {
      if (form.flight?.[k] && !isValidTime(form.flight[k])) e[k] = "Use a valid time.";
    }
    if (form.cab?.pickupDate && !isValidDate(form.cab.pickupDate)) e.pickupDate = "Use a valid date.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) {
      setTimeout(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(), 0);
      return;
    }
    const ok = await upsert("bookings", { ...form, title: form.title.trim() }, isNew ? "Booking added" : "Booking saved");
    if (ok && isNew) router.replace(`/bookings/edit/?id=${encodeURIComponent(form.id)}`);
  };

  const doDelete = async () => {
    // Unlink from activities and expenses so nothing points at a missing booking.
    const acts = data.activities.filter((a) => a.bookingIds.includes(form.id)).map((a) => ({ ...a, bookingIds: a.bookingIds.filter((x) => x !== form.id) }));
    const exps = data.expenses.filter((x) => x.bookingId === form.id).map((x) => ({ ...x, bookingId: undefined }));
    if (acts.length) await upsertMany("activities", acts, "");
    if (exps.length) await upsertMany("expenses", exps, "");
    if (await remove("bookings", form.id, "Booking deleted")) router.push("/bookings/");
  };

  const balance = bookingBalance(form);
  const overpaid = form.amount !== undefined && (form.amountPaid ?? 0) > form.amount;
  const linkedActivities = data.activities.filter((a) => a.bookingIds.includes(form.id));
  const isStay = form.category === "accommodation" || form.category === "houseboat";

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      {!isNew && <BookingActions booking={initial} />}

      <Section title="Basics">
        <TextField className="sm:col-span-2" label="Name / title" value={form.title} onChange={(e) => set("title", e.target.value)} error={errors.title} required />
        <SelectField
          label="Category"
          value={form.category}
          onChange={(e) => changeCategory(e.target.value as BookingCategory)}
          options={BOOKING_CATEGORIES.map((c) => ({ value: c, label: BOOKING_CATEGORY_LABEL[c] }))}
        />
        <SelectField
          label="Status"
          value={form.status}
          onChange={(e) => set("status", e.target.value as BookingStatus)}
          options={BOOKING_STATUSES.map((s) => ({ value: s, label: BOOKING_STATUS_LABEL[s] }))}
          hint="Only mark Booked or Paid once you have the confirmation."
        />
        <TextField label={isStay ? "Check-in date" : "Date / start date"} type="date" value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value || undefined)} error={errors.startDate} />
        <TextField label={isStay ? "Check-out date" : "End date (optional)"} type="date" value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value || undefined)} error={errors.endDate} />
        <TextField className="sm:col-span-2" label={isStay ? "Address / location" : "Location"} value={form.location ?? ""} onChange={(e) => set("location", e.target.value || undefined)} />
        <TextField label="Provider" value={form.provider ?? ""} onChange={(e) => set("provider", e.target.value || undefined)} />
        <TextField
          label={form.category === "flight" ? "PNR / booking reference" : "Confirmation / reference number"}
          value={form.referenceNumber ?? ""}
          onChange={(e) => set("referenceNumber", e.target.value || undefined)}
          autoCapitalize="characters"
        />
      </Section>

      {form.category === "flight" && (
        <Section title="Flight details">
          <TextField label="Airline" value={form.flight?.airline ?? ""} onChange={(e) => setFlight({ airline: e.target.value || undefined })} />
          <TextField label="Flight number" value={form.flight?.flightNumber ?? ""} onChange={(e) => setFlight({ flightNumber: e.target.value || undefined })} />
          <TextField label="Scheduled departure" type="time" value={form.flight?.departureTime ?? ""} onChange={(e) => setFlight({ departureTime: e.target.value || undefined })} error={errors.departureTime} />
          <TextField label="Scheduled arrival" type="time" value={form.flight?.arrivalTime ?? ""} onChange={(e) => setFlight({ arrivalTime: e.target.value || undefined })} error={errors.arrivalTime} />
          <TextField label="Terminal" value={form.flight?.terminal ?? ""} onChange={(e) => setFlight({ terminal: e.target.value || undefined })} />
          <TextField label="Seats" value={form.flight?.seats ?? ""} onChange={(e) => setFlight({ seats: e.target.value || undefined })} />
          <p className="text-xs text-muted sm:col-span-2">Stored times are scheduled times. Check the airline for live flight status.</p>
        </Section>
      )}

      {form.category === "cab" && (
        <Section title="Cab and driver">
          <TextField label="Driver name" value={form.cab?.driverName ?? ""} onChange={(e) => setCab({ driverName: e.target.value || undefined })} />
          <TextField label="Vehicle type" value={form.cab?.vehicleType ?? ""} onChange={(e) => setCab({ vehicleType: e.target.value || undefined })} placeholder="e.g. Innova Crysta" />
          <TextField label="Registration number" value={form.cab?.registrationNumber ?? ""} onChange={(e) => setCab({ registrationNumber: e.target.value || undefined })} autoCapitalize="characters" />
          <TextField label="Pickup date" type="date" value={form.cab?.pickupDate ?? ""} onChange={(e) => setCab({ pickupDate: e.target.value || undefined })} error={errors.pickupDate} />
          <TextField label="Pickup time" type="time" value={form.cab?.pickupTime ?? ""} onChange={(e) => setCab({ pickupTime: e.target.value || undefined })} />
          <TextField label="Pickup place" value={form.cab?.pickupPlace ?? ""} onChange={(e) => setCab({ pickupPlace: e.target.value || undefined })} />
          <TextField className="sm:col-span-2" label="Drop-off" value={form.cab?.dropoff ?? ""} onChange={(e) => setCab({ dropoff: e.target.value || undefined })} />
          <TextArea className="sm:col-span-2" label="Route" value={form.cab?.route ?? ""} onChange={(e) => setCab({ route: e.target.value || undefined })} placeholder="e.g. COK → Athirappilly → Munnar → Kumarakom → COK" hint="Used for “Open route in Maps”. Separate stops with → or commas." />
        </Section>
      )}

      <Section title="Contact">
        <TextField label={form.category === "cab" ? "Contact / office name" : "Contact name"} value={form.contactName ?? ""} onChange={(e) => set("contactName", e.target.value || undefined)} />
        <TextField
          label={form.category === "cab" ? "Driver phone" : "Phone"}
          type="tel"
          inputMode="tel"
          value={form.phone ?? ""}
          onChange={(e) => set("phone", e.target.value || undefined)}
          error={errors.phone}
          hint="10-digit Indian mobiles work for WhatsApp. Add +country code for others."
        />
        <TextField className="sm:col-span-2" label="Booking website / link" type="url" inputMode="url" placeholder="https://" value={form.url ?? ""} onChange={(e) => set("url", e.target.value || undefined)} error={errors.url} />
      </Section>

      <Section title="Money">
        <MoneyField
          label={form.amountKind === "estimated" ? "Estimated total (₹)" : "Quoted total (₹)"}
          value={form.amount}
          onChange={(raw) => setMoney("amount", raw)}
          error={errors.amount}
        />
        <SelectField
          label="This amount is"
          value={form.amountKind}
          onChange={(e) => set("amountKind", e.target.value as Booking["amountKind"])}
          options={[
            { value: "quoted", label: "Quoted by the provider" },
            { value: "estimated", label: "My estimate" },
          ]}
        />
        <MoneyField label="Paid so far / advance (₹)" value={form.amountPaid} onChange={(raw) => setMoney("amountPaid", raw)} error={errors.amountPaid} />
        <div className="rounded-xl bg-sand-100 px-3 py-2">
          <p className="text-sm text-muted">Balance (calculated)</p>
          <p className="text-lg font-semibold">{form.amount === undefined ? "—" : formatINR(balance)}</p>
        </div>
        {overpaid && <Notice>Paid amount is more than the total. Check the figures.</Notice>}
        <TextField label="Payment due date" type="date" value={form.paymentDueDate ?? ""} onChange={(e) => set("paymentDueDate", e.target.value || undefined)} error={errors.paymentDueDate} />
        <TextField label="Free cancellation until" type="date" value={form.cancellationDeadline ?? ""} onChange={(e) => set("cancellationDeadline", e.target.value || undefined)} error={errors.cancellationDeadline} />
        <p className="text-xs text-muted sm:col-span-2">
          Booking amounts are commitments, not expenses. Log actual payments on the Expenses page and link them to this booking so they are not counted twice. Never store card numbers, CVV or passwords here.
        </p>
      </Section>

      <Card>
        <h2 className="mb-1 font-semibold text-palm-900">
          {form.category === "cab" ? "Inclusions checklist" : isStay ? `${BOOKING_CATEGORY_LABEL[form.category]} checklist` : "Checklist"}
        </h2>
        <ChecklistEditor label="Booking checklist" items={form.checklist} onChange={(items) => set("checklist", items)} />
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold text-palm-900">Notes</h2>
        <TextArea label="Notes" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value || undefined)} rows={4} />
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold text-palm-900">Linked itinerary activities</h2>
        {data.activities.length === 0 ? (
          <p className="text-sm text-muted">No activities in the itinerary.</p>
        ) : (
          <LinkedActivities bookingId={form.id} />
        )}
        {linkedActivities.length === 0 && <p className="text-sm text-muted">Not linked to any activity yet.</p>}
      </Card>

      {!isNew && (
        <Card>
          <h2 className="mb-2 font-semibold text-palm-900">Tickets and files</h2>
          <AttachmentList
            ids={form.attachmentIds}
            onChange={(attachmentIds) => {
              set("attachmentIds", attachmentIds);
              // Persist only the attachment change; other edits wait for Save.
              const stored = data.bookings.find((b) => b.id === form.id) ?? initial;
              void upsert("bookings", { ...stored, attachmentIds }, "Attachments updated");
            }}
            accept="application/pdf,image/*"
          />
        </Card>
      )}

      <div className="no-print sticky bottom-20 z-30 flex flex-wrap gap-2 rounded-2xl border border-sand-200 bg-white/95 p-3 shadow-lg backdrop-blur md:bottom-4">
        <Button type="submit" variant="primary" className="flex-1">
          {isNew ? "Add booking" : "Save changes"}
        </Button>
        <Button onClick={() => router.push("/bookings/")}>Cancel</Button>
        {!isNew && (
          <Button variant="ghost" onClick={() => setConfirmDelete(true)} aria-label="Delete booking">
            <Trash2 size={18} aria-hidden />
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete booking?"
        message={<>“{form.title || "This booking"}” will be deleted. Linked activities and expenses are kept but unlinked. Attached files stay until you delete them in Settings.</>}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          void doDelete();
        }}
      />
    </form>
  );
}

function LinkedActivities({ bookingId }: { bookingId: string }) {
  const data = useData();
  const { upsert } = useStore();
  const sorted = [...data.activities].sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? -1 : 1));
  return (
    <details>
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-palm-700">
        {data.activities.filter((a) => a.bookingIds.includes(bookingId)).map((a) => a.title).join(", ") || "Choose activities"}
      </summary>
      <div className="max-h-64 overflow-y-auto">
        {sorted.map((a) => (
          <CheckboxField
            key={a.id}
            label={a.title}
            hint={a.date}
            checked={a.bookingIds.includes(bookingId)}
            onChange={(v) =>
              void upsert(
                "activities",
                { ...a, bookingIds: v ? [...a.bookingIds, bookingId] : a.bookingIds.filter((x) => x !== bookingId) },
                v ? "Linked" : "Unlinked",
              )
            }
          />
        ))}
      </div>
    </details>
  );
}

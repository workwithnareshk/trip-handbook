"use client";

import { useState } from "react";
import { dateRange, formatDayShort, isValidTime, timeToMinutes } from "@/lib/dates";
import { isValidUrl } from "@/lib/format";
import { newId, nowIso } from "@/lib/ids";
import { ACTIVITY_CATEGORIES, ACTIVITY_CATEGORY_LABEL, ACTIVITY_STATUS_LABEL, BOOKING_STATUS_LABEL } from "@/lib/labels";
import { VERIFY_NOTE } from "@/lib/seed";
import { useData, useStore } from "@/lib/store";
import type { ActivityCategory, ActivityStatus, ItineraryActivity } from "@/lib/types";
import { ChecklistEditor } from "./ChecklistEditor";
import { Button, CheckboxField, Dialog, Notice, SelectField, TextArea, TextField } from "./ui";

export function blankActivity(tripId: string, date: string, order: number, category: ActivityCategory = "sightseeing"): ItineraryActivity {
  const now = nowIso();
  return {
    id: newId("act"),
    tripId,
    date,
    title: category === "buffer" ? "Buffer time" : category === "travel" ? "Travel" : "",
    category,
    status: "planned",
    optional: false,
    bookingRequired: false,
    bookingIds: [],
    checklist: [],
    order,
    createdAt: now,
    updatedAt: now,
  };
}

/** Create / edit dialog for an itinerary activity. */
export function ActivityForm({
  activity,
  isNew,
  open,
  onClose,
}: {
  activity: ItineraryActivity;
  isNew: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const data = useData();
  const { upsert } = useStore();
  const [form, setForm] = useState<ItineraryActivity>(activity);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const days = dateRange(data.trip.startDate, data.trip.endDate);
  const dayOptions = days.includes(form.date) ? days : [form.date, ...days];

  const set = <K extends keyof ItineraryActivity>(key: K, value: ItineraryActivity[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Add a title.";
    if (form.startTime && !isValidTime(form.startTime)) e.startTime = "Use a valid time.";
    if (form.endTime && !isValidTime(form.endTime)) e.endTime = "Use a valid time.";
    if (isValidTime(form.startTime) && isValidTime(form.endTime) && timeToMinutes(form.endTime) <= timeToMinutes(form.startTime))
      e.endTime = "End time should be after the start time.";
    if (form.durationMinutes !== undefined && (!Number.isFinite(form.durationMinutes) || form.durationMinutes < 0))
      e.durationMinutes = "Use a positive number of minutes.";
    if (form.bookingUrl && !isValidUrl(form.bookingUrl)) e.bookingUrl = "Use a full link starting with https://";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    let record = { ...form, title: form.title.trim() };
    // Moving to another day puts the activity at the end of that day.
    if (!isNew && record.date !== activity.date) {
      record.order = Math.max(-1, ...data.activities.filter((a) => a.date === record.date).map((a) => a.order)) + 1;
    }
    record = clean(record);
    if (await upsert("activities", record, isNew ? "Activity added" : "Activity saved")) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isNew ? "Add activity" : "Edit activity"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()}>
            Save
          </Button>
        </>
      }
    >
      <form
        className="grid grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <TextField
          className="col-span-2"
          label="Title"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          error={errors.title}
          required
        />
        <SelectField
          label="Day"
          value={form.date}
          onChange={(e) => set("date", e.target.value)}
          options={dayOptions.map((d) => ({ value: d, label: `${formatDayShort(d)}${data.trip.dayLabels?.[d] ? ` · ${data.trip.dayLabels[d]}` : ""}` }))}
        />
        <SelectField
          label="Category"
          value={form.category}
          onChange={(e) => set("category", e.target.value as ActivityCategory)}
          options={ACTIVITY_CATEGORIES.map((c) => ({ value: c, label: ACTIVITY_CATEGORY_LABEL[c] }))}
        />
        <TextField
          label="Start time (planned)"
          type="time"
          value={form.startTime ?? ""}
          onChange={(e) => set("startTime", e.target.value || undefined)}
          error={errors.startTime}
        />
        <TextField
          label="End time (planned)"
          type="time"
          value={form.endTime ?? ""}
          onChange={(e) => set("endTime", e.target.value || undefined)}
          error={errors.endTime}
        />
        <TextField
          label="Estimated duration (minutes)"
          type="number"
          inputMode="numeric"
          min={0}
          value={form.durationMinutes ?? ""}
          onChange={(e) => set("durationMinutes", e.target.value === "" ? undefined : Number(e.target.value))}
          error={errors.durationMinutes}
          hint="Used when there is no end time."
        />
        <SelectField
          label="Status"
          value={form.status}
          onChange={(e) => set("status", e.target.value as ActivityStatus)}
          options={(["planned", "done", "skipped"] as const).map((s) => ({ value: s, label: ACTIVITY_STATUS_LABEL[s] }))}
        />
        <TextField
          className="col-span-2"
          label="Place"
          value={form.place ?? ""}
          onChange={(e) => set("place", e.target.value)}
        />
        <TextField
          className="col-span-2"
          label="Map search text"
          value={form.mapQuery ?? ""}
          onChange={(e) => set("mapQuery", e.target.value)}
          hint="What to search in Google Maps. Leave blank to use the place."
        />
        <TextArea
          className="col-span-2"
          label="Notes"
          value={form.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
        />
        <div className="col-span-2 grid gap-1 sm:grid-cols-2">
          <CheckboxField
            label="Optional / maybe"
            checked={form.optional}
            onChange={(v) => set("optional", v)}
            hint="Not a firm part of the plan yet."
          />
          <CheckboxField
            label="Booking or ticket needed"
            checked={form.bookingRequired}
            onChange={(v) => set("bookingRequired", v)}
          />
        </div>
        {form.bookingRequired && (
          <Notice>{VERIFY_NOTE}</Notice>
        )}
        <TextField
          className="col-span-2"
          label="Official booking / ticket link"
          type="url"
          inputMode="url"
          placeholder="https://"
          value={form.bookingUrl ?? ""}
          onChange={(e) => set("bookingUrl", e.target.value)}
          error={errors.bookingUrl}
        />
        <fieldset className="col-span-2">
          <legend className="mb-1 text-sm font-medium">Linked bookings</legend>
          {data.bookings.length === 0 ? (
            <p className="text-sm text-muted">No bookings yet.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-sand-200 bg-white px-3">
              {data.bookings.map((b) => (
                <CheckboxField
                  key={b.id}
                  label={b.title}
                  hint={BOOKING_STATUS_LABEL[b.status]}
                  checked={form.bookingIds.includes(b.id)}
                  onChange={(v) =>
                    set("bookingIds", v ? [...form.bookingIds, b.id] : form.bookingIds.filter((x) => x !== b.id))
                  }
                />
              ))}
            </div>
          )}
        </fieldset>
        <div className="col-span-2">
          <p className="mb-1 text-sm font-medium">Activity checklist (optional)</p>
          <ChecklistEditor
            label="Activity checklist"
            items={form.checklist}
            onChange={(items) => set("checklist", items)}
            showProgress={false}
            compact
          />
        </div>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

function clean(a: ItineraryActivity): ItineraryActivity {
  const out = { ...a };
  for (const k of ["place", "mapQuery", "notes", "bookingUrl", "startTime", "endTime"] as const) {
    const v = out[k]?.trim();
    out[k] = v ? v : undefined;
  }
  return out;
}

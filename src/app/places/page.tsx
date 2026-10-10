"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ExternalLink, MapPin, Navigation, Pencil, Plus, Trash2 } from "lucide-react";
import { ActionLink, Button, Card, ConfirmDialog, Dialog, EmptyState, IconButton, PageHeader, SelectField, TextArea, TextField } from "@/components/ui";
import { dateRange, formatDayShort, isValidDate } from "@/lib/dates";
import { isValidUrl, mapsDirectionsHref, mapsSearchHref } from "@/lib/format";
import { newId, nowIso } from "@/lib/ids";
import { useData, useStore } from "@/lib/store";
import type { Place } from "@/lib/types";

/** Text used for map searches: address if known, else name plus area. */
function placeQuery(p: Place): string {
  if (p.address?.trim()) return p.address;
  return [p.name, p.area && p.area !== "To confirm" ? p.area : "", "Kerala"].filter(Boolean).join(", ");
}

export default function PlacesPage() {
  const data = useData();
  const { upsert, remove } = useStore();
  const [editing, setEditing] = useState<{ place: Place; isNew: boolean } | null>(null);
  const [deleting, setDeleting] = useState<Place | null>(null);
  const [filter, setFilter] = useState<"all" | "todo" | "visited">("all");

  const places = [...data.places]
    .filter((p) => (filter === "all" ? true : filter === "visited" ? p.visited : !p.visited))
    .sort((a, b) => (a.plannedDate ?? "9999").localeCompare(b.plannedDate ?? "9999") || a.name.localeCompare(b.name));

  const add = () => {
    const now = nowIso();
    setEditing({ place: { id: newId("pl"), tripId: data.trip.id, name: "", visited: false, createdAt: now, updatedAt: now }, isNew: true });
  };

  return (
    <>
      <PageHeader
        title="Places & maps"
        subtitle="Map links open Google Maps. No exact addresses are filled in for you."
        actions={
          <Button variant="primary" onClick={add}>
            <Plus size={18} aria-hidden /> Add place
          </Button>
        }
      />

      <div className="mb-3 grid grid-cols-3 rounded-xl bg-sand-100 p-1" role="group" aria-label="Filter places">
        {(
          [
            ["all", "All"],
            ["todo", "Not visited"],
            ["visited", "Visited"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={filter === k}
            onClick={() => setFilter(k)}
            className={`min-h-11 rounded-lg text-sm font-medium ${filter === k ? "bg-white text-palm-900 shadow-sm" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {places.length === 0 ? (
        <EmptyState icon={<MapPin size={28} />} title={data.places.length ? "No places match" : "No places yet"} />
      ) : (
        <ul className="space-y-2">
          {places.map((p) => (
            <li key={p.id}>
              <Card className="p-3">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    aria-pressed={p.visited}
                    aria-label={p.visited ? `Mark ${p.name} as not visited` : `Mark ${p.name} as visited`}
                    onClick={() => void upsert("places", { ...p, visited: !p.visited }, p.visited ? "Marked not visited" : "Marked visited")}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-palm-700 hover:bg-palm-50"
                  >
                    {p.visited ? <CheckCircle2 size={24} aria-hidden /> : <Circle size={24} aria-hidden />}
                  </button>
                  <div className="min-w-0 flex-1 pt-1">
                    <h2 className={`font-semibold ${p.visited ? "text-muted" : ""}`}>{p.name}</h2>
                    <p className="text-sm text-muted">
                      {[p.area, p.plannedDate ? `Planned ${formatDayShort(p.plannedDate)}` : ""].filter(Boolean).join(" · ")}
                    </p>
                    {p.address && <p className="text-sm">{p.address}</p>}
                    {p.notes && <p className="mt-1 whitespace-pre-line text-sm text-muted">{p.notes}</p>}
                  </div>
                  <IconButton label={`Edit ${p.name}`} onClick={() => setEditing({ place: p, isNew: false })}>
                    <Pencil size={18} aria-hidden />
                  </IconButton>
                  <IconButton label={`Delete ${p.name}`} onClick={() => setDeleting(p)}>
                    <Trash2 size={18} aria-hidden />
                  </IconButton>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 pl-12">
                  <ActionLink href={mapsSearchHref(placeQuery(p))} disabledReason="No place name">
                    <MapPin size={16} aria-hidden /> Map
                  </ActionLink>
                  <ActionLink href={mapsDirectionsHref(placeQuery(p))} disabledReason="No place name">
                    <Navigation size={16} aria-hidden /> Directions
                  </ActionLink>
                  {p.officialUrl && (
                    <ActionLink href={p.officialUrl} disabledReason="">
                      <ExternalLink size={16} aria-hidden /> Official site
                    </ActionLink>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <PlaceDialog
          key={editing.place.id}
          place={editing.place}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSave={async (p) => {
            if (await upsert("places", p, editing.isNew ? "Place added" : "Place saved")) setEditing(null);
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title="Delete place?"
        message={<>“{deleting?.name}” will be removed from your places.</>}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) void remove("places", deleting.id, "Place deleted");
          setDeleting(null);
        }}
      />
    </>
  );
}

function PlaceDialog({ place, isNew, onSave, onClose }: { place: Place; isNew: boolean; onSave: (p: Place) => void; onClose: () => void }) {
  const data = useData();
  const [form, setForm] = useState(place);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const days = dateRange(data.trip.startDate, data.trip.endDate);

  const submit = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Add the place name.";
    if (form.officialUrl && !isValidUrl(form.officialUrl)) e.officialUrl = "Use a full link starting with https://";
    if (form.plannedDate && !isValidDate(form.plannedDate)) e.plannedDate = "Use a valid date.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const trim = (v?: string) => v?.trim() || undefined;
    onSave({ ...form, name: form.name.trim(), area: trim(form.area), address: trim(form.address), officialUrl: trim(form.officialUrl), notes: trim(form.notes) });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={isNew ? "Add place" : "Edit place"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>
            Save
          </Button>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <TextField label="Area" value={form.area ?? ""} onChange={(e) => setForm({ ...form, area: e.target.value })} />
        <SelectField
          label="Planned day"
          value={form.plannedDate ?? ""}
          onChange={(e) => setForm({ ...form, plannedDate: e.target.value || undefined })}
          options={[{ value: "", label: "Not planned" }, ...days.map((d) => ({ value: d, label: formatDayShort(d) }))]}
          error={errors.plannedDate}
        />
        <TextField label="Address or exact map search" value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} hint="Optional. Paste from an official source or Google Maps." />
        <TextField label="Official website" type="url" inputMode="url" placeholder="https://" value={form.officialUrl ?? ""} onChange={(e) => setForm({ ...form, officialUrl: e.target.value })} error={errors.officialUrl} />
        <TextArea label="Notes" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Clock, Pencil, Plus, Route } from "lucide-react";
import { ActivityCard } from "@/components/ActivityCard";
import { ActivityForm, blankActivity } from "@/components/ActivityForm";
import { DaySelector } from "@/components/DaySelector";
import { Button, ConfirmDialog, Dialog, EmptyState, Notice, PageHeader, TextField } from "@/components/ui";
import { activitiesForDay, findOverlaps, moveItem } from "@/lib/calc";
import { dateRange, formatDayLong, nowInIST } from "@/lib/dates";
import { useData, useStore } from "@/lib/store";
import type { ActivityCategory, ItineraryActivity } from "@/lib/types";

export default function ItineraryPage() {
  const data = useData();
  const { upsert, upsertMany, remove, updateTrip } = useStore();
  const days = dateRange(data.trip.startDate, data.trip.endDate);
  const today = nowInIST().date;
  const [view, setView] = useState<string>(days.includes(today) ? today : "all");
  const [editing, setEditing] = useState<{ activity: ItineraryActivity; isNew: boolean } | null>(null);
  const [deleting, setDeleting] = useState<ItineraryActivity | null>(null);
  const [renaming, setRenaming] = useState<{ date: string; label: string } | null>(null);
  const overlaps = useMemo(() => findOverlaps(data.activities), [data.activities]);

  // Activities on dates outside the trip (e.g. after changing trip dates) still show up.
  const extraDates = [...new Set(data.activities.map((a) => a.date))].filter((d) => !days.includes(d)).sort();
  const allDates = [...days, ...extraDates];
  const shownDays = view === "all" ? allDates : [view];

  const startAdd = (date: string, category?: ActivityCategory) => {
    const order = Math.max(-1, ...activitiesForDay(data.activities, date).map((a) => a.order)) + 1;
    setEditing({ activity: blankActivity(data.trip.id, date, order, category), isNew: true });
  };

  const move = (date: string, id: string, delta: -1 | 1) => {
    const reordered = moveItem(activitiesForDay(data.activities, date), id, delta);
    const changed = reordered.filter((a) => data.activities.find((x) => x.id === a.id)?.order !== a.order);
    void upsertMany("activities", changed, "Order updated");
  };

  return (
    <>
      <PageHeader
        title="Itinerary"
        subtitle="Draft plan. Every stop, time and day can be changed."
        actions={
          <Button variant="primary" onClick={() => startAdd(view === "all" ? (days.includes(today) ? today : days[0]) : view)}>
            <Plus size={18} aria-hidden /> Add activity
          </Button>
        }
      />

      <Notice>
        This itinerary is a <strong>draft, not a verified or final plan</strong>. Times are planned times only. Check opening hours, operating dates and tickets with official providers.
      </Notice>

      <div className="mt-4">
        <DaySelector days={days} selected={view} onSelect={setView} labels={data.trip.dayLabels} includeAll today={today} />
      </div>

      <div className="mt-4 space-y-8">
        {shownDays.map((date) => {
          const items = activitiesForDay(data.activities, date);
          const label = data.trip.dayLabels?.[date];
          return (
            <section key={date} aria-labelledby={`day-${date}`}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 id={`day-${date}`} className="text-lg font-semibold text-palm-900">
                    {formatDayLong(date)}
                  </h2>
                  <p className="flex items-center gap-1 text-sm text-muted">
                    {label || "No day label"}
                    {days.includes(date) && (
                      <button
                        type="button"
                        className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-sand-100"
                        aria-label={`Rename day label for ${formatDayLong(date)}`}
                        onClick={() => setRenaming({ date, label: label ?? "" })}
                      >
                        <Pencil size={14} aria-hidden />
                      </button>
                    )}
                    {!days.includes(date) && <span className="text-amber-800"> · Outside trip dates</span>}
                  </p>
                </div>
              </div>

              {items.length === 0 ? (
                <EmptyState icon={<CalendarDays size={28} />} title="Nothing planned for this day yet">
                  Add an activity, travel block or buffer below.
                </EmptyState>
              ) : (
                <ol className="space-y-2">
                  {items.map((a, idx) => (
                    <li key={a.id}>
                      <ActivityCard
                        activity={a}
                        bookings={data.bookings}
                        overlap={overlaps.has(a.id)}
                        isFirst={idx === 0}
                        isLast={idx === items.length - 1}
                        onEdit={() => setEditing({ activity: a, isNew: false })}
                        onStatus={(status) =>
                          void upsert("activities", { ...a, status }, status === "planned" ? "Marked as planned" : `Marked ${status}`)
                        }
                        onMove={(d) => move(date, a.id, d)}
                      />
                    </li>
                  ))}
                </ol>
              )}

              <div className="no-print mt-2 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => startAdd(date)}>
                  <Plus size={16} aria-hidden /> Activity
                </Button>
                <Button size="sm" onClick={() => startAdd(date, "travel")}>
                  <Route size={16} aria-hidden /> Travel block
                </Button>
                <Button size="sm" onClick={() => startAdd(date, "buffer")}>
                  <Clock size={16} aria-hidden /> Buffer
                </Button>
              </div>
            </section>
          );
        })}
      </div>

      {editing && (
        <ActivityForm
          key={editing.activity.id}
          open
          activity={editing.activity}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onDelete={() => {
            setDeleting(editing.activity);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete activity?"
        message={<>“{deleting?.title}” will be removed from the itinerary. Linked bookings are kept.</>}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) void remove("activities", deleting.id, "Activity deleted");
          setDeleting(null);
        }}
      />

      <Dialog
        open={!!renaming}
        onClose={() => setRenaming(null)}
        title="Day label"
        footer={
          <>
            <Button onClick={() => setRenaming(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (renaming) {
                  void updateTrip({ dayLabels: { ...data.trip.dayLabels, [renaming.date]: renaming.label.trim() } });
                }
                setRenaming(null);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        {renaming && (
          <TextField
            label={`Label for ${formatDayLong(renaming.date)}`}
            value={renaming.label}
            onChange={(e) => setRenaming({ ...renaming, label: e.target.value })}
            placeholder="e.g. Munnar"
          />
        )}
      </Dialog>
    </>
  );
}

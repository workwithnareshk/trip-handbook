"use client";

import { useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { AttachmentList } from "@/components/Attachments";
import { Button, Card, ConfirmDialog, Notice, PageHeader } from "@/components/ui";
import { deleteAttachment } from "@/lib/db";
import { dateRange, formatDayLong, nowInIST } from "@/lib/dates";
import { newId, nowIso } from "@/lib/ids";
import { useData, useStore } from "@/lib/store";
import type { Memory } from "@/lib/types";

export default function MemoriesPage() {
  const data = useData();
  const days = dateRange(data.trip.startDate, data.trip.endDate);
  const today = nowInIST().date;

  return (
    <>
      <PageHeader title="Memories" subtitle="A short note and a few photos for each day." />
      <Notice tone="gray">
        Photos are kept in this browser on this device only. They are not uploaded anywhere and are not included in JSON backups. Large photos use
        phone storage, so delete any you no longer need here.
      </Notice>
      <div className="mt-4 space-y-4">
        {days.map((d) => (
          <DayMemory key={d} date={d} isToday={d === today} memory={data.memories.find((m) => m.date === d)} />
        ))}
      </div>
    </>
  );
}

function DayMemory({ date, memory, isToday }: { date: string; memory?: Memory; isToday: boolean }) {
  const data = useData();
  const { upsert, remove } = useStore();
  const [note, setNote] = useState(memory?.note ?? "");
  const [confirmClear, setConfirmClear] = useState(false);
  const dirty = note !== (memory?.note ?? "");

  const base = (): Memory =>
    memory ?? { id: newId("mem"), tripId: data.trip.id, date, note: "", attachmentIds: [], createdAt: nowIso(), updatedAt: nowIso() };

  const clear = async () => {
    if (!memory) return;
    for (const id of memory.attachmentIds) await deleteAttachment(id);
    await remove("memories", memory.id, "Memory cleared");
    setNote("");
  };

  return (
    <Card className={isToday ? "border-palm-300" : ""}>
      <h2 className="font-semibold text-palm-900">
        {formatDayLong(date)}
        {isToday && <span className="ml-2 text-sm font-medium text-palm-600">Today</span>}
      </h2>
      {data.trip.dayLabels?.[date] && <p className="text-sm text-muted">{data.trip.dayLabels[date]}</p>}
      <label htmlFor={`note-${date}`} className="sr-only">
        Note for {formatDayLong(date)}
      </label>
      <textarea
        id={`note-${date}`}
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What made today special?"
        className="mt-2 block w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-base"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="primary" disabled={!dirty} onClick={() => void upsert("memories", { ...base(), note: note.trim() }, "Note saved")}>
          Save note
        </Button>
        {memory && (
          <Button variant="ghost" onClick={() => setConfirmClear(true)}>
            <Trash2 size={16} aria-hidden /> Clear day
          </Button>
        )}
      </div>
      <div className="mt-3">
        <p className="mb-1 flex items-center gap-1 text-sm font-medium">
          <Camera size={16} aria-hidden /> Photos
        </p>
        <AttachmentList
          ids={memory?.attachmentIds ?? []}
          accept="image/*"
          imagesAsThumbnails
          onChange={(attachmentIds) => void upsert("memories", { ...base(), note: memory?.note ?? note.trim(), attachmentIds }, "Photos updated")}
        />
      </div>
      <ConfirmDialog
        open={confirmClear}
        title="Clear this day?"
        message="The note and all photos for this day will be deleted from this device."
        confirmLabel="Clear"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false);
          void clear();
        }}
      />
    </Card>
  );
}

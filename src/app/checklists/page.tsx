"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp, ListChecks, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { ChecklistEditor } from "@/components/ChecklistEditor";
import { Button, Card, ConfirmDialog, Dialog, EmptyState, IconButton, PageHeader, ProgressBar, TextField } from "@/components/ui";
import { checklistProgress, combineProgress, moveItem } from "@/lib/calc";
import { formatDayShort } from "@/lib/dates";
import { newId, nowIso } from "@/lib/ids";
import { BOOKING_CATEGORY_LABEL } from "@/lib/labels";
import { useData, useStore } from "@/lib/store";
import type { Checklist } from "@/lib/types";

type Tab = "prep" | "bookings";

export default function ChecklistsPage() {
  const data = useData();
  const { upsert, upsertMany, remove } = useStore();
  const [tab, setTab] = useState<Tab>("prep");
  const [naming, setNaming] = useState<{ list: Checklist; isNew: boolean } | null>(null);
  const [deleting, setDeleting] = useState<Checklist | null>(null);
  const [resetting, setResetting] = useState<Checklist | null>(null);

  const lists = [...data.checklists].sort((a, b) => a.order - b.order);
  const overall = combineProgress(lists.map((l) => checklistProgress(l.items)));
  const bookings = data.bookings.filter((b) => b.status !== "cancelled" && b.checklist.length > 0);
  const activities = data.activities
    .filter((a) => a.checklist.length > 0)
    .sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? -1 : 1));

  const newList = () => {
    const now = nowIso();
    setNaming({
      list: { id: newId("cl"), tripId: data.trip.id, title: "", items: [], order: lists.length, createdAt: now, updatedAt: now },
      isNew: true,
    });
  };

  return (
    <>
      <PageHeader
        title="Checklists"
        subtitle={`Preparation: ${overall.done} of ${overall.total} done (${overall.percent}%)`}
        actions={
          tab === "prep" ? (
            <Button variant="primary" onClick={newList}>
              <Plus size={18} aria-hidden /> New list
            </Button>
          ) : undefined
        }
      />

      <div role="tablist" aria-label="Checklist type" className="mb-4 grid grid-cols-2 rounded-xl bg-sand-100 p-1">
        {(
          [
            ["prep", "Preparation"],
            ["bookings", "Bookings & activities"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`min-h-11 rounded-lg text-sm font-medium ${tab === key ? "bg-white text-palm-900 shadow-sm" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "prep" && (
        <div className="space-y-3">
          {lists.length === 0 && (
            <EmptyState icon={<ListChecks size={28} />} title="No checklists yet">
              Create a list for packing, documents or anything else.
            </EmptyState>
          )}
          {lists.map((l, idx) => {
            const p = checklistProgress(l.items);
            return (
              <Card key={l.id}>
                <details open={idx === 0 || undefined}>
                  <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-palm-900">{l.title}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <ProgressBar percent={p.percent} label={`${l.title} progress`} />
                        <span className="shrink-0 text-xs text-muted">
                          {p.done}/{p.total}
                        </span>
                      </div>
                    </div>
                    <ChevronDown size={18} className="text-muted" aria-hidden />
                  </summary>
                  <div className="mt-3">
                    <ChecklistEditor
                      label={l.title}
                      items={l.items}
                      showProgress={false}
                      onChange={(items) => void upsert("checklists", { ...l, items }, "")}
                    />
                    <div className="mt-2 flex flex-wrap gap-1 border-t border-sand-100 pt-2">
                      <IconButton label={`Move ${l.title} list up`} disabled={idx === 0} onClick={() => void upsertMany("checklists", moveItem(lists, l.id, -1), "Order updated")}>
                        <ChevronUp size={18} aria-hidden />
                      </IconButton>
                      <IconButton label={`Move ${l.title} list down`} disabled={idx === lists.length - 1} onClick={() => void upsertMany("checklists", moveItem(lists, l.id, 1), "Order updated")}>
                        <ChevronDown size={18} aria-hidden />
                      </IconButton>
                      <span className="flex-1" />
                      <Button size="sm" variant="ghost" onClick={() => setNaming({ list: l, isNew: false })}>
                        <Pencil size={16} aria-hidden /> Rename
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setResetting(l)} disabled={p.done === 0}>
                        <RotateCcw size={16} aria-hidden /> Reset
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(l)}>
                        <Trash2 size={16} aria-hidden /> Delete
                      </Button>
                    </div>
                  </div>
                </details>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "bookings" && (
        <div className="space-y-3">
          {bookings.length === 0 && activities.length === 0 && (
            <EmptyState title="No booking or activity checklists">
              Hotel, houseboat and cab bookings get a checklist automatically.
            </EmptyState>
          )}
          {bookings.map((b) => {
            const p = checklistProgress(b.checklist);
            return (
              <Card key={b.id}>
                <details>
                  <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-wide text-muted">{BOOKING_CATEGORY_LABEL[b.category]}</p>
                      <h2 className="font-semibold text-palm-900">{b.title}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <ProgressBar percent={p.percent} label={`${b.title} checklist progress`} />
                        <span className="shrink-0 text-xs text-muted">
                          {p.done}/{p.total}
                        </span>
                      </div>
                    </div>
                    <ChevronDown size={18} className="text-muted" aria-hidden />
                  </summary>
                  <div className="mt-3">
                    <ChecklistEditor
                      label={b.title}
                      items={b.checklist}
                      showProgress={false}
                      onChange={(checklist) => void upsert("bookings", { ...b, checklist }, "")}
                    />
                    <Link href={`/bookings/edit/?id=${encodeURIComponent(b.id)}`} className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-palm-700">
                      Open booking
                    </Link>
                  </div>
                </details>
              </Card>
            );
          })}
          {activities.map((a) => (
            <Card key={a.id}>
              <p className="text-xs uppercase tracking-wide text-muted">Activity · {formatDayShort(a.date)}</p>
              <h2 className="mb-2 font-semibold text-palm-900">{a.title}</h2>
              <ChecklistEditor label={a.title} items={a.checklist} onChange={(checklist) => void upsert("activities", { ...a, checklist }, "")} />
            </Card>
          ))}
        </div>
      )}

      {naming && (
        <NameDialog
          key={naming.list.id}
          initial={naming.list.title}
          isNew={naming.isNew}
          onClose={() => setNaming(null)}
          onSave={async (title) => {
            if (await upsert("checklists", { ...naming.list, title }, naming.isNew ? "List created" : "List renamed")) setNaming(null);
          }}
        />
      )}
      <ConfirmDialog
        open={!!resetting}
        title="Reset checklist?"
        message={<>All items in “{resetting?.title}” will be unticked. The items themselves are kept.</>}
        confirmLabel="Reset"
        onCancel={() => setResetting(null)}
        onConfirm={() => {
          if (resetting) void upsert("checklists", { ...resetting, items: resetting.items.map((i) => ({ ...i, checked: false })) }, "Checklist reset");
          setResetting(null);
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Delete list?"
        message={<>“{deleting?.title}” and its {deleting?.items.length} items will be deleted.</>}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) void remove("checklists", deleting.id, "List deleted");
          setDeleting(null);
        }}
      />
    </>
  );
}

function NameDialog({ initial, isNew, onSave, onClose }: { initial: string; isNew: boolean; onSave: (t: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState(initial);
  const [error, setError] = useState<string>();
  const submit = () => {
    if (!title.trim()) return setError("Give the list a name.");
    onSave(title.trim());
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={isNew ? "New checklist" : "Rename checklist"}
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
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <TextField label="List name" value={title} onChange={(e) => setTitle(e.target.value)} error={error} placeholder="e.g. Day bag" autoFocus />
      </form>
    </Dialog>
  );
}

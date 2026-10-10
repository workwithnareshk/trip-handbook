"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { checklistProgress, moveItem, renumber } from "@/lib/calc";
import { newId } from "@/lib/ids";
import type { ChecklistItem } from "@/lib/types";
import { Button, IconButton, ProgressBar } from "./ui";

/**
 * Editable checklist: tick, rename, delete, reorder and add items. Calls
 * `onChange` with the full new list; the parent persists it.
 */
export function ChecklistEditor({
  items,
  onChange,
  label,
  showProgress = true,
  compact = false,
}: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  label: string;
  showProgress?: boolean;
  compact?: boolean;
}) {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [arranging, setArranging] = useState(false);
  const progress = checklistProgress(items);

  const update = (id: string, patch: Partial<ChecklistItem>) =>
    onChange(sorted.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const add = () => {
    const title = newTitle.trim();
    if (!title) return;
    onChange(renumber([...sorted, { id: newId("chk"), title, checked: false, order: sorted.length }]));
    setNewTitle("");
  };

  const saveRename = () => {
    if (editingId && draft.trim()) update(editingId, { title: draft.trim() });
    setEditingId(null);
  };

  return (
    <div>
      {showProgress && items.length > 0 && (
        <div className="mb-2 flex items-center gap-3">
          <ProgressBar percent={progress.percent} label={`${label} progress`} />
          <span className="shrink-0 text-xs font-medium text-muted">
            {progress.done}/{progress.total} · {progress.percent}%
          </span>
        </div>
      )}
      {sorted.length === 0 && <p className="py-2 text-sm text-muted">No items yet. Add one below.</p>}
      <ul className="divide-y divide-sand-100">
        {sorted.map((item, idx) => (
          <li key={item.id} className="flex items-center gap-1 py-0.5">
            {editingId === item.id ? (
              <form
                className="flex flex-1 items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveRename();
                }}
              >
                <input
                  autoFocus
                  aria-label="Item name"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="min-h-11 flex-1 rounded-lg border border-sand-300 px-2 text-base"
                />
                <IconButton label="Save name" type="submit">
                  <Check size={18} aria-hidden />
                </IconButton>
                <IconButton label="Cancel rename" onClick={() => setEditingId(null)}>
                  <X size={18} aria-hidden />
                </IconButton>
              </form>
            ) : (
              <>
                <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 py-1">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => update(item.id, { checked: e.target.checked })}
                    className="size-5 shrink-0 accent-palm-700"
                  />
                  <span className={`text-sm ${item.checked ? "text-muted line-through" : ""}`}>{item.title}</span>
                </label>
                {arranging ? (
                  <>
                    <IconButton
                      label={`Move "${item.title}" up`}
                      disabled={idx === 0}
                      onClick={() => onChange(moveItem(sorted, item.id, -1))}
                    >
                      <ChevronUp size={18} aria-hidden />
                    </IconButton>
                    <IconButton
                      label={`Move "${item.title}" down`}
                      disabled={idx === sorted.length - 1}
                      onClick={() => onChange(moveItem(sorted, item.id, 1))}
                    >
                      <ChevronDown size={18} aria-hidden />
                    </IconButton>
                    <IconButton
                      label={`Rename "${item.title}"`}
                      onClick={() => {
                        setEditingId(item.id);
                        setDraft(item.title);
                      }}
                    >
                      <Pencil size={16} aria-hidden />
                    </IconButton>
                    <IconButton
                      label={`Delete "${item.title}"`}
                      onClick={() => onChange(renumber(sorted.filter((i) => i.id !== item.id)))}
                    >
                      <Trash2 size={16} aria-hidden />
                    </IconButton>
                  </>
                ) : null}
              </>
            )}
          </li>
        ))}
      </ul>
      <form
        className={`flex gap-2 ${compact ? "mt-1" : "mt-2"}`}
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          aria-label={`New item for ${label}`}
          placeholder="Add an item"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="min-h-11 flex-1 rounded-xl border border-sand-300 bg-white px-3 text-base"
        />
        <Button type="submit" disabled={!newTitle.trim()} aria-label={`Add item to ${label}`}>
          <Plus size={18} aria-hidden />
          Add
        </Button>
      </form>
      {sorted.length > 0 && (
        <button
          type="button"
          onClick={() => setArranging((a) => !a)}
          className="mt-1 min-h-11 text-sm font-medium text-palm-700 underline-offset-2 hover:underline"
          aria-pressed={arranging}
        >
          {arranging ? "Done editing items" : "Rename, reorder or delete items"}
        </button>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, ImageIcon, Paperclip, Trash2 } from "lucide-react";
import { deleteAttachment, getAttachment, saveAttachment } from "@/lib/db";
import { formatBytes } from "@/lib/format";
import { newId } from "@/lib/ids";
import type { AttachmentMeta } from "@/lib/types";
import { useToast } from "./Toast";
import { Button, ConfirmDialog, IconButton } from "./ui";

const MAX_BYTES = 15 * 1024 * 1024;

export const DEVICE_ONLY_NOTE =
  "Files are stored in this browser on this device only. They are not backed up to the cloud and are not included in JSON backups.";

/** Shows files kept on this device and lets the user add or remove them. */
export function AttachmentList({
  ids,
  onChange,
  accept,
  imagesAsThumbnails = false,
}: {
  ids: string[];
  onChange: (ids: string[]) => void;
  accept: string;
  imagesAsThumbnails?: boolean;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<(AttachmentMeta & { url?: string; missing?: boolean })[]>([]);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    void (async () => {
      const loaded = await Promise.all(
        ids.map(async (id) => {
          const a = await getAttachment(id);
          if (!a) return { id, name: "File not on this device", type: "", size: 0, createdAt: "", missing: true };
          const url = URL.createObjectURL(a.blob);
          urls.push(url);
          return { id: a.id, name: a.name, type: a.type, size: a.size, createdAt: a.createdAt, url };
        }),
      );
      if (!cancelled) setItems(loaded);
    })();
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [ids]);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const added: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_BYTES) {
          toast.show(`${file.name} is larger than 15 MB and was not added.`, "error");
          continue;
        }
        const meta = await saveAttachment(file, file.name, newId("file"));
        added.push(meta.id);
      }
      if (added.length) onChange([...ids, ...added]);
    } catch (e) {
      toast.show(`Could not store the file: ${e instanceof Error ? e.message : String(e)}`, "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await deleteAttachment(deleting);
    onChange(ids.filter((x) => x !== deleting));
    setDeleting(null);
  };

  return (
    <div>
      {items.length > 0 && (
        <ul className={imagesAsThumbnails ? "mb-2 grid grid-cols-3 gap-2" : "mb-2 divide-y divide-sand-100"}>
          {items.map((it) =>
            imagesAsThumbnails && it.url && it.type.startsWith("image/") ? (
              <li key={it.id} className="relative">
                <a href={it.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.url} alt={it.name} className="aspect-square w-full rounded-xl object-cover" />
                </a>
                <IconButton label={`Delete ${it.name}`} onClick={() => setDeleting(it.id)} className="absolute right-1 top-1 bg-white/90">
                  <Trash2 size={16} aria-hidden />
                </IconButton>
              </li>
            ) : (
              <li key={it.id} className="flex items-center gap-2 py-1">
                {it.type.startsWith("image/") ? <ImageIcon size={18} className="text-muted" aria-hidden /> : <FileText size={18} className="text-muted" aria-hidden />}
                {it.url ? (
                  <a href={it.url} target="_blank" rel="noopener noreferrer" className="min-h-11 flex-1 content-center truncate text-sm font-medium text-palm-800 underline">
                    {it.name}
                  </a>
                ) : (
                  <span className="flex-1 text-sm text-muted">{it.name}</span>
                )}
                {!it.missing && <span className="text-xs text-muted">{formatBytes(it.size)}</span>}
                <IconButton label={`Delete ${it.name}`} onClick={() => setDeleting(it.id)}>
                  <Trash2 size={16} aria-hidden />
                </IconButton>
              </li>
            ),
          )}
        </ul>
      )}
      <input ref={input} type="file" accept={accept} multiple className="sr-only" aria-label="Choose files to attach" onChange={(e) => void addFiles(e.target.files)} tabIndex={-1} />
      <Button onClick={() => input.current?.click()} disabled={busy}>
        <Paperclip size={16} aria-hidden /> {busy ? "Saving…" : "Attach file"}
      </Button>
      <p className="mt-2 text-xs text-muted">{DEVICE_ONLY_NOTE}</p>
      <ConfirmDialog
        open={!!deleting}
        title="Delete file?"
        message="The file will be removed from this device."
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

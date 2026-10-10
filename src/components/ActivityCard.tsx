"use client";

import { AlertTriangle, Check, ChevronDown, ChevronUp, ExternalLink, MapPin, Pencil, SkipForward, Trash2, Undo2 } from "lucide-react";
import { formatDuration, formatTime } from "@/lib/dates";
import { mapsSearchHref } from "@/lib/format";
import { ACTIVITY_CATEGORY_LABEL, BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from "@/lib/labels";
import type { Booking, ItineraryActivity } from "@/lib/types";
import Link from "next/link";
import { Chip, IconButton } from "./ui";

export function timeLabel(a: ItineraryActivity): string {
  const start = formatTime(a.startTime);
  const end = formatTime(a.endTime);
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  return "Time not set";
}

export function ActivityCard({
  activity,
  bookings,
  overlap,
  onEdit,
  onStatus,
  onMove,
  onDelete,
  isFirst,
  isLast,
  compact = false,
}: {
  activity: ItineraryActivity;
  bookings: Booking[];
  overlap: boolean;
  onEdit?: () => void;
  onStatus?: (status: ItineraryActivity["status"]) => void;
  onMove?: (delta: -1 | 1) => void;
  onDelete?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  compact?: boolean;
}) {
  const a = activity;
  const linked = bookings.filter((b) => a.bookingIds.includes(b.id));
  const mapHref = mapsSearchHref(a.mapQuery || a.place);
  const muted = a.status !== "planned";

  return (
    <article
      className={`rounded-2xl border bg-white p-3 ${overlap ? "border-amber-400" : "border-sand-200"} ${muted ? "opacity-75" : ""}`}
      aria-label={a.title}
    >
      <div className="flex items-start gap-3">
        <div className="w-20 shrink-0 pt-0.5 text-xs font-semibold text-palm-800">
          {timeLabel(a)}
          {a.durationMinutes ? <span className="block font-normal text-muted">~{formatDuration(a.durationMinutes)}</span> : null}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`font-semibold leading-snug ${a.status === "skipped" ? "line-through" : ""}`}>{a.title}</h3>
          {a.place && <p className="text-sm text-muted">{a.place}</p>}
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Chip>{ACTIVITY_CATEGORY_LABEL[a.category]}</Chip>
            {a.optional && <Chip tone="blue">Optional</Chip>}
            {a.status === "done" && <Chip tone="green">Done</Chip>}
            {a.status === "skipped" && <Chip>Skipped</Chip>}
            {a.bookingRequired && linked.length === 0 && <Chip tone="amber">Booking needed</Chip>}
            {linked.map((b) => (
              <Link key={b.id} href={`/bookings/edit/?id=${encodeURIComponent(b.id)}`} className="rounded-full focus-visible:outline-2">
                <Chip tone={BOOKING_STATUS_TONE[b.status]}>
                  {b.category === "flight" || b.category === "cab" ? b.title : "Booking"}: {BOOKING_STATUS_LABEL[b.status]}
                </Chip>
              </Link>
            ))}
            {overlap && (
              <Chip tone="amber">
                <AlertTriangle size={12} aria-hidden /> Time overlaps
              </Chip>
            )}
          </div>
          {!compact && a.notes && <p className="mt-2 whitespace-pre-line text-sm text-muted">{a.notes}</p>}
          {!compact && a.checklist.length > 0 && (
            <p className="mt-1 text-xs text-muted">
              Checklist: {a.checklist.filter((c) => c.checked).length}/{a.checklist.length} done
            </p>
          )}
        </div>
      </div>

      {!compact && (
        <div className="mt-2 flex flex-wrap items-center gap-0.5 border-t border-sand-100 pt-1">
          {onStatus &&
            (a.status === "planned" ? (
              <>
                <IconButton label={`Mark "${a.title}" done`} onClick={() => onStatus("done")}>
                  <Check size={18} aria-hidden />
                </IconButton>
                <IconButton label={`Skip "${a.title}"`} onClick={() => onStatus("skipped")}>
                  <SkipForward size={18} aria-hidden />
                </IconButton>
              </>
            ) : (
              <IconButton label={`Mark "${a.title}" as planned again`} onClick={() => onStatus("planned")}>
                <Undo2 size={18} aria-hidden />
              </IconButton>
            ))}
          {onMove && (
            <>
              <IconButton label={`Move "${a.title}" earlier`} disabled={isFirst} onClick={() => onMove(-1)}>
                <ChevronUp size={18} aria-hidden />
              </IconButton>
              <IconButton label={`Move "${a.title}" later`} disabled={isLast} onClick={() => onMove(1)}>
                <ChevronDown size={18} aria-hidden />
              </IconButton>
            </>
          )}
          {mapHref && (
            <a
              href={mapHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open "${a.place || a.title}" in Google Maps`}
              title="Open in Google Maps"
              className="inline-flex size-11 items-center justify-center rounded-xl text-muted hover:bg-sand-100 hover:text-ink"
            >
              <MapPin size={18} aria-hidden />
            </a>
          )}
          {a.bookingUrl && (
            <a
              href={a.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open booking link for "${a.title}"`}
              title="Open booking link"
              className="inline-flex size-11 items-center justify-center rounded-xl text-muted hover:bg-sand-100 hover:text-ink"
            >
              <ExternalLink size={18} aria-hidden />
            </a>
          )}
          <span className="flex-1" />
          {onEdit && (
            <IconButton label={`Edit "${a.title}"`} onClick={onEdit}>
              <Pencil size={18} aria-hidden />
            </IconButton>
          )}
          {onDelete && (
            <IconButton label={`Delete "${a.title}"`} onClick={onDelete}>
              <Trash2 size={18} aria-hidden />
            </IconButton>
          )}
        </div>
      )}
    </article>
  );
}

"use client";

import Link from "next/link";
import { BadgeCheck, CalendarCheck, ExternalLink, MapPin, MessageCircle, Phone, Route } from "lucide-react";
import { bookingBalance, missingDetails } from "@/lib/calc";
import { formatDate, formatTime } from "@/lib/dates";
import { formatINR, mapsDirectionsHref, mapsSearchHref, telHref, whatsappHref } from "@/lib/format";
import { BOOKING_CATEGORY_LABEL, BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from "@/lib/labels";
import { useStore } from "@/lib/store";
import type { Booking } from "@/lib/types";
import { ActionLink, Button, Chip } from "./ui";

/** Directions URL through each stop of a free-text route ("A → B → C"). */
export function routeHref(route: string | undefined): string | undefined {
  const stops = (route ?? "")
    .split(/→|->|,|\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (stops.length === 0) return undefined;
  if (stops.length === 1) return mapsSearchHref(stops[0]);
  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const via = stops.slice(1, -1);
  const href = mapsDirectionsHref(destination, origin);
  return via.length ? `${href}&waypoints=${encodeURIComponent(via.join("|"))}` : href;
}

export function BookingActions({ booking: b }: { booking: Booking }) {
  const { upsert } = useStore();
  const isCab = b.category === "cab";
  const mapTarget = b.location || b.cab?.pickupPlace;

  const markBooked = () => void upsert("bookings", { ...b, status: "booked" }, "Marked booked");
  const markPaid = () =>
    void upsert(
      "bookings",
      { ...b, status: "paid", amountPaid: b.amount !== undefined ? Math.max(b.amount, b.amountPaid ?? 0) : b.amountPaid },
      "Marked paid",
    );

  return (
    <div className="no-print flex flex-wrap gap-2">
      <ActionLink href={telHref(b.phone)} disabledReason="Add a valid phone number to call" variant="secondary">
        <Phone size={16} aria-hidden /> {isCab ? "Call driver" : "Call"}
      </ActionLink>
      {isCab && (
        <ActionLink
          href={whatsappHref(b.phone)}
          disabledReason="WhatsApp needs a valid mobile number. Add a 10-digit Indian mobile or a number with +country code."
        >
          <MessageCircle size={16} aria-hidden /> WhatsApp driver
        </ActionLink>
      )}
      {isCab ? (
        <ActionLink href={routeHref(b.cab?.route)} disabledReason="Add the route to open it in Maps">
          <Route size={16} aria-hidden /> Open route in Maps
        </ActionLink>
      ) : (
        <ActionLink href={mapsSearchHref(mapTarget)} disabledReason="Add a location to open it in Maps">
          <MapPin size={16} aria-hidden /> Map
        </ActionLink>
      )}
      {b.url && (
        <ActionLink href={b.url} disabledReason="">
          <ExternalLink size={16} aria-hidden /> Website
        </ActionLink>
      )}
      {b.status !== "booked" && b.status !== "paid" && b.status !== "cancelled" && (
        <Button onClick={markBooked}>
          <CalendarCheck size={16} aria-hidden /> Mark booked
        </Button>
      )}
      {b.status !== "paid" && b.status !== "cancelled" && (
        <Button onClick={markPaid}>
          <BadgeCheck size={16} aria-hidden /> Mark paid
        </Button>
      )}
    </div>
  );
}

export function BookingCard({ booking: b }: { booking: Booking }) {
  const missing = missingDetails(b);
  const dateText = [formatDate(b.startDate), b.endDate && b.endDate !== b.startDate ? formatDate(b.endDate) : ""].filter(Boolean).join(" – ");
  const time = b.category === "flight" ? formatTime(b.flight?.departureTime) : b.category === "cab" ? formatTime(b.cab?.pickupTime) : "";
  const checked = b.checklist.filter((c) => c.checked).length;

  return (
    <article className="rounded-2xl border border-sand-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{BOOKING_CATEGORY_LABEL[b.category]}</p>
          <h3 className="font-semibold leading-snug">
            <Link href={`/bookings/edit/?id=${encodeURIComponent(b.id)}`} className="hover:underline">
              {b.title}
            </Link>
          </h3>
          {(dateText || time) && (
            <p className="text-sm text-muted">
              {dateText}
              {time ? ` · ${b.category === "flight" ? "Dep." : "Pickup"} ${time}` : ""}
            </p>
          )}
          {b.referenceNumber && (
            <p className="mt-0.5 text-sm">
              {b.category === "flight" ? "PNR" : "Ref"}: <span className="font-mono font-semibold">{b.referenceNumber}</span>
            </p>
          )}
        </div>
        <Chip tone={BOOKING_STATUS_TONE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</Chip>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {b.amount !== undefined && (
          <span>
            {b.amountKind === "estimated" ? "Estimated" : "Quoted"}: <strong>{formatINR(b.amount)}</strong>
          </span>
        )}
        {(b.amountPaid ?? 0) > 0 && (
          <span>
            Paid: <strong>{formatINR(b.amountPaid)}</strong>
          </span>
        )}
        {b.amount !== undefined && b.status !== "cancelled" && (
          <span>
            Balance: <strong>{formatINR(bookingBalance(b))}</strong>
          </span>
        )}
        {b.checklist.length > 0 && (
          <span className="text-muted">
            Checklist {checked}/{b.checklist.length}
          </span>
        )}
      </div>

      {missing.length > 0 && (
        <p className="mt-2 text-xs text-amber-900">
          <span className="font-semibold">To add:</span> {missing.join(", ")}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <BookingActions booking={b} />
        <Link href={`/bookings/edit/?id=${encodeURIComponent(b.id)}`} className="ml-auto min-h-11 content-center px-2 text-sm font-medium text-palm-700">
          Edit
        </Link>
      </div>
    </article>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BookingForm } from "@/components/BookingForm";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { BOOKING_CATEGORY_LABEL } from "@/lib/labels";
import { useData } from "@/lib/store";

function EditBooking() {
  const id = useSearchParams().get("id");
  const data = useData();
  const booking = data.bookings.find((b) => b.id === id);
  if (!booking) {
    return (
      <EmptyState title="Booking not found">
        <p>It may have been deleted.</p>
        <LinkButton href="/bookings/" className="mt-3">
          Back to bookings
        </LinkButton>
      </EmptyState>
    );
  }
  return (
    <>
      <PageHeader title={booking.title} subtitle={BOOKING_CATEGORY_LABEL[booking.category]} />
      <BookingForm key={booking.id + booking.updatedAt} initial={booking} isNew={false} />
    </>
  );
}

export default function EditBookingPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <EditBooking />
    </Suspense>
  );
}

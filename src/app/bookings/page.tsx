"use client";

import { useState } from "react";
import { Plus, Ticket } from "lucide-react";
import { BookingCard } from "@/components/BookingCard";
import { Chip, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { bookingSummary } from "@/lib/calc";
import { BOOKING_CATEGORIES, BOOKING_CATEGORY_LABEL, BOOKING_STATUSES, BOOKING_STATUS_LABEL } from "@/lib/labels";
import { useData } from "@/lib/store";
import type { Booking, BookingCategory, BookingStatus } from "@/lib/types";

type StatusFilter = "all" | "open" | BookingStatus;

const ORDER: BookingCategory[] = ["flight", "cab", "accommodation", "houseboat", "ticket", "show", "other"];

function sortBookings(a: Booking, b: Booking): number {
  const da = a.startDate ?? "9999";
  const db = b.startDate ?? "9999";
  if (da !== db) return da < db ? -1 : 1;
  return ORDER.indexOf(a.category) - ORDER.indexOf(b.category);
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 shrink-0 rounded-full border px-3 text-sm font-medium ${
        active ? "border-palm-700 bg-palm-700 text-white" : "border-sand-300 bg-white text-ink hover:bg-sand-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function BookingsPage() {
  const data = useData();
  const [category, setCategory] = useState<"all" | BookingCategory>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const summary = bookingSummary(data.bookings);

  const filtered = data.bookings
    .filter((b) => category === "all" || b.category === category)
    .filter((b) =>
      status === "all" ? true : status === "open" ? ["not-started", "researching", "pending"].includes(b.status) : b.status === status,
    )
    .sort(sortBookings);

  const usedCategories = BOOKING_CATEGORIES.filter((c) => data.bookings.some((b) => b.category === c));

  return (
    <>
      <PageHeader
        title="Bookings"
        subtitle={
          <>
            {summary.confirmed} confirmed · {summary.pending} pending · {summary.withMissingDetails} missing details
          </>
        }
        actions={
          <LinkButton href="/bookings/new/" variant="primary">
            <Plus size={18} aria-hidden /> Add booking
          </LinkButton>
        }
      />

      <div className="space-y-2">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" role="group" aria-label="Filter by category">
          <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
            All types
          </FilterChip>
          {usedCategories.map((c) => (
            <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
              {BOOKING_CATEGORY_LABEL[c]}
            </FilterChip>
          ))}
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" role="group" aria-label="Filter by status">
          {(["all", "open", ...BOOKING_STATUSES] as StatusFilter[]).map((s) => (
            <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s === "all" ? "Any status" : s === "open" ? "Still to do" : BOOKING_STATUS_LABEL[s]}
            </FilterChip>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        Nothing here is confirmed unless you marked it <Chip tone="green">Booked</Chip> or <Chip tone="green">Paid</Chip> yourself.
      </p>

      <div className="mt-3 space-y-3">
        {filtered.length === 0 ? (
          <EmptyState icon={<Ticket size={28} />} title={data.bookings.length === 0 ? "No bookings yet" : "No bookings match these filters"}>
            {data.bookings.length === 0 ? "Add flights, stays, the cab, tickets and shows to keep them in one place." : "Try another filter."}
          </EmptyState>
        ) : (
          filtered.map((b) => <BookingCard key={b.id} booking={b} />)
        )}
      </div>
    </>
  );
}

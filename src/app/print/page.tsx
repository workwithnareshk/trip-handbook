"use client";

import { Printer } from "lucide-react";
import { timeLabel } from "@/components/ActivityCard";
import { Button, PageHeader } from "@/components/ui";
import { activitiesForDay, bookingBalance, checklistProgress, moneySummary } from "@/lib/calc";
import { dateRange, formatDate, formatDayLong, formatTime } from "@/lib/dates";
import { formatINR } from "@/lib/format";
import { BOOKING_CATEGORY_LABEL, BOOKING_STATUS_LABEL } from "@/lib/labels";
import { useData } from "@/lib/store";

export default function PrintPage() {
  const data = useData();
  const { trip } = data;
  const days = dateRange(trip.startDate, trip.endDate);
  const money = moneySummary(data.expenses, data.bookings, trip.budget);
  const contacts = [...data.contacts].sort((a, b) => a.order - b.order).filter((c) => c.phone || c.name);

  return (
    <div className="print:text-[11pt]">
      <PageHeader
        title={trip.name}
        subtitle={`${formatDayLong(trip.startDate)} – ${formatDayLong(trip.endDate)} · Draft plan, planned times in IST`}
        actions={
          <Button variant="primary" onClick={() => window.print()}>
            <Printer size={18} aria-hidden /> Print or save as PDF
          </Button>
        }
      />

      <section className="mb-6">
        <h2 className="mb-2 border-b border-sand-300 pb-1 text-lg font-semibold">Itinerary</h2>
        {days.map((d) => (
          <div key={d} className="mb-3 break-inside-avoid">
            <h3 className="font-semibold">
              {formatDayLong(d)}
              {trip.dayLabels?.[d] ? ` · ${trip.dayLabels[d]}` : ""}
            </h3>
            <ul className="ml-1 text-sm">
              {activitiesForDay(data.activities, d).map((a) => (
                <li key={a.id} className={a.status === "skipped" ? "line-through" : ""}>
                  <span className="inline-block w-36 text-muted">{a.startTime ? timeLabel(a) : "—"}</span>
                  {a.title}
                  {a.optional ? " (optional)" : ""}
                  {a.place ? ` · ${a.place}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="text-xs text-muted">
          Departure day target: reach COK {formatTime(trip.airportTargetStart)}–{formatTime(trip.airportTargetEnd)} (planning target).
        </p>
      </section>

      <section className="mb-6 break-inside-avoid">
        <h2 className="mb-2 border-b border-sand-300 pb-1 text-lg font-semibold">Bookings</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted">
              <th className="py-1 pr-2 font-medium">Booking</th>
              <th className="py-1 pr-2 font-medium">Status</th>
              <th className="py-1 pr-2 font-medium">Ref / PNR</th>
              <th className="py-1 pr-2 font-medium">Phone</th>
              <th className="py-1 font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {data.bookings.map((b) => (
              <tr key={b.id} className="border-t border-sand-200 align-top">
                <td className="py-1 pr-2">
                  {b.title}
                  <span className="block text-xs text-muted">
                    {BOOKING_CATEGORY_LABEL[b.category]} · {formatDate(b.startDate)}
                  </span>
                </td>
                <td className="py-1 pr-2">{BOOKING_STATUS_LABEL[b.status]}</td>
                <td className="py-1 pr-2 font-mono">{b.referenceNumber || "—"}</td>
                <td className="py-1 pr-2">{b.phone || "—"}</td>
                <td className="py-1">{b.amount === undefined ? "—" : formatINR(bookingBalance(b))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-6 break-inside-avoid">
        <h2 className="mb-2 border-b border-sand-300 pb-1 text-lg font-semibold">Contacts</h2>
        <ul className="text-sm">
          {contacts.map((c) => (
            <li key={c.id}>
              <strong>{c.label}</strong>: {[c.name, c.phone].filter(Boolean).join(" · ")}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6 break-inside-avoid">
        <h2 className="mb-2 border-b border-sand-300 pb-1 text-lg font-semibold">Money</h2>
        <p className="text-sm">
          Spent {formatINR(money.recordedExpenses)} · Still owed on bookings {formatINR(money.outstandingBalances)} · Projected {formatINR(money.projectedTotal)}
          {money.budget !== undefined ? ` · Budget ${formatINR(money.budget)} · Remaining ${formatINR(money.budgetRemaining)}` : ""}
        </p>
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-2 border-b border-sand-300 pb-1 text-lg font-semibold">Checklists</h2>
        <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          {[...data.checklists]
            .sort((a, b) => a.order - b.order)
            .map((l) => {
              const p = checklistProgress(l.items);
              return (
                <div key={l.id} className="break-inside-avoid text-sm">
                  <h3 className="font-semibold">
                    {l.title} ({p.done}/{p.total})
                  </h3>
                  <ul>
                    {[...l.items]
                      .sort((a, b) => a.order - b.order)
                      .map((i) => (
                        <li key={i.id}>
                          {i.checked ? "☑" : "☐"} {i.title}
                        </li>
                      ))}
                  </ul>
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarPlus,
  ListChecks,
  MapPin,
  Phone,
  Plane,
  Siren,
  Ticket,
  Wallet,
} from "lucide-react";
import { ActivityCard, timeLabel } from "@/components/ActivityCard";
import { ActivityForm, blankActivity } from "@/components/ActivityForm";
import { DaySelector } from "@/components/DaySelector";
import { ActionLink, Card, Chip, EmptyState, LinkButton, Notice, ProgressBar, buttonClass } from "@/components/ui";
import {
  activitiesForDay,
  bookingSummary,
  checklistProgress,
  combineProgress,
  findOverlaps,
  driverPhone,
  moneySummary,
  nextUp,
} from "@/lib/calc";
import { dateRange, daysBetween, formatDate, formatDayLong, formatDayShort, formatTime, nowInIST } from "@/lib/dates";
import { formatINR, mapsSearchHref, telHref } from "@/lib/format";
import { useData } from "@/lib/store";
import type { ItineraryActivity } from "@/lib/types";

export default function TodayPage() {
  const data = useData();
  const { trip } = data;
  const days = dateRange(trip.startDate, trip.endDate);

  // Re-evaluate "now" every minute so "next up" stays current.
  const [now, setNow] = useState(() => nowInIST());
  useEffect(() => {
    const t = setInterval(() => setNow(nowInIST()), 60_000);
    return () => clearInterval(t);
  }, []);

  const inTrip = now.date >= trip.startDate && now.date <= trip.endDate;
  const [day, setDay] = useState(inTrip ? now.date : days[0]);
  const [adding, setAdding] = useState<ItineraryActivity | null>(null);

  const daysToGo = daysBetween(now.date, trip.startDate);
  const next = nextUp(data.activities, now, trip.startDate, trip.endDate, daysToGo);
  const dayItems = activitiesForDay(data.activities, day);
  const overlaps = useMemo(() => findOverlaps(data.activities), [data.activities]);
  const bSummary = bookingSummary(data.bookings);
  const money = moneySummary(data.expenses, data.bookings, trip.budget);
  const prepProgress = combineProgress(data.checklists.map((c) => checklistProgress(c.items)));
  const bookingChecks = combineProgress(data.bookings.filter((b) => b.status !== "cancelled").map((b) => checklistProgress(b.checklist)));
  const phone = driverPhone(data);
  const nextActivity = next.kind !== "after-trip" ? next.activity : undefined;
  const mapTarget = nextActivity?.mapQuery || nextActivity?.place;

  let status: string;
  if (next.kind === "before-trip") status = daysToGo === 1 ? "Trip starts tomorrow" : `Trip starts in ${daysToGo} days`;
  else if (next.kind === "during-trip") status = `Day ${daysBetween(trip.startDate, now.date) + 1} of ${days.length}`;
  else status = "Trip complete";

  return (
    <>
      <header className="mb-4">
        <p className="text-sm font-medium text-palm-700">{status}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-palm-900">{trip.name}</h1>
        <p className="text-sm text-muted">
          {formatDayShort(trip.startDate)} – {formatDayShort(trip.endDate)} {trip.endDate.slice(0, 4)} · Hyderabad ⇄ Kochi
        </p>
      </header>

      <div className="space-y-4">
        {/* Next up */}
        <Card className="border-palm-200 bg-palm-50">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-palm-700">
            {next.kind === "before-trip" ? "First on the plan" : next.kind === "during-trip" ? "Next up" : "All done"}
          </h2>
          {nextActivity ? (
            <div className="mt-1">
              <p className="text-lg font-semibold text-palm-900">{nextActivity.title}</p>
              <p className="text-sm text-palm-900">
                {formatDayShort(nextActivity.date)} · {timeLabel(nextActivity)}
                {nextActivity.place ? ` · ${nextActivity.place}` : ""}
              </p>
              <p className="mt-1 text-xs text-palm-800">Planned time, not live flight or traffic status.</p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-palm-900">
              {next.kind === "after-trip" ? "Hope it was a wonderful trip. Add a memory or export a backup." : "Nothing left on the plan for today."}
            </p>
          )}
        </Card>

        {/* Quick actions */}
        <nav aria-label="Quick actions" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <button
            type="button"
            onClick={() => {
              const order = Math.max(-1, ...dayItems.map((a) => a.order)) + 1;
              setAdding(blankActivity(trip.id, day, order));
            }}
            className={`${buttonClass("secondary")} h-auto flex-col py-2 text-center text-xs`}
          >
            <CalendarPlus size={20} aria-hidden /> Add activity
          </button>
          <LinkButton href="/bookings/new/" className="h-auto flex-col py-2 text-center text-xs">
            <Ticket size={20} aria-hidden /> Add booking
          </LinkButton>
          <LinkButton href="/expenses/?new=1" className="h-auto flex-col py-2 text-center text-xs">
            <Wallet size={20} aria-hidden /> Add expense
          </LinkButton>
          <ActionLink
            href={telHref(phone)}
            disabledReason="Add the driver's phone in the cab booking to call"
            className="h-auto flex-col py-2 text-center text-xs"
          >
            <Phone size={20} aria-hidden /> Call driver
          </ActionLink>
          <ActionLink
            href={mapsSearchHref(mapTarget || "Kerala")}
            disabledReason="No place to show"
            className="h-auto flex-col py-2 text-center text-xs"
          >
            <MapPin size={20} aria-hidden /> Open map
          </ActionLink>
          <LinkButton href="/contacts/" className="h-auto flex-col py-2 text-center text-xs">
            <Siren size={20} aria-hidden /> Emergency
          </LinkButton>
        </nav>

        {/* Day schedule */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-palm-900">Day plan</h2>
            <Link href="/itinerary/" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-palm-700">
              Edit itinerary <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <DaySelector days={days} selected={day} onSelect={setDay} labels={trip.dayLabels} today={now.date} />
          <h3 className="mt-3 text-sm font-medium text-muted">
            {formatDayLong(day)}
            {trip.dayLabels?.[day] ? ` · ${trip.dayLabels[day]}` : ""} <Chip tone="amber">Draft</Chip>
          </h3>
          {day === trip.endDate && (
            <div className="mt-2">
              <Notice>
                <Plane size={14} className="mr-1 inline" aria-hidden />
                Planning target: reach COK around {formatTime(trip.airportTargetStart)}–{formatTime(trip.airportTargetEnd)} for the{" "}
                {formatTime(data.bookings.find((b) => b.id === "bk_flight_ret")?.flight?.departureTime) || "return"} flight. This is a
                conservative plan, not a live traffic estimate.
              </Notice>
            </div>
          )}
          {dayItems.length === 0 ? (
            <div className="mt-2">
              <EmptyState title="Nothing planned for this day yet" />
            </div>
          ) : (
            <ol className="mt-2 space-y-2">
              {dayItems.map((a) => (
                <li key={a.id}>
                  <ActivityCard activity={a} bookings={data.bookings} overlap={overlaps.has(a.id)} compact />
                </li>
              ))}
            </ol>
          )}
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Bookings */}
          <Card>
            <h2 className="flex items-center gap-2 font-semibold text-palm-900">
              <Ticket size={18} aria-hidden /> Bookings
            </h2>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
              <Stat label="Confirmed" value={bSummary.confirmed} />
              <Stat label="Pending" value={bSummary.pending} tone="amber" />
              <Stat label="Missing details" value={bSummary.withMissingDetails} tone="amber" />
            </dl>
            <Link href="/bookings/" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-palm-700">
              Review bookings <ArrowRight size={16} aria-hidden />
            </Link>
          </Card>

          {/* Checklists */}
          <Card>
            <h2 className="flex items-center gap-2 font-semibold text-palm-900">
              <ListChecks size={18} aria-hidden /> Checklists
            </h2>
            <div className="mt-3 space-y-3 text-sm">
              <div>
                <div className="mb-1 flex justify-between">
                  <span>Preparation</span>
                  <span className="text-muted">
                    {prepProgress.done}/{prepProgress.total}
                  </span>
                </div>
                <ProgressBar percent={prepProgress.percent} label="Preparation checklist progress" />
              </div>
              <div>
                <div className="mb-1 flex justify-between">
                  <span>Booking checks</span>
                  <span className="text-muted">
                    {bookingChecks.done}/{bookingChecks.total}
                  </span>
                </div>
                <ProgressBar percent={bookingChecks.percent} label="Booking checklist progress" />
              </div>
            </div>
            <Link href="/checklists/" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-palm-700">
              Open checklists <ArrowRight size={16} aria-hidden />
            </Link>
          </Card>
        </div>

        {/* Money */}
        <Card>
          <h2 className="flex items-center gap-2 font-semibold text-palm-900">
            <Wallet size={18} aria-hidden /> Money
          </h2>
          <dl className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <MoneyStat label="Spent (recorded)" value={formatINR(money.recordedExpenses)} />
            <MoneyStat label="Still owed on bookings" value={formatINR(money.outstandingBalances)} />
            <MoneyStat label="Budget" value={money.budget === undefined ? "Not set" : formatINR(money.budget)} />
            <MoneyStat
              label="Budget remaining"
              value={money.budgetRemaining === undefined ? "—" : formatINR(money.budgetRemaining)}
              negative={(money.budgetRemaining ?? 0) < 0}
            />
          </dl>
          <Link href="/expenses/" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-palm-700">
            Expenses and budget <ArrowRight size={16} aria-hidden />
          </Link>
        </Card>

        <p className="text-center text-xs text-muted">
          Stored on this device only · Last change {formatDate(trip.updatedAt.slice(0, 10))}
        </p>
      </div>

      {adding && (
        <ActivityForm key={adding.id} open activity={adding} isNew onClose={() => setAdding(null)} />
      )}
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "amber" }) {
  return (
    <div className={`rounded-xl px-2 py-2 ${tone && value > 0 ? "bg-amber-50" : "bg-sand-50"}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`text-xl font-semibold ${tone && value > 0 ? "text-amber-900" : "text-palm-900"}`}>{value}</dd>
    </div>
  );
}

function MoneyStat({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`font-semibold ${negative ? "text-rose-700" : "text-ink"}`}>{value}</dd>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { Button, Card, ConfirmDialog, Dialog, EmptyState, IconButton, Notice, PageHeader, SelectField, TextArea, TextField } from "@/components/ui";
import { bookingBalance, EXPENSE_CATEGORIES, moneySummary } from "@/lib/calc";
import { formatDate, isValidDate, nowInIST } from "@/lib/dates";
import { formatINR, parseAmount } from "@/lib/format";
import { newId, nowIso } from "@/lib/ids";
import { BOOKING_STATUS_LABEL, EXPENSE_CATEGORY_LABEL } from "@/lib/labels";
import { useData, useStore } from "@/lib/store";
import type { BookingCategory, Expense, ExpenseCategory } from "@/lib/types";

const BOOKING_TO_EXPENSE: Record<BookingCategory, ExpenseCategory> = {
  flight: "flights",
  accommodation: "accommodation",
  houseboat: "accommodation",
  cab: "cab",
  ticket: "tickets",
  show: "tickets",
  other: "other",
};

function ExpensesInner() {
  const data = useData();
  const { upsert, remove, updateTrip } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const [editing, setEditing] = useState<{ expense: Expense; isNew: boolean } | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);

  const money = moneySummary(data.expenses, data.bookings, data.trip.budget);
  const expenses = [...data.expenses].sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : a.date < b.date ? 1 : -1));
  const activeBookings = data.bookings.filter((b) => b.status !== "cancelled" && b.amount !== undefined);
  const maxCat = Math.max(1, ...Object.values(money.byCategory));

  const startNew = (bookingId?: string) => {
    const booking = data.bookings.find((b) => b.id === bookingId);
    const today = nowInIST().date;
    const now = nowIso();
    setEditing({
      isNew: true,
      expense: {
        id: newId("exp"),
        tripId: data.trip.id,
        date: today,
        title: booking ? `Payment: ${booking.title}` : "",
        category: booking ? BOOKING_TO_EXPENSE[booking.category] : "food",
        amount: 0,
        bookingId: booking?.id,
        createdAt: now,
        updatedAt: now,
      },
    });
  };

  // Support /expenses/?new=1[&booking=<id>] from quick actions.
  useEffect(() => {
    if (params.get("new") === "1") {
      startNew(params.get("booking") ?? undefined);
      router.replace("/expenses/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="All amounts in INR. Stored on this device."
        actions={
          <Button variant="primary" onClick={() => startNew()}>
            <Plus size={18} aria-hidden /> Add expense
          </Button>
        }
      />

      <Card>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Summary label="Spent (recorded)" value={formatINR(money.recordedExpenses)} hint="Sum of transactions below" />
          <Summary label="Advances paid on bookings" value={formatINR(money.advancesPaid)} />
          <Summary label="Still owed on bookings" value={formatINR(money.outstandingBalances)} />
          <Summary label="Projected trip total" value={formatINR(money.projectedTotal)} hint="Spent + unlogged advances + still owed" />
          <Summary label="Budget" value={money.budget === undefined ? "Not set" : formatINR(money.budget)} />
          <Summary
            label="Budget remaining"
            value={money.budgetRemaining === undefined ? "—" : formatINR(money.budgetRemaining)}
            negative={(money.budgetRemaining ?? 0) < 0}
          />
        </dl>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setBudgetOpen(true)}>
            {money.budget === undefined ? "Set budget" : "Change budget"}
          </Button>
        </div>
        {money.unloggedAdvances > 0 && (
          <div className="mt-3">
            <Notice>
              {formatINR(money.unloggedAdvances)} paid on bookings is not in your expense log yet. It is still counted once in the projected total. Log it below and link it to the booking to keep the records tidy.
            </Notice>
          </div>
        )}
      </Card>

      <section className="mt-6" aria-labelledby="cat-h">
        <h2 id="cat-h" className="mb-2 text-lg font-semibold text-palm-900">
          By category
        </h2>
        <Card>
          {money.recordedExpenses === 0 ? (
            <p className="text-sm text-muted">No expenses recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {EXPENSE_CATEGORIES.filter((c) => money.byCategory[c] > 0).map((c) => (
                <li key={c} className="text-sm">
                  <div className="flex justify-between">
                    <span>{EXPENSE_CATEGORY_LABEL[c]}</span>
                    <span className="font-medium">{formatINR(money.byCategory[c])}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-sand-100" aria-hidden>
                    <div className="h-full rounded-full bg-palm-600" style={{ width: `${(money.byCategory[c] / maxCat) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="mt-6" aria-labelledby="bk-h">
        <h2 id="bk-h" className="mb-2 text-lg font-semibold text-palm-900">
          Booking commitments
        </h2>
        <p className="mb-2 text-sm text-muted">Amounts agreed on bookings. These are not expenses until you log a payment.</p>
        <Card className="p-0">
          {activeBookings.length === 0 ? (
            <p className="p-4 text-sm text-muted">No booking amounts entered yet.</p>
          ) : (
            <ul className="divide-y divide-sand-100">
              {activeBookings.map((b) => (
                <li key={b.id} className="px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/bookings/edit/?id=${encodeURIComponent(b.id)}`} className="font-medium hover:underline">
                      {b.title}
                    </Link>
                    <span className="shrink-0 text-xs text-muted">{BOOKING_STATUS_LABEL[b.status]}</span>
                  </div>
                  <p className="mt-0.5 text-muted">
                    {b.amountKind === "estimated" ? "Estimated" : "Quoted"} {formatINR(b.amount)} · Paid {formatINR(b.amountPaid)} · Balance{" "}
                    <strong className="text-ink">{formatINR(bookingBalance(b))}</strong>
                  </p>
                  <button type="button" onClick={() => startNew(b.id)} className="mt-1 min-h-11 text-sm font-medium text-palm-700">
                    Log a payment
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="mt-6" aria-labelledby="tx-h">
        <h2 id="tx-h" className="mb-2 text-lg font-semibold text-palm-900">
          Transactions
        </h2>
        {expenses.length === 0 ? (
          <EmptyState icon={<Receipt size={28} />} title="No expenses yet">
            Add what you spend on food, tickets, fuel and more.
          </EmptyState>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-sand-100">
              {expenses.map((e) => {
                const booking = data.bookings.find((b) => b.id === e.bookingId);
                return (
                  <li key={e.id} className="flex items-center gap-2 py-2 pl-4 pr-1">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{e.title}</p>
                      <p className="text-xs text-muted">
                        {formatDate(e.date)} · {EXPENSE_CATEGORY_LABEL[e.category]}
                        {e.payer ? ` · ${e.payer}` : ""}
                        {e.paymentMethod ? ` · ${e.paymentMethod}` : ""}
                        {booking ? ` · ${booking.title}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold">{formatINR(e.amount)}</span>
                    <IconButton label={`Edit ${e.title}`} onClick={() => setEditing({ expense: e, isNew: false })}>
                      <Pencil size={16} aria-hidden />
                    </IconButton>
                    <IconButton label={`Delete ${e.title}`} onClick={() => setDeleting(e)}>
                      <Trash2 size={16} aria-hidden />
                    </IconButton>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      {editing && (
        <ExpenseDialog
          key={editing.expense.id}
          expense={editing.expense}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSave={async (e) => {
            if (await upsert("expenses", e, editing.isNew ? "Expense added" : "Expense saved")) setEditing(null);
          }}
        />
      )}
      {budgetOpen && (
        <BudgetDialog
          initial={data.trip.budget}
          onClose={() => setBudgetOpen(false)}
          onSave={async (budget) => {
            if (await updateTrip({ budget })) setBudgetOpen(false);
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title="Delete expense?"
        message={
          <>
            “{deleting?.title}” ({formatINR(deleting?.amount)}) will be deleted.
          </>
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) void remove("expenses", deleting.id, "Expense deleted");
          setDeleting(null);
        }}
      />
    </>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <ExpensesInner />
    </Suspense>
  );
}

function Summary({ label, value, hint, negative }: { label: string; value: string; hint?: string; negative?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`text-lg font-semibold ${negative ? "text-rose-700" : "text-ink"}`}>{value}</dd>
      {hint && <dd className="text-xs text-muted">{hint}</dd>}
    </div>
  );
}

function ExpenseDialog({ expense, isNew, onSave, onClose }: { expense: Expense; isNew: boolean; onSave: (e: Expense) => void; onClose: () => void }) {
  const data = useData();
  const [form, setForm] = useState(expense);
  const [amountRaw, setAmountRaw] = useState(isNew ? "" : String(expense.amount));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    const amount = parseAmount(amountRaw);
    if (!form.title.trim()) e.title = "Describe the expense.";
    if (amount === undefined || Number.isNaN(amount) || amount <= 0) e.amount = "Enter an amount in rupees, more than zero.";
    if (!isValidDate(form.date)) e.date = "Use a valid date.";
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave({
      ...form,
      title: form.title.trim(),
      amount: amount!,
      payer: form.payer?.trim() || undefined,
      paymentMethod: form.paymentMethod?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      bookingId: form.bookingId || undefined,
    });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={isNew ? "Add expense" : "Edit expense"}
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
        className="grid grid-cols-2 gap-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          submit();
        }}
      >
        <TextField className="col-span-2" label="Description" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} error={errors.title} />
        <TextField label="Amount (₹)" inputMode="decimal" value={amountRaw} onChange={(e) => setAmountRaw(e.target.value)} error={errors.amount} autoFocus={isNew} />
        <TextField label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} error={errors.date} />
        <SelectField
          label="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
          options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: EXPENSE_CATEGORY_LABEL[c] }))}
        />
        <TextField label="Payment method" value={form.paymentMethod ?? ""} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} placeholder="UPI, cash, card…" />
        <TextField label="Paid by" value={form.payer ?? ""} onChange={(e) => setForm({ ...form, payer: e.target.value })} />
        <SelectField
          label="Related booking"
          value={form.bookingId ?? ""}
          onChange={(e) => setForm({ ...form, bookingId: e.target.value || undefined })}
          options={[{ value: "", label: "None" }, ...data.bookings.map((b) => ({ value: b.id, label: b.title }))]}
          hint="Link payments to a booking so they are not counted twice."
        />
        <TextArea className="col-span-2" label="Notes" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <p className="col-span-2 text-xs text-muted">Do not store card numbers, CVV or passwords.</p>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

function BudgetDialog({ initial, onSave, onClose }: { initial?: number; onSave: (b: number | undefined) => void; onClose: () => void }) {
  const [raw, setRaw] = useState(initial === undefined ? "" : String(initial));
  const [error, setError] = useState<string>();
  const submit = () => {
    const v = parseAmount(raw);
    if (Number.isNaN(v)) return setError("Enter a positive amount, or leave blank for no budget.");
    onSave(v);
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title="Trip budget"
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
        <TextField label="Total budget (₹)" inputMode="decimal" value={raw} onChange={(e) => setRaw(e.target.value)} error={error} hint="Leave blank to remove the budget." autoFocus />
      </form>
    </Dialog>
  );
}

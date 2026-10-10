"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle, Pencil, Phone, Plus, Siren, Trash2, UserRound } from "lucide-react";
import { ActionLink, Button, Card, ConfirmDialog, Dialog, EmptyState, IconButton, PageHeader, TextArea, TextField } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { isValidPhone, telHref, whatsappHref } from "@/lib/format";
import { newId, nowIso } from "@/lib/ids";
import { BOOKING_CATEGORY_LABEL, BOOKING_STATUS_LABEL } from "@/lib/labels";
import { useData, useStore } from "@/lib/store";
import type { Contact } from "@/lib/types";

export default function ContactsPage() {
  const data = useData();
  const { upsert, remove } = useStore();
  const [editing, setEditing] = useState<{ contact: Contact; isNew: boolean } | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);

  const contacts = [...data.contacts].sort((a, b) => a.order - b.order);
  const flights = data.bookings.filter((b) => b.category === "flight" && b.status !== "cancelled");
  const others = data.bookings.filter((b) => b.category !== "flight" && b.status !== "cancelled" && (b.referenceNumber || b.phone));

  const add = () => {
    const now = nowIso();
    setEditing({
      contact: { id: newId("ct"), tripId: data.trip.id, label: "", order: contacts.length, createdAt: now, updatedAt: now },
      isNew: true,
    });
  };

  return (
    <>
      <PageHeader
        title="Emergency & contacts"
        subtitle="Works offline. Everything here is stored on this device."
        actions={
          <Button variant="primary" onClick={add}>
            <Plus size={18} aria-hidden /> Add contact
          </Button>
        }
      />

      <a
        href="tel:112"
        className="mb-4 flex min-h-16 items-center gap-3 rounded-2xl bg-rose-700 px-4 py-3 text-white hover:bg-rose-800"
      >
        <Siren size={28} aria-hidden />
        <span>
          <span className="block text-lg font-semibold">Call 112</span>
          <span className="text-sm text-rose-100">India emergency number: police, fire, ambulance</span>
        </span>
      </a>

      <section aria-labelledby="contacts-h" className="space-y-2">
        <h2 id="contacts-h" className="text-lg font-semibold text-palm-900">
          Contacts
        </h2>
        {contacts.length === 0 && <EmptyState title="No contacts yet" />}
        {contacts.map((c) => (
          <Card key={c.id} className="p-3">
            <div className="flex items-start gap-3">
              <UserRound size={22} className="mt-0.5 shrink-0 text-palm-700" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">{c.label}</p>
                <p className="font-semibold">{c.name || <span className="font-normal text-muted">Name not added</span>}</p>
                <p className="font-mono text-sm">{c.phone || <span className="font-sans text-muted">No phone yet</span>}</p>
                {c.notes && <p className="mt-1 text-sm text-muted">{c.notes}</p>}
              </div>
              <IconButton label={`Edit ${c.label}`} onClick={() => setEditing({ contact: c, isNew: false })}>
                <Pencil size={18} aria-hidden />
              </IconButton>
              <IconButton label={`Delete ${c.label}`} onClick={() => setDeleting(c)}>
                <Trash2 size={18} aria-hidden />
              </IconButton>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <ActionLink href={telHref(c.phone)} disabledReason="Add a valid phone number to call">
                <Phone size={16} aria-hidden /> Call
              </ActionLink>
              {c.phone !== "112" && (
                <ActionLink href={whatsappHref(c.phone)} disabledReason="WhatsApp needs a valid mobile number">
                  <MessageCircle size={16} aria-hidden /> WhatsApp
                </ActionLink>
              )}
            </div>
          </Card>
        ))}
      </section>

      <section aria-labelledby="pnr-h" className="mt-6">
        <h2 id="pnr-h" className="mb-2 text-lg font-semibold text-palm-900">
          Flight PNRs
        </h2>
        <Card className="p-0">
          {flights.length === 0 ? (
            <p className="p-4 text-sm text-muted">No flights saved.</p>
          ) : (
            <ul className="divide-y divide-sand-100">
              {flights.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <Link href={`/bookings/edit/?id=${encodeURIComponent(f.id)}`} className="font-medium hover:underline">
                      {f.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {formatDate(f.startDate)} · {f.flight?.airline || "Airline not added"} {f.flight?.flightNumber ?? ""}
                    </p>
                  </div>
                  <span className={`font-mono text-lg font-semibold ${f.referenceNumber ? "" : "text-amber-800"}`}>
                    {f.referenceNumber || "PNR to add"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section aria-labelledby="refs-h" className="mt-6">
        <h2 id="refs-h" className="mb-2 text-lg font-semibold text-palm-900">
          Stays, cab and other bookings
        </h2>
        <Card className="p-0">
          {others.length === 0 ? (
            <p className="p-4 text-sm text-muted">
              Booking references and phone numbers appear here once you add them to a booking.
            </p>
          ) : (
            <ul className="divide-y divide-sand-100">
              {others.map((b) => (
                <li key={b.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/bookings/edit/?id=${encodeURIComponent(b.id)}`} className="font-medium hover:underline">
                        {b.title}
                      </Link>
                      <p className="text-xs text-muted">
                        {BOOKING_CATEGORY_LABEL[b.category]} · {BOOKING_STATUS_LABEL[b.status]}
                        {b.contactName || b.cab?.driverName ? ` · ${b.cab?.driverName || b.contactName}` : ""}
                      </p>
                    </div>
                    {b.referenceNumber && <span className="font-mono font-semibold">{b.referenceNumber}</span>}
                  </div>
                  {b.phone && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <ActionLink href={telHref(b.phone)} disabledReason="Phone number is not valid">
                        <Phone size={16} aria-hidden /> {b.phone}
                      </ActionLink>
                      <ActionLink href={whatsappHref(b.phone)} disabledReason="WhatsApp needs a valid mobile number">
                        <MessageCircle size={16} aria-hidden /> WhatsApp
                      </ActionLink>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {editing && (
        <ContactDialog
          key={editing.contact.id}
          contact={editing.contact}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSave={async (c) => {
            if (await upsert("contacts", c, editing.isNew ? "Contact added" : "Contact saved")) setEditing(null);
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title="Delete contact?"
        message={<>“{deleting?.label}” will be removed.</>}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) void remove("contacts", deleting.id, "Contact deleted");
          setDeleting(null);
        }}
      />
    </>
  );
}

function ContactDialog({
  contact,
  isNew,
  onClose,
  onSave,
}: {
  contact: Contact;
  isNew: boolean;
  onClose: () => void;
  onSave: (c: Contact) => void;
}) {
  const [form, setForm] = useState(contact);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = () => {
    const e: Record<string, string> = {};
    if (!form.label.trim()) e.label = "Add a label, e.g. Hotel reception.";
    if (form.phone && !isValidPhone(form.phone)) e.phone = "Use digits only, e.g. 98765 43210 or +91 98765 43210.";
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave({
      ...form,
      label: form.label.trim(),
      name: form.name?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    });
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={isNew ? "Add contact" : "Edit contact"}
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
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <TextField label="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} error={errors.label} placeholder="e.g. Munnar hotel reception" />
        <TextField label="Name" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <TextField
          label="Phone"
          type="tel"
          inputMode="tel"
          value={form.phone ?? ""}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          error={errors.phone}
          hint="10-digit Indian mobiles work for WhatsApp. Add +country code for others."
        />
        <TextArea label="Notes" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

# Kerala Trip Handbook

A mobile-first, offline-friendly personal handbook for the Kerala trip on **14–18 October 2026** (Hyderabad ⇄ Kochi). It keeps the itinerary, bookings, cab and driver details, checklists, expenses, places, emergency contacts and daily notes in one installable web app.

This is a personal trip organiser, not a booking site. It ships with only the known trip details. Everything else starts blank and marked **Pending / Draft** until you fill it in. It shows no live flight status, traffic, weather or ticket availability.

## Your data stays on your device

- All data is stored in the browser's IndexedDB on the device you use. There is no account, server, analytics or cloud copy.
- Attached tickets (PDF/images) and memory photos are stored as files in IndexedDB on that device only.
- **Back up regularly:** Settings & backup → *Export JSON backup*. The JSON file contains the itinerary, bookings, expenses, checklists, places, contacts and memory notes. **It does not include attached files or photos**; records that referenced them show “File not on this device” after a restore elsewhere.
- *Import backup* validates the file, shows a preview with record counts, and lets you **Merge** (records with the same ID are overwritten, others kept) or **Replace all**.
- *Clear all trip data* deletes everything (including files) after you type `DELETE`, then restores the original trip outline.
- Clearing browser data or uninstalling the browser removes the handbook data. On Settings you can ask the browser to protect the storage from automatic clean-up.

## Features

| Area | What it does |
|---|---|
| **Today** | Trip countdown/day, next planned activity (based on IST), day selector with that day's plan, booking/checklist/money summaries, quick actions (add activity/booking/expense, call driver, open map, emergency). |
| **Itinerary** | Five-day draft timeline plus any extra dates. Add, edit, delete, reorder, move between days, mark done/skipped, travel and buffer blocks, optional items, linked bookings, per-activity checklists, overlap warnings (never blocks saving), editable day labels. |
| **Bookings** | Flights, stays, houseboat, cab, tickets, shows, other. Status chips and filters, reference/PNR, contact, link, quoted vs estimated amount, paid, calculated balance, due/cancellation dates, notes, checklists (hotel, houseboat, cab inclusions…), linked activities, attachments, quick call/WhatsApp/map/mark booked/mark paid. |
| **Cab** | Driver, vehicle, registration, pickup/drop, route (“Open route in Maps” with waypoints), WhatsApp link built only from a valid mobile number. |
| **Checklists** | Preparation lists (documents, packing, family, electronics, home, follow-ups) with add/rename/delete/reorder, progress, reset with confirmation; booking and activity checklists in one place. |
| **Expenses** | INR transactions with category, payer, method and optional booking link; budget; category breakdown; booking commitments vs recorded spend. |
| **Places** | Saved places with planned day, visited toggle, notes and Google Maps search/directions links (no API key). |
| **Emergency & contacts** | One-tap 112, editable contacts with call/WhatsApp, flight PNRs and booking references pulled from bookings. Works offline. |
| **Memories** | A note and photos per day, stored on the device only. |
| **Settings & backup** | Trip details, budget, departure-day airport target, JSON export/import, printable summary, storage usage, install help, clear all data. |

### How money is counted

Booking amounts are **commitments**, not expenses. Expenses are actual payments you log.

- *Spent (recorded)* = sum of logged expenses.
- *Still owed on bookings* = Σ max(amount − paid, 0) over non-cancelled bookings.
- *Unlogged advances* = amounts marked paid on a booking but not logged as expenses linked to that booking.
- *Projected trip total* = spent + unlogged advances + still owed. A booking advance is counted exactly once, whether or not you also log it as an expense.
- *Budget remaining* = budget − projected total.

## Setup

Requires Node.js 20+ (22 recommended).

```bash
npm install
npm run dev        # http://localhost:3000
```

| Command | Purpose |
|---|---|
| `npm run dev` | Development server (service worker disabled) |
| `npm run build` | Static export to `out/` and generate `out/sw.js` |
| `npm start` | Serve `out/` locally |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (strict) |
| `npm test` | Vitest unit tests (dates, formatting, calculations, seed data, IndexedDB, backup import/export) |
| `npm run check` | All of the above |

## Deploying and installing on Android

The app is a static export, so any static host works. A GitHub Pages workflow is included:

1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions** (one time).
2. Push to `main`. The `Deploy to GitHub Pages` workflow builds with `NEXT_PUBLIC_BASE_PATH=/<repo-name>` and publishes to `https://<user>.github.io/<repo-name>/`.
3. On the phone, open that URL in Chrome, then ⋮ → **Install app** / **Add to Home screen**. Open it once while online so every screen is cached for offline use.

For another host under a sub-path, set `NEXT_PUBLIC_BASE_PATH` at build time. For a root domain, leave it unset.

## Offline behaviour

`scripts/generate-sw.mjs` runs after `next build` and writes a service worker that precaches every page and asset in the export. After the first successful load, all screens open without a network connection. Google Maps, WhatsApp and booking websites still need a connection. A new deploy changes the cache name, and old caches are removed on activation.

## Project structure

```
src/app/             Routes: / itinerary bookings(/new, /edit?id=) checklists expenses
                     places contacts memories settings print more
src/components/      AppShell, ui primitives, ChecklistEditor, ActivityForm/Card,
                     BookingForm/Card, Attachments, DaySelector, Toast, ServiceWorker
src/lib/types.ts     Versioned schema (SCHEMA_VERSION)
src/lib/seed.ts      Known trip details and checklist templates
src/lib/db.ts        IndexedDB (idb) persistence; attachments in their own store
src/lib/store.tsx    React context that loads once and writes every change through
src/lib/calc.ts      Progress, booking summary, money, overlaps, next-up
src/lib/backup.ts    Export, validation, merge/replace import
scripts/             Service worker generator
```

Booking editing uses `/bookings/edit/?id=…` rather than `/bookings/[id]` because IDs are created on the device and a static export cannot pre-render them.

## Known limitations

- Single device: there is no sync. Use JSON backups to move data.
- Backups exclude attachments and photos.
- Stored times are planned times in IST; nothing checks live flight, traffic or opening status.
- Phone validation is format-based; WhatsApp links need a 10-digit Indian mobile or a number with `+country code`.
- Browser storage limits apply, especially for many large photos.

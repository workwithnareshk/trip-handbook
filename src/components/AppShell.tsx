"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  CalendarDays,
  Camera,
  Ellipsis,
  ListChecks,
  MapPin,
  Settings,
  Siren,
  Sun,
  Ticket,
  TreePalm,
  Wallet,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "./ui";

const PRIMARY = [
  { href: "/", label: "Today", icon: Sun },
  { href: "/itinerary", label: "Itinerary", icon: CalendarDays },
  { href: "/bookings", label: "Bookings", icon: Ticket },
  { href: "/checklists", label: "Checklist", icon: ListChecks },
  { href: "/expenses", label: "Expenses", icon: Wallet },
];

export const SECONDARY = [
  { href: "/contacts", label: "Emergency & contacts", icon: Siren },
  { href: "/places", label: "Places & maps", icon: MapPin },
  { href: "/memories", label: "Memories", icon: Camera },
  { href: "/settings", label: "Settings & backup", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  const p = pathname.replace(/\/$/, "") || "/";
  if (href === "/") return p === "/";
  return p === href || p.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const moreActive = pathname.startsWith("/more") || SECONDARY.some((s) => isActive(pathname, s.href));

  return (
    <div className="min-h-dvh md:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sand-200 bg-white px-3 py-5 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2 text-palm-800">
          <TreePalm size={26} aria-hidden />
          <span className="text-lg font-semibold leading-tight">Kerala Trip Handbook</span>
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {[...PRIMARY, ...SECONDARY].map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium ${
                  active ? "bg-palm-50 text-palm-900" : "text-muted hover:bg-sand-100 hover:text-ink"
                }`}
              >
                <Icon size={20} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto px-2 text-xs text-muted">Your trip data is stored on this device only.</p>
      </aside>

      <main id="main" className="pb-safe mx-auto w-full max-w-3xl px-4 pt-5 md:px-8 md:pt-8">
        <DataGate>{children}</DataGate>
      </main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Main"
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-sand-200 bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-6">
          {[...PRIMARY, { href: "/more", label: "More", icon: Ellipsis }].map(({ href, label, icon: Icon }) => {
            const active = href === "/more" ? moreActive : isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                    active ? "text-palm-800" : "text-muted"
                  }`}
                >
                  <Icon size={22} aria-hidden strokeWidth={active ? 2.4 : 1.8} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function DataGate({ children }: { children: ReactNode }) {
  const { status, error, reload } = useStore();
  if (status === "loading") {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center text-muted" role="status">
        Loading your trip…
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950" role="alert">
        <p className="font-semibold">Could not open the trip data on this device.</p>
        <p className="mt-1 text-sm">{error}</p>
        <p className="mt-2 text-sm">Private browsing modes can block offline storage. Try a normal browser window.</p>
        <Button className="mt-3" onClick={() => void reload()}>
          Try again
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}

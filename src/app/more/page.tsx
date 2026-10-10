"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SECONDARY } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";

export default function MorePage() {
  return (
    <>
      <PageHeader title="More" />
      <ul className="divide-y divide-sand-200 overflow-hidden rounded-2xl border border-sand-200 bg-white">
        {SECONDARY.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-14 items-center gap-3 px-4 hover:bg-sand-50">
              <Icon size={22} className="text-palm-700" aria-hidden />
              <span className="flex-1 font-medium">{label}</span>
              <ChevronRight size={18} className="text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted">
        Everything in this handbook is stored on this device only. Use Settings &amp; backup to export a copy.
      </p>
    </>
  );
}

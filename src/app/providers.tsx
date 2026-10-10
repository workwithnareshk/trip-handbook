"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { ServiceWorker } from "@/components/ServiceWorker";
import { ToastProvider } from "@/components/Toast";
import { StoreProvider } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ServiceWorker />
      <StoreProvider>
        <AppShell>{children}</AppShell>
      </StoreProvider>
    </ToastProvider>
  );
}

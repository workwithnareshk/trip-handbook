import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Kerala Trip Handbook",
  description: "Personal offline handbook for the Kerala trip, 14–18 October 2026.",
  applicationName: "Kerala Trip",
  appleWebApp: { capable: true, title: "Kerala Trip", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#185649",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

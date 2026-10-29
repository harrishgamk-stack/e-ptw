import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./simple.css";
import { StoreProvider } from "@/components/store";
import { Shell } from "@/components/shell";
import { isConfigured } from "@/lib/supabase/server";
import { Pwa } from "@/components/pwa";
import { WeeklyProvider } from "@/features/weekly/store";
import "./weekly.css";
export const metadata: Metadata = {
  title: "PCG ePTW | Safety workspace",
  description:
    "Electronic Permit to Work & Safety Control System for Premier Centre Group",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = {
  themeColor: "#10243b",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <StoreProvider demo={!isConfigured()}>
          <WeeklyProvider enabled={!isConfigured()}>
            <Pwa />
            <Shell>{children}</Shell>
          </WeeklyProvider>
        </StoreProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./simple.css";
import { StoreProvider } from "@/components/store";
import { Shell } from "@/components/shell";
import { isConfigured } from "@/lib/supabase/server";
import { Pwa } from "@/components/pwa";
import { WeeklyProvider } from "@/features/weekly/store";
import "./weekly.css";
import "./branding.css";
const rubik = localFont({
  src: "./fonts/rubik-latin.woff2",
  weight: "300 700",
  style: "normal",
  display: "swap",
  variable: "--font-rubik",
});
export const metadata: Metadata = {
  title: "PCG ePTW | Safety workspace",
  description:
    "Electronic Permit to Work & Safety Control System for Premier Centre Group",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/brand/pcg-icon-192.png",
    apple: "/brand/pcg-apple-icon.png",
  },
};
export const viewport: Viewport = {
  themeColor: "#004e46",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={rubik.variable}>
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

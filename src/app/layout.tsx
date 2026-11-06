import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const instrument = localFont({
  src: [
    { path: "./fonts/instrument-sans-latin-wght-normal.woff2", weight: "400 700", style: "normal" },
    { path: "./fonts/instrument-sans-latin-ext-wght-normal.woff2", weight: "400 700", style: "normal" },
  ],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "89 Gradi", template: "%s · 89 Gradi" },
  description: "Gestionale privato di 89 Gradi — pizza catering e cocktail bar.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "89 Gradi", statusBarStyle: "default" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#F7F3EE",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={instrument.variable}>
      <body>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}

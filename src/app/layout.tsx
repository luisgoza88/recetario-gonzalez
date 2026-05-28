import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Fraunces,
  Plus_Jakarta_Sans,
} from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import Providers from "@/lib/providers/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Recetario Familia González",
  description: "Plan de 15 días - Menú rotativo familiar",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Recetario",
  },
};

export const viewport: Viewport = {
  themeColor: "#15803d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${plusJakarta.variable} antialiased warm-mode min-h-screen`}
        style={{
          fontFamily: "var(--font-jakarta), var(--font-geist-sans)",
          background: "var(--bg)",
          color: "var(--ink)",
          paddingBottom: "96px",
          lineHeight: 1.5,
        }}
      >
        <Providers>
          <ServiceWorkerRegistration />
          {children}
        </Providers>
      </body>
    </html>
  );
}

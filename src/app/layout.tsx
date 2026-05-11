import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import Providers from "@/lib/providers/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Evita FOIT (Flash of Invisible Text)
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Sprint 10 (Lazyweb research): serif moderna para heros editoriales
// (NYT Cooking pattern). Solo se usa via la clase .font-display.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
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
  themeColor: "#FF6B35", // orange brand 2026 (Lazyweb research)
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
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased bg-gray-100 min-h-screen`}
      >
        <Providers>
          <ServiceWorkerRegistration />
          {children}
        </Providers>
      </body>
    </html>
  );
}

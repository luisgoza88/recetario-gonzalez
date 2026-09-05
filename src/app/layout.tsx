import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import Providers from "@/lib/providers/Providers";

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

// Monospace del nuevo design system (etiquetas técnicas, fechas, números)
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Recetario Familiar",
  description: "Recetas, menú, compras y tareas para tu hogar",
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
        className={`${fraunces.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} antialiased warm-mode min-h-screen`}
        style={{
          fontFamily: "var(--font-jakarta), system-ui, sans-serif",
          background: "var(--bg)",
          color: "var(--ink)",
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

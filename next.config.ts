import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  // Headers de seguridad
  async headers() {
    // CSP permite: self, Supabase, PostHog, Google APIs, y recursos inline de Next.js
    const isDev = process.env.NODE_ENV === "development";
    const cspDirectives = [
      "default-src 'self'",
      // unsafe-inline necesario para Next.js inline styles; unsafe-eval solo en dev (hot reload)
      // vercel.live: feedback widget en deploys; pexels: imagenes de comida
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://us.i.posthog.com https://us-assets.i.posthog.com https://vercel.live`,
      "style-src 'self' 'unsafe-inline' https://vercel.live https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.supabase.co https://us.i.posthog.com https://images.pexels.com https://images.unsplash.com https://vercel.live https://vercel.com",
      "font-src 'self' data: https://vercel.live https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://us.i.posthog.com https://us-assets.i.posthog.com https://us.posthog.com https://api.pexels.com https://vercel.live wss://ws-us3.pusher.com",
      "frame-src https://vercel.live",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: cspDirectives,
          },
        ],
      },
    ];
  },

  // Optimizaciones de rendimiento
  experimental: {
    // Optimizar imports de paquetes grandes
    optimizePackageImports: ["lucide-react", "@supabase/supabase-js"],
  },

  // Mejor detección de errores en desarrollo
  reactStrictMode: true,

  // Optimización de imágenes
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Recipe photos hibridas Pexels (cliente getRecipeImageHybrid)
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "/**",
      },
      // Fallback Unsplash
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default withBundleAnalyzer(withSerwist(nextConfig));

import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  // Usar webpack en lugar de turbopack para el build de producción
  // para compatibilidad con serwist
  turbopack: {},
};

export default withSerwist(nextConfig);

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware de autenticación
 *
 * Protege las rutas de API que requieren autenticación.
 * Las rutas públicas (auth, join, assets, etc.) son accesibles sin sesión.
 */

// Rutas que no requieren autenticación
const PUBLIC_PATHS = [
  "/auth",
  "/join",
  "/r/", // Páginas públicas de recetas compartidas
  "/_next",
  "/favicon",
  "/manifest",
  "/sw.js",
  "/icon",
  "/apple-icon",
  "/api/auth", // Endpoints de auth de Supabase
];

// Rutas de API públicas (no requieren auth)
const PUBLIC_API_PATHS = [
  "/api/auth",
  "/api/validate-invitation",
  "/api/pwa-icon", // PWA manifest necesita iconos sin sesión
  "/api/cron", // Cron jobs validan via CRON_SECRET header
  "/api/push/send", // GET es health check (solo VAPID public key); POST se auto-autentica via CRON_SECRET
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas sin verificación
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Permitir la página principal sin auth (para mostrar landing/login)
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Solo verificar autenticación para rutas de API protegidas
  if (pathname.startsWith("/api") || pathname === "/onboarding") {
    // Permitir APIs públicas
    if (PUBLIC_API_PATHS.some((path) => pathname.startsWith(path))) {
      return NextResponse.next();
    }

    const requestHeaders = new Headers(request.headers);
    type ResponseCookieOptions = Parameters<
      ReturnType<typeof NextResponse.next>["cookies"]["set"]
    >[2];
    type CookieToSet = {
      name: string;
      value: string;
      options?: ResponseCookieOptions;
    };
    const mutableCookiesToSet: CookieToSet[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              mutableCookiesToSet.push({ name, value, options });
            });
          },
        },
      },
    );

    // Verificar usuario autenticado (getUser() es más seguro que getSession())
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      // Log para debugging (en desarrollo)
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[Middleware] Auth required for ${pathname} - no valid user`,
        );
      }

      if (pathname === "/onboarding") {
        const login = new URL("/auth/login", request.url);
        login.searchParams.set(
          "redirect",
          request.nextUrl.pathname + request.nextUrl.search,
        );
        return NextResponse.redirect(login);
      }
      const unauthorizedResponse = NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
      mutableCookiesToSet.forEach(({ name, value, options }) => {
        unauthorizedResponse.cookies.set(name, value, options);
      });
      return unauthorizedResponse;
    }

    // Usuario autenticado: inyectar user ID en request headers para API routes.
    requestHeaders.set("x-user-id", user.id);

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    mutableCookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  }

  // Para páginas normales, permitir acceso (el cliente maneja la auth)
  return NextResponse.next();
}

// Configurar qué rutas pasan por el middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

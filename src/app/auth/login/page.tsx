"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, AlertCircle, ArrowRight, Ticket } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Spinner from "@/components/ui/Spinner";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Por favor completa todos los campos");
      return;
    }

    const result = await signIn(email, password);

    if (result.error) {
      // Traducir errores comunes
      if (result.error.includes("Invalid login credentials")) {
        setError("Email o contrasena incorrectos");
      } else if (result.error.includes("Email not confirmed")) {
        setError("Por favor confirma tu email antes de iniciar sesion");
      } else {
        setError(result.error);
      }
    } else {
      const redirectParam = searchParams.get("redirect");
      const safeRedirect =
        redirectParam && redirectParam.startsWith("/") ? redirectParam : "/";
      router.push(safeRedirect);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)]">
      {/* Logo + titulo */}
      <div className="pt-16 pb-8 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto bg-gradient-to-br from-[var(--accent)] to-green-800 text-white flex items-center justify-center text-[28px] font-bold shadow-lg shadow-green-200">
          R
        </div>
        <h1 className="text-[26px] font-bold tracking-tight mt-4">
          Recetario Familiar
        </h1>
        <p className="text-[14px] text-[var(--ink-soft)] mt-1">
          Tu cocina, tu hogar, tu IA
        </p>
      </div>

      <div className="px-6 flex-1 w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
          {/* Tabs login / registro */}
          <div className="flex bg-stone-100 rounded-xl p-1 mb-5">
            <span className="flex-1 py-2 rounded-lg text-[13px] font-semibold text-center bg-white shadow-sm text-[var(--ink)]">
              Iniciar sesion
            </span>
            <Link
              href="/auth/register"
              className="flex-1 py-2 rounded-lg text-[13px] font-semibold text-center text-stone-500 transition-all hover:text-[var(--ink)]"
            >
              Crear cuenta
            </Link>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-[var(--danger-light)] text-[var(--danger)] rounded-xl">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Email */}
            <div className="mb-3">
              <label className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 bg-stone-50 border border-[var(--border)] rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:border-[var(--accent)] transition-colors"
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="mb-2">
              <label className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                Contrasena
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mt-1 bg-stone-50 border border-[var(--border)] rounded-xl px-3 py-2.5 pr-11 text-[14px] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  placeholder="Tu contrasena"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-stone-400 hover:text-stone-600"
                  aria-label={
                    showPassword ? "Ocultar contrasena" : "Mostrar contrasena"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password link */}
            <div className="text-right">
              <Link
                href="/auth/forgot-password"
                className="text-[12px] text-[var(--accent)] font-medium hover:underline"
              >
                Olvidaste tu contrasena?
              </Link>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 bg-[var(--accent)] text-white py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.99] hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Spinner size="md" color="white" />
                  Iniciando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[11px] text-stone-400 uppercase tracking-wider">
              o
            </span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Join with code */}
          <Link
            href="/join"
            className="w-full bg-white border border-[var(--border)] py-2.5 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors"
          >
            <Ticket className="w-4 h-4 text-[var(--accent)]" />
            Tengo un codigo de invitacion
          </Link>
        </div>

        {/* Register link */}
        <p className="mt-6 text-center text-[13px] text-[var(--ink-soft)]">
          No tienes cuenta?{" "}
          <Link
            href="/auth/register"
            className="text-[var(--accent)] font-semibold hover:underline"
          >
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}

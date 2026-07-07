"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, AlertCircle, Check, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Spinner from "@/components/ui/Spinner";

export default function RegisterPage() {
  const { signUp, isLoading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validacion de contrasena
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch =
    password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName || !email || !password || !confirmPassword) {
      setError("Por favor completa todos los campos");
      return;
    }

    if (!isPasswordValid) {
      setError("La contraseña no cumple con los requisitos");
      return;
    }

    if (!passwordsMatch) {
      setError("Las contraseñas no coinciden");
      return;
    }

    const result = await signUp(email, password, fullName);

    if (result.error) {
      // Traducir errores comunes
      if (result.error.includes("already registered")) {
        setError("Este email ya está registrado");
      } else {
        setError("No se pudo crear la cuenta. Intenta de nuevo.");
      }
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--ink)] p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-[var(--border)] p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--accent-soft)] rounded-2xl mb-4">
              <Check className="w-8 h-8 text-[var(--accent)]" />
            </div>
            <h2 className="text-[22px] font-bold tracking-tight mb-2">
              ¡Registro exitoso!
            </h2>
            <p className="text-[14px] text-[var(--ink-soft)] mb-6">
              Te hemos enviado un email de confirmación. Por favor revisa tu
              bandeja de entrada y haz clic en el enlace para activar tu cuenta.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent)] text-white text-[14px] font-semibold rounded-xl transition-all active:scale-[0.99] hover:opacity-95"
            >
              Ir a Iniciar Sesión
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

      <div className="px-6 flex-1 w-full max-w-md mx-auto pb-8">
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
          {/* Tabs login / registro */}
          <div className="flex bg-stone-100 rounded-xl p-1 mb-5">
            <Link
              href="/auth/login"
              className="flex-1 py-2 rounded-lg text-[13px] font-semibold text-center text-stone-500 transition-all hover:text-[var(--ink)]"
            >
              Iniciar sesión
            </Link>
            <span className="flex-1 py-2 rounded-lg text-[13px] font-semibold text-center bg-white shadow-sm text-[var(--ink)]">
              Crear cuenta
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-[var(--danger-light)] text-[var(--danger)] rounded-xl">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Full Name */}
            <div className="mb-3">
              <label className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                Nombre completo
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full mt-1 bg-stone-50 border border-[var(--border)] rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:border-[var(--accent)] transition-colors"
                placeholder="Tu nombre"
                autoComplete="name"
              />
            </div>

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
            <div className="mb-3">
              <label className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mt-1 bg-stone-50 border border-[var(--border)] rounded-xl px-3 py-2.5 pr-11 text-[14px] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  placeholder="Crea una contraseña segura"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-stone-400 hover:text-stone-600"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password requirements */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <PasswordCheck
                    passed={passwordChecks.length}
                    text="Mínimo 8 caracteres"
                  />
                  <PasswordCheck
                    passed={passwordChecks.uppercase}
                    text="Una mayúscula"
                  />
                  <PasswordCheck
                    passed={passwordChecks.lowercase}
                    text="Una minúscula"
                  />
                  <PasswordCheck
                    passed={passwordChecks.number}
                    text="Un número"
                  />
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="mb-2">
              <label className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                Confirmar contraseña
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full mt-1 bg-stone-50 border rounded-xl px-3 py-2.5 text-[14px] focus:outline-none transition-colors ${
                  confirmPassword.length > 0
                    ? passwordsMatch
                      ? "border-[var(--accent)] focus:border-[var(--accent)]"
                      : "border-[var(--danger)] focus:border-[var(--danger)]"
                    : "border-[var(--border)] focus:border-[var(--accent)]"
                }`}
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="mt-1 text-[12px] text-[var(--danger)]">
                  Las contraseñas no coinciden
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || !isPasswordValid || !passwordsMatch}
              className="w-full mt-4 bg-[var(--accent)] text-white py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.99] hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Spinner size="md" color="white" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  Crear mi recetario
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Login link */}
        <p className="mt-6 text-center text-[13px] text-[var(--ink-soft)]">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/auth/login"
            className="text-[var(--accent)] font-semibold hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

// Componente para mostrar requisitos de contrasena
function PasswordCheck({ passed, text }: { passed: boolean; text: string }) {
  return (
    <div
      className={`flex items-center gap-2 text-xs ${
        passed ? "text-[var(--accent)]" : "text-stone-400"
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center ${
          passed ? "bg-[var(--accent-soft)]" : "bg-stone-100"
        }`}
      >
        {passed && <Check className="w-3 h-3" />}
      </div>
      {text}
    </div>
  );
}

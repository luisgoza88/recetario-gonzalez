"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, CheckCircle2, AlertCircle, ChefHat } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { isLoading, isAuthenticated, updatePassword } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordChecks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
  };
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch =
    newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError("La contrasena no cumple con los requisitos");
      return;
    }

    if (!passwordsMatch) {
      setError("Las contrasenas no coinciden");
      return;
    }

    setIsSubmitting(true);
    const result = await updatePassword(newPassword);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/");
    }, 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Nueva contrasena</h1>
          <p className="text-gray-600 mt-1">
            Actualiza tu contrasena de acceso
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {success ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Contrasena actualizada
              </h2>
              <p className="text-gray-600">Redirigiendo...</p>
            </div>
          ) : (
            <>
              {!isLoading && !isAuthenticated && (
                <div className="mb-4 flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">
                    Este enlace de recuperacion no es valido o ya expiro.
                  </span>
                </div>
              )}

              {error && (
                <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nueva contrasena
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="Nueva contrasena"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar nueva contrasena
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="Repite tu nueva contrasena"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !isAuthenticated}
                  className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? "Actualizando..."
                    : "Guardar nueva contrasena"}
                </button>
              </form>

              <p className="mt-6 text-center text-gray-600">
                <Link
                  href="/auth/login"
                  className="text-green-600 font-semibold hover:text-green-700"
                >
                  Volver a iniciar sesion
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ChefHat, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Por favor ingresa tu email');
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword(email.trim());
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Recuperar contrasena</h1>
          <p className="text-gray-600 mt-1">Te enviaremos un enlace para restablecerla</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {success ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Email enviado</h2>
              <p className="text-gray-600 mb-6">
                Revisa tu bandeja de entrada y abre el enlace para cambiar tu contrasena.
              </p>
              <Link
                href="/auth/login"
                className="inline-block px-5 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all"
              >
                Volver a iniciar sesion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="tu@email.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar enlace de recuperacion'}
              </button>
            </form>
          )}

          {!success && (
            <p className="mt-6 text-center text-gray-600">
              Recordaste tu contrasena?{' '}
              <Link href="/auth/login" className="text-green-600 font-semibold hover:text-green-700">
                Inicia sesion
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

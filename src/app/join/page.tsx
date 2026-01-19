'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Ticket, AlertCircle, Check, Users, ArrowRight } from 'lucide-react';
import { useOptionalAuth } from '@/contexts/AuthContext';
import {
  validateInvitationCode,
  useInvitationCode,
  formatInvitationCode,
  getRoleName,
  getRoleColor,
  getRoleDescription,
  type InvitationValidation
} from '@/lib/invitation-service';

// Componente interno que usa useSearchParams
function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useOptionalAuth();

  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [validation, setValidation] = useState<InvitationValidation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Si hay un codigo en la URL, usarlo
  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setCode(codeParam.toUpperCase());
      handleValidate(codeParam);
    }
  }, [searchParams]);

  const handleCodeChange = (value: string) => {
    // Solo permitir letras y numeros, maximo 8 caracteres
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setCode(cleaned);

    // Limpiar validacion anterior si el codigo cambio
    if (validation) {
      setValidation(null);
    }
    setError(null);
  };

  const handleValidate = async (codeToValidate?: string) => {
    const finalCode = codeToValidate || code;

    if (finalCode.length !== 8) {
      setError('El codigo debe tener 8 caracteres');
      return;
    }

    setIsValidating(true);
    setError(null);

    const result = await validateInvitationCode(finalCode);
    setValidation(result);

    if (!result.isValid) {
      setError(result.error || 'Codigo invalido');
    }

    setIsValidating(false);
  };

  const handleJoin = async () => {
    if (!auth?.isAuthenticated) {
      // Guardar codigo y redirigir a login
      sessionStorage.setItem('pendingInvitationCode', code);
      router.push('/auth/login?redirect=/join');
      return;
    }

    setIsJoining(true);
    setError(null);

    const result = await useInvitationCode(code);

    if (result.success) {
      setSuccess(true);
      // Refrescar memberships
      await auth.refreshMemberships();
      // Redirigir despues de 2 segundos
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } else {
      setError(result.error || 'Error al unirse');
    }

    setIsJoining(false);
  };

  // Verificar si hay un codigo pendiente despues de login
  useEffect(() => {
    if (auth?.isAuthenticated) {
      const pendingCode = sessionStorage.getItem('pendingInvitationCode');
      if (pendingCode && !code) {
        setCode(pendingCode);
        sessionStorage.removeItem('pendingInvitationCode');
        handleValidate(pendingCode);
      }
    }
  }, [auth?.isAuthenticated]);

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Bienvenido!</h2>
            <p className="text-gray-600 mb-4">
              Te has unido exitosamente a <strong>{validation?.householdName}</strong>
            </p>
            <p className="text-sm text-gray-500">Redirigiendo...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
            <Ticket className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Unirse a un Hogar</h1>
          <p className="text-gray-600 mt-1">Ingresa tu codigo de invitacion</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Code input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Codigo de invitacion
            </label>
            <div className="relative">
              <input
                type="text"
                value={formatInvitationCode(code)}
                onChange={(e) => handleCodeChange(e.target.value.replace('-', ''))}
                className="w-full text-center text-2xl font-mono tracking-widest py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all uppercase"
                placeholder="XXXX-XXXX"
                maxLength={9}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              8 caracteres alfanumericos
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Validation result */}
          {validation?.isValid && validation.invitation && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{validation.householdName}</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(validation.invitation.role)}`}>
                    {getRoleName(validation.invitation.role)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {getRoleDescription(validation.invitation.role)}
              </p>
              {validation.invitation.suggested_name && (
                <p className="text-sm text-gray-500 mt-2">
                  Seras registrado como: <strong>{validation.invitation.suggested_name}</strong>
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          {!validation?.isValid ? (
            <button
              onClick={() => handleValidate()}
              disabled={code.length !== 8 || isValidating}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isValidating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  Validar codigo
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isJoining ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uniendose...
                </>
              ) : (
                <>
                  {auth?.isAuthenticated ? 'Unirse al hogar' : 'Continuar'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          )}

          {/* Auth status message */}
          {validation?.isValid && !auth?.isAuthenticated && (
            <p className="text-sm text-gray-500 text-center mt-4">
              Necesitaras iniciar sesion o crear una cuenta para continuar
            </p>
          )}

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-200" />
            <span className="px-4 text-sm text-gray-500">o</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Links */}
          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full py-3 text-center border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all"
            >
              Ya tengo cuenta
            </Link>
            <Link
              href="/auth/register"
              className="block w-full py-3 text-center text-gray-500 hover:text-gray-700 transition-all"
            >
              Crear cuenta nueva
            </Link>
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

// Loading fallback
function JoinPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
    </div>
  );
}

// Main export with Suspense
export default function JoinPage() {
  return (
    <Suspense fallback={<JoinPageLoading />}>
      <JoinPageContent />
    </Suspense>
  );
}

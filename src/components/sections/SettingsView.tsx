"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Bell,
  Database,
  Info,
  ChevronRight,
  Moon,
  Globe,
  Shield,
  HelpCircle,
  Smartphone,
  Brain,
  UtensilsCrossed,
  LogOut,
  User,
  Mail,
  BarChart3,
  Sparkles,
  Crown,
} from "lucide-react";
import AICommandCenter from "@/components/ai/AICommandCenter";
import DietaryPreferencesPanel from "@/components/settings/DietaryPreferencesPanel";
import CookingProfilePanel from "@/components/settings/CookingProfilePanel";
import MonthlyReportView from "@/components/reports/MonthlyReportView";
import { KidsMode } from "@/components/kids/KidsMode";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { AdminOnly } from "@/components/auth/RoleGate";
import {
  useHouseholdId,
  useCurrentHousehold,
} from "@/lib/stores/useHouseholdStore";
import { useAuth } from "@/contexts/AuthContext";

interface SettingsSectionProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
  rightContent?: React.ReactNode;
  danger?: boolean;
}

function SettingsSection({
  icon,
  title,
  description,
  onClick,
  rightContent,
  danger,
}: SettingsSectionProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-4 p-4 bg-white rounded-xl
        ${onClick ? "hover:bg-gray-50 active:bg-gray-100" : ""}
        transition-colors text-left
      `}
    >
      <div
        className={`
        w-10 h-10 rounded-full flex items-center justify-center
        ${danger ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"}
      `}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className={`font-medium ${danger ? "text-red-600" : ""}`}>{title}</p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      {rightContent ||
        (onClick && <ChevronRight size={20} className="text-gray-400" />)}
    </button>
  );
}

export default function SettingsView() {
  const [notifications, setNotifications] = useState(true);
  const [showAICommandCenter, setShowAICommandCenter] = useState(false);
  const [showDietaryPreferences, setShowDietaryPreferences] = useState(false);
  const [showCookingProfile, setShowCookingProfile] = useState(false);
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);
  const [showKidsMode, setShowKidsMode] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { tier, isPremium } = useSubscription();
  const householdId = useHouseholdId();
  const household = useCurrentHousehold();
  const { user, signOut } = useAuth();
  const router = useRouter();

  /**
   * Cierra sesión limpiando TODO: cookies, localStorage,
   * IndexedDB cache y service worker. Después redirige a /auth/login.
   */
  const handleSignOut = async () => {
    if (signingOut) return;
    const confirmed = window.confirm(
      "¿Seguro que quieres cerrar sesión? Tendrás que volver a ingresar.",
    );
    if (!confirmed) return;

    setSigningOut(true);
    try {
      // 1. Sign out de Supabase (limpia cookies + localStorage)
      await signOut();

      // 2. Limpiar IndexedDB (cache offline de la app)
      try {
        const dbs = await window.indexedDB.databases?.();
        if (dbs) {
          await Promise.all(
            dbs.map(
              (db) =>
                new Promise<void>((resolve) => {
                  if (!db.name) return resolve();
                  const req = window.indexedDB.deleteDatabase(db.name);
                  req.onsuccess = () => resolve();
                  req.onerror = () => resolve();
                  req.onblocked = () => resolve();
                }),
            ),
          );
        }
      } catch {
        /* ignore IndexedDB cleanup errors */
      }

      // 3. Limpiar localStorage residual (excepto preferencias mínimas)
      try {
        Object.keys(localStorage).forEach((key) => {
          if (
            key.startsWith("supabase.") ||
            key.startsWith("sb-") ||
            key.startsWith("ai_session_") ||
            key.startsWith("recetario.")
          ) {
            localStorage.removeItem(key);
          }
        });
      } catch {
        /* ignore */
      }

      // 4. Desregistrar service workers
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
      } catch {
        /* ignore SW unregister errors */
      }

      // 5. Limpiar caches del browser
      try {
        if ("caches" in window) {
          const names = await caches.keys();
          await Promise.all(names.map((n) => caches.delete(n)));
        }
      } catch {
        /* ignore cache cleanup */
      }

      // 6. Redirigir a login con hard reload para asegurar estado limpio
      window.location.href = "/auth/login";
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Forzar redirect aunque falle algo
      window.location.href = "/auth/login";
    }
  };

  // Show AI Command Center as full screen
  if (showAICommandCenter) {
    return (
      <AICommandCenter
        onClose={() => setShowAICommandCenter(false)}
        householdId={householdId || undefined}
      />
    );
  }

  // Show Dietary Preferences panel
  if (showDietaryPreferences && householdId) {
    return (
      <DietaryPreferencesPanel
        householdId={householdId}
        onBack={() => setShowDietaryPreferences(false)}
      />
    );
  }

  // Show Cooking Profile panel
  if (showCookingProfile && householdId) {
    return (
      <CookingProfilePanel
        householdId={householdId}
        onBack={() => setShowCookingProfile(false)}
      />
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Settings size={28} className="text-gray-600" />
          Ajustes
        </h1>
        <p className="text-gray-500 mt-1">Configura tu aplicación</p>
      </div>

      {/* AI Command Center - Prominent Card */}
      <div className="mb-6">
        <button
          onClick={() => setShowAICommandCenter(true)}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 text-white text-left hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Brain size={28} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">Centro de Comando IA</p>
              <p className="text-purple-200 text-sm">
                Monitorea, controla y configura tu asistente
              </p>
            </div>
            <ChevronRight size={24} className="text-purple-200" />
          </div>
        </button>
      </div>

      {/* Cuenta Section - Usuario logueado */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500 mb-2 px-1">CUENTA</p>
        <div className="space-y-2">
          <div className="bg-white rounded-xl p-4 flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {(user?.email?.charAt(0) || "U").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base truncate">
                {user?.full_name || user?.email?.split("@")[0] || "Usuario"}
              </p>
              <p className="text-gray-500 text-sm truncate flex items-center gap-1">
                <Mail size={12} />
                {user?.email || "Sin sesión"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500 mb-2 px-1">HOGAR</p>
        <div className="space-y-2">
          <div className="bg-white rounded-xl p-4 flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {(household?.name?.charAt(0) || "H").toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg">
                {household?.name || "Mi Hogar"}
              </p>
              <p className="text-gray-500 text-sm">Hogar activo</p>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
        </div>
      </div>

      {/* Porciones */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500 mb-2 px-1">PORCIONES</p>
        <div className="bg-white rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">🍽️</span>
                </div>
                <div>
                  <p className="font-medium">Porción grande</p>
                  <p className="text-sm text-gray-500">Plato principal</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-blue-600">3</span>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">🥗</span>
                </div>
                <div>
                  <p className="font-medium">Porción pequeña</p>
                  <p className="text-sm text-gray-500">Plato ligero</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-green-600">2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preferencias */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500 mb-2 px-1">
          PREFERENCIAS
        </p>
        <div className="space-y-2">
          <SettingsSection
            icon={<Bell size={20} />}
            title="Notificaciones"
            description={notifications ? "Activadas" : "Desactivadas"}
            rightContent={
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-12 h-7 rounded-full transition-colors ${
                  notifications ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                    notifications ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            }
          />
          <SettingsSection
            icon={<UtensilsCrossed size={20} />}
            title="Preferencias Dietéticas"
            description="Restricciones, alergias y preferencias"
            onClick={() => setShowDietaryPreferences(true)}
          />
          <SettingsSection
            icon={<Moon size={20} />}
            title="Tema oscuro"
            description="Próximamente"
          />
          <SettingsSection
            icon={<Globe size={20} />}
            title="Idioma"
            description="Español"
            onClick={() => {}}
          />
        </div>
      </div>

      {/* Datos - Solo visible para admin */}
      <AdminOnly>
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-500 mb-2 px-1">DATOS</p>
          <div className="space-y-2">
            <SettingsSection
              icon={<Database size={20} />}
              title="Exportar datos"
              description="Descarga tus recetas y menús"
              onClick={() => {}}
            />
            <SettingsSection
              icon={<Shield size={20} />}
              title="Privacidad"
              description="Gestiona tus datos"
              onClick={() => {}}
            />
          </div>
        </div>
      </AdminOnly>

      {/* Funciones extras */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500 mb-2 px-1">
          MIS FUNCIONES
        </p>
        <div className="space-y-2">
          <SettingsSection
            icon={<BarChart3 size={20} />}
            title="Mi reporte mensual"
            description="Estadísticas de cocina, gasto y ahorro del mes"
            onClick={() => setShowMonthlyReport(true)}
          />
          <SettingsSection
            icon={<Sparkles size={20} />}
            title="Modo Niños"
            description="Pantalla simple para que los chicos ayuden en cocina"
            onClick={() => setShowKidsMode(true)}
          />
          <SettingsSection
            icon={<Crown size={20} />}
            title={isPremium ? `Plan ${tier}` : "Actualizar a Premium"}
            description={
              isPremium
                ? "✓ Funciones premium activas"
                : "Recetas e imágenes ilimitadas, asistente de voz"
            }
            onClick={() => {
              if (!isPremium) {
                window.alert(
                  "Premium llega pronto. Por ahora puedes activarlo manualmente desde la BD.",
                );
              }
            }}
            rightContent={
              isPremium ? (
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-bold">
                  ⭐ {tier.toUpperCase()}
                </span>
              ) : undefined
            }
          />
        </div>
      </div>

      {/* Modal Reporte Mensual */}
      {showMonthlyReport && (
        <MonthlyReportView onClose={() => setShowMonthlyReport(false)} />
      )}

      {/* Modal Modo Niños */}
      {showKidsMode && <KidsMode onClose={() => setShowKidsMode(false)} />}

      {/* Información */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500 mb-2 px-1">
          INFORMACIÓN
        </p>
        <div className="space-y-2">
          <SettingsSection
            icon={<Smartphone size={20} />}
            title="Versión de la app"
            description="1.0.0"
          />
          <SettingsSection
            icon={<HelpCircle size={20} />}
            title="Ayuda y soporte"
            onClick={() => {}}
          />
          <SettingsSection
            icon={<Info size={20} />}
            title="Acerca de"
            description="Recetario Familia González"
            onClick={() => {}}
          />
        </div>
      </div>

      {/* Cerrar Sesión - Botón rojo prominente */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500 mb-2 px-1">SESIÓN</p>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-3 p-4 bg-red-50 hover:bg-red-100 active:bg-red-200 disabled:opacity-60 disabled:cursor-not-allowed text-red-600 font-semibold rounded-xl border border-red-200 transition-colors"
        >
          <LogOut size={20} />
          <span>{signingOut ? "Cerrando sesión..." : "Cerrar Sesión"}</span>
        </button>
        <p className="text-xs text-gray-500 text-center mt-2 px-2">
          Al cerrar sesión se limpiará la caché local y deberás iniciar sesión
          de nuevo
        </p>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-400 text-sm mt-8">
        <p>Hecho con ❤️ para tu hogar</p>
        <p className="mt-1">© 2026 Recetario App</p>
      </div>
    </div>
  );
}

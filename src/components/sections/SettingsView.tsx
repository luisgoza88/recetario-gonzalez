"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChefHat,
  Heart,
  Bell,
  Bot,
  ShieldCheck,
  Database,
  Globe,
  Moon,
  BarChart3,
  Sparkles,
  Crown,
  User,
  LogOut,
  ChevronRight,
  Mail,
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

  const householdName = household?.name || "Mi Hogar";
  const userName =
    user?.full_name || user?.email?.split("@")[0] || "Usuario";
  const userEmail = user?.email || "Sin sesión";

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-32">
      {/* Header */}
      <div className="bg-white px-5 pt-4 pb-3 border-b border-[var(--border)]">
        <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-[var(--ink)]">
          Ajustes
        </h1>
        <p className="text-[13px] text-[var(--ink-soft)] mt-0.5">
          Personaliza tu Recetario
        </p>
      </div>

      <div className="px-5 py-4 space-y-3 max-w-lg mx-auto">
        {/* Household / family card */}
        <section className="bg-white rounded-2xl border border-[var(--border)] p-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--accent)] to-green-800 text-white flex items-center justify-center font-bold text-[20px]">
              {householdName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-[var(--ink)] truncate">
                {householdName}
              </p>
              <p className="text-[12px] text-[var(--ink-soft)]">
                Hogar activo
              </p>
            </div>
          </div>
        </section>

        {/* Account card */}
        <section className="bg-white rounded-2xl border border-[var(--border)] p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-[16px]">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[var(--ink)] truncate">
                {userName}
              </p>
              <p className="text-[12px] text-[var(--ink-soft)] truncate flex items-center gap-1">
                <Mail size={12} />
                {userEmail}
              </p>
            </div>
          </div>
        </section>

        {/* Preferencias */}
        <Group title="Preferencias">
          <Row
            Icon={ChefHat}
            color="text-amber-600"
            label="Perfil de cocina"
            sub="Cocina, restricciones y porciones"
            onClick={() => setShowCookingProfile(true)}
          />
          <Row
            Icon={Heart}
            color="text-rose-600"
            label="Preferencias dietéticas"
            sub="Restricciones, alergias y preferencias"
            onClick={() => setShowDietaryPreferences(true)}
          />
          <Row
            Icon={Bell}
            color="text-orange-600"
            label="Notificaciones"
            sub={notifications ? "Activadas" : "Desactivadas"}
            rightContent={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setNotifications(!notifications);
                }}
                className={`w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
                  notifications ? "bg-[var(--accent)]" : "bg-stone-300"
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
          <Row
            Icon={Globe}
            color="text-blue-600"
            label="Idioma"
            sub="Español"
            onClick={() => {}}
          />
          <Row
            Icon={Moon}
            color="text-indigo-600"
            label="Tema oscuro"
            sub="Próximamente"
            last
          />
        </Group>

        {/* Tecnología */}
        <Group title="Tecnología">
          <Row
            Icon={Bot}
            color="text-purple-600"
            label="Centro de Comando IA"
            sub="Monitorea, controla y configura tu asistente"
            onClick={() => setShowAICommandCenter(true)}
            last
          />
        </Group>

        {/* Datos — solo admin */}
        <AdminOnly>
          <Group title="Datos">
            <Row
              Icon={Database}
              color="text-cyan-600"
              label="Exportar datos"
              sub="Descarga tus recetas y menús"
              onClick={() => {}}
            />
            <Row
              Icon={ShieldCheck}
              color="text-green-600"
              label="Privacidad"
              sub="Gestiona tus datos"
              onClick={() => {}}
              last
            />
          </Group>
        </AdminOnly>

        {/* Vistas de demo / Mis funciones */}
        <Group title="Vistas de demo">
          <Row
            Icon={BarChart3}
            color="text-blue-600"
            label="Mi reporte mensual"
            sub="Estadísticas de cocina, gasto y ahorro del mes"
            onClick={() => setShowMonthlyReport(true)}
          />
          <Row
            Icon={Sparkles}
            color="text-pink-600"
            label="Modo Niños"
            sub="Pantalla simple para que los chicos ayuden en cocina"
            onClick={() => setShowKidsMode(true)}
          />
          <Row
            Icon={Crown}
            color="text-yellow-600"
            label={isPremium ? `Plan ${tier}` : "Actualizar a Premium"}
            sub={
              isPremium
                ? "Funciones premium activas"
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
                <span className="text-[10px] px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-bold flex-shrink-0">
                  ⭐ {tier.toUpperCase()}
                </span>
              ) : undefined
            }
            last
          />
        </Group>

        {/* Modal Reporte Mensual */}
        {showMonthlyReport && (
          <MonthlyReportView onClose={() => setShowMonthlyReport(false)} />
        )}

        {/* Modal Modo Niños */}
        {showKidsMode && <KidsMode onClose={() => setShowKidsMode(false)} />}

        {/* Cuenta */}
        <Group title="Cuenta">
          <Row
            Icon={User}
            color="text-stone-600"
            label="Mi cuenta"
            sub={userEmail}
          />
          <Row
            Icon={LogOut}
            color="text-red-600"
            label={signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
            sub="Limpia la caché local de este dispositivo"
            onClick={handleSignOut}
            disabled={signingOut}
            danger
            last
          />
        </Group>

        <p className="text-center text-[11px] text-stone-400 py-2">
          Recetario v1.0.0 · {householdName}
        </p>
      </div>
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-2 px-1">
        {title}
      </p>
      <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({
  Icon,
  color,
  label,
  sub,
  last,
  danger,
  disabled,
  onClick,
  rightContent,
}: {
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  label: string;
  sub?: string;
  last?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  rightContent?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full px-4 py-3 flex items-center gap-3 text-left ${
        !last ? "border-b border-[var(--border)]" : ""
      } ${onClick ? "active:bg-stone-50" : ""} disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      <div
        className={`w-9 h-9 rounded-xl bg-stone-50 flex items-center justify-center flex-shrink-0 ${color}`}
      >
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-[14px] font-medium ${
            danger ? "text-red-600" : "text-[var(--ink)]"
          }`}
        >
          {label}
        </p>
        {sub && (
          <p className="text-[12px] text-[var(--ink-soft)] truncate">{sub}</p>
        )}
      </div>
      {rightContent ??
        (onClick && (
          <ChevronRight size={14} className="text-stone-300 flex-shrink-0" />
        ))}
    </button>
  );
}

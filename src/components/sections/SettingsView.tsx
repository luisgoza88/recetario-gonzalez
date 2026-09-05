"use client";

import { useTodayMenu } from "@/lib/hooks/useTodayDashboard";
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
  Users,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Mail,
} from "lucide-react";
import AICommandCenter from "@/components/ai/AICommandCenter";
import DietaryPreferencesPanel from "@/components/settings/DietaryPreferencesPanel";
import CookingProfilePanel from "@/components/settings/CookingProfilePanel";
import MembersPanel from "@/components/settings/MembersPanel";
import MonthlyReportView from "@/components/reports/MonthlyReportView";
import { KidsMode } from "@/components/kids/KidsMode";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useNotifications } from "@/hooks/useNotifications";
import { AdminOnly } from "@/components/auth/RoleGate";
import {
  useHouseholdId,
  useCurrentHousehold,
} from "@/lib/stores/useHouseholdStore";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsView() {
  const [showAICommandCenter, setShowAICommandCenter] = useState(false);
  const [showDietaryPreferences, setShowDietaryPreferences] = useState(false);
  const [showCookingProfile, setShowCookingProfile] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);
  const { menu: todayMenu } = useTodayMenu();
  const [showKidsMode, setShowKidsMode] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { tier, isPremium } = useSubscription();
  const householdId = useHouseholdId();
  const household = useCurrentHousehold();
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Notificaciones push reales (antes el toggle era decorativo: useState(true)).
  // `supported` es false si el navegador no lo soporta O si falta la VAPID key
  // (NEXT_PUBLIC_VAPID_PUBLIC_KEY); en ese caso el toggle se muestra deshabilitado
  // y honesto en vez de fingir "Activadas".
  const notif = useNotifications();
  const notifSubText = !notif.supported
    ? "No disponible en este dispositivo"
    : notif.permission === "denied"
      ? "Bloqueadas en el navegador"
      : notif.subscribed
        ? "Activadas"
        : "Desactivadas";

  const handleToggleNotifications = async () => {
    if (!notif.supported || notif.loading) return;
    if (notif.subscribed) {
      await notif.unsubscribe();
    } else {
      const granted =
        notif.permission === "granted" || (await notif.requestPermission());
      if (granted) await notif.subscribe(householdId ?? undefined);
    }
  };

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

      // AuthContext clears the visible session caches. Keep scoped pending
      // operations so a connection failure never deletes unsynced work.
      // 6. Redirigir a login con hard reload para asegurar estado limpio
      window.location.href = "/auth/login";
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      setSigningOut(false);
      window.alert("No se pudo cerrar sesión. Vuelve a intentarlo.");
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

  // Show Members & invitations panel (MembersPanel no trae onBack propio)
  if (showMembers && householdId) {
    return (
      <div className="min-h-screen bg-[var(--bg)] pb-32">
        <div className="bg-white px-5 pt-4 pb-3 border-b border-[var(--border)] flex items-center gap-3">
          <button
            onClick={() => setShowMembers(false)}
            aria-label="Volver a Ajustes"
            className="p-1 -ml-1 text-[var(--ink)] active:opacity-60"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-[var(--ink)]">
              Miembros del hogar
            </h1>
            <p className="text-[13px] text-[var(--ink-soft)]">
              Invita y gestiona quién accede
            </p>
          </div>
        </div>
        <div className="px-5 py-4 max-w-lg mx-auto">
          <MembersPanel householdId={householdId} />
        </div>
      </div>
    );
  }

  const householdName = household?.name || "Mi Hogar";
  const userName = user?.full_name || user?.email?.split("@")[0] || "Usuario";
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
              <p className="text-[12px] text-[var(--ink-soft)]">Hogar activo</p>
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
            sub={notifSubText}
            rightContent={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleNotifications();
                }}
                disabled={!notif.supported || notif.loading}
                aria-label={
                  notif.subscribed
                    ? "Desactivar notificaciones"
                    : "Activar notificaciones"
                }
                className={`w-12 h-7 rounded-full transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                  notif.subscribed ? "bg-[var(--accent)]" : "bg-stone-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                    notif.subscribed ? "translate-x-6" : "translate-x-1"
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
          />
          <Row
            Icon={Moon}
            color="text-indigo-600"
            label="Apariencia"
            sub="Tema claro"
            last
          />
        </Group>

        {/* Hogar — solo admin (crear invitaciones es acción de admin) */}
        <AdminOnly>
          <Group title="Hogar">
            <Row
              Icon={Users}
              color="text-teal-600"
              label="Miembros e invitaciones"
              sub="Invita familia o empleados y gestiona el acceso"
              onClick={() => setShowMembers(true)}
              last
            />
          </Group>
        </AdminOnly>

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
            />
            <Row
              Icon={ShieldCheck}
              color="text-green-600"
              label="Privacidad"
              sub="Gestiona tus datos"
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
            label={isPremium ? `Plan ${tier}` : "Tu cuenta"}
            sub={
              isPremium
                ? "Funciones premium activas"
                : "Las funciones disponibles aparecen en la aplicación"
            }
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
        {showKidsMode && (
          <KidsMode
            todayRecipe={todayMenu?.lunch ?? undefined}
            onClose={() => setShowKidsMode(false)}
          />
        )}

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

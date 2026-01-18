'use client';

import { useState } from 'react';
import {
  Settings, Bell, Database, Info, ChevronRight,
  Moon, Globe, Shield, HelpCircle, Smartphone
} from 'lucide-react';

interface SettingsSectionProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
  rightContent?: React.ReactNode;
  danger?: boolean;
}

function SettingsSection({ icon, title, description, onClick, rightContent, danger }: SettingsSectionProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-4 p-4 bg-white rounded-xl
        ${onClick ? 'hover:bg-gray-50 active:bg-gray-100' : ''}
        transition-colors text-left
      `}
    >
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center
        ${danger ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}
      `}>
        {icon}
      </div>
      <div className="flex-1">
        <p className={`font-medium ${danger ? 'text-red-600' : ''}`}>{title}</p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      {rightContent || (onClick && <ChevronRight size={20} className="text-gray-400" />)}
    </button>
  );
}

export default function SettingsView() {
  const [notifications, setNotifications] = useState(true);

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

      {/* Profile Section */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500 mb-2 px-1">PERFIL</p>
        <div className="space-y-2">
          <div className="bg-white rounded-xl p-4 flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              FG
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg">Familia González</p>
              <p className="text-gray-500 text-sm">2 miembros · Luis & Mariana</p>
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
                  <span className="text-lg">👨</span>
                </div>
                <div>
                  <p className="font-medium">Luis</p>
                  <p className="text-sm text-gray-500">Porciones grandes</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-blue-600">3</span>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">👩</span>
                </div>
                <div>
                  <p className="font-medium">Mariana</p>
                  <p className="text-sm text-gray-500">Porciones normales</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-pink-600">2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preferencias */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500 mb-2 px-1">PREFERENCIAS</p>
        <div className="space-y-2">
          <SettingsSection
            icon={<Bell size={20} />}
            title="Notificaciones"
            description={notifications ? 'Activadas' : 'Desactivadas'}
            rightContent={
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-12 h-7 rounded-full transition-colors ${
                  notifications ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  notifications ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            }
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

      {/* Datos */}
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

      {/* Información */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500 mb-2 px-1">INFORMACIÓN</p>
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

      {/* Footer */}
      <div className="text-center text-gray-400 text-sm mt-8">
        <p>Hecho con ❤️ para la Familia González</p>
        <p className="mt-1">© 2025 Recetario App</p>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Home, Users, UtensilsCrossed, Calendar, Target,
  ChevronRight, ChevronLeft, Check, Sparkles,
  Plus, Trash2, Clock, Heart, Leaf, Globe,
  ShoppingCart, ClipboardList, Bot, AlertCircle,
  X, Star, Zap, Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';

// ==================== TYPES ====================

type OnboardingStep =
  | 'welcome'
  | 'profile'
  | 'household'
  | 'dietary'
  | 'cuisine'
  | 'goals'
  | 'spaces'
  | 'employees'
  | 'summary'
  | 'complete';

type ProfileType = 'admin' | 'family' | 'employee' | null;

interface DietaryPreference {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface CuisineTemplate {
  id: string;
  name: string;
  flag: string;
  description: string;
  popular: string[];
}

interface GoalOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

interface SpaceConfig {
  id: string;
  name: string;
  category: 'interior' | 'exterior';
  selected: boolean;
}

interface EmployeeConfig {
  id: string;
  name: string;
  role: string;
  workDays: string[];
}

// ==================== DATA ====================

const DIETARY_PREFERENCES: DietaryPreference[] = [
  { id: 'none', name: 'Sin restricciones', icon: '🍽️', description: 'Comemos de todo' },
  { id: 'vegetariano', name: 'Vegetariano', icon: '🥬', description: 'Sin carnes' },
  { id: 'vegano', name: 'Vegano', icon: '🌱', description: 'Sin productos animales' },
  { id: 'sin-gluten', name: 'Sin gluten', icon: '🌾', description: 'Celíacos o sensibilidad' },
  { id: 'sin-lactosa', name: 'Sin lactosa', icon: '🥛', description: 'Intolerancia a lácteos' },
  { id: 'keto', name: 'Keto / Low-carb', icon: '🥑', description: 'Bajo en carbohidratos' },
  { id: 'halal', name: 'Halal', icon: '☪️', description: 'Según normas islámicas' },
  { id: 'kosher', name: 'Kosher', icon: '✡️', description: 'Según normas judías' },
];

const CUISINE_TEMPLATES: CuisineTemplate[] = [
  {
    id: 'colombiana',
    name: 'Cocina Colombiana',
    flag: '🇨🇴',
    description: 'Bandeja paisa, ajiaco, sancocho...',
    popular: ['Ajiaco', 'Bandeja Paisa', 'Arroz con Pollo', 'Sancocho']
  },
  {
    id: 'mexicana',
    name: 'Cocina Mexicana',
    flag: '🇲🇽',
    description: 'Tacos, enchiladas, pozole...',
    popular: ['Tacos', 'Enchiladas', 'Pozole', 'Mole']
  },
  {
    id: 'mediterranea',
    name: 'Mediterránea',
    flag: '🇪🇸',
    description: 'Paella, tapas, ensaladas...',
    popular: ['Paella', 'Gazpacho', 'Tortilla Española', 'Tapas']
  },
  {
    id: 'peruana',
    name: 'Cocina Peruana',
    flag: '🇵🇪',
    description: 'Ceviche, lomo saltado, ají...',
    popular: ['Ceviche', 'Lomo Saltado', 'Ají de Gallina', 'Causa']
  },
  {
    id: 'argentina',
    name: 'Cocina Argentina',
    flag: '🇦🇷',
    description: 'Asado, empanadas, milanesas...',
    popular: ['Asado', 'Empanadas', 'Milanesa', 'Locro']
  },
  {
    id: 'internacional',
    name: 'Internacional / Fusión',
    flag: '🌍',
    description: 'Mezcla de diferentes cocinas',
    popular: ['Pasta', 'Sushi', 'Curry', 'Stir-fry']
  },
];

const GOAL_OPTIONS: GoalOption[] = [
  {
    id: 'meal-planning',
    name: 'Planificar comidas',
    icon: <Calendar size={24} />,
    description: 'Organizar el menú semanal y no repetir platos'
  },
  {
    id: 'shopping',
    name: 'Lista de compras inteligente',
    icon: <ShoppingCart size={24} />,
    description: 'Saber exactamente qué comprar cada semana'
  },
  {
    id: 'home-management',
    name: 'Gestionar el hogar',
    icon: <Home size={24} />,
    description: 'Organizar empleados, tareas y limpieza'
  },
  {
    id: 'save-money',
    name: 'Ahorrar dinero',
    icon: <Target size={24} />,
    description: 'Reducir desperdicios y optimizar compras'
  },
  {
    id: 'eat-healthy',
    name: 'Comer más sano',
    icon: <Heart size={24} />,
    description: 'Seguir una dieta balanceada'
  },
  {
    id: 'ai-assistant',
    name: 'Tener un asistente IA',
    icon: <Bot size={24} />,
    description: 'Que me ayude con recetas y sugerencias'
  },
];

const DEFAULT_SPACES: SpaceConfig[] = [
  { id: 'sala', name: 'Sala', category: 'interior', selected: true },
  { id: 'comedor', name: 'Comedor', category: 'interior', selected: true },
  { id: 'cocina', name: 'Cocina', category: 'interior', selected: true },
  { id: 'habitacion1', name: 'Habitación Principal', category: 'interior', selected: true },
  { id: 'habitacion2', name: 'Habitación 2', category: 'interior', selected: false },
  { id: 'habitacion3', name: 'Habitación 3', category: 'interior', selected: false },
  { id: 'bano1', name: 'Baño Principal', category: 'interior', selected: true },
  { id: 'bano2', name: 'Baño 2', category: 'interior', selected: false },
  { id: 'estudio', name: 'Estudio/Oficina', category: 'interior', selected: false },
  { id: 'lavanderia', name: 'Lavandería', category: 'interior', selected: true },
  { id: 'jardin', name: 'Jardín', category: 'exterior', selected: false },
  { id: 'terraza', name: 'Terraza', category: 'exterior', selected: false },
  { id: 'garaje', name: 'Garaje', category: 'exterior', selected: false },
  { id: 'patio', name: 'Patio', category: 'exterior', selected: false },
];

const WORK_DAYS = [
  { id: 'lunes', label: 'L' },
  { id: 'martes', label: 'M' },
  { id: 'miercoles', label: 'Mi' },
  { id: 'jueves', label: 'J' },
  { id: 'viernes', label: 'V' },
  { id: 'sabado', label: 'S' },
];

// ==================== COMPONENT ====================

export default function OnboardingPage() {
  const router = useRouter();
  const { currentHousehold, refreshMemberships, user } = useAuth();

  // Step management
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Profile selection
  const [profileType, setProfileType] = useState<ProfileType>(null);

  // Household config
  const [householdName, setHouseholdName] = useState('');
  const [membersCount, setMembersCount] = useState(4);

  // Dietary preferences
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(['none']);
  const [allergies, setAllergies] = useState<string>('');

  // Cuisine template
  const [selectedCuisine, setSelectedCuisine] = useState<string>('colombiana');

  // Goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['meal-planning', 'shopping']);

  // Spaces config
  const [spaces, setSpaces] = useState<SpaceConfig[]>(DEFAULT_SPACES);
  const [customSpace, setCustomSpace] = useState('');

  // Employees config
  const [hasEmployees, setHasEmployees] = useState<boolean | null>(null);
  const [employees, setEmployees] = useState<EmployeeConfig[]>([]);
  const [newEmployee, setNewEmployee] = useState({ name: '', role: 'Empleada doméstica' });
  const [newEmployeeDays, setNewEmployeeDays] = useState<string[]>(['lunes', 'martes', 'miercoles', 'jueves', 'viernes']);

  // Define steps based on profile
  const getSteps = (): { id: OnboardingStep; label: string; icon: React.ReactNode }[] => {
    const baseSteps: { id: OnboardingStep; label: string; icon: React.ReactNode }[] = [
      { id: 'welcome', label: 'Bienvenida', icon: <Sparkles size={18} /> },
      { id: 'profile', label: 'Perfil', icon: <Users size={18} /> },
      { id: 'household', label: 'Hogar', icon: <Home size={18} /> },
      { id: 'dietary', label: 'Dieta', icon: <Leaf size={18} /> },
      { id: 'cuisine', label: 'Cocina', icon: <Globe size={18} /> },
      { id: 'goals', label: 'Objetivos', icon: <Target size={18} /> },
    ];

    // Add home management steps if admin
    if (profileType === 'admin') {
      baseSteps.push(
        { id: 'spaces', label: 'Espacios', icon: <Home size={18} /> },
        { id: 'employees', label: 'Empleados', icon: <Users size={18} /> }
      );
    }

    baseSteps.push(
      { id: 'summary', label: 'Resumen', icon: <ClipboardList size={18} /> },
      { id: 'complete', label: 'Listo', icon: <Check size={18} /> }
    );

    return baseSteps;
  };

  const steps = getSteps();
  const currentStepIndex = steps.findIndex(s => s.id === step);

  // Check if already completed onboarding
  useEffect(() => {
    if (currentHousehold?.setup_completed) {
      router.push('/');
    }
  }, [currentHousehold, router]);

  // Initialize with household name if exists
  useEffect(() => {
    if (currentHousehold?.name) {
      setHouseholdName(currentHousehold.name);
    }
  }, [currentHousehold]);

  // Navigation with animation
  const navigateTo = (nextStep: OnboardingStep) => {
    setAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setAnimating(false);
    }, 200);
  };

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      navigateTo(steps[nextIndex].id);
    }
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      navigateTo(steps[prevIndex].id);
    }
  };

  // Skip onboarding (go to demo mode)
  const skipOnboarding = () => {
    localStorage.setItem('onboarding_skipped', 'true');
    router.push('/');
  };

  // Dietary preferences toggle
  const toggleDietary = (id: string) => {
    if (id === 'none') {
      setDietaryPreferences(['none']);
    } else {
      setDietaryPreferences(prev => {
        const withoutNone = prev.filter(p => p !== 'none');
        if (prev.includes(id)) {
          const result = withoutNone.filter(p => p !== id);
          return result.length === 0 ? ['none'] : result;
        }
        return [...withoutNone, id];
      });
    }
  };

  // Goals toggle
  const toggleGoal = (id: string) => {
    setSelectedGoals(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  // Space management
  const toggleSpace = (spaceId: string) => {
    setSpaces(prev =>
      prev.map(s => s.id === spaceId ? { ...s, selected: !s.selected } : s)
    );
  };

  const addCustomSpace = () => {
    if (!customSpace.trim()) return;
    setSpaces(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: customSpace.trim(),
        category: 'interior',
        selected: true
      }
    ]);
    setCustomSpace('');
  };

  // Employee management
  const addEmployee = () => {
    if (!newEmployee.name.trim()) return;
    setEmployees(prev => [
      ...prev,
      {
        id: `emp-${Date.now()}`,
        name: newEmployee.name.trim(),
        role: newEmployee.role,
        workDays: newEmployeeDays
      }
    ]);
    setNewEmployee({ name: '', role: 'Empleada doméstica' });
    setNewEmployeeDays(['lunes', 'martes', 'miercoles', 'jueves', 'viernes']);
  };

  const removeEmployee = (empId: string) => {
    setEmployees(prev => prev.filter(e => e.id !== empId));
  };

  const toggleEmployeeDay = (day: string) => {
    setNewEmployeeDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // Complete onboarding
  const completeOnboarding = async () => {
    if (!currentHousehold) return;

    setIsLoading(true);
    try {
      // 1. Update household settings
      const settings = {
        members_count: membersCount,
        dietary_preferences: dietaryPreferences,
        allergies: allergies.split(',').map(a => a.trim()).filter(Boolean),
        cuisine_template: selectedCuisine,
        goals: selectedGoals,
        profile_type: profileType,
      };

      await supabase
        .from('households')
        .update({
          name: householdName,
          settings,
          setup_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentHousehold.id);

      // 2. Create spaces (if admin selected spaces)
      if (profileType === 'admin') {
        const selectedSpaces = spaces.filter(s => s.selected);
        if (selectedSpaces.length > 0) {
          await supabase
            .from('spaces')
            .insert(
              selectedSpaces.map(s => ({
                household_id: currentHousehold.id,
                custom_name: s.name,
                category: s.category,
              }))
            );
        }
      }

      // 3. Create employees (if any)
      if (employees.length > 0) {
        await supabase
          .from('home_employees')
          .insert(
            employees.map(e => ({
              household_id: currentHousehold.id,
              name: e.name,
              role: e.role,
              work_days: e.workDays,
            }))
          );
      }

      // 4. Track onboarding completion for analytics
      if (typeof window !== 'undefined') {
        // Future: Send to analytics
        console.log('Onboarding completed:', {
          profileType,
          cuisine: selectedCuisine,
          goals: selectedGoals,
          hasEmployees: employees.length > 0
        });
      }

      // Refresh data
      await refreshMemberships();

      // Show complete step
      navigateTo('complete');
      setTimeout(() => {
        router.push('/');
      }, 2500);

    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Can proceed to next step?
  const canProceed = () => {
    switch (step) {
      case 'profile':
        return profileType !== null;
      case 'household':
        return householdName.trim().length > 0;
      case 'dietary':
        return dietaryPreferences.length > 0;
      case 'cuisine':
        return selectedCuisine !== '';
      case 'goals':
        return selectedGoals.length > 0;
      case 'employees':
        return hasEmployees !== null;
      default:
        return true;
    }
  };

  // ==================== RENDER STEPS ====================

  const renderWelcomeStep = () => (
    <div className="text-center py-8">
      {/* Animated logo */}
      <div className="relative w-28 h-28 mx-auto mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 rounded-3xl animate-pulse" />
        <div className="absolute inset-2 bg-white rounded-2xl flex items-center justify-center">
          <UtensilsCrossed size={48} className="text-green-600" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
          <Sparkles size={16} className="text-yellow-800" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-gray-800 mb-3">
        ¡Bienvenido a Recetario!
      </h1>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        Tu asistente inteligente para organizar comidas, lista de compras y gestión del hogar.
      </p>

      {/* Feature highlights */}
      <div className="grid grid-cols-1 gap-3 text-left max-w-sm mx-auto mb-8">
        {[
          { icon: <Bot className="text-purple-600" />, bg: 'bg-purple-100', text: 'IA que te ayuda a planificar' },
          { icon: <ShoppingCart className="text-blue-600" />, bg: 'bg-blue-100', text: 'Lista de compras automática' },
          { icon: <Calendar className="text-green-600" />, bg: 'bg-green-100', text: 'Menú semanal organizado' },
          { icon: <Users className="text-orange-600" />, bg: 'bg-orange-100', text: 'Gestión de empleados del hogar' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
            <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              {item.icon}
            </div>
            <span className="text-gray-700 font-medium">{item.text}</span>
          </div>
        ))}
      </div>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Shield size={16} className="text-green-600" />
          <span>Datos seguros</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap size={16} className="text-yellow-600" />
          <span>Gratis para empezar</span>
        </div>
      </div>
    </div>
  );

  const renderProfileStep = () => (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">¿Quién eres?</h2>
      <p className="text-gray-600 mb-6">Esto nos ayuda a personalizar tu experiencia</p>

      <div className="space-y-3">
        {[
          {
            id: 'admin' as const,
            icon: <Star className="text-yellow-600" />,
            bg: 'bg-yellow-100',
            title: 'Administrador del hogar',
            description: 'Organizo las comidas, compras y gestiono empleados'
          },
          {
            id: 'family' as const,
            icon: <Heart className="text-pink-600" />,
            bg: 'bg-pink-100',
            title: 'Miembro de la familia',
            description: 'Quiero ver el menú, recetas y lista de compras'
          },
          {
            id: 'employee' as const,
            icon: <ClipboardList className="text-blue-600" />,
            bg: 'bg-blue-100',
            title: 'Empleado del hogar',
            description: 'Necesito ver mis tareas asignadas'
          },
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => setProfileType(option.id)}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
              profileType === option.id
                ? 'border-green-500 bg-green-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 ${option.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                {option.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{option.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{option.description}</p>
              </div>
              {profileType === option.id && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check size={14} className="text-white" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderHouseholdStep = () => (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Tu hogar</h2>
      <p className="text-gray-600 mb-6">Cuéntanos sobre tu familia</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre del hogar
          </label>
          <input
            type="text"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="Ej: Familia González, Mi Casa..."
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            ¿Cuántas personas comen regularmente?
          </label>
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setMembersCount(Math.max(1, membersCount - 1))}
                className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-2xl font-medium"
              >
                −
              </button>
              <div className="text-center">
                <span className="text-5xl font-bold text-green-600">{membersCount}</span>
                <p className="text-sm text-gray-500 mt-1">personas</p>
              </div>
              <button
                onClick={() => setMembersCount(membersCount + 1)}
                className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-2xl font-medium"
              >
                +
              </button>
            </div>

            {/* Visual representation */}
            <div className="flex items-center justify-center gap-1 mt-4 flex-wrap">
              {Array.from({ length: Math.min(membersCount, 10) }).map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <Users size={16} className="text-green-600" />
                </div>
              ))}
              {membersCount > 10 && (
                <span className="text-sm text-gray-500 ml-2">+{membersCount - 10}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDietaryStep = () => (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Preferencias alimentarias</h2>
      <p className="text-gray-600 mb-6">¿Tienen restricciones o preferencias especiales?</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {DIETARY_PREFERENCES.map((pref) => (
          <button
            key={pref.id}
            onClick={() => toggleDietary(pref.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              dietaryPreferences.includes(pref.id)
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-2xl mb-2">{pref.icon}</div>
            <h3 className="font-medium text-gray-800 text-sm">{pref.name}</h3>
            <p className="text-xs text-gray-500 mt-1">{pref.description}</p>
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Alergias específicas (opcional)
        </label>
        <input
          type="text"
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder="Ej: nueces, mariscos, huevo..."
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
        <p className="text-xs text-gray-500 mt-2">
          Separa con comas si hay varias
        </p>
      </div>
    </div>
  );

  const renderCuisineStep = () => (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Estilo de cocina</h2>
      <p className="text-gray-600 mb-6">¿Qué tipo de cocina prefieres?</p>

      <div className="space-y-3">
        {CUISINE_TEMPLATES.map((cuisine) => (
          <button
            key={cuisine.id}
            onClick={() => setSelectedCuisine(cuisine.id)}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              selectedCuisine === cuisine.id
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl">{cuisine.flag}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{cuisine.name}</h3>
                <p className="text-sm text-gray-500">{cuisine.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {cuisine.popular.map((dish) => (
                    <span key={dish} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {dish}
                    </span>
                  ))}
                </div>
              </div>
              {selectedCuisine === cuisine.id && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500 mt-4 text-center">
        Podrás agregar recetas de cualquier estilo después
      </p>
    </div>
  );

  const renderGoalsStep = () => (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">¿Qué quieres lograr?</h2>
      <p className="text-gray-600 mb-6">Selecciona todos los que apliquen</p>

      <div className="space-y-3">
        {GOAL_OPTIONS.map((goal) => (
          <button
            key={goal.id}
            onClick={() => toggleGoal(goal.id)}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              selectedGoals.includes(goal.id)
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedGoals.includes(goal.id) ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {goal.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{goal.name}</h3>
                <p className="text-sm text-gray-500">{goal.description}</p>
              </div>
              {selectedGoals.includes(goal.id) && (
                <Check size={20} className="text-green-500" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderSpacesStep = () => (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Espacios del hogar</h2>
      <p className="text-gray-600 mb-6">Selecciona los espacios para gestionar</p>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Home size={16} /> Interior
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {spaces.filter(s => s.category === 'interior').map(space => (
              <button
                key={space.id}
                onClick={() => toggleSpace(space.id)}
                className={`p-3 rounded-xl text-left transition-all ${
                  space.selected
                    ? 'bg-green-100 border-2 border-green-500 text-green-800'
                    : 'bg-white border-2 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="text-sm font-medium">{space.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Leaf size={16} /> Exterior
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {spaces.filter(s => s.category === 'exterior').map(space => (
              <button
                key={space.id}
                onClick={() => toggleSpace(space.id)}
                className={`p-3 rounded-xl text-left transition-all ${
                  space.selected
                    ? 'bg-blue-100 border-2 border-blue-500 text-blue-800'
                    : 'bg-white border-2 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="text-sm font-medium">{space.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={customSpace}
            onChange={(e) => setCustomSpace(e.target.value)}
            placeholder="Agregar espacio personalizado..."
            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-green-500"
            onKeyDown={(e) => e.key === 'Enter' && addCustomSpace()}
          />
          <button
            onClick={addCustomSpace}
            disabled={!customSpace.trim()}
            className="px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderEmployeesStep = () => (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Empleados del hogar</h2>
      <p className="text-gray-600 mb-6">¿Tienes empleados domésticos?</p>

      {hasEmployees === null ? (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setHasEmployees(true)}
            className="p-6 rounded-2xl border-2 border-gray-200 bg-white hover:border-green-500 hover:bg-green-50 transition-all text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users size={32} className="text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-800">Sí, tengo</h3>
            <p className="text-sm text-gray-500 mt-1">Quiero gestionar sus tareas</p>
          </button>
          <button
            onClick={() => setHasEmployees(false)}
            className="p-6 rounded-2xl border-2 border-gray-200 bg-white hover:border-gray-400 transition-all text-center"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <X size={32} className="text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-800">No tengo</h3>
            <p className="text-sm text-gray-500 mt-1">Solo quiero el recetario</p>
          </button>
        </div>
      ) : hasEmployees ? (
        <div className="space-y-4">
          {/* Employee list */}
          {employees.length > 0 && (
            <div className="space-y-3">
              {employees.map(emp => (
                <div
                  key={emp.id}
                  className="bg-white p-4 rounded-xl border-2 border-gray-200 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{emp.name}</p>
                    <p className="text-sm text-gray-500">{emp.role}</p>
                    <div className="flex gap-1 mt-2">
                      {emp.workDays.map(day => (
                        <span key={day} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          {day.slice(0, 2).toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => removeEmployee(emp.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add employee form */}
          <div className="bg-gray-50 p-4 rounded-xl space-y-4">
            <input
              type="text"
              value={newEmployee.name}
              onChange={(e) => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nombre del empleado"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-green-500"
            />

            <select
              value={newEmployee.role}
              onChange={(e) => setNewEmployee(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-green-500"
            >
              <option>Empleada doméstica</option>
              <option>Cocinera</option>
              <option>Jardinero</option>
              <option>Niñera</option>
              <option>Chofer</option>
              <option>Otro</option>
            </select>

            <div>
              <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                <Clock size={14} /> Días de trabajo
              </p>
              <div className="flex gap-2 flex-wrap">
                {WORK_DAYS.map(day => (
                  <button
                    key={day.id}
                    onClick={() => toggleEmployeeDay(day.id)}
                    className={`w-11 h-11 rounded-full text-sm font-medium transition-all ${
                      newEmployeeDays.includes(day.id)
                        ? 'bg-green-500 text-white'
                        : 'bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={addEmployee}
              disabled={!newEmployee.name.trim()}
              className="w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Agregar empleado
            </button>
          </div>

          <button
            onClick={() => setHasEmployees(null)}
            className="text-sm text-gray-500 hover:text-gray-700 text-center w-full"
          >
            ← Volver a elegir
          </button>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={40} className="text-gray-400" />
          </div>
          <p className="text-gray-600">Perfecto, continuemos con el resumen</p>
          <button
            onClick={() => setHasEmployees(null)}
            className="text-sm text-green-600 hover:text-green-700 mt-4"
          >
            Cambiar respuesta
          </button>
        </div>
      )}
    </div>
  );

  const renderSummaryStep = () => {
    const selectedCuisineData = CUISINE_TEMPLATES.find(c => c.id === selectedCuisine);
    const selectedDietaryNames = dietaryPreferences
      .map(id => DIETARY_PREFERENCES.find(d => d.id === id)?.name)
      .filter(Boolean);
    const selectedGoalNames = selectedGoals
      .map(id => GOAL_OPTIONS.find(g => g.id === id)?.name)
      .filter(Boolean);

    return (
      <div className="py-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Resumen</h2>
        <p className="text-gray-600 mb-6">Confirma tu configuración</p>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Hogar</h3>
            <p className="font-semibold text-gray-800">{householdName}</p>
            <p className="text-sm text-gray-600">{membersCount} personas</p>
          </div>

          <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Estilo de cocina</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selectedCuisineData?.flag}</span>
              <span className="font-semibold text-gray-800">{selectedCuisineData?.name}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Preferencias dietéticas</h3>
            <div className="flex flex-wrap gap-2">
              {selectedDietaryNames.map((name, i) => (
                <span key={i} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                  {name}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Objetivos</h3>
            <div className="flex flex-wrap gap-2">
              {selectedGoalNames.map((name, i) => (
                <span key={i} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                  {name}
                </span>
              ))}
            </div>
          </div>

          {profileType === 'admin' && (
            <>
              <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Espacios</h3>
                <p className="text-gray-800">{spaces.filter(s => s.selected).length} espacios seleccionados</p>
              </div>

              {employees.length > 0 && (
                <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Empleados</h3>
                  <p className="text-gray-800">{employees.length} empleado(s) registrado(s)</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-6 bg-green-50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-green-800">¡Todo listo para empezar!</p>
              <p className="text-sm text-green-700 mt-1">
                Recibirás recetas personalizadas, lista de compras inteligente y sugerencias de IA.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCompleteStep = () => (
    <div className="py-12 text-center">
      <div className="relative w-28 h-28 mx-auto mb-8">
        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-25" />
        <div className="absolute inset-0 bg-green-500 rounded-full flex items-center justify-center">
          <Check size={56} className="text-white" />
        </div>
      </div>
      <h2 className="text-3xl font-bold text-gray-800 mb-3">¡Excelente!</h2>
      <p className="text-gray-600 text-lg mb-2">
        Tu hogar está configurado
      </p>
      <p className="text-gray-500">
        Redirigiendo a tu dashboard...
      </p>

      {/* Loading dots */}
      <div className="flex items-center justify-center gap-1 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );

  // Render current step content
  const renderStepContent = () => {
    switch (step) {
      case 'welcome': return renderWelcomeStep();
      case 'profile': return renderProfileStep();
      case 'household': return renderHouseholdStep();
      case 'dietary': return renderDietaryStep();
      case 'cuisine': return renderCuisineStep();
      case 'goals': return renderGoalsStep();
      case 'spaces': return renderSpacesStep();
      case 'employees': return renderEmployeesStep();
      case 'summary': return renderSummaryStep();
      case 'complete': return renderCompleteStep();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-gray-200 z-50">
        <div
          className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500 ease-out"
          style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Header with skip */}
      {step !== 'complete' && (
        <div className="fixed top-4 left-4 right-4 flex items-center justify-between z-40">
          <div className="text-sm text-gray-500">
            {currentStepIndex + 1} / {steps.length}
          </div>
          {step !== 'summary' && (
            <button
              onClick={skipOnboarding}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              Saltar <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* Step indicators (mini) */}
      <div className="fixed top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-40">
        {steps.slice(0, -1).map((s, i) => (
          <div
            key={s.id}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i < currentStepIndex
                ? 'w-6 bg-green-500'
                : i === currentStepIndex
                ? 'w-8 bg-green-500'
                : 'w-4 bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 pt-20 pb-32">
        <div className={`transition-all duration-200 ${animating ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
          {renderStepContent()}
        </div>
      </div>

      {/* Navigation buttons */}
      {step !== 'complete' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-gray-200">
          <div className="max-w-lg mx-auto flex gap-3">
            {currentStepIndex > 0 && (
              <button
                onClick={prevStep}
                className="flex-1 py-4 px-6 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
              >
                <ChevronLeft size={20} />
                Atrás
              </button>
            )}

            {step === 'summary' ? (
              <button
                onClick={completeOnboarding}
                disabled={isLoading}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/25"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    Finalizar configuración
                    <Sparkles size={20} />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-500 flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/25 disabled:shadow-none"
              >
                Continuar
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

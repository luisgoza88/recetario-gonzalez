'use client';

import { useState, useEffect } from 'react';
import { BookOpen, ShoppingCart, UtensilsCrossed, Sparkles, Home as HomeIcon, Users, ClipboardList, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import BottomNavigation from '@/components/navigation/BottomNavigation';
import RecetarioSection from '@/components/sections/RecetarioSection';
import HomeView from '@/components/home/HomeView';
import AIChat from '@/components/sections/AIChat';
import SettingsView from '@/components/sections/SettingsView';
import { Recipe, MarketItem, MainSection, RecetarioTab } from '@/types';
import { FABAction } from '@/components/navigation/DynamicFAB';

export default function Home() {
  // Navegación principal
  const [activeSection, setActiveSection] = useState<MainSection>('recetario');
  const [recetarioTab, setRecetarioTab] = useState<RecetarioTab>('calendar');

  // FAB
  const [fabOpen, setFabOpen] = useState(false);

  // Datos
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingSuggestions, setPendingSuggestions] = useState(0);

  useEffect(() => {
    loadData();
    loadSuggestionsCount();
  }, []);

  // Cerrar FAB cuando cambia la sección
  useEffect(() => {
    setFabOpen(false);
  }, [activeSection]);

  const loadSuggestionsCount = async () => {
    try {
      const { count } = await supabase
        .from('adjustment_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setPendingSuggestions(count || 0);
    } catch (error) {
      console.error('Error loading suggestions count:', error);
    }
  };

  const loadData = async () => {
    try {
      // Cargar recetas
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .order('name');

      if (recipesError) {
        console.error('Error loading recipes:', recipesError);
      } else if (recipesData) {
        setRecipes(recipesData);
      }

      // Cargar items del mercado
      const { data: itemsData, error: itemsError } = await supabase
        .from('market_items')
        .select('*')
        .order('order_index');

      if (itemsError) {
        console.error('Error loading items:', itemsError);
        return;
      }

      // Cargar checklist separadamente
      const { data: checklistData, error: checklistError } = await supabase
        .from('market_checklist')
        .select('item_id, checked');

      if (checklistError) {
        console.error('Error loading checklist:', checklistError);
      }

      // Cargar inventario separadamente
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select('item_id, current_quantity, current_number');

      if (inventoryError) {
        console.error('Error loading inventory:', inventoryError);
      }

      // Crear mapas para búsqueda rápida
      const checklistMap = new Map(
        (checklistData || []).map(c => [c.item_id, c.checked])
      );
      const inventoryMap = new Map(
        (inventoryData || []).map(i => [i.item_id, { qty: i.current_quantity, num: i.current_number }])
      );

      // Combinar datos
      if (itemsData) {
        const items = itemsData.map(item => ({
          ...item,
          checked: checklistMap.get(item.id) || false,
          currentQuantity: inventoryMap.get(item.id)?.qty || '0',
          currentNumber: inventoryMap.get(item.id)?.num || 0
        }));
        setMarketItems(items);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = () => {
    loadData();
    loadSuggestionsCount();
  };

  // Acciones del FAB según la sección activa
  const getRecetarioFABActions = (): FABAction[] => [
    {
      id: 'new-recipe',
      icon: <BookOpen size={20} />,
      label: 'Nueva receta',
      color: 'bg-green-500',
      onClick: () => {
        setFabOpen(false);
        setRecetarioTab('recipes');
        // Disparar evento para abrir modal de nueva receta
        setTimeout(() => window.dispatchEvent(new CustomEvent('openNewRecipe')), 100);
      }
    },
    {
      id: 'add-market',
      icon: <ShoppingCart size={20} />,
      label: 'Al mercado',
      color: 'bg-blue-500',
      onClick: () => {
        setFabOpen(false);
        setRecetarioTab('market');
        setTimeout(() => window.dispatchEvent(new CustomEvent('openAddMarketItem')), 100);
      }
    },
    {
      id: 'register-meal',
      icon: <UtensilsCrossed size={20} />,
      label: 'Registrar',
      color: 'bg-orange-500',
      onClick: () => {
        setFabOpen(false);
        setRecetarioTab('calendar');
        setTimeout(() => window.dispatchEvent(new CustomEvent('openMealFeedback')), 100);
      }
    },
    {
      id: 'ai-suggestion',
      icon: <Sparkles size={20} />,
      label: 'Sugerencia IA',
      color: 'bg-purple-500',
      onClick: () => {
        setFabOpen(false);
        setRecetarioTab('suggestions');
      }
    }
  ];

  const getHomeFABActions = (): FABAction[] => [
    {
      id: 'new-space',
      icon: <HomeIcon size={20} />,
      label: 'Nuevo espacio',
      color: 'bg-blue-500',
      onClick: () => {
        setFabOpen(false);
        window.dispatchEvent(new CustomEvent('openSpacesPanel'));
      }
    },
    {
      id: 'new-employee',
      icon: <Users size={20} />,
      label: 'Empleado',
      color: 'bg-green-500',
      onClick: () => {
        setFabOpen(false);
        window.dispatchEvent(new CustomEvent('openEmployeesPanel'));
      }
    },
    {
      id: 'new-task',
      icon: <ClipboardList size={20} />,
      label: 'Nueva tarea',
      color: 'bg-orange-500',
      onClick: () => {
        setFabOpen(false);
        window.dispatchEvent(new CustomEvent('openTaskModal'));
      }
    },
    {
      id: 'quick-routine',
      icon: <Zap size={20} />,
      label: 'Rutina rápida',
      color: 'bg-purple-500',
      onClick: () => {
        setFabOpen(false);
        window.dispatchEvent(new CustomEvent('openRoutinePanel'));
      }
    }
  ];

  const getFABActions = (): FABAction[] => {
    switch (activeSection) {
      case 'recetario':
        return getRecetarioFABActions();
      case 'hogar':
        return getHomeFABActions();
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando recetario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Content - pb-32 para dejar espacio para los tabs secundarios */}
      <main className="pb-32">
        {activeSection === 'recetario' && (
          <RecetarioSection
            activeTab={recetarioTab}
            onTabChange={setRecetarioTab}
            recipes={recipes}
            marketItems={marketItems}
            pendingSuggestions={pendingSuggestions}
            onUpdate={handleUpdate}
          />
        )}

        {activeSection === 'hogar' && (
          <HomeView />
        )}

        {activeSection === 'ia' && (
          <AIChat />
        )}

        {activeSection === 'ajustes' && (
          <SettingsView />
        )}
      </main>

      {/* Bottom Navigation with Dynamic FAB */}
      <BottomNavigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        fabOpen={fabOpen}
        onFabToggle={() => setFabOpen(!fabOpen)}
        fabActions={getFABActions()}
        pendingAlerts={pendingSuggestions}
        recetarioTab={recetarioTab}
        onRecetarioTabChange={setRecetarioTab}
        pendingSuggestions={pendingSuggestions}
      />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Calendar, ShoppingCart, BookOpen, MapPin, Lightbulb } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import CalendarView from '@/components/CalendarView';
import MarketView from '@/components/MarketView';
import RecipesView from '@/components/RecipesView';
import SuggestionsPanel from '@/components/SuggestionsPanel';
import { Recipe, MarketItem } from '@/types';

type TabType = 'calendar' | 'market' | 'recipes' | 'suggestions';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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

  const goToToday = () => {
    setActiveTab('calendar');
    // Disparar evento para que CalendarView seleccione el día actual
    window.dispatchEvent(new CustomEvent('goToToday'));
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
      {/* Header */}
      <header className="bg-green-700 text-white px-5 py-4 sticky top-0 z-50 shadow-lg">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <span>🍽️</span> Recetario Familia González
        </h1>
        <p className="text-sm opacity-90">Plan de 15 días • Menú rotativo</p>
      </header>

      {/* Content */}
      <main className="pb-24">
        {activeTab === 'calendar' && (
          <CalendarView recipes={recipes} />
        )}
        {activeTab === 'market' && (
          <MarketView items={marketItems} onUpdate={loadData} />
        )}
        {activeTab === 'recipes' && (
          <RecipesView recipes={recipes} onUpdate={loadData} />
        )}
        {activeTab === 'suggestions' && (
          <div className="p-4 max-w-lg mx-auto">
            <SuggestionsPanel onUpdate={loadData} />
          </div>
        )}
      </main>

      {/* Today Button */}
      <button
        onClick={goToToday}
        className="fixed bottom-24 right-5 bg-green-700 text-white px-5 py-3 rounded-full font-semibold shadow-lg flex items-center gap-2 hover:bg-green-800 transition-colors z-40"
      >
        <MapPin size={18} />
        Hoy
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white flex justify-around py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-50">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex flex-col items-center px-3 py-2 rounded-lg transition-colors ${
            activeTab === 'calendar'
              ? 'text-green-700 bg-green-50'
              : 'text-gray-500'
          }`}
        >
          <Calendar size={22} />
          <span className="text-[10px] mt-1">Calendario</span>
        </button>
        <button
          onClick={() => setActiveTab('market')}
          className={`flex flex-col items-center px-3 py-2 rounded-lg transition-colors ${
            activeTab === 'market'
              ? 'text-green-700 bg-green-50'
              : 'text-gray-500'
          }`}
        >
          <ShoppingCart size={22} />
          <span className="text-[10px] mt-1">Mercado</span>
        </button>
        <button
          onClick={() => setActiveTab('recipes')}
          className={`flex flex-col items-center px-3 py-2 rounded-lg transition-colors ${
            activeTab === 'recipes'
              ? 'text-green-700 bg-green-50'
              : 'text-gray-500'
          }`}
        >
          <BookOpen size={22} />
          <span className="text-[10px] mt-1">Recetas</span>
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`flex flex-col items-center px-3 py-2 rounded-lg transition-colors ${
            activeTab === 'suggestions'
              ? 'text-yellow-600 bg-yellow-50'
              : 'text-gray-500'
          }`}
        >
          <Lightbulb size={22} />
          <span className="text-[10px] mt-1">Ajustes</span>
        </button>
      </nav>
    </div>
  );
}

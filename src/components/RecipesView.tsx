'use client';

import { useState } from 'react';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { Recipe, Ingredient } from '@/types';
import RecipeModal from './RecipeModal';
import RecipeForm from './forms/RecipeForm';
import { supabase } from '@/lib/supabase/client';

interface RecipesViewProps {
  recipes: Recipe[];
  onUpdate: () => void;
}

export default function RecipesView({ recipes, onUpdate }: RecipesViewProps) {
  const [search, setSearch] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'breakfast' | 'lunch' | 'dinner'>('all');

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || recipe.type === filter;
    return matchesSearch && matchesFilter;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'breakfast': return 'Desayuno';
      case 'lunch': return 'Almuerzo';
      case 'dinner': return 'Cena';
      default: return type;
    }
  };

  const getTypeClass = (type: string) => {
    switch (type) {
      case 'breakfast': return 'bg-orange-100 text-orange-700';
      case 'lunch': return 'bg-green-100 text-green-700';
      case 'dinner': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleDelete = async (recipe: Recipe) => {
    if (!confirm(`¿Eliminar la receta "${recipe.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipe.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Error al eliminar la receta');
    }
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingRecipe(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    onUpdate();
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar receta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-700"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {(['all', 'breakfast', 'lunch', 'dinner'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
              ${filter === type
                ? 'bg-green-700 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'}
            `}
          >
            {type === 'all' ? 'Todas' : getTypeLabel(type)}
          </button>
        ))}
      </div>

      {/* Add Button */}
      <button
        onClick={() => setShowForm(true)}
        className="w-full mb-4 p-4 bg-green-50 text-green-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-green-100 transition-colors border-2 border-dashed border-green-300"
      >
        <Plus size={20} />
        Agregar nueva receta
      </button>

      {/* Recipe List */}
      <div className="space-y-3">
        {filteredRecipes.map(recipe => (
          <div
            key={recipe.id}
            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => setSelectedRecipe(recipe)}
              >
                <h3 className="font-semibold mb-2">{recipe.name}</h3>
                <span className={`text-xs px-3 py-1 rounded-full ${getTypeClass(recipe.type)}`}>
                  {getTypeLabel(recipe.type)}
                </span>
              </div>
              <div className="flex gap-2 ml-2">
                <button
                  onClick={() => handleEdit(recipe)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(recipe)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredRecipes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <span className="text-4xl block mb-4">🍽️</span>
            {search ? 'No se encontraron recetas' : 'No hay recetas aún'}
          </div>
        )}
      </div>

      {/* Recipe Modal */}
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}

      {/* Recipe Form */}
      {showForm && (
        <RecipeForm
          recipe={editingRecipe}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { X, Plus, Trash2, Sparkles, Camera, Upload, Loader2, Wand2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Recipe, Ingredient, MealType } from '@/types';
import ImageUpload from '../ImageUpload';

interface RecipeFormProps {
  recipe: Recipe | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RecipeForm({ recipe, onClose, onSuccess }: RecipeFormProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(recipe?.name || '');
  const [type, setType] = useState<MealType>(recipe?.type || 'lunch');
  const [total, setTotal] = useState(recipe?.total || '');
  const [imageUrl, setImageUrl] = useState<string | null>(recipe?.image_url || null);
  const [portionsLuis, setPortionsLuis] = useState(recipe?.portions?.luis || '');
  const [portionsMariana, setPortionsMariana] = useState(recipe?.portions?.mariana || '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    (recipe?.ingredients as Ingredient[]) || [{ name: '', luis: '', mariana: '', total: '' }]
  );
  const [steps, setSteps] = useState<string[]>(recipe?.steps || ['']);

  // AI Generation state
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', luis: '', mariana: '', total: '' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const addStep = () => {
    setSteps([...steps, '']);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const updateStep = (index: number, value: string) => {
    const updated = [...steps];
    updated[index] = value;
    setSteps(updated);
  };

  // AI Functions
  const handleAIImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAiImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const generateWithAI = async () => {
    if (!aiDescription && !aiImagePreview) {
      setAiError('Ingresa una descripción o sube una foto del plato');
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch('/api/generate-recipe-from-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: aiImagePreview,
          description: aiDescription,
          type: type !== 'lunch' ? type : undefined // Only send if user changed it
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const generatedRecipe = data.recipe;

      // Fill form with generated data
      setName(generatedRecipe.name);
      setType(generatedRecipe.type);
      setTotal(generatedRecipe.total || '');
      setPortionsLuis(generatedRecipe.portions?.luis || '');
      setPortionsMariana(generatedRecipe.portions?.mariana || '');

      // Set ingredients
      if (generatedRecipe.ingredients && generatedRecipe.ingredients.length > 0) {
        setIngredients(generatedRecipe.ingredients.map((ing: { name: string; total?: string; luis?: string; mariana?: string }) => ({
          name: ing.name,
          total: ing.total || '',
          luis: ing.luis || '',
          mariana: ing.mariana || ''
        })));
      }

      // Set steps
      if (generatedRecipe.steps && generatedRecipe.steps.length > 0) {
        setSteps(generatedRecipe.steps);
      }

      // Close AI panel
      setShowAIPanel(false);
      setAiDescription('');
      setAiImagePreview(null);

    } catch (err) {
      console.error('Error generating recipe:', err);
      setAiError(err instanceof Error ? err.message : 'Error al generar la receta');
    } finally {
      setAiLoading(false);
    }
  };

  const clearAIImage = () => {
    setAiImagePreview(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('El nombre es requerido');
      return;
    }

    if (ingredients.some(i => !i.name.trim())) {
      alert('Todos los ingredientes deben tener nombre');
      return;
    }

    if (steps.some(s => !s.trim())) {
      alert('Todos los pasos deben tener contenido');
      return;
    }

    setLoading(true);

    try {
      const recipeData = {
        name: name.trim(),
        type,
        total: total.trim() || null,
        portions: (portionsLuis || portionsMariana) ? {
          luis: portionsLuis,
          mariana: portionsMariana
        } : null,
        ingredients: ingredients.filter(i => i.name.trim()),
        steps: steps.filter(s => s.trim()),
        image_url: imageUrl
      };

      if (recipe) {
        // Update
        const { error } = await supabase
          .from('recipes')
          .update(recipeData)
          .eq('id', recipe.id);

        if (error) throw error;
      } else {
        // Create
        const id = `custom_${Date.now()}`;
        const { error } = await supabase
          .from('recipes')
          .insert({ id, ...recipeData });

        if (error) throw error;
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('Error al guardar la receta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h3 className="font-semibold text-lg">
            {recipe ? 'Editar Receta' : 'Nueva Receta'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1">
          {/* AI Generation Button - Only for new recipes */}
          {!recipe && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowAIPanel(!showAIPanel)}
                className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                  showAIPanel
                    ? 'bg-purple-600 text-white'
                    : 'bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border border-purple-200 hover:from-purple-100 hover:to-indigo-100'
                }`}
              >
                <Sparkles size={18} />
                {showAIPanel ? 'Ocultar asistente IA' : 'Generar con IA'}
              </button>

              {/* AI Panel */}
              {showAIPanel && (
                <div className="mt-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <p className="text-sm text-purple-700 mb-3">
                    Sube una foto de un plato o describe lo que quieres cocinar y la IA generará la receta completa.
                  </p>

                  {/* AI Error */}
                  {aiError && (
                    <div className="mb-3 p-2 bg-red-100 text-red-700 rounded-lg text-sm">
                      {aiError}
                    </div>
                  )}

                  {/* Image Preview */}
                  {aiImagePreview && (
                    <div className="mb-3 relative">
                      <img
                        src={aiImagePreview}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={clearAIImage}
                        className="absolute top-2 right-2 p-1 bg-white/90 rounded-full shadow"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {/* Image capture buttons */}
                  {!aiImagePreview && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 py-2 bg-white rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-100 text-sm"
                      >
                        <Camera size={16} />
                        Tomar foto
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 py-2 bg-white rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-100 text-sm"
                      >
                        <Upload size={16} />
                        Subir imagen
                      </button>
                    </div>
                  )}

                  {/* Hidden inputs */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleAIImageCapture}
                    className="hidden"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAIImageCapture}
                    className="hidden"
                  />

                  {/* Description input */}
                  <div className="mb-3">
                    <input
                      type="text"
                      value={aiDescription}
                      onChange={(e) => setAiDescription(e.target.value)}
                      placeholder="Ej: Arroz con pollo colombiano, Pasta carbonara..."
                      className="w-full p-3 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Generate button */}
                  <button
                    type="button"
                    onClick={generateWithAI}
                    disabled={aiLoading || (!aiDescription && !aiImagePreview)}
                    className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Generando receta...
                      </>
                    ) : (
                      <>
                        <Wand2 size={18} />
                        Generar receta
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Image Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Foto de la receta</label>
            <ImageUpload
              currentImageUrl={imageUrl}
              onImageUploaded={setImageUrl}
            />
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
              placeholder="Ej: Pollo a la Criolla"
            />
          </div>

          {/* Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Tipo *</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as MealType)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
            >
              <option value="breakfast">Desayuno</option>
              <option value="lunch">Almuerzo</option>
              <option value="dinner">Cena</option>
            </select>
          </div>

          {/* Total (for lunch) */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Total a preparar</label>
            <input
              type="text"
              value={total}
              onChange={e => setTotal(e.target.value)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
              placeholder="Ej: 1.3kg pechuga + 300ml salsa"
            />
          </div>

          {/* Portions */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium mb-2">Porciones resumidas</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Porción grande</label>
                <input
                  type="text"
                  value={portionsLuis}
                  onChange={e => setPortionsLuis(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm"
                  placeholder="Ej: 300g + 2 huevos"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Porción pequeña</label>
                <input
                  type="text"
                  value={portionsMariana}
                  onChange={e => setPortionsMariana(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm"
                  placeholder="Ej: 180g + 1 huevo"
                />
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Ingredientes *</label>
            {ingredients.map((ing, index) => (
              <div key={index} className="mb-3 p-3 bg-gray-50 rounded-lg">
                {/* Row 1: Name + Delete */}
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={e => updateIngredient(index, 'name', e.target.value)}
                    className="flex-1 p-2 border rounded-lg text-sm bg-white"
                    placeholder="Nombre del ingrediente"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg shrink-0"
                    disabled={ingredients.length === 1}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {/* Row 2: Total, Porción grande, Porción pequeña */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Total</label>
                    <input
                      type="text"
                      value={ing.total || ''}
                      onChange={e => updateIngredient(index, 'total', e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm bg-white"
                      placeholder="500g"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">P. grande</label>
                    <input
                      type="text"
                      value={ing.luis}
                      onChange={e => updateIngredient(index, 'luis', e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm bg-white"
                      placeholder="300g"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">P. pequeña</label>
                    <input
                      type="text"
                      value={ing.mariana}
                      onChange={e => updateIngredient(index, 'mariana', e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm bg-white"
                      placeholder="200g"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addIngredient}
              className="text-sm text-green-700 flex items-center gap-1 hover:underline"
            >
              <Plus size={16} /> Agregar ingrediente
            </button>
          </div>

          {/* Steps */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Pasos *</label>
            {steps.map((step, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <span className="text-gray-400 pt-2">{index + 1}.</span>
                <input
                  type="text"
                  value={step}
                  onChange={e => updateStep(index, e.target.value)}
                  className="flex-1 p-2 border rounded-lg text-sm"
                  placeholder={`Paso ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  disabled={steps.length === 1}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addStep}
              className="text-sm text-green-700 flex items-center gap-1 hover:underline"
            >
              <Plus size={16} /> Agregar paso
            </button>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : (recipe ? 'Guardar cambios' : 'Crear receta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

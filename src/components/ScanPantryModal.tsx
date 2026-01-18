'use client';

import { useState, useRef } from 'react';
import {
  X, Camera, Upload, Loader2, Check, Plus, Package,
  AlertCircle, Sparkles, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';

interface IdentifiedProduct {
  name: string;
  genericName: string;
  quantity: number;
  unit: string;
  category: string;
  confidence: number;
}

interface MatchedProduct {
  product: IdentifiedProduct;
  marketItemId: string;
  marketItemName: string;
  action: 'update_inventory';
  selected?: boolean;
}

interface NewProduct {
  product: IdentifiedProduct;
  action: 'create_new';
  selected?: boolean;
}

interface ScanResult {
  identified: IdentifiedProduct[];
  matched: MatchedProduct[];
  newItems: NewProduct[];
  summary: string;
}

interface ScanPantryModalProps {
  onClose: () => void;
  onComplete: () => void;
}

type ScanStep = 'capture' | 'analyzing' | 'results' | 'applying' | 'done';

export default function ScanPantryModal({ onClose, onComplete }: ScanPantryModalProps) {
  const [step, setStep] = useState<ScanStep>('capture');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<'matched' | 'new' | null>('matched');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convertir a base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      await analyzeImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (imageBase64: string) => {
    setStep('analyzing');
    setError(null);

    try {
      const response = await fetch('/api/scan-pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Marcar todos como seleccionados por defecto
      const result: ScanResult = {
        ...data,
        matched: data.matched.map((m: MatchedProduct) => ({ ...m, selected: true })),
        newItems: data.newItems.map((n: NewProduct) => ({ ...n, selected: true })),
      };

      setScanResult(result);
      setStep('results');
    } catch (err) {
      console.error('Error analyzing image:', err);
      setError(err instanceof Error ? err.message : 'Error al analizar la imagen');
      setStep('capture');
    }
  };

  const toggleProductSelection = (type: 'matched' | 'new', index: number) => {
    if (!scanResult) return;

    setScanResult(prev => {
      if (!prev) return prev;

      if (type === 'matched') {
        const updated = [...prev.matched];
        updated[index] = { ...updated[index], selected: !updated[index].selected };
        return { ...prev, matched: updated };
      } else {
        const updated = [...prev.newItems];
        updated[index] = { ...updated[index], selected: !updated[index].selected };
        return { ...prev, newItems: updated };
      }
    });
  };

  const applyChanges = async () => {
    if (!scanResult) return;

    setStep('applying');
    setError(null);

    try {
      const selectedMatched = scanResult.matched.filter(m => m.selected);
      const selectedNew = scanResult.newItems.filter(n => n.selected);

      const response = await fetch('/api/scan-pantry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matched: selectedMatched,
          newItems: selectedNew,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setStep('done');
      setTimeout(() => {
        onComplete();
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error applying changes:', err);
      setError(err instanceof Error ? err.message : 'Error al aplicar cambios');
      setStep('results');
    }
  };

  const resetScan = () => {
    setImagePreview(null);
    setScanResult(null);
    setError(null);
    setStep('capture');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Camera className="text-purple-600" size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Escanear Despensa</h2>
              <p className="text-xs text-gray-500">
                {step === 'capture' && 'Toma una foto de tu nevera o despensa'}
                {step === 'analyzing' && 'Analizando productos...'}
                {step === 'results' && 'Revisa los productos identificados'}
                {step === 'applying' && 'Aplicando cambios...'}
                {step === 'done' && 'Inventario actualizado'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm text-red-700 font-medium">Error</p>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Step: Capture */}
          {step === 'capture' && (
            <div className="space-y-4">
              {/* Image Preview */}
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-xl"
                  />
                  <button
                    onClick={resetScan}
                    className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              ) : (
                <div className="bg-gray-100 rounded-xl p-8 text-center">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="text-purple-600" size={32} />
                  </div>
                  <p className="text-gray-600 mb-2">
                    Toma una foto de tu nevera, despensa o alacena
                  </p>
                  <p className="text-sm text-gray-400">
                    La IA identificará los productos y actualizará tu inventario
                  </p>
                </div>
              )}

              {/* Capture Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                >
                  <Camera size={24} />
                  <span className="font-medium">Tomar foto</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <Upload size={24} />
                  <span className="font-medium">Subir imagen</span>
                </button>
              </div>

              {/* Hidden inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageCapture}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageCapture}
                className="hidden"
              />

              {/* Tips */}
              <div className="bg-blue-50 p-3 rounded-xl">
                <p className="text-sm text-blue-700 font-medium mb-1">Tips para mejores resultados:</p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• Asegúrate de que haya buena iluminación</li>
                  <li>• Incluye varios productos en una sola foto</li>
                  <li>• Las etiquetas deben ser visibles</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step: Analyzing */}
          {step === 'analyzing' && (
            <div className="py-12 text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="text-purple-600 animate-spin" size={32} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Analizando imagen...</h3>
              <p className="text-sm text-gray-500">
                Identificando productos y cantidades
              </p>
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Analyzing"
                  className="w-32 h-32 object-cover rounded-xl mx-auto mt-4 opacity-50"
                />
              )}
            </div>
          )}

          {/* Step: Results */}
          {step === 'results' && scanResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-purple-50 p-3 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="text-purple-600" size={16} />
                  <span className="font-medium text-purple-700">Resumen</span>
                </div>
                <p className="text-sm text-purple-600">{scanResult.summary}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 p-3 rounded-xl text-center">
                  <p className="text-2xl font-bold text-green-700">{scanResult.matched.length}</p>
                  <p className="text-xs text-green-600">Productos existentes</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl text-center">
                  <p className="text-2xl font-bold text-blue-700">{scanResult.newItems.length}</p>
                  <p className="text-xs text-blue-600">Productos nuevos</p>
                </div>
              </div>

              {/* Matched Products */}
              {scanResult.matched.length > 0 && (
                <div className="border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'matched' ? null : 'matched')}
                    className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100"
                  >
                    <span className="font-medium text-green-700 flex items-center gap-2">
                      <Check size={16} />
                      Actualizar inventario ({scanResult.matched.filter(m => m.selected).length})
                    </span>
                    {expandedSection === 'matched' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {expandedSection === 'matched' && (
                    <div className="divide-y">
                      {scanResult.matched.map((match, index) => (
                        <label
                          key={index}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={match.selected}
                            onChange={() => toggleProductSelection('matched', index)}
                            className="w-5 h-5 accent-green-600"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{match.marketItemName}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${getConfidenceColor(match.product.confidence)}`}>
                                {Math.round(match.product.confidence * 100)}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Detectado: {match.product.name} → {match.product.quantity} {match.product.unit}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* New Products */}
              {scanResult.newItems.length > 0 && (
                <div className="border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'new' ? null : 'new')}
                    className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100"
                  >
                    <span className="font-medium text-blue-700 flex items-center gap-2">
                      <Plus size={16} />
                      Agregar nuevos ({scanResult.newItems.filter(n => n.selected).length})
                    </span>
                    {expandedSection === 'new' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {expandedSection === 'new' && (
                    <div className="divide-y">
                      {scanResult.newItems.map((newItem, index) => (
                        <label
                          key={index}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={newItem.selected}
                            onChange={() => toggleProductSelection('new', index)}
                            className="w-5 h-5 accent-blue-600"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Package size={14} className="text-blue-500" />
                              <span className="font-medium">{newItem.product.genericName}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${getConfidenceColor(newItem.product.confidence)}`}>
                                {Math.round(newItem.product.confidence * 100)}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {newItem.product.category} • {newItem.product.quantity} {newItem.product.unit}
                            </p>
                            {newItem.product.name !== newItem.product.genericName && (
                              <p className="text-xs text-purple-500">
                                Marca detectada: {newItem.product.name}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* No products */}
              {scanResult.matched.length === 0 && scanResult.newItems.length === 0 && (
                <div className="text-center py-8">
                  <Package className="mx-auto text-gray-300 mb-2" size={48} />
                  <p className="text-gray-500">No se identificaron productos</p>
                  <button
                    onClick={resetScan}
                    className="mt-4 text-purple-600 font-medium"
                  >
                    Intentar con otra foto
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step: Applying */}
          {step === 'applying' && (
            <div className="py-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="text-green-600 animate-spin" size={32} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Actualizando inventario...</h3>
              <p className="text-sm text-gray-500">
                Guardando los cambios en tu lista de mercado
              </p>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="py-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="text-green-600" size={40} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">¡Listo!</h3>
              <p className="text-sm text-gray-500">
                Tu inventario ha sido actualizado
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'results' && scanResult && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex gap-3">
              <button
                onClick={resetScan}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-100"
              >
                Nueva foto
              </button>
              <button
                onClick={applyChanges}
                disabled={
                  scanResult.matched.filter(m => m.selected).length === 0 &&
                  scanResult.newItems.filter(n => n.selected).length === 0
                }
                className="flex-1 py-3 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Aplicar cambios
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

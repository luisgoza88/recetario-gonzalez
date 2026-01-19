'use client';

import { useState, useRef } from 'react';
import {
  X, Camera, Upload, Loader2, Check, Plus, Package,
  AlertCircle, Sparkles, RefreshCw, ChevronDown, ChevronUp,
  Trash2, ImagePlus
} from 'lucide-react';

const MAX_PHOTOS = 5;

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
  const [images, setImages] = useState<string[]>([]);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<'matched' | 'new' | null>('matched');
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [continuousMode, setContinuousMode] = useState(true);
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Process each file
    const newImages: string[] = [];

    for (let i = 0; i < files.length && images.length + newImages.length < MAX_PHOTOS; i++) {
      const file = files[i];
      const base64 = await fileToBase64(file);
      newImages.push(base64);
    }

    const updatedImages = [...images, ...newImages].slice(0, MAX_PHOTOS);
    setImages(updatedImages);

    // Reset input to allow selecting the same file again
    e.target.value = '';

    // If continuous mode is on and we haven't reached max, show prompt to continue
    if (continuousMode && updatedImages.length < MAX_PHOTOS) {
      setShowContinuePrompt(true);
    }
  };

  const handleContinueCapture = () => {
    setShowContinuePrompt(false);
    // Small delay to ensure state is updated before opening camera
    setTimeout(() => {
      cameraInputRef.current?.click();
    }, 100);
  };

  const handleStopCapture = () => {
    setShowContinuePrompt(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeImages = async () => {
    if (images.length === 0) return;

    setStep('analyzing');
    setError(null);
    setAnalyzingProgress(0);

    try {
      const response = await fetch('/api/scan-pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
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
      console.error('Error analyzing images:', err);
      setError(err instanceof Error ? err.message : 'Error al analizar las imágenes');
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
    setImages([]);
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
                {step === 'capture' && `${images.length}/${MAX_PHOTOS} fotos`}
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
              {/* Continue Prompt Modal */}
              {showContinuePrompt && (
                <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Check className="text-green-600" size={32} />
                      </div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        ¡Foto {images.length} agregada!
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Puedes agregar {MAX_PHOTOS - images.length} foto{MAX_PHOTOS - images.length > 1 ? 's' : ''} más
                      </p>
                    </div>

                    <div className="space-y-3">
                      <button
                        onClick={handleContinueCapture}
                        className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
                      >
                        <Camera size={20} />
                        Tomar otra foto
                      </button>
                      <button
                        onClick={handleStopCapture}
                        className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                      >
                        Listo, analizar {images.length} foto{images.length > 1 ? 's' : ''}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Grid Preview */}
              {images.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img, index) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={img}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover rounded-xl"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                          {index + 1}
                        </span>
                      </div>
                    ))}

                    {/* Add more button */}
                    {images.length < MAX_PHOTOS && (
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="aspect-square border-2 border-dashed border-purple-300 rounded-xl flex flex-col items-center justify-center gap-1 text-purple-500 hover:bg-purple-50 hover:border-purple-400 transition-colors"
                      >
                        <ImagePlus size={24} />
                        <span className="text-xs">Agregar</span>
                      </button>
                    )}
                  </div>

                  {/* Photo counter */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {images.length} de {MAX_PHOTOS} fotos máximo
                    </span>
                    <button
                      onClick={resetScan}
                      className="text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                    >
                      <RefreshCw size={14} />
                      Reiniciar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 rounded-xl p-8 text-center">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="text-purple-600" size={32} />
                  </div>
                  <p className="text-gray-600 mb-2">
                    Toma fotos de tu nevera, despensa o alacena
                  </p>
                  <p className="text-sm text-gray-400">
                    Puedes agregar hasta {MAX_PHOTOS} fotos para mejor precisión
                  </p>
                </div>
              )}

              {/* Capture Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={images.length >= MAX_PHOTOS}
                  className="flex flex-col items-center gap-2 p-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera size={24} />
                  <span className="font-medium">Tomar foto</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={images.length >= MAX_PHOTOS}
                  className="flex flex-col items-center gap-2 p-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload size={24} />
                  <span className="font-medium">Subir imágenes</span>
                </button>
              </div>

              {/* Analyze Button */}
              {images.length > 0 && !showContinuePrompt && (
                <button
                  onClick={analyzeImages}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg"
                >
                  <Sparkles size={20} />
                  Analizar {images.length} foto{images.length > 1 ? 's' : ''}
                </button>
              )}

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
                multiple
                onChange={handleImageCapture}
                className="hidden"
              />

              {/* Tips */}
              <div className="bg-blue-50 p-3 rounded-xl">
                <p className="text-sm text-blue-700 font-medium mb-1">Tips para mejores resultados:</p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• Asegúrate de que haya buena iluminación</li>
                  <li>• Incluye varios productos en cada foto</li>
                  <li>• Las etiquetas deben ser visibles</li>
                  <li>• Toma fotos desde diferentes ángulos</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step: Analyzing */}
          {step === 'analyzing' && (
            <div className="py-8 text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="text-purple-600 animate-spin" size={32} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Analizando {images.length} foto{images.length > 1 ? 's' : ''}...</h3>
              <p className="text-sm text-gray-500 mb-4">
                Identificando productos y cantidades
              </p>

              {/* Thumbnails while analyzing */}
              <div className="flex justify-center gap-2 flex-wrap">
                {images.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`Foto ${index + 1}`}
                    className="w-16 h-16 object-cover rounded-lg opacity-50"
                  />
                ))}
              </div>
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
                  <p className="text-xs text-green-600">Ya en tu lista</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl text-center">
                  <p className="text-2xl font-bold text-blue-700">{scanResult.newItems.length}</p>
                  <p className="text-xs text-blue-600">Nuevos productos</p>
                </div>
              </div>

              {/* Selection info */}
              <div className="bg-amber-50 p-3 rounded-xl text-sm text-amber-700">
                <p className="font-medium">Selecciona los productos correctos:</p>
                <p className="text-xs mt-1">
                  ✓ Seleccionados existentes → actualizan inventario<br/>
                  ✓ Seleccionados nuevos → se agregan a tu lista<br/>
                  ✗ No seleccionados → se ignoran
                </p>
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
                      Actualizar inventario ({scanResult.matched.filter(m => m.selected).length}/{scanResult.matched.length})
                    </span>
                    {expandedSection === 'matched' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {expandedSection === 'matched' && (
                    <div className="divide-y">
                      {scanResult.matched.map((match, index) => (
                        <label
                          key={index}
                          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                            match.selected ? 'bg-green-50/50' : 'bg-gray-50 opacity-60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={match.selected}
                            onChange={() => toggleProductSelection('matched', index)}
                            className="w-5 h-5 accent-green-600"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium truncate ${!match.selected && 'line-through text-gray-400'}`}>
                                {match.marketItemName}
                              </span>
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
                      Agregar a lista ({scanResult.newItems.filter(n => n.selected).length}/{scanResult.newItems.length})
                    </span>
                    {expandedSection === 'new' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {expandedSection === 'new' && (
                    <div className="divide-y">
                      {scanResult.newItems.map((newItem, index) => (
                        <label
                          key={index}
                          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                            newItem.selected ? 'bg-blue-50/50' : 'bg-gray-50 opacity-60'
                          }`}
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
                              <span className={`font-medium ${!newItem.selected && 'line-through text-gray-400'}`}>
                                {newItem.product.genericName}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${getConfidenceColor(newItem.product.confidence)}`}>
                                {Math.round(newItem.product.confidence * 100)}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {newItem.product.category} • {newItem.product.quantity} {newItem.product.unit}
                            </p>
                            {newItem.product.name !== newItem.product.genericName && (
                              <p className="text-xs text-purple-500">
                                Marca: {newItem.product.name}
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
                    Intentar con otras fotos
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

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Plus, Sparkles, Mic, MicOff, Edit3, Check, Trash2,
  AlertCircle, ChevronUp, Loader2, Camera, ScanBarcode,
  Search, Clock, Star, Receipt, Package
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { IngredientCategory } from '@/types';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import {
  recordProductUsage,
  getFrequentItems,
  getRecentItems,
  lookupBarcodeWithCache,
  FrequentItem
} from '@/lib/userPreferences';

interface AddCustomItemModalProps {
  onClose: () => void;
  onAdded: () => void;
}

interface ParsedItem {
  id: string;
  name: string;
  originalInput: string;
  category: {
    id: string;
    name: string;
    icon: string;
  };
  quantity: number;
  unit: string;
  brand?: string;
  price?: number;
  confidence: number;
  needsClarification?: string;
  isEditing?: boolean;
  isSelected: boolean;
}

type InputMode = 'smart' | 'voice' | 'barcode' | 'receipt' | 'manual';

export default function AddCustomItemModal({ onClose, onAdded }: AddCustomItemModalProps) {
  const [mode, setMode] = useState<InputMode>('smart');
  const [categories, setCategories] = useState<IngredientCategory[]>([]);

  // Smart mode state
  const [smartInput, setSmartInput] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Manual mode state
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('other');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('unid');

  // Voice mode
  const {
    transcript,
    interimTranscript,
    isListening,
    error: voiceError,
    isSupported: voiceSupported,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({ language: 'es-CO' });

  // Barcode mode
  const [barcodeScanning, setBarcodeScanning] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<string | null>(null);
  const [barcodeProduct, setBarcodeProduct] = useState<{ name: string; brand?: string } | null>(null);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const barcodeStreamRef = useRef<MediaStream | null>(null);

  // Receipt mode
  const [receiptProcessing, setReceiptProcessing] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Frequent/Recent items
  const [frequentItems, setFrequentItems] = useState<FrequentItem[]>([]);
  const [recentItems, setRecentItems] = useState<FrequentItem[]>([]);

  // General state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commonUnits = ['kg', 'g', 'lb', 'unid', 'bolsa', 'paquete', 'botella', 'lata', 'tarro', 'litro', 'ml', 'manojo', 'racimo'];

  useEffect(() => {
    loadCategories();
    loadUserPreferences();
  }, []);

  // Handle voice transcript changes
  useEffect(() => {
    if (transcript && mode === 'voice') {
      setSmartInput(transcript);
    }
  }, [transcript, mode]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('ingredient_categories')
      .select('*')
      .order('sort_order');

    if (data) {
      setCategories(data);
    }
  };

  const loadUserPreferences = async () => {
    const [frequent, recent] = await Promise.all([
      getFrequentItems(8),
      getRecentItems(5)
    ]);
    setFrequentItems(frequent);
    setRecentItems(recent);
  };

  // ==================== QUICK ADD FROM SUGGESTIONS ====================

  const handleQuickAdd = async (item: FrequentItem) => {
    setSaving(true);
    try {
      const customId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fullQuantity = '1 unid';

      await supabase
        .from('market_items')
        .insert({
          id: customId,
          name: item.productName,
          category: item.category || 'Otros',
          category_id: item.categoryId || 'other',
          quantity: fullQuantity,
          order_index: 999,
          is_custom: true,
          unit: 'unid',
          created_at: new Date().toISOString()
        });

      await supabase
        .from('inventory')
        .insert({
          item_id: customId,
          current_quantity: fullQuantity,
          current_number: 1,
          last_updated: new Date().toISOString()
        });

      await recordProductUsage(customId, item.productName, item.category, item.categoryId);

      onAdded();
      onClose();
    } catch (err) {
      console.error('Error quick adding:', err);
      setError('Error al agregar el producto');
    } finally {
      setSaving(false);
    }
  };

  // ==================== SMART MODE FUNCTIONS ====================

  const handleSmartParse = async () => {
    const inputText = mode === 'voice' ? transcript : smartInput;
    if (!inputText.trim()) return;

    setIsParsing(true);
    setParseError(null);

    try {
      const response = await fetch('/api/parse-market-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: inputText.trim() })
      });

      if (!response.ok) {
        throw new Error('Error al procesar');
      }

      const data = await response.json();

      const itemsWithIds = data.items.map((item: Omit<ParsedItem, 'id' | 'isSelected'>, index: number) => ({
        ...item,
        id: `parsed_${Date.now()}_${index}`,
        isSelected: true
      }));

      setParsedItems(itemsWithIds);

      if (mode === 'voice') {
        resetTranscript();
      }

    } catch (err) {
      console.error('Error parsing:', err);
      setParseError('Error al procesar. Intenta de nuevo o usa el modo manual.');
    } finally {
      setIsParsing(false);
    }
  };

  // ==================== BARCODE FUNCTIONS ====================

  const startBarcodeScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        barcodeStreamRef.current = stream;
        setBarcodeScanning(true);

        // Use BarcodeDetector API if available
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new (window as Window & { BarcodeDetector: new (options?: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
          });

          const detectBarcode = async () => {
            if (videoRef.current && barcodeScanning) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  handleBarcodeDetected(barcodes[0].rawValue);
                  return;
                }
              } catch {
                // Continue scanning
              }
              requestAnimationFrame(detectBarcode);
            }
          };

          videoRef.current.onloadedmetadata = () => {
            detectBarcode();
          };
        }
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('No se pudo acceder a la cámara');
    }
  };

  const stopBarcodeScanner = () => {
    if (barcodeStreamRef.current) {
      barcodeStreamRef.current.getTracks().forEach(track => track.stop());
      barcodeStreamRef.current = null;
    }
    setBarcodeScanning(false);
  };

  const handleBarcodeDetected = async (barcode: string) => {
    stopBarcodeScanner();
    setBarcodeResult(barcode);
    setBarcodeLoading(true);

    // Vibrate on success
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }

    try {
      const product = await lookupBarcodeWithCache(barcode);
      if (product) {
        setBarcodeProduct(product);
        setSmartInput(product.name);
      } else {
        setBarcodeProduct(null);
      }
    } catch (err) {
      console.error('Error looking up barcode:', err);
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleManualBarcodeInput = () => {
    const barcode = prompt('Ingresa el código de barras manualmente:');
    if (barcode) {
      handleBarcodeDetected(barcode);
    }
  };

  // ==================== RECEIPT FUNCTIONS ====================

  const handleReceiptCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptProcessing(true);
    setReceiptError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.error) {
        setReceiptError(data.error);
        return;
      }

      if (data.items?.length > 0) {
        const itemsWithIds = data.items.map((item: {
          name: string;
          quantity: number;
          unit: string;
          price?: number;
          category: { id: string; name: string; icon: string };
          brand?: string;
        }, index: number) => ({
          id: `receipt_${Date.now()}_${index}`,
          name: item.name,
          originalInput: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          brand: item.brand,
          confidence: 0.9,
          isSelected: true
        }));

        setParsedItems(itemsWithIds);
        setMode('smart'); // Switch to smart mode to show results
      } else {
        setReceiptError('No se encontraron productos en el recibo');
      }
    } catch (err) {
      console.error('Receipt scan error:', err);
      setReceiptError('Error al procesar el recibo');
    } finally {
      setReceiptProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ==================== ITEM MANAGEMENT ====================

  const toggleItemSelection = (itemId: string) => {
    setParsedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, isSelected: !item.isSelected } : item
      )
    );
  };

  const toggleItemEdit = (itemId: string) => {
    setParsedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, isEditing: !item.isEditing } : item
      )
    );
  };

  const updateParsedItem = (itemId: string, updates: Partial<ParsedItem>) => {
    setParsedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    );
  };

  const removeParsedItem = (itemId: string) => {
    setParsedItems(prev => prev.filter(item => item.id !== itemId));
  };

  // ==================== SAVE FUNCTIONS ====================

  const handleSaveItems = async () => {
    const selectedItems = parsedItems.filter(item => item.isSelected);
    if (selectedItems.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      for (const item of selectedItems) {
        const customId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fullQuantity = `${item.quantity} ${item.unit}`;

        await supabase
          .from('market_items')
          .insert({
            id: customId,
            name: item.brand ? `${item.name} (${item.brand})` : item.name,
            category: item.category.name,
            category_id: item.category.id,
            quantity: fullQuantity,
            order_index: 999,
            is_custom: true,
            unit: item.unit,
            created_at: new Date().toISOString()
          });

        await supabase
          .from('inventory')
          .insert({
            item_id: customId,
            current_quantity: fullQuantity,
            current_number: item.quantity,
            last_updated: new Date().toISOString()
          });

        // Record for learning
        await recordProductUsage(customId, item.name, item.category.name, item.category.id);
      }

      onAdded();
      onClose();
    } catch (err) {
      console.error('Error saving items:', err);
      setError('Error al guardar los items');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveManual = async () => {
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const customId = `custom_${Date.now()}`;
      const fullQuantity = quantity && unit ? `${quantity} ${unit}` : quantity || '1 unid';
      const category = categories.find(c => c.id === selectedCategory);

      await supabase
        .from('market_items')
        .insert({
          id: customId,
          name: name.trim(),
          category: category?.name_es || 'Otros',
          category_id: selectedCategory,
          quantity: fullQuantity,
          order_index: 999,
          is_custom: true,
          unit: unit || null,
          created_at: new Date().toISOString()
        });

      if (quantity) {
        await supabase
          .from('inventory')
          .insert({
            item_id: customId,
            current_quantity: fullQuantity,
            current_number: parseFloat(quantity) || 1,
            last_updated: new Date().toISOString()
          });
      }

      // Record for learning
      await recordProductUsage(customId, name.trim(), category?.name_es, selectedCategory);

      onAdded();
      onClose();
    } catch (err) {
      console.error('Error saving custom item:', err);
      setError('Error al guardar el item');
    } finally {
      setSaving(false);
    }
  };

  // ==================== RENDER ====================

  const selectedCount = parsedItems.filter(i => i.isSelected).length;
  const showResults = parsedItems.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={20} />
              <span className="font-semibold">Agregar Productos</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
              <X size={20} />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex bg-white/20 rounded-xl p-1 gap-1">
            <button
              onClick={() => setMode('smart')}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                mode === 'smart' ? 'bg-white text-purple-600' : 'text-white/80 hover:text-white'
              }`}
            >
              <Sparkles size={16} />
              IA
            </button>
            <button
              onClick={() => setMode('voice')}
              disabled={!voiceSupported}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                mode === 'voice' ? 'bg-white text-purple-600' : 'text-white/80 hover:text-white'
              } ${!voiceSupported ? 'opacity-50' : ''}`}
            >
              <Mic size={16} />
              Voz
            </button>
            <button
              onClick={() => setMode('barcode')}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                mode === 'barcode' ? 'bg-white text-purple-600' : 'text-white/80 hover:text-white'
              }`}
            >
              <ScanBarcode size={16} />
              Código
            </button>
            <button
              onClick={() => setMode('receipt')}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                mode === 'receipt' ? 'bg-white text-purple-600' : 'text-white/80 hover:text-white'
              }`}
            >
              <Receipt size={16} />
              Recibo
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                mode === 'manual' ? 'bg-white text-purple-600' : 'text-white/80 hover:text-white'
              }`}
            >
              <Edit3 size={16} />
              Manual
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Quick Suggestions (always visible at top unless in manual mode) */}
          {mode !== 'manual' && !showResults && (frequentItems.length > 0 || recentItems.length > 0) && (
            <div className="mb-4 space-y-3">
              {recentItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <Clock size={12} />
                    <span>Recientes</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentItems.slice(0, 4).map((item) => (
                      <button
                        key={item.productId}
                        onClick={() => handleQuickAdd(item)}
                        disabled={saving}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors"
                      >
                        + {item.productName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {frequentItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <Star size={12} />
                    <span>Más usados</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {frequentItems.slice(0, 6).map((item) => (
                      <button
                        key={item.productId}
                        onClick={() => handleQuickAdd(item)}
                        disabled={saving}
                        className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm hover:bg-amber-100 transition-colors flex items-center gap-1"
                      >
                        + {item.productName}
                        <span className="text-xs opacity-60">({item.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== SMART / VOICE MODE ==================== */}
          {(mode === 'smart' || mode === 'voice') && (
            <div className="space-y-4">
              {/* Voice Controls */}
              {mode === 'voice' && (
                <div className="text-center py-4">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse scale-110'
                        : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                    }`}
                  >
                    {isListening ? <MicOff size={32} /> : <Mic size={32} />}
                  </button>
                  <p className="mt-3 text-sm text-gray-600">
                    {isListening ? 'Escuchando... Toca para detener' : 'Toca para dictar'}
                  </p>
                  {interimTranscript && (
                    <p className="mt-2 text-purple-600 italic">"{interimTranscript}"</p>
                  )}
                  {voiceError && (
                    <p className="mt-2 text-red-500 text-sm">{voiceError}</p>
                  )}
                </div>
              )}

              {/* Text Input (for smart mode or after voice) */}
              {(mode === 'smart' || transcript) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {mode === 'voice' ? 'Texto detectado' : 'Escribe lo que compraste'}
                  </label>
                  <textarea
                    value={mode === 'voice' ? transcript : smartInput}
                    onChange={(e) => mode === 'smart' && setSmartInput(e.target.value)}
                    placeholder="Ej: 1 kg camarones, chocolate Luker, 2 paquetes galletas saltinas..."
                    className="w-full p-4 border-2 border-purple-200 rounded-xl focus:border-purple-500 resize-none h-24"
                    disabled={isParsing}
                    readOnly={mode === 'voice'}
                  />
                </div>
              )}

              {/* Process Button */}
              {((mode === 'smart' && smartInput.trim()) || (mode === 'voice' && transcript)) && (
                <button
                  onClick={handleSmartParse}
                  disabled={isParsing}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isParsing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Procesar con IA
                    </>
                  )}
                </button>
              )}

              {parseError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2">
                  <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                  {parseError}
                </div>
              )}
            </div>
          )}

          {/* ==================== BARCODE MODE ==================== */}
          {mode === 'barcode' && (
            <div className="space-y-4">
              {barcodeScanning ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full aspect-video bg-black rounded-xl object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-24 border-2 border-white/50 rounded-lg" />
                  </div>
                  <button
                    onClick={stopBarcodeScanner}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/90 rounded-lg text-sm font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <button
                    onClick={startBarcodeScanner}
                    className="w-24 h-24 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto hover:bg-purple-200 transition-colors"
                  >
                    <ScanBarcode size={40} className="text-purple-600" />
                  </button>
                  <p className="mt-4 text-gray-600">Escanear código de barras</p>
                  <button
                    onClick={handleManualBarcodeInput}
                    className="mt-2 text-sm text-purple-600 underline"
                  >
                    o ingresa el código manualmente
                  </button>
                </div>
              )}

              {barcodeLoading && (
                <div className="text-center py-4">
                  <Loader2 size={24} className="animate-spin mx-auto text-purple-600" />
                  <p className="mt-2 text-sm text-gray-500">Buscando producto...</p>
                </div>
              )}

              {barcodeResult && !barcodeLoading && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Código: {barcodeResult}</p>
                  {barcodeProduct ? (
                    <div>
                      <p className="font-medium">{barcodeProduct.name}</p>
                      {barcodeProduct.brand && (
                        <p className="text-sm text-gray-500">{barcodeProduct.brand}</p>
                      )}
                      <button
                        onClick={handleSmartParse}
                        className="mt-3 w-full py-2 bg-purple-600 text-white rounded-lg font-medium"
                      >
                        Agregar este producto
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-amber-600 text-sm mb-2">Producto no encontrado en la base de datos</p>
                      <input
                        type="text"
                        value={smartInput}
                        onChange={(e) => setSmartInput(e.target.value)}
                        placeholder="Ingresa el nombre del producto"
                        className="w-full p-3 border rounded-lg"
                      />
                      {smartInput && (
                        <button
                          onClick={handleSmartParse}
                          className="mt-2 w-full py-2 bg-purple-600 text-white rounded-lg font-medium"
                        >
                          Procesar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================== RECEIPT MODE ==================== */}
          {mode === 'receipt' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <label className="cursor-pointer">
                  <div className="w-24 h-24 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto hover:bg-purple-200 transition-colors">
                    {receiptProcessing ? (
                      <Loader2 size={40} className="text-purple-600 animate-spin" />
                    ) : (
                      <Camera size={40} className="text-purple-600" />
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleReceiptCapture}
                    disabled={receiptProcessing}
                    className="hidden"
                  />
                </label>
                <p className="mt-4 text-gray-600">
                  {receiptProcessing ? 'Analizando recibo...' : 'Toma foto del recibo'}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  La IA extraerá todos los productos automáticamente
                </p>
              </div>

              {receiptError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2">
                  <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                  {receiptError}
                </div>
              )}
            </div>
          )}

          {/* ==================== MANUAL MODE ==================== */}
          {mode === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del producto *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Camarones, Quinoa..."
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left ${
                        selectedCategory === cat.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-sm font-medium">{cat.name_es}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="text"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Ej: 1, 500"
                    className="w-full px-4 py-3 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidad
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-4 py-3 border rounded-xl bg-white"
                  >
                    {commonUnits.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ==================== PARSED ITEMS PREVIEW ==================== */}
          {showResults && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">
                  Productos detectados ({parsedItems.length})
                </h3>
                <span className="text-sm text-purple-600">
                  {selectedCount} seleccionados
                </span>
              </div>

              {parsedItems.map(item => (
                <div
                  key={item.id}
                  className={`rounded-xl border-2 transition-all ${
                    item.isSelected
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="p-3">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleItemSelection(item.id)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          item.isSelected
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {item.isSelected && <Check size={14} />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{item.category.icon}</span>
                          <span className="font-medium">{item.name}</span>
                          {item.brand && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                              {item.brand}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                          <span>{item.category.name}</span>
                          <span>•</span>
                          <span>{item.quantity} {item.unit}</span>
                          {item.price && (
                            <>
                              <span>•</span>
                              <span>${item.price.toLocaleString()}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => toggleItemEdit(item.id)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-100 rounded-lg"
                        >
                          {item.isEditing ? <ChevronUp size={16} /> : <Edit3 size={16} />}
                        </button>
                        <button
                          onClick={() => removeParsedItem(item.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {item.isEditing && (
                      <div className="mt-3 pt-3 border-t border-purple-200 space-y-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateParsedItem(item.id, { name: e.target.value })}
                          className="w-full p-2 border rounded-lg text-sm"
                          placeholder="Nombre"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateParsedItem(item.id, { quantity: parseFloat(e.target.value) || 1 })}
                            className="p-2 border rounded-lg text-sm"
                            placeholder="Cantidad"
                          />
                          <select
                            value={item.unit}
                            onChange={(e) => updateParsedItem(item.id, { unit: e.target.value })}
                            className="p-2 border rounded-lg text-sm bg-white"
                          >
                            {commonUnits.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                        <select
                          value={item.category.id}
                          onChange={(e) => {
                            const cat = categories.find(c => c.id === e.target.value);
                            if (cat) {
                              updateParsedItem(item.id, {
                                category: { id: cat.id, name: cat.name_es, icon: cat.icon }
                              });
                            }
                          }}
                          className="w-full p-2 border rounded-lg text-sm bg-white"
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.icon} {cat.name_es}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200"
          >
            Cancelar
          </button>

          {mode === 'manual' ? (
            <button
              onClick={handleSaveManual}
              disabled={saving || !name.trim()}
              className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Plus size={18} />
                  Agregar
                </>
              )}
            </button>
          ) : showResults ? (
            <button
              onClick={handleSaveItems}
              disabled={saving || selectedCount === 0}
              className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Plus size={18} />
                  Agregar {selectedCount > 0 ? `(${selectedCount})` : ''}
                </>
              )}
            </button>
          ) : (
            <div className="flex-1" /> // Placeholder when no action needed
          )}
        </div>
      </div>
    </div>
  );
}

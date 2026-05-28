"use client";

import { useState, useRef } from "react";
import {
  X,
  Camera,
  Upload,
  Check,
  CheckCircle2,
  Plus,
  Package,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Trash2,
  ImagePlus,
} from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import Spinner from "@/components/ui/Spinner";
import FocusTrap from "@/components/ui/FocusTrap";

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
  action: "update_inventory";
  selected?: boolean;
}

interface NewProduct {
  product: IdentifiedProduct;
  action: "create_new";
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

type ScanStep = "capture" | "analyzing" | "results" | "applying" | "done";

export default function ScanPantryModal({
  onClose,
  onComplete,
}: ScanPantryModalProps) {
  const [step, setStep] = useState<ScanStep>("capture");
  const [images, setImages] = useState<string[]>([]);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<
    "matched" | "new" | null
  >("matched");
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [continuousMode, setContinuousMode] = useState(true);
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEscapeKey(onClose);

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Process each file
    const newImages: string[] = [];

    for (
      let i = 0;
      i < files.length && images.length + newImages.length < MAX_PHOTOS;
      i++
    ) {
      const file = files[i];
      const base64 = await fileToBase64(file);
      newImages.push(base64);
    }

    const updatedImages = [...images, ...newImages].slice(0, MAX_PHOTOS);
    setImages(updatedImages);

    // Reset input to allow selecting the same file again
    e.target.value = "";

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
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const analyzeImages = async () => {
    if (images.length === 0) return;

    setStep("analyzing");
    setError(null);
    setAnalyzingProgress(0);

    try {
      const response = await fetch("/api/scan-pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Marcar todos como seleccionados por defecto
      const result: ScanResult = {
        ...data,
        matched: data.matched.map((m: MatchedProduct) => ({
          ...m,
          selected: true,
        })),
        newItems: data.newItems.map((n: NewProduct) => ({
          ...n,
          selected: true,
        })),
      };

      setScanResult(result);
      setStep("results");
    } catch (err) {
      console.error("Error analyzing images:", err);
      setError(
        err instanceof Error ? err.message : "Error al analizar las imágenes",
      );
      setStep("capture");
    }
  };

  const toggleProductSelection = (type: "matched" | "new", index: number) => {
    if (!scanResult) return;

    setScanResult((prev) => {
      if (!prev) return prev;

      if (type === "matched") {
        const updated = [...prev.matched];
        updated[index] = {
          ...updated[index],
          selected: !updated[index].selected,
        };
        return { ...prev, matched: updated };
      } else {
        const updated = [...prev.newItems];
        updated[index] = {
          ...updated[index],
          selected: !updated[index].selected,
        };
        return { ...prev, newItems: updated };
      }
    });
  };

  const applyChanges = async () => {
    if (!scanResult) return;

    setStep("applying");
    setError(null);

    try {
      const selectedMatched = scanResult.matched.filter((m) => m.selected);
      const selectedNew = scanResult.newItems.filter((n) => n.selected);

      const response = await fetch("/api/scan-pantry", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matched: selectedMatched,
          newItems: selectedNew,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setStep("done");
      setTimeout(() => {
        onComplete();
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Error applying changes:", err);
      setError(err instanceof Error ? err.message : "Error al aplicar cambios");
      setStep("results");
    }
  };

  const resetScan = () => {
    setImages([]);
    setScanResult(null);
    setError(null);
    setStep("capture");
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-50";
    if (confidence >= 0.6) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const totalSelected =
    (scanResult?.matched.filter((m) => m.selected).length ?? 0) +
    (scanResult?.newItems.filter((n) => n.selected).length ?? 0);

  return (
    <FocusTrap active={true}>
      <div
        className="fixed inset-0 z-[400] bg-black flex flex-col animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-pantry-modal-title"
      >
        {/* Keyframe local para la línea de escaneo */}
        <style>{`
          @keyframes scan-line {
            0% { top: 8%; }
            100% { top: 92%; }
          }
        `}</style>

        {/* ───────── Viewfinder / cámara ───────── */}
        <div className="relative flex-1 min-h-0 bg-gradient-to-br from-stone-800 to-stone-900 overflow-hidden">
          {/* Textura sutil */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 12px)",
            }}
          />

          {/* Preview de imágenes capturadas como fondo del viewfinder */}
          {images.length > 0 && (
            <img
              src={images[images.length - 1]}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
          )}

          {/* Marco con esquinas */}
          <div className="absolute inset-8 sm:inset-12 border-2 border-white/40 rounded-2xl pointer-events-none">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-2xl" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-2xl" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-2xl" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-2xl" />
            {step === "analyzing" && (
              <div
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent"
                style={{
                  animation: "scan-line 1.6s ease-in-out infinite alternate",
                }}
              />
            )}
          </div>

          {/* Header overlay */}
          <div className="absolute top-0 inset-x-0 pt-[max(2rem,env(safe-area-inset-top))] px-5 flex items-center justify-between">
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            >
              <X size={16} />
            </button>
            <div
              id="scan-pantry-modal-title"
              className="bg-black/40 backdrop-blur rounded-full px-3 py-1.5 text-white text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
            >
              <Sparkles size={12} /> Escanear despensa
            </div>
            <button
              onClick={resetScan}
              aria-label="Reiniciar"
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center hover:bg-black/60 transition-colors disabled:opacity-40"
              disabled={images.length === 0 && step === "capture"}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Status badge central */}
          <div className="absolute top-1/3 inset-x-0 text-center text-white px-5">
            {step === "analyzing" && (
              <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur rounded-full px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  Analizando {images.length} foto{images.length > 1 ? "s" : ""}…
                </span>
              </div>
            )}
            {step === "applying" && (
              <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur rounded-full px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  Actualizando inventario…
                </span>
              </div>
            )}
            {step === "done" && (
              <div className="inline-flex items-center gap-2 bg-green-500 rounded-full px-3 py-1.5">
                <CheckCircle2 size={14} className="text-white" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Inventario actualizado
                </span>
              </div>
            )}
            {step === "results" && scanResult && (
              <div className="inline-flex items-center gap-2 bg-green-500 rounded-full px-3 py-1.5">
                <CheckCircle2 size={14} className="text-white" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  {scanResult.matched.length + scanResult.newItems.length} items
                  detectados
                </span>
              </div>
            )}
            {step === "capture" && images.length === 0 && (
              <div className="inline-flex flex-col items-center gap-2">
                <span className="text-[13px] font-medium text-white/90">
                  Apunta a tu nevera, despensa o alacena
                </span>
                <span className="text-[11px] text-white/60">
                  Hasta {MAX_PHOTOS} fotos para mejor precisión
                </span>
              </div>
            )}
            {step === "capture" && images.length > 0 && (
              <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur rounded-full px-3 py-1.5">
                <Camera size={14} />
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  {images.length}/{MAX_PHOTOS} fotos
                </span>
              </div>
            )}
          </div>

          {/* Error overlay */}
          {error && (
            <div className="absolute bottom-28 inset-x-5">
              <div className="bg-red-500/90 backdrop-blur text-white rounded-xl p-3 flex items-start gap-2 shadow-lg">
                <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-sm font-semibold">Error</p>
                  <p className="text-xs opacity-90">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Spinner overlay para analyzing/applying */}
          {(step === "analyzing" || step === "applying") && (
            <div className="absolute bottom-24 inset-x-0 flex justify-center">
              <Spinner size="lg" color="green" />
            </div>
          )}

          {/* Controles de captura (shutter + thumbnails) */}
          {step === "capture" && (
            <div className="absolute bottom-0 inset-x-0 pb-[max(1.5rem,env(safe-area-inset-bottom))] px-5">
              {/* Thumbnails */}
              {images.length > 0 && (
                <div className="flex justify-center gap-2 mb-4 flex-wrap">
                  {images.map((img, index) => (
                    <div key={index} className="relative">
                      <img
                        src={img}
                        alt={`Foto ${index + 1}`}
                        className="w-12 h-12 object-cover rounded-lg border-2 border-white/60"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        aria-label={`Eliminar foto ${index + 1}`}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                {/* Subir imágenes */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={images.length >= MAX_PHOTOS}
                  aria-label="Subir imágenes"
                  className="w-12 h-12 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center hover:bg-black/60 transition-colors disabled:opacity-40"
                >
                  <Upload size={20} />
                </button>

                {/* Shutter (tomar foto) */}
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={images.length >= MAX_PHOTOS}
                  aria-label="Tomar foto"
                  className="w-16 h-16 rounded-full bg-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 rounded-full bg-white border-4 border-stone-900 flex items-center justify-center">
                    <Camera size={20} className="text-stone-900" />
                  </div>
                </button>

                {/* Analizar */}
                <button
                  onClick={analyzeImages}
                  disabled={images.length === 0}
                  aria-label="Analizar fotos"
                  className="w-12 h-12 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  <Sparkles size={20} />
                </button>
              </div>

              {images.length > 0 && (
                <p className="text-center text-[11px] text-white/60 mt-3">
                  Toca <Sparkles size={11} className="inline" /> para analizar{" "}
                  {images.length} foto{images.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
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
        </div>

        {/* ───────── Bottom sheet de resultados ───────── */}
        {step === "results" && scanResult && (
          <div className="bg-white rounded-t-3xl flex flex-col max-h-[62vh] animate-slide-up">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            <div className="overflow-y-auto px-5 pt-2 pb-4 space-y-4">
              {/* Resumen */}
              {scanResult.summary && (
                <div className="bg-[var(--accent-soft)] p-3 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="text-[var(--accent)]" size={16} />
                    <span className="font-semibold text-[var(--accent)] text-[13px]">
                      Detectado por IA
                    </span>
                  </div>
                  <p className="text-[13px] text-[var(--ink-soft)]">
                    {scanResult.summary}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 p-3 rounded-xl text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {scanResult.matched.length}
                  </p>
                  <p className="text-[11px] text-green-600">Ya en tu lista</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl text-center">
                  <p className="text-2xl font-bold text-blue-700">
                    {scanResult.newItems.length}
                  </p>
                  <p className="text-[11px] text-blue-600">Nuevos productos</p>
                </div>
              </div>

              {/* Info de selección */}
              <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                Selecciona los productos correctos
              </p>

              {/* Matched */}
              {scanResult.matched.length > 0 && (
                <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedSection(
                        expandedSection === "matched" ? null : "matched",
                      )
                    }
                    className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 transition-colors"
                  >
                    <span className="font-semibold text-green-700 flex items-center gap-2 text-[13px]">
                      <Check size={16} />
                      Actualizar inventario (
                      {scanResult.matched.filter((m) => m.selected).length}/
                      {scanResult.matched.length})
                    </span>
                    {expandedSection === "matched" ? (
                      <ChevronUp size={18} className="text-green-700" />
                    ) : (
                      <ChevronDown size={18} className="text-green-700" />
                    )}
                  </button>
                  {expandedSection === "matched" && (
                    <div className="divide-y divide-[var(--border)]">
                      {scanResult.matched.map((match, index) => (
                        <label
                          key={index}
                          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                            match.selected
                              ? "bg-white"
                              : "bg-stone-50 opacity-60"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={match.selected}
                            onChange={() =>
                              toggleProductSelection("matched", index)
                            }
                            className="w-5 h-5 accent-green-600"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-semibold text-[13px] truncate ${!match.selected && "line-through text-gray-400"}`}
                              >
                                {match.marketItemName}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${getConfidenceColor(match.product.confidence)}`}
                              >
                                {Math.round(match.product.confidence * 100)}%
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--ink-soft)]">
                              Detectado: {match.product.name} →{" "}
                              {match.product.quantity} {match.product.unit}
                            </p>
                          </div>
                          {match.selected && (
                            <Check
                              size={16}
                              className="text-green-600 flex-shrink-0"
                            />
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* New */}
              {scanResult.newItems.length > 0 && (
                <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedSection(
                        expandedSection === "new" ? null : "new",
                      )
                    }
                    className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <span className="font-semibold text-blue-700 flex items-center gap-2 text-[13px]">
                      <Plus size={16} />
                      Agregar a lista (
                      {scanResult.newItems.filter((n) => n.selected).length}/
                      {scanResult.newItems.length})
                    </span>
                    {expandedSection === "new" ? (
                      <ChevronUp size={18} className="text-blue-700" />
                    ) : (
                      <ChevronDown size={18} className="text-blue-700" />
                    )}
                  </button>
                  {expandedSection === "new" && (
                    <div className="divide-y divide-[var(--border)]">
                      {scanResult.newItems.map((newItem, index) => (
                        <label
                          key={index}
                          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                            newItem.selected
                              ? "bg-white"
                              : "bg-stone-50 opacity-60"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={newItem.selected}
                            onChange={() =>
                              toggleProductSelection("new", index)
                            }
                            className="w-5 h-5 accent-blue-600"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Package size={14} className="text-blue-500" />
                              <span
                                className={`font-semibold text-[13px] ${!newItem.selected && "line-through text-gray-400"}`}
                              >
                                {newItem.product.genericName}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${getConfidenceColor(newItem.product.confidence)}`}
                              >
                                {Math.round(newItem.product.confidence * 100)}%
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--ink-soft)]">
                              {newItem.product.category} •{" "}
                              {newItem.product.quantity} {newItem.product.unit}
                            </p>
                            {newItem.product.name !==
                              newItem.product.genericName && (
                              <p className="text-[11px] text-[var(--accent)]">
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

              {/* Sin productos */}
              {scanResult.matched.length === 0 &&
                scanResult.newItems.length === 0 && (
                  <div className="text-center py-8">
                    <Package className="mx-auto text-gray-300 mb-2" size={48} />
                    <p className="text-[var(--ink-soft)]">
                      No se identificaron productos
                    </p>
                    <button
                      onClick={resetScan}
                      className="mt-4 text-[var(--accent)] font-semibold text-[13px]"
                    >
                      Intentar con otras fotos
                    </button>
                  </div>
                )}
            </div>

            {/* Footer fijo */}
            {(scanResult.matched.length > 0 ||
              scanResult.newItems.length > 0) && (
              <div className="px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-[var(--border)] flex gap-3">
                <button
                  onClick={resetScan}
                  className="flex-1 py-3 px-4 border border-[var(--border)] rounded-xl font-medium text-[13px] text-[var(--ink)] hover:bg-stone-50 transition-colors"
                >
                  Nueva foto
                </button>
                <button
                  onClick={applyChanges}
                  disabled={totalSelected === 0}
                  className="flex-1 py-3 px-4 bg-[var(--accent)] text-white rounded-xl font-semibold text-[14px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  Actualizar inventario
                </button>
              </div>
            )}
          </div>
        )}

        {/* ───────── Prompt de captura continua ───────── */}
        {showContinuePrompt && (
          <div className="fixed inset-0 bg-black/70 z-[410] flex items-end sm:items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-slide-up">
              <div className="text-center mb-5">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="text-green-600" size={32} />
                </div>
                <h3 className="font-semibold text-lg text-[var(--ink)]">
                  ¡Foto {images.length} agregada!
                </h3>
                <p className="text-sm text-[var(--ink-soft)] mt-1">
                  Puedes agregar {MAX_PHOTOS - images.length} foto
                  {MAX_PHOTOS - images.length > 1 ? "s" : ""} más
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleContinueCapture}
                  className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <Camera size={20} />
                  Tomar otra foto
                </button>
                <button
                  onClick={handleStopCapture}
                  className="w-full py-3 bg-stone-100 text-[var(--ink)] rounded-xl font-medium hover:bg-stone-200 transition-colors"
                >
                  Listo, analizar {images.length} foto
                  {images.length > 1 ? "s" : ""}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2 text-[var(--ink-soft)] text-sm hover:text-[var(--ink)] transition-colors"
                >
                  Cancelar y salir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </FocusTrap>
  );
}

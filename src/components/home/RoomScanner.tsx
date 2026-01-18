'use client';

import { useState, useRef, useCallback } from 'react';
import {
  X, Camera, Upload, Trash2, Sparkles, RefreshCw,
  CheckCircle2, AlertTriangle, Image as ImageIcon,
  RotateCcw, Zap, Eye
} from 'lucide-react';
import { SpaceAttributes } from '@/types';

interface CleaningZone {
  zone: string;
  complexity: 'simple' | 'moderada' | 'compleja';
  items: string[];
}

interface RoomAnalysis {
  roomType: string;
  roomTypeId: string;
  estimatedArea: number;
  attributes: SpaceAttributes;
  furniture: string[];
  surfaces: string[];
  cleaningZones?: CleaningZone[];
  suggestedTasks: {
    name: string;
    frequency: 'diaria' | 'semanal' | 'quincenal' | 'mensual';
    estimatedMinutes: number;
    reason: string;
    priority?: 'alta' | 'media' | 'baja';
  }[];
  usageLevel: 'alto' | 'medio' | 'bajo';
  description: string;
  specialConsiderations?: string[];
  confidence: number;
}

interface RoomScannerProps {
  onClose: () => void;
  onAnalysisComplete: (analysis: RoomAnalysis) => void;
}

// Pasos de guía para escanear
const SCAN_GUIDE_STEPS = [
  {
    id: 'overview',
    title: 'Vista General',
    instruction: 'Captura una vista panorámica del espacio completo',
    tip: 'Párate en una esquina para ver la mayor parte posible',
    icon: '📷',
    required: true
  },
  {
    id: 'floor',
    title: 'Piso Completo',
    instruction: 'Enfoca el piso mostrando el tipo de superficie',
    tip: 'Incluye una puerta o mueble como referencia de tamaño',
    icon: '⬇️',
    required: true
  },
  {
    id: 'corners',
    title: 'Esquinas y Rincones',
    instruction: 'Captura las esquinas donde se acumula polvo',
    tip: 'Las esquinas revelan necesidades de limpieza profunda',
    icon: '📐',
    required: false
  },
  {
    id: 'furniture',
    title: 'Muebles Principales',
    instruction: 'Enfoca los muebles grandes que requieren limpieza',
    tip: 'Cama, sofá, mesa, escritorio, estantes',
    icon: '🛋️',
    required: true
  },
  {
    id: 'special',
    title: 'Áreas Especiales',
    instruction: 'Captura baño, closet, balcón si los hay',
    tip: 'Estas áreas tienen tareas de limpieza específicas',
    icon: '🚿',
    required: false
  }
];

export default function RoomScanner({ onClose, onAnalysisComplete }: RoomScannerProps) {
  const [images, setImages] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null);
  const [step, setStep] = useState<'intro' | 'guided' | 'capture' | 'preview' | 'analyzing' | 'result'>('intro');
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [guidedStep, setGuidedStep] = useState(0);
  const [capturedSteps, setCapturedSteps] = useState<Set<string>>(new Set());
  const [referenceSize, setReferenceSize] = useState<string>('door'); // Para estimar dimensiones

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Iniciar cámara
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('No se pudo acceder a la cámara. Por favor, permite el acceso o sube fotos.');
    }
  };

  // Detener cámara
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Cambiar cámara frontal/trasera
  const toggleCamera = async () => {
    stopCamera();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    setTimeout(() => startCamera(), 100);
  };

  // Capturar foto
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Configurar canvas al tamaño del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar frame del video en el canvas
    ctx.drawImage(video, 0, 0);

    // Convertir a base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setImages(prev => [...prev, imageData]);

    // Marcar paso guiado como capturado
    if (step === 'guided' && guidedStep < SCAN_GUIDE_STEPS.length) {
      const currentStep = SCAN_GUIDE_STEPS[guidedStep];
      setCapturedSteps(prev => new Set([...prev, currentStep.id]));

      // Avanzar al siguiente paso o terminar
      if (guidedStep < SCAN_GUIDE_STEPS.length - 1) {
        setGuidedStep(prev => prev + 1);
      }
    }

    // Efecto de flash
    canvas.style.opacity = '1';
    setTimeout(() => {
      canvas.style.opacity = '0';
    }, 100);
  };

  // Calcular progreso de escaneo guiado
  const requiredSteps = SCAN_GUIDE_STEPS.filter(s => s.required);
  const requiredCaptured = requiredSteps.filter(s => capturedSteps.has(s.id)).length;
  const canAnalyze = requiredCaptured >= requiredSteps.length || images.length >= 3;

  // Subir imágenes desde archivo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImages(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Eliminar imagen
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Analizar imágenes
  const analyzeImages = async () => {
    if (images.length === 0) {
      setError('Por favor, toma o sube al menos una foto del espacio');
      return;
    }

    setStep('analyzing');
    setAnalyzing(true);
    setError(null);
    stopCamera();

    try {
      const response = await fetch('/api/analyze-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images,
          referenceObject: referenceSize,
          capturedSteps: Array.from(capturedSteps)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al analizar');
      }

      setAnalysis(data.analysis);
      setStep('result');

    } catch (err) {
      console.error('Error analyzing:', err);
      setError(err instanceof Error ? err.message : 'Error al analizar las imágenes');
      setStep('capture');
    } finally {
      setAnalyzing(false);
    }
  };

  // Aplicar análisis
  const applyAnalysis = () => {
    if (analysis) {
      onAnalysisComplete(analysis);
    }
  };

  // Reiniciar
  const reset = () => {
    setImages([]);
    setAnalysis(null);
    setError(null);
    setStep('capture');
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkles size={20} />
          <span className="font-semibold">Escanear Espacio con IA</span>
        </div>
        <button
          onClick={() => { stopCamera(); onClose(); }}
          className="p-2 hover:bg-white/20 rounded-lg"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Step: Intro - Explicación y selección de referencia */}
        {step === 'intro' && (
          <div className="h-full flex flex-col items-center justify-center p-6">
            <div className="text-center max-w-sm">
              {/* Icon */}
              <div className="w-24 h-24 bg-gradient-to-br from-violet-500/30 to-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Camera size={48} className="text-violet-400" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-3">
                Escaneo Inteligente
              </h2>
              <p className="text-gray-400 mb-8">
                Te guiaremos paso a paso para capturar las mejores fotos y obtener un análisis preciso del espacio.
              </p>

              {/* Reference Object Selection */}
              <div className="bg-gray-800 rounded-xl p-4 mb-6 text-left">
                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                  📏 Referencia de Tamaño
                </h3>
                <p className="text-gray-400 text-sm mb-3">
                  Selecciona un objeto que aparecerá en las fotos para estimar las dimensiones:
                </p>
                <div className="space-y-2">
                  {[
                    { id: 'door', label: 'Puerta estándar', size: '~2.10m altura', icon: '🚪' },
                    { id: 'bed_single', label: 'Cama sencilla', size: '~1.90m largo', icon: '🛏️' },
                    { id: 'bed_double', label: 'Cama doble/queen', size: '~2.00m largo', icon: '🛏️' },
                    { id: 'window', label: 'Ventana estándar', size: '~1.20m ancho', icon: '🪟' },
                    { id: 'sofa', label: 'Sofá 3 puestos', size: '~2.00m largo', icon: '🛋️' },
                    { id: 'none', label: 'Sin referencia', size: 'Estimación básica', icon: '❓' }
                  ].map(ref => (
                    <button
                      key={ref.id}
                      onClick={() => setReferenceSize(ref.id)}
                      className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                        referenceSize === ref.id
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <span className="text-xl">{ref.icon}</span>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{ref.label}</p>
                        <p className={`text-xs ${referenceSize === ref.id ? 'text-violet-200' : 'text-gray-500'}`}>
                          {ref.size}
                        </p>
                      </div>
                      {referenceSize === ref.id && <CheckCircle2 size={18} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => { setStep('guided'); startCamera(); }}
                  className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90"
                >
                  <Camera size={20} />
                  Iniciar Escaneo Guiado
                </button>
                <button
                  onClick={() => setStep('capture')}
                  className="w-full py-3 bg-gray-700 text-gray-300 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-600"
                >
                  <Upload size={18} />
                  Modo Libre / Subir Fotos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Guided - Captura guiada paso a paso */}
        {step === 'guided' && (
          <div className="h-full flex flex-col">
            {/* Progress Bar */}
            <div className="bg-gray-900 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-medium">
                  Paso {guidedStep + 1} de {SCAN_GUIDE_STEPS.length}
                </span>
                <span className="text-violet-400 text-sm">
                  {capturedSteps.size} foto{capturedSteps.size !== 1 ? 's' : ''} capturada{capturedSteps.size !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex gap-1">
                {SCAN_GUIDE_STEPS.map((s, i) => (
                  <div
                    key={s.id}
                    className={`flex-1 h-2 rounded-full transition-all ${
                      capturedSteps.has(s.id)
                        ? 'bg-green-500'
                        : i === guidedStep
                        ? 'bg-violet-500'
                        : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Camera View with Overlay */}
            <div className="flex-1 relative bg-black">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-100 bg-white"
                  />

                  {/* Guided Instructions Overlay */}
                  <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{SCAN_GUIDE_STEPS[guidedStep].icon}</span>
                      <div>
                        <h3 className="text-white font-bold text-lg">
                          {SCAN_GUIDE_STEPS[guidedStep].title}
                        </h3>
                        <p className="text-gray-200 text-sm">
                          {SCAN_GUIDE_STEPS[guidedStep].instruction}
                        </p>
                        <p className="text-violet-300 text-xs mt-1 flex items-center gap-1">
                          <Sparkles size={12} />
                          {SCAN_GUIDE_STEPS[guidedStep].tip}
                        </p>
                        {!SCAN_GUIDE_STEPS[guidedStep].required && (
                          <span className="inline-block mt-2 text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
                            Opcional
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Already Captured Badge */}
                  {capturedSteps.has(SCAN_GUIDE_STEPS[guidedStep].id) && (
                    <div className="absolute top-20 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                      <CheckCircle2 size={14} />
                      Capturado
                    </div>
                  )}

                  {/* Capture Controls */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4">
                    {/* Skip Button (for optional steps) */}
                    {!SCAN_GUIDE_STEPS[guidedStep].required && (
                      <button
                        onClick={() => {
                          if (guidedStep < SCAN_GUIDE_STEPS.length - 1) {
                            setGuidedStep(prev => prev + 1);
                          }
                        }}
                        className="px-4 py-2 bg-white/20 backdrop-blur rounded-lg text-white text-sm hover:bg-white/30"
                      >
                        Omitir
                      </button>
                    )}

                    {/* Capture Button */}
                    <button
                      onClick={capturePhoto}
                      className="w-18 h-18 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                    >
                      <div className="w-16 h-16 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full flex items-center justify-center">
                        <Camera size={32} className="text-white" />
                      </div>
                    </button>

                    {/* Toggle Camera */}
                    <button
                      onClick={toggleCamera}
                      className="p-3 bg-white/20 backdrop-blur rounded-full hover:bg-white/30"
                    >
                      <RotateCcw size={20} className="text-white" />
                    </button>
                  </div>

                  {/* Step Navigation Dots */}
                  <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-2">
                    {SCAN_GUIDE_STEPS.map((s, i) => (
                      <button
                        key={s.id}
                        onClick={() => setGuidedStep(i)}
                        className={`w-3 h-3 rounded-full transition-all ${
                          capturedSteps.has(s.id)
                            ? 'bg-green-500'
                            : i === guidedStep
                            ? 'bg-violet-500 scale-125'
                            : 'bg-white/30'
                        }`}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <button
                    onClick={startCamera}
                    className="py-4 px-8 bg-violet-600 text-white rounded-xl font-semibold flex items-center gap-2"
                  >
                    <Camera size={20} />
                    Activar Cámara
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Action Bar */}
            <div className="bg-gray-900 p-4 space-y-3">
              {/* Thumbnails */}
              {images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, index) => (
                    <div key={index} className="relative flex-shrink-0">
                      <img
                        src={img}
                        alt={`Foto ${index + 1}`}
                        className="w-12 h-12 object-cover rounded-lg border-2 border-violet-500"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => { stopCamera(); setStep('capture'); }}
                  className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-medium"
                >
                  Modo Libre
                </button>
                <button
                  onClick={() => { stopCamera(); analyzeImages(); }}
                  disabled={!canAnalyze}
                  className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${
                    canAnalyze
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white'
                      : 'bg-gray-600 text-gray-400'
                  }`}
                >
                  <Zap size={18} />
                  {canAnalyze ? `Analizar (${images.length})` : `Faltan ${requiredSteps.length - requiredCaptured} fotos`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Capture */}
        {step === 'capture' && (
          <div className="h-full flex flex-col">
            {/* Camera View o Upload Area */}
            <div className="flex-1 relative bg-black">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-100 bg-white"
                  />

                  {/* Camera Controls Overlay */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4">
                    <button
                      onClick={toggleCamera}
                      className="p-3 bg-white/20 backdrop-blur rounded-full hover:bg-white/30"
                    >
                      <RotateCcw size={24} className="text-white" />
                    </button>

                    <button
                      onClick={capturePhoto}
                      className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                    >
                      <div className="w-14 h-14 bg-violet-600 rounded-full flex items-center justify-center">
                        <Camera size={28} className="text-white" />
                      </div>
                    </button>

                    <button
                      onClick={stopCamera}
                      className="p-3 bg-white/20 backdrop-blur rounded-full hover:bg-white/30"
                    >
                      <X size={24} className="text-white" />
                    </button>
                  </div>

                  {/* Photo count badge */}
                  {images.length > 0 && (
                    <div className="absolute top-4 right-4 bg-violet-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {images.length} foto{images.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-violet-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Camera size={40} className="text-violet-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Escanea tu espacio
                    </h3>
                    <p className="text-gray-400 text-sm max-w-xs">
                      Toma varias fotos desde diferentes ángulos para un mejor análisis
                    </p>
                  </div>

                  <div className="space-y-3 w-full max-w-xs">
                    <button
                      onClick={startCamera}
                      className="w-full py-4 bg-violet-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-violet-700"
                    >
                      <Camera size={20} />
                      Abrir Cámara
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-4 bg-white/10 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white/20"
                    >
                      <Upload size={20} />
                      Subir Fotos
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Tips */}
                  <div className="mt-8 bg-white/5 rounded-xl p-4 max-w-xs">
                    <p className="text-violet-400 text-sm font-medium mb-2">💡 Tips para mejor análisis:</p>
                    <ul className="text-gray-400 text-xs space-y-1">
                      <li>• Buena iluminación</li>
                      <li>• Captura las 4 esquinas</li>
                      <li>• Incluye piso y techo</li>
                      <li>• Muestra muebles y objetos</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 0 && (
              <div className="bg-gray-900 p-4">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, index) => (
                    <div key={index} className="relative flex-shrink-0">
                      <img
                        src={img}
                        alt={`Foto ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => cameraActive ? capturePhoto() : fileInputRef.current?.click()}
                    className="w-16 h-16 flex-shrink-0 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-500 hover:text-violet-400 hover:border-violet-400"
                  >
                    <Camera size={24} />
                  </button>
                </div>

                <button
                  onClick={analyzeImages}
                  disabled={images.length === 0}
                  className="w-full mt-3 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Zap size={20} />
                  Analizar con IA ({images.length} foto{images.length !== 1 ? 's' : ''})
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step: Analyzing */}
        {step === 'analyzing' && (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="w-24 h-24 bg-violet-600/20 rounded-full flex items-center justify-center mb-6 relative">
              <Sparkles size={40} className="text-violet-400" />
              <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Analizando espacio...
            </h3>
            <p className="text-gray-400 text-sm text-center max-w-xs">
              La IA está identificando muebles, superficies, dimensiones y necesidades de limpieza
            </p>

            <div className="mt-8 space-y-2 text-sm text-gray-500">
              <p className="flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                Procesando {images.length} imagen{images.length !== 1 ? 'es' : ''}...
              </p>
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && analysis && (
          <div className="p-4 space-y-4">
            {/* Confidence Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-green-500" />
                <span className="text-white font-medium">Análisis Completado</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                analysis.confidence >= 80 ? 'bg-green-500/20 text-green-400' :
                analysis.confidence >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {analysis.confidence}% confianza
              </span>
            </div>

            {/* Room Type Card */}
            <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-xl p-4 border border-violet-500/30">
              <h3 className="text-2xl font-bold text-white mb-1">{analysis.roomType}</h3>
              <p className="text-violet-300 text-sm">{analysis.description}</p>
              <div className="flex gap-4 mt-3 text-sm">
                <span className="text-gray-400">📐 ~{analysis.estimatedArea} m²</span>
                <span className="text-gray-400">
                  {analysis.usageLevel === 'alto' ? '🔥 Uso Alto' :
                   analysis.usageLevel === 'medio' ? '⚡ Uso Medio' : '💤 Uso Bajo'}
                </span>
              </div>
            </div>

            {/* Attributes Detected */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Eye size={16} />
                Características Detectadas
              </h4>
              <div className="flex flex-wrap gap-2">
                {analysis.attributes.has_bathroom && (
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm">🚿 Baño privado</span>
                )}
                {analysis.attributes.has_walkin_closet && (
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-sm">👔 Walking closet</span>
                )}
                {analysis.attributes.has_balcony && (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm">🌅 Balcón</span>
                )}
                {analysis.attributes.has_windows > 0 && (
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm">🪟 {analysis.attributes.has_windows} ventana{analysis.attributes.has_windows !== 1 ? 's' : ''}</span>
                )}
                {analysis.attributes.has_curtains && (
                  <span className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded-lg text-sm">🎭 Cortinas</span>
                )}
                {analysis.attributes.has_air_conditioning && (
                  <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm">❄️ Aire acondicionado</span>
                )}
                <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-sm">
                  {analysis.attributes.floor_type === 'tile' ? '🪨 Baldosa' :
                   analysis.attributes.floor_type === 'wood' ? '🪵 Madera' :
                   analysis.attributes.floor_type === 'carpet' ? '🧶 Alfombra' :
                   analysis.attributes.floor_type === 'concrete' ? '⬜ Concreto' : '❓ Otro'}
                </span>
              </div>
            </div>

            {/* Cleaning Zones - Nuevo formato inteligente */}
            {analysis.cleaningZones && analysis.cleaningZones.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Eye size={16} />
                  Zonas de Limpieza
                </h4>
                <div className="space-y-2">
                  {analysis.cleaningZones.map((zone, i) => (
                    <div key={i} className="bg-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm font-medium">{zone.zone}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          zone.complexity === 'simple' ? 'bg-green-500/20 text-green-400' :
                          zone.complexity === 'moderada' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {zone.complexity}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs">{zone.items.join(' • ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback: Furniture if no zones */}
            {(!analysis.cleaningZones || analysis.cleaningZones.length === 0) && analysis.furniture.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <ImageIcon size={16} />
                  Elementos Principales
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.furniture.map((item, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Special Considerations */}
            {analysis.specialConsiderations && analysis.specialConsiderations.length > 0 && (
              <div className="bg-amber-900/30 border border-amber-500/30 rounded-xl p-4">
                <h4 className="text-amber-400 font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Consideraciones Especiales
                </h4>
                <ul className="space-y-1">
                  {analysis.specialConsiderations.map((item, i) => (
                    <li key={i} className="text-amber-200 text-sm flex items-start gap-2">
                      <span className="text-amber-400">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Tasks */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Sparkles size={16} />
                Tareas Sugeridas ({analysis.suggestedTasks.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {analysis.suggestedTasks.map((task, i) => (
                  <div key={i} className={`rounded-lg p-3 ${
                    task.priority === 'alta' ? 'bg-red-900/30 border border-red-500/30' :
                    task.priority === 'media' ? 'bg-yellow-900/20 border border-yellow-500/20' :
                    'bg-gray-700/50'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {task.priority === 'alta' && <span className="text-red-400">🔴</span>}
                        {task.priority === 'media' && <span className="text-yellow-400">🟡</span>}
                        {task.priority === 'baja' && <span className="text-green-400">🟢</span>}
                        <span className="text-white text-sm font-medium">{task.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        task.frequency === 'diaria' ? 'bg-red-500/20 text-red-400' :
                        task.frequency === 'semanal' ? 'bg-blue-500/20 text-blue-400' :
                        task.frequency === 'quincenal' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {task.frequency}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs">{task.reason}</p>
                    <p className="text-gray-500 text-xs mt-1">⏱️ {task.estimatedMinutes} min</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={reset}
                className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} />
                Escanear Otro
              </button>
              <button
                onClick={applyAnalysis}
                className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                Aplicar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Toast */}
      {error && (
        <div className="absolute bottom-20 left-4 right-4 bg-red-500 text-white p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Error</p>
            <p className="text-sm text-red-100">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="p-1">
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

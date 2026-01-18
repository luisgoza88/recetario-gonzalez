'use client';

import { useState, useRef } from 'react';
import {
  X, Camera, CheckCircle2, AlertTriangle, Eye,
  Plus, Trash2, Send, Image as ImageIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { ScheduledTask } from '@/types';

interface InspectionModeProps {
  task: ScheduledTask;
  onClose: () => void;
  onComplete: () => void;
}

interface InspectionItem {
  id: string;
  name: string;
  status: 'good' | 'issue' | 'pending';
  note?: string;
  photo?: string;
}

const getDefaultChecklistForSpace = (spaceType?: string): InspectionItem[] => {
  const baseItems: InspectionItem[] = [
    { id: '1', name: 'Piso limpio y sin manchas', status: 'pending' },
    { id: '2', name: 'Superficies sin polvo', status: 'pending' },
    { id: '3', name: 'Esquinas limpias', status: 'pending' },
    { id: '4', name: 'Sin mal olor', status: 'pending' },
    { id: '5', name: 'Objetos organizados', status: 'pending' },
  ];

  const spaceSpecific: Record<string, InspectionItem[]> = {
    'baño': [
      { id: '6', name: 'Sanitario limpio', status: 'pending' },
      { id: '7', name: 'Espejo sin manchas', status: 'pending' },
      { id: '8', name: 'Ducha/bañera limpia', status: 'pending' },
      { id: '9', name: 'Lavamanos limpio', status: 'pending' },
    ],
    'cocina': [
      { id: '6', name: 'Mesones limpios', status: 'pending' },
      { id: '7', name: 'Estufa limpia', status: 'pending' },
      { id: '8', name: 'Fregadero limpio', status: 'pending' },
      { id: '9', name: 'Electrodomésticos limpios', status: 'pending' },
    ],
    'habitacion': [
      { id: '6', name: 'Cama tendida', status: 'pending' },
      { id: '7', name: 'Muebles sacudidos', status: 'pending' },
      { id: '8', name: 'Closet organizado', status: 'pending' },
    ],
    'sala': [
      { id: '6', name: 'Sofás limpios', status: 'pending' },
      { id: '7', name: 'Mesas sin polvo', status: 'pending' },
      { id: '8', name: 'Decoración organizada', status: 'pending' },
    ],
  };

  const normalizedType = spaceType?.toLowerCase() || '';
  for (const [key, items] of Object.entries(spaceSpecific)) {
    if (normalizedType.includes(key)) {
      return [...baseItems, ...items];
    }
  }

  return baseItems;
};

export default function InspectionMode({ task, onClose, onComplete }: InspectionModeProps) {
  const [checklist, setChecklist] = useState<InspectionItem[]>(
    getDefaultChecklistForSpace(task.space?.space_type?.name)
  );
  const [generalNotes, setGeneralNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [currentItemForPhoto, setCurrentItemForPhoto] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleItemStatus = (itemId: string) => {
    setChecklist(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const nextStatus = item.status === 'pending' ? 'good' :
                            item.status === 'good' ? 'issue' : 'pending';
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  const updateItemNote = (itemId: string, note: string) => {
    setChecklist(prev =>
      prev.map(item => item.id === itemId ? { ...item, note } : item)
    );
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCurrentItemForPhoto(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.7);

    if (currentItemForPhoto) {
      setChecklist(prev =>
        prev.map(item => item.id === currentItemForPhoto ? { ...item, photo: imageData } : item)
      );
    } else {
      setPhotos(prev => [...prev, imageData]);
    }

    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setPhotos(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const saveInspection = async () => {
    setSaving(true);

    try {
      const issues = checklist.filter(item => item.status === 'issue');
      const passed = issues.length === 0;

      await supabase.from('inspection_reports').insert({
        household_id: task.household_id,
        task_id: task.id,
        space_id: task.space_id,
        employee_id: task.employee_id,
        checklist: checklist,
        general_notes: generalNotes.trim() || null,
        photos: photos.length > 0 ? photos : null,
        issues_found: issues.length,
        passed,
        inspected_at: new Date().toISOString()
      });

      onComplete();
      onClose();
    } catch (error) {
      console.error('Error saving inspection:', error);
    } finally {
      setSaving(false);
    }
  };

  const goodCount = checklist.filter(i => i.status === 'good').length;
  const issueCount = checklist.filter(i => i.status === 'issue').length;
  const pendingCount = checklist.filter(i => i.status === 'pending').length;
  const progressPercent = ((goodCount + issueCount) / checklist.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Eye size={20} />
            <span className="font-semibold">Inspección</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Task Info */}
        <div className="p-4 bg-purple-50 border-b">
          <h3 className="font-semibold">{task.task_template?.name}</h3>
          <p className="text-sm text-purple-700">
            {task.space?.space_type?.icon} {task.space?.custom_name || task.space?.space_type?.name}
          </p>
        </div>

        {/* Progress */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Progreso de inspección</span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-green-600">✓ {goodCount} bien</span>
            <span className="text-red-600">⚠ {issueCount} problemas</span>
            <span className="text-gray-400">○ {pendingCount} pendientes</span>
          </div>
        </div>

        {/* Camera View */}
        {cameraActive && (
          <div className="relative bg-black aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <button
                onClick={stopCamera}
                className="px-4 py-2 bg-white/20 text-white rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={capturePhoto}
                className="px-6 py-2 bg-white text-purple-600 rounded-lg font-semibold"
              >
                Capturar
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Checklist */}
          <div className="space-y-2">
            {checklist.map(item => (
              <div
                key={item.id}
                className={`rounded-xl p-3 border-2 ${
                  item.status === 'good' ? 'border-green-300 bg-green-50' :
                  item.status === 'issue' ? 'border-red-300 bg-red-50' :
                  'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleItemStatus(item.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.status === 'good' ? 'bg-green-500 text-white' :
                      item.status === 'issue' ? 'bg-red-500 text-white' :
                      'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {item.status === 'good' && <CheckCircle2 size={18} />}
                    {item.status === 'issue' && <AlertTriangle size={18} />}
                    {item.status === 'pending' && <span className="text-sm">?</span>}
                  </button>
                  <span className={`flex-1 ${
                    item.status === 'issue' ? 'text-red-800' :
                    item.status === 'good' ? 'text-green-800' : ''
                  }`}>
                    {item.name}
                  </span>
                  <button
                    onClick={() => {
                      setCurrentItemForPhoto(item.id);
                      startCamera();
                    }}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                  >
                    <Camera size={18} />
                  </button>
                </div>

                {/* Issue note */}
                {item.status === 'issue' && (
                  <input
                    type="text"
                    value={item.note || ''}
                    onChange={(e) => updateItemNote(item.id, e.target.value)}
                    placeholder="Describe el problema..."
                    className="mt-2 w-full p-2 border rounded-lg text-sm"
                  />
                )}

                {/* Item photo */}
                {item.photo && (
                  <div className="mt-2 relative">
                    <img
                      src={item.photo}
                      alt="Foto del problema"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setChecklist(prev =>
                        prev.map(i => i.id === item.id ? { ...i, photo: undefined } : i)
                      )}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* General Photos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Fotos generales</label>
              <div className="flex gap-2">
                <button
                  onClick={() => startCamera()}
                  className="text-sm text-purple-600 flex items-center gap-1"
                >
                  <Camera size={14} />
                  Cámara
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-purple-600 flex items-center gap-1"
                >
                  <ImageIcon size={14} />
                  Subir
                </button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            {photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {photos.map((photo, i) => (
                  <div key={i} className="relative flex-shrink-0">
                    <img
                      src={photo}
                      alt={`Foto ${i + 1}`}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* General Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Notas generales
            </label>
            <textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Observaciones adicionales..."
              className="w-full p-3 border rounded-xl resize-none h-20"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={saveInspection}
            disabled={saving || pendingCount === checklist.length}
            className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${
              pendingCount < checklist.length
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <Send size={18} />
                Guardar Inspección
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

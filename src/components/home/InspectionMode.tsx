"use client";

import { useState, useRef } from "react";
import {
  X,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Plus,
  Trash2,
  Send,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { ScheduledTask } from "@/types";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import Spinner from "@/components/ui/Spinner";

interface InspectionModeProps {
  task: ScheduledTask;
  onClose: () => void;
  onComplete: () => void;
}

interface InspectionItem {
  id: string;
  name: string;
  status: "good" | "issue" | "pending";
  note?: string;
  photo?: string;
}

const getDefaultChecklistForSpace = (spaceType?: string): InspectionItem[] => {
  const baseItems: InspectionItem[] = [
    { id: "1", name: "Piso limpio y sin manchas", status: "pending" },
    { id: "2", name: "Superficies sin polvo", status: "pending" },
    { id: "3", name: "Esquinas limpias", status: "pending" },
    { id: "4", name: "Sin mal olor", status: "pending" },
    { id: "5", name: "Objetos organizados", status: "pending" },
  ];

  const spaceSpecific: Record<string, InspectionItem[]> = {
    baño: [
      { id: "6", name: "Sanitario limpio", status: "pending" },
      { id: "7", name: "Espejo sin manchas", status: "pending" },
      { id: "8", name: "Ducha/bañera limpia", status: "pending" },
      { id: "9", name: "Lavamanos limpio", status: "pending" },
    ],
    cocina: [
      { id: "6", name: "Mesones limpios", status: "pending" },
      { id: "7", name: "Estufa limpia", status: "pending" },
      { id: "8", name: "Fregadero limpio", status: "pending" },
      { id: "9", name: "Electrodomésticos limpios", status: "pending" },
    ],
    habitacion: [
      { id: "6", name: "Cama tendida", status: "pending" },
      { id: "7", name: "Muebles sacudidos", status: "pending" },
      { id: "8", name: "Closet organizado", status: "pending" },
    ],
    sala: [
      { id: "6", name: "Sofás limpios", status: "pending" },
      { id: "7", name: "Mesas sin polvo", status: "pending" },
      { id: "8", name: "Decoración organizada", status: "pending" },
    ],
  };

  const normalizedType = spaceType?.toLowerCase() || "";
  for (const [key, items] of Object.entries(spaceSpecific)) {
    if (normalizedType.includes(key)) {
      return [...baseItems, ...items];
    }
  }

  return baseItems;
};

// Estilos por estado (mapea al sistema de severidad del diseño)
const statusDot: Record<InspectionItem["status"], string> = {
  good: "bg-[var(--accent)]",
  issue: "bg-red-500",
  pending: "bg-stone-300",
};
const statusBadge: Record<InspectionItem["status"], string> = {
  good: "bg-[var(--accent-soft)] text-[var(--accent)]",
  issue: "bg-red-100 text-red-700",
  pending: "bg-stone-100 text-stone-500",
};
const statusLabel: Record<InspectionItem["status"], string> = {
  good: "Bien",
  issue: "Revisar",
  pending: "Pendiente",
};

export default function InspectionMode({
  task,
  onClose,
  onComplete,
}: InspectionModeProps) {
  const [checklist, setChecklist] = useState<InspectionItem[]>(
    getDefaultChecklistForSpace(task.space?.space_type?.name),
  );
  const [generalNotes, setGeneralNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [currentItemForPhoto, setCurrentItemForPhoto] = useState<string | null>(
    null,
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEscapeKey(onClose);

  const toggleItemStatus = (itemId: string) => {
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const nextStatus =
            item.status === "pending"
              ? "good"
              : item.status === "good"
                ? "issue"
                : "pending";
          return { ...item, status: nextStatus };
        }
        return item;
      }),
    );
  };

  const updateItemNote = (itemId: string, note: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, note } : item)),
    );
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCurrentItemForPhoto(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg", 0.7);

    if (currentItemForPhoto) {
      setChecklist((prev) =>
        prev.map((item) =>
          item.id === currentItemForPhoto
            ? { ...item, photo: imageData }
            : item,
        ),
      );
    } else {
      setPhotos((prev) => [...prev, imageData]);
    }

    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setPhotos((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const saveInspection = async () => {
    setSaving(true);

    try {
      const issues = checklist.filter((item) => item.status === "issue");
      const passed = issues.length === 0;

      await supabase.from("inspection_reports").insert({
        household_id: task.household_id,
        task_id: task.id,
        space_id: task.space_id,
        employee_id: task.employee_id,
        checklist: checklist,
        general_notes: generalNotes.trim() || null,
        photos: photos.length > 0 ? photos : null,
        issues_found: issues.length,
        passed,
        inspected_at: new Date().toISOString(),
      });

      onComplete();
      onClose();
    } catch (error) {
      console.error("Error saving inspection:", error);
    } finally {
      setSaving(false);
    }
  };

  const goodCount = checklist.filter((i) => i.status === "good").length;
  const issueCount = checklist.filter((i) => i.status === "issue").length;
  const pendingCount = checklist.filter((i) => i.status === "pending").length;
  const progressPercent = ((goodCount + issueCount) / checklist.length) * 100;
  const spaceLabel =
    task.space?.custom_name || task.space?.space_type?.name || "Espacio";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[400] bg-black flex flex-col"
    >
      {/* ── Viewfinder ─────────────────────────────────────────── */}
      <div
        className="relative shrink-0 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #57534e, #292524)",
          height: cameraActive ? "auto" : "36vh",
        }}
      >
        {/* Textura diagonal sutil */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 12px)",
          }}
        />

        {/* Cámara en vivo */}
        {cameraActive ? (
          <div className="relative bg-black aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            {/* Marco viewfinder */}
            <div className="pointer-events-none absolute inset-8 border-2 border-white/40 rounded-2xl" />
            {/* Etiqueta de captura activa */}
            <div className="absolute top-5 inset-x-0 text-center z-20">
              <div className="inline-flex items-center gap-2 bg-black/50 backdrop-blur rounded-full px-3.5 py-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white text-[11px] font-semibold uppercase tracking-wider">
                  {currentItemForPhoto
                    ? "Foto del hallazgo"
                    : "Foto del espacio"}
                </span>
              </div>
            </div>
            {/* Controles de captura */}
            <div className="absolute bottom-5 left-0 right-0 flex justify-center items-center gap-5 z-20">
              <button
                onClick={stopCamera}
                className="px-4 py-2 rounded-full bg-black/40 backdrop-blur text-white text-[13px] font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={capturePhoto}
                aria-label="Capturar"
                className="w-16 h-16 rounded-full bg-white ring-4 ring-white/40 flex items-center justify-center active:scale-95 transition-transform"
              >
                <span className="w-12 h-12 rounded-full bg-white border-2 border-stone-300" />
              </button>
              <span className="w-[72px]" />
            </div>
          </div>
        ) : (
          <>
            {/* Canvas oculto disponible aun sin cámara activa */}
            <canvas ref={canvasRef} className="hidden" />
            {/* Chrome superior */}
            <div className="absolute top-0 inset-x-0 pt-6 px-5 flex items-center justify-between z-20">
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="w-9 h-9 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center"
              >
                <X size={16} />
              </button>
              <div className="bg-black/40 backdrop-blur rounded-full px-3 py-1.5 text-white text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} /> Inspección
              </div>
              <button
                onClick={() => startCamera()}
                aria-label="Tomar foto del espacio"
                className="w-9 h-9 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center"
              >
                <Camera size={15} />
              </button>
            </div>

            {/* Marco viewfinder vacío */}
            <div className="absolute inset-10 top-16 border-2 border-white/25 rounded-2xl flex items-center justify-center">
              <div className="text-center px-6">
                <p className="text-white/90 text-[15px] font-semibold tracking-tight">
                  {task.task_template?.name}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur rounded-full px-3 py-1">
                  <span className="text-[12px]">
                    {task.space?.space_type?.icon}
                  </span>
                  <span className="text-[12px] font-semibold text-[var(--ink)]">
                    {spaceLabel}
                  </span>
                </div>
                <button
                  onClick={() => startCamera()}
                  className="mt-4 inline-flex items-center gap-2 bg-white text-[var(--ink)] px-4 py-2 rounded-full text-[12.5px] font-semibold active:scale-95 transition-transform"
                >
                  <Camera size={14} /> Capturar espacio
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Panel de resultados ────────────────────────────────── */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-4 relative z-10 flex flex-col overflow-hidden">
        {/* Encabezado / progreso */}
        <div className="px-5 pt-5 pb-3 border-b border-stone-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                Lista de inspección
              </p>
              <p className="text-[16px] font-semibold text-[var(--ink)] tracking-tight">
                {issueCount > 0
                  ? `${issueCount} ${issueCount === 1 ? "punto a corregir" : "puntos a corregir"}`
                  : pendingCount === checklist.length
                    ? "Revisa cada punto"
                    : "Sin problemas detectados"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                Progreso
              </p>
              <p className="text-[16px] font-bold text-[var(--accent)]">
                {Math.round(progressPercent)}
                <span className="text-stone-400 text-[12px]">%</span>
              </p>
            </div>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[11px] font-medium">
            <span className="text-[var(--accent)]">✓ {goodCount} bien</span>
            <span className="text-red-600">⚠ {issueCount} problemas</span>
            <span className="text-stone-400">○ {pendingCount} pendientes</span>
          </div>
        </div>

        {/* Lista scrolleable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Checklist como hallazgos */}
          <div className="space-y-1.5">
            {checklist.map((item, idx) => (
              <div
                key={item.id}
                className={`rounded-xl border transition-colors ${
                  item.status === "good"
                    ? "border-[var(--accent)]/30 bg-[var(--accent-soft)]"
                    : item.status === "issue"
                      ? "border-red-200 bg-red-50"
                      : "border-stone-100 bg-stone-50"
                }`}
              >
                <div className="flex items-center gap-2.5 p-2.5">
                  {/* Pin numerado con estado */}
                  <button
                    onClick={() => toggleItemStatus(item.id)}
                    aria-label={`Estado: ${statusLabel[item.status]}`}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 border-2 border-white shadow-sm ${statusDot[item.status]}`}
                  >
                    {item.status === "good" ? (
                      <CheckCircle2 size={15} />
                    ) : item.status === "issue" ? (
                      <AlertTriangle size={15} />
                    ) : (
                      idx + 1
                    )}
                  </button>
                  <span className="flex-1 text-[12.5px] text-[var(--ink)] leading-tight">
                    {item.name}
                  </span>
                  <span
                    className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${statusBadge[item.status]}`}
                  >
                    {statusLabel[item.status]}
                  </span>
                  <button
                    onClick={() => {
                      setCurrentItemForPhoto(item.id);
                      startCamera();
                    }}
                    aria-label="Tomar foto del hallazgo"
                    className="p-1.5 text-stone-400 hover:text-[var(--accent)] hover:bg-white rounded-lg flex-shrink-0"
                  >
                    <Camera size={16} />
                  </button>
                </div>

                {/* Nota de problema */}
                {item.status === "issue" && (
                  <div className="px-2.5 pb-2.5">
                    <input
                      type="text"
                      value={item.note || ""}
                      onChange={(e) => updateItemNote(item.id, e.target.value)}
                      placeholder="Describe el problema..."
                      className="w-full px-3 py-2 bg-white border border-red-200 rounded-lg text-[12.5px] text-[var(--ink)] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-red-200"
                    />
                  </div>
                )}

                {/* Foto del hallazgo */}
                {item.photo && (
                  <div className="px-2.5 pb-2.5">
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.photo}
                        alt="Foto del problema"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        onClick={() =>
                          setChecklist((prev) =>
                            prev.map((i) =>
                              i.id === item.id ? { ...i, photo: undefined } : i,
                            ),
                          )
                        }
                        aria-label="Eliminar foto"
                        className="absolute top-2 right-2 p-1 bg-black/60 backdrop-blur text-white rounded-full"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Fotos generales */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                Fotos del espacio
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => startCamera()}
                  className="text-[12px] text-[var(--accent)] font-semibold flex items-center gap-1"
                >
                  <Camera size={14} />
                  Cámara
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[12px] text-[var(--accent)] font-semibold flex items-center gap-1"
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
            {photos.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {photos.map((photo, i) => (
                  <div key={i} className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo}
                      alt={`Foto ${i + 1}`}
                      className="w-20 h-20 object-cover rounded-xl"
                    />
                    <button
                      onClick={() => removePhoto(i)}
                      aria-label="Eliminar foto"
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-stone-200 rounded-xl py-4 flex flex-col items-center gap-1 text-stone-400 hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-colors"
              >
                <Plus size={18} />
                <span className="text-[12px] font-medium">
                  Agregar fotos del espacio
                </span>
              </button>
            )}
          </div>

          {/* Notas generales */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold block mb-2">
              Notas generales
            </label>
            <textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Observaciones adicionales..."
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl resize-none h-20 text-[13px] text-[var(--ink)] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-stone-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Cancelar
          </button>
          <button
            onClick={saveInspection}
            disabled={saving || pendingCount === checklist.length}
            className={`flex-1 py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.98] ${
              pendingCount < checklist.length && !saving
                ? "bg-[var(--accent)] text-white"
                : "bg-stone-200 text-stone-400"
            }`}
          >
            {saving ? (
              <Spinner size="md" color="white" />
            ) : (
              <>
                <Send size={16} />
                Guardar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

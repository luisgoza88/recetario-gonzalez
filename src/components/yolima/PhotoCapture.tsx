"use client";

import { useState, useRef } from "react";
import { Camera, X } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { supabase } from "@/lib/supabase/client";

interface PhotoCaptureProps {
  date: string;
  householdId: string | null;
  existingPhotos: string[];
  onPhotoAdded: (url: string) => void;
}

export default function PhotoCapture({
  date,
  householdId,
  existingPhotos,
  onPhotoAdded,
}: PhotoCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      // Generate unique filename
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `yolima/${date}/${Date.now()}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("meal-photos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        // If bucket doesn't exist, store locally
        console.error("Upload error:", uploadError);
        // Create a local URL instead
        const localUrl = URL.createObjectURL(file);
        onPhotoAdded(localUrl);
        setUploading(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("meal-photos")
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        onPhotoAdded(urlData.publicUrl);
      }
    } catch (err) {
      console.error("Photo capture error:", err);
      setError("No se pudo subir la foto. Intenta de nuevo.");
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-[var(--border)] shadow-sm">
      {/* Existing photos */}
      {existingPhotos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {existingPhotos.map((url, i) => (
            <button
              key={i}
              onClick={() => setPreviewPhoto(url)}
              className="w-16 h-16 rounded-xl overflow-hidden border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Foto ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Capture button */}
      <button
        onClick={handleCapture}
        disabled={uploading}
        className={`w-full rounded-xl py-3 text-[13px] font-medium transition-colors
                    flex items-center justify-center gap-2 ${
                      uploading
                        ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                        : "bg-white border border-[var(--border)] text-[var(--ink)] active:bg-stone-50"
                    }`}
      >
        {uploading ? (
          <>
            <Spinner size="sm" />
            Subiendo foto...
          </>
        ) : (
          <>
            <Camera size={15} />
            {existingPhotos.length > 0
              ? "Agregar otra foto"
              : "Tomar foto del plato"}
          </>
        )}
      </button>

      {/* Hidden file input for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error message */}
      {error && <p className="text-red-500 text-center mt-3">{error}</p>}

      {/* Photo preview overlay */}
      {previewPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <button
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-4 right-4 bg-white/20 rounded-full p-2"
          >
            <X size={28} className="text-white" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewPhoto}
            alt="Vista previa"
            className="max-w-full max-h-[80vh] rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
}

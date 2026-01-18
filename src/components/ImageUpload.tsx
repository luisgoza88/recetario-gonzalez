'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface ImageUploadProps {
  currentImageUrl?: string | null
  onImageUploaded: (url: string | null) => void
  bucket?: string
  folder?: string
}

// Comprimir imagen antes de subir
async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img

      // Redimensionar si es necesario
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('No blob created'))
          }
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export default function ImageUpload({
  currentImageUrl,
  onImageUploaded,
  bucket = 'recipe-images',
  folder = 'recipes'
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen')
      return
    }

    // Validar tamaño (max 10MB antes de compresión)
    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen es muy grande (máximo 10MB)')
      return
    }

    setError(null)
    setIsUploading(true)

    try {
      // Mostrar preview inmediato
      const previewUrl = URL.createObjectURL(file)
      setPreview(previewUrl)

      // Comprimir imagen
      const compressedBlob = await compressImage(file)

      // Generar nombre único
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 8)
      const fileName = `${folder}/${timestamp}-${randomId}.jpg`

      // Subir a Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, compressedBlob, {
          contentType: 'image/jpeg',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        // Si el bucket no existe, mostrar mensaje amigable
        if (uploadError.message.includes('not found') || uploadError.message.includes('Bucket')) {
          setError('El storage no está configurado. Contacta al administrador.')
        } else {
          setError('Error al subir la imagen')
        }
        setPreview(currentImageUrl || null)
        return
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      onImageUploaded(urlData.publicUrl)
      setPreview(urlData.publicUrl)
    } catch (err) {
      console.error('Upload error:', err)
      setError('Error al procesar la imagen')
      setPreview(currentImageUrl || null)
    } finally {
      setIsUploading(false)
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = () => {
    setPreview(null)
    onImageUploaded(null)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            disabled={isUploading}
          >
            <X className="w-4 h-4" />
          </button>
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={isUploading}
          className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-orange-400 hover:bg-orange-50 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              <span className="text-sm text-gray-500">Subiendo...</span>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-gray-400" />
              </div>
              <div className="text-center">
                <span className="text-sm text-gray-600">Agregar foto</span>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG (máx. 10MB)</p>
              </div>
              <Upload className="w-4 h-4 text-gray-400" />
            </>
          )}
        </button>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}

'use client';

import { useState, useRef, useCallback } from 'react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function useImageInput() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageOptions, setShowImageOptions] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        alert('La imagen es muy grande. Máximo 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setShowImageOptions(false);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }, []);

  const removeSelectedImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const openCamera = useCallback(() => {
    cameraInputRef.current?.click();
    setShowImageOptions(false);
  }, []);

  const openGallery = useCallback(() => {
    imageInputRef.current?.click();
    setShowImageOptions(false);
  }, []);

  const toggleImageOptions = useCallback(() => {
    setShowImageOptions(prev => !prev);
  }, []);

  const clearImage = useCallback(() => {
    setSelectedImage(null);
    setShowImageOptions(false);
  }, []);

  return {
    selectedImage,
    showImageOptions,
    imageInputRef,
    cameraInputRef,
    handleImageSelect,
    removeSelectedImage,
    openCamera,
    openGallery,
    toggleImageOptions,
    clearImage,
  };
}

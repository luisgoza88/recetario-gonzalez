import { useEffect } from 'react';

/**
 * Hook reutilizable para cerrar modales/overlays con Escape.
 * @param onEscape Callback cuando se presiona Escape
 * @param enabled Si está activo (default: true)
 */
export function useEscapeKey(onEscape: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, enabled]);
}

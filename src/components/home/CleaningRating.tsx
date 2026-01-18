'use client';

import { useState } from 'react';
import { X, Star, Camera, MessageSquare, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { ScheduledTask } from '@/types';

interface CleaningRatingProps {
  task: ScheduledTask;
  onClose: () => void;
  onSave: () => void;
}

export default function CleaningRating({ task, onClose, onSave }: CleaningRatingProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [issues, setIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const commonIssues = [
    'Faltó sacudir',
    'Esquinas sucias',
    'Mal olor',
    'Manchas visibles',
    'Desorganizado',
    'Ventanas sucias',
    'Piso pegajoso',
    'Polvo visible'
  ];

  const toggleIssue = (issue: string) => {
    setIssues(prev =>
      prev.includes(issue)
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    );
  };

  const handleSave = async () => {
    if (rating === 0) return;

    setSaving(true);

    try {
      // Guardar calificación
      await supabase.from('cleaning_ratings').insert({
        household_id: task.household_id,
        task_id: task.id,
        space_id: task.space_id,
        employee_id: task.employee_id,
        rating,
        issues: issues.length > 0 ? issues : null,
        notes: notes.trim() || null,
        rated_at: new Date().toISOString()
      });

      // Actualizar historial si existe
      await supabase
        .from('cleaning_history')
        .update({ rating })
        .eq('task_id', task.id);

      setSaved(true);
      setTimeout(() => {
        onSave();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error saving rating:', error);
    } finally {
      setSaving(false);
    }
  };

  const getRatingLabel = (r: number) => {
    switch (r) {
      case 1: return 'Muy mal';
      case 2: return 'Mal';
      case 3: return 'Regular';
      case 4: return 'Bien';
      case 5: return 'Excelente';
      default: return 'Selecciona';
    }
  };

  const getRatingColor = (r: number) => {
    switch (r) {
      case 1: return 'text-red-500';
      case 2: return 'text-orange-500';
      case 3: return 'text-yellow-500';
      case 4: return 'text-lime-500';
      case 5: return 'text-green-500';
      default: return 'text-gray-400';
    }
  };

  if (saved) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">¡Calificación Guardada!</h3>
          <p className="text-gray-600">Gracias por tu feedback</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Star size={20} />
            <span className="font-semibold">Calificar Limpieza</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Task Info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-lg">{task.task_template?.name}</h3>
            <p className="text-gray-600 text-sm">
              {task.space?.space_type?.icon} {task.space?.custom_name || task.space?.space_type?.name}
            </p>
            {task.employee && (
              <p className="text-gray-500 text-sm mt-1">
                Realizado por: {task.employee.name}
              </p>
            )}
          </div>

          {/* Star Rating */}
          <div className="text-center">
            <p className="text-gray-600 mb-3">¿Cómo quedó la limpieza?</p>
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    size={36}
                    className={`transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className={`font-medium ${getRatingColor(hoveredRating || rating)}`}>
              {getRatingLabel(hoveredRating || rating)}
            </p>
          </div>

          {/* Quick Issues */}
          {rating > 0 && rating < 5 && (
            <div>
              <p className="text-gray-600 mb-2 text-sm">¿Qué problemas encontraste?</p>
              <div className="flex flex-wrap gap-2">
                {commonIssues.map(issue => (
                  <button
                    key={issue}
                    onClick={() => toggleIssue(issue)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      issues.includes(issue)
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {issue}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-gray-600 text-sm flex items-center gap-2 mb-2">
              <MessageSquare size={16} />
              Notas adicionales (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escribe cualquier comentario..."
              className="w-full p-3 border rounded-xl resize-none h-24 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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
            onClick={handleSave}
            disabled={rating === 0 || saving}
            className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${
              rating > 0
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <Star size={18} />
                Guardar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

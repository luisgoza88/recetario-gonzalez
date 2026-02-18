'use client';

import { useState } from 'react';
import { X, DollarSign, Store } from 'lucide-react';
import { STORE_OPTIONS } from '@/types';

interface PriceLogModalProps {
  itemName: string;
  onSave: (price: number, store: string) => void;
  onSkip: () => void;
}

export default function PriceLogModal({ itemName, onSave, onSkip }: PriceLogModalProps) {
  const [price, setPrice] = useState('');
  const [store, setStore] = useState('');

  const handleSave = () => {
    const numPrice = parseFloat(price);
    if (!numPrice || numPrice <= 0 || !store) return;
    onSave(numPrice, store);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-5 animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">¿Cuánto costó?</h3>
          <button onClick={onSkip} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Registra el precio de <span className="font-semibold text-gray-700">{itemName}</span>
        </p>

        {/* Price input */}
        <div className="relative mb-4">
          <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="number"
            inputMode="numeric"
            placeholder="Precio (ej: 5500)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
            autoFocus
          />
        </div>

        {/* Store selection */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
            <Store size={14} />
            <span>¿Dónde compraste?</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {STORE_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStore(s)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  store === s
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-3 rounded-xl text-gray-500 font-medium hover:bg-gray-50"
          >
            Omitir
          </button>
          <button
            onClick={handleSave}
            disabled={!price || !store || parseFloat(price) <= 0}
            className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

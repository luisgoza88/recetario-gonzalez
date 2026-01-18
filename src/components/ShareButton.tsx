'use client';

import { useState } from 'react';
import { Share2, MessageCircle, Copy, Check, X } from 'lucide-react';
import { openWhatsApp, copyToClipboard } from '@/lib/whatsapp-share';

interface ShareButtonProps {
  message: string;
  title?: string;
  phoneNumber?: string;
  variant?: 'icon' | 'button' | 'fab';
  className?: string;
}

export default function ShareButton({
  message,
  title = 'Compartir',
  phoneNumber,
  variant = 'button',
  className = ''
}: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleWhatsAppShare = () => {
    openWhatsApp(message, phoneNumber);
    setShowMenu(false);
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(message);
    if (success) {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 2000);
    }
  };

  const baseButtonStyles = {
    icon: 'p-2 rounded-full hover:bg-gray-100',
    button: 'flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600',
    fab: 'w-12 h-12 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 flex items-center justify-center'
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`${baseButtonStyles[variant]} ${className} transition-colors`}
        title={title}
      >
        <Share2 size={variant === 'icon' ? 20 : variant === 'fab' ? 24 : 18} />
        {variant === 'button' && <span>Compartir</span>}
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 bottom-full mb-2 bg-white rounded-xl shadow-lg border z-50 overflow-hidden min-w-[200px]">
            <div className="p-2 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{title}</span>
                <button
                  onClick={() => setShowMenu(false)}
                  className="p-1 rounded-full hover:bg-gray-200"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="py-1">
              {/* WhatsApp */}
              <button
                onClick={handleWhatsAppShare}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
              >
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <MessageCircle size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">WhatsApp</p>
                  <p className="text-xs text-gray-500">Enviar mensaje directo</p>
                </div>
              </button>

              {/* Copiar */}
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  copied ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {copied ? (
                    <Check size={18} className="text-green-600" />
                  ) : (
                    <Copy size={18} className="text-gray-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-800">
                    {copied ? 'Copiado!' : 'Copiar texto'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {copied ? 'Listo para pegar' : 'Para pegar en otra app'}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

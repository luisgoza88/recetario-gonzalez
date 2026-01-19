/**
 * Voice Commands System
 * Uses Web Speech API for voice input/output
 */

// ==========================================
// Types
// ==========================================

export interface VoiceState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
}

export interface VoiceCommand {
  pattern: RegExp;
  action: string;
  description: string;
}

// Use 'any' to avoid conflicts with DOM's SpeechRecognition types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

// Common voice commands that map to quick actions
export const VOICE_COMMANDS: VoiceCommand[] = [
  {
    pattern: /^(qué|cual|cuál).*(menú|menu|comida|almuerzo|cena|desayuno).*(hoy|mañana|semana)?$/i,
    action: 'get_menu',
    description: 'Consultar menú'
  },
  {
    pattern: /^(qué|que|cuáles|cuales).*(tarea|pendiente|trabajo).*$/i,
    action: 'get_tasks',
    description: 'Ver tareas'
  },
  {
    pattern: /^(agregar?|añadir?|poner?)\s+(.+)\s+(a la lista|lista de compras|al mercado)$/i,
    action: 'add_to_shopping',
    description: 'Agregar a lista de compras'
  },
  {
    pattern: /^(qué|que).*(falta|necesito|comprar).*$/i,
    action: 'get_shopping_list',
    description: 'Ver lista de compras'
  },
  {
    pattern: /^(sugerir|recomienda|sugiere).*(receta|plato|comida).*$/i,
    action: 'suggest_recipe',
    description: 'Sugerir receta'
  },
  {
    pattern: /^(cómo|como).*(va|están|estan).*(tarea|progreso|avance).*$/i,
    action: 'get_task_progress',
    description: 'Progreso de tareas'
  },
  {
    pattern: /^(mostrar|ver|dame).*(inventario|despensa|stock).*$/i,
    action: 'get_inventory',
    description: 'Ver inventario'
  },
];

// Check if speech recognition is supported
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

// Check if speech synthesis is supported
export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
}

// Create speech recognition instance
export function createSpeechRecognition(): SpeechRecognitionInstance | null {
  if (typeof window === 'undefined') return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
  if (!SpeechRecognitionClass) return null;

  const recognition = new SpeechRecognitionClass();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'es-ES';
  recognition.maxAlternatives = 1;

  return recognition;
}

// Match transcript to voice command
export function matchVoiceCommand(transcript: string): VoiceCommand | null {
  const normalized = transcript.toLowerCase().trim();

  for (const command of VOICE_COMMANDS) {
    if (command.pattern.test(normalized)) {
      return command;
    }
  }

  return null;
}

// Speak text using speech synthesis
export function speak(text: string, options?: {
  rate?: number;
  pitch?: number;
  volume?: number;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isSpeechSynthesisSupported()) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = options?.rate ?? 1;
    utterance.pitch = options?.pitch ?? 1;
    utterance.volume = options?.volume ?? 1;

    // Try to use a Spanish voice
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith('es'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);

    window.speechSynthesis.speak(utterance);
  });
}

// Stop speaking
export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

// Clean transcript for display
export function cleanTranscript(transcript: string): string {
  return transcript
    .trim()
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s+/g, ' ');
}

// Format AI response for speech (remove emojis, special chars)
export function formatForSpeech(text: string): string {
  return text
    // Remove emojis
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    // Remove markdown bold
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove bullet points
    .replace(/^[•\-]\s*/gm, '')
    // Remove special symbols
    .replace(/[✅❌⚠️📝💡🍽️⏱️🧊📊]/g, '')
    // Clean up extra spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// Voice Hook State Manager
export class VoiceManager {
  private recognition: SpeechRecognitionInstance | null = null;
  private onResultCallback: ((transcript: string, isFinal: boolean) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private isActive = false;

  constructor() {
    this.recognition = createSpeechRecognition();
    this.setupListeners();
  }

  private setupListeners(): void {
    if (!this.recognition) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const result = event.results[last];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;

      if (this.onResultCallback) {
        this.onResultCallback(cleanTranscript(transcript), isFinal);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.recognition.onerror = (event: any) => {
      let errorMessage = 'Error de reconocimiento de voz';

      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No se detectó voz';
          break;
        case 'audio-capture':
          errorMessage = 'No se encontró micrófono';
          break;
        case 'not-allowed':
          errorMessage = 'Permiso de micrófono denegado';
          break;
        case 'network':
          errorMessage = 'Error de conexión';
          break;
      }

      if (this.onErrorCallback) {
        this.onErrorCallback(errorMessage);
      }

      this.isActive = false;
    };

    this.recognition.onend = () => {
      this.isActive = false;
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    };
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  isListening(): boolean {
    return this.isActive;
  }

  start(callbacks: {
    onResult: (transcript: string, isFinal: boolean) => void;
    onError: (error: string) => void;
    onEnd: () => void;
  }): boolean {
    if (!this.recognition) return false;

    this.onResultCallback = callbacks.onResult;
    this.onErrorCallback = callbacks.onError;
    this.onEndCallback = callbacks.onEnd;

    try {
      this.recognition.start();
      this.isActive = true;
      return true;
    } catch {
      return false;
    }
  }

  stop(): void {
    if (this.recognition && this.isActive) {
      this.recognition.stop();
      this.isActive = false;
    }
  }

  abort(): void {
    if (this.recognition) {
      this.recognition.abort();
      this.isActive = false;
    }
  }
}

// Singleton instance
let voiceManagerInstance: VoiceManager | null = null;

export function getVoiceManager(): VoiceManager {
  if (!voiceManagerInstance) {
    voiceManagerInstance = new VoiceManager();
  }
  return voiceManagerInstance;
}

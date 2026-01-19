'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  getVoiceManager,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  speak,
  stopSpeaking,
  formatForSpeech,
  type VoiceManager
} from '@/lib/voice-commands';

interface UseVoiceInputOptions {
  onFinalTranscript?: (transcript: string) => void;
  autoSendDelay?: number;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const { onFinalTranscript, autoSendDelay = 500 } = options;

  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  const voiceManagerRef = useRef<VoiceManager | null>(null);

  // Initialize voice recognition
  useEffect(() => {
    const supported = isSpeechRecognitionSupported();
    setVoiceSupported(supported);

    if (supported) {
      voiceManagerRef.current = getVoiceManager();
    }

    // Check TTS support
    if (isSpeechSynthesisSupported()) {
      setTimeout(() => {
        window.speechSynthesis.getVoices();
      }, 100);
    }
  }, []);

  const startListening = useCallback(() => {
    if (!voiceManagerRef.current) return;

    const started = voiceManagerRef.current.start({
      onResult: (transcript, isFinal) => {
        if (isFinal) {
          setInterimTranscript('');
          setIsListening(false);
          if (autoSendDelay > 0) {
            setTimeout(() => {
              if (transcript.trim()) {
                onFinalTranscript?.(transcript);
              }
            }, autoSendDelay);
          } else {
            onFinalTranscript?.(transcript);
          }
        } else {
          setInterimTranscript(transcript);
        }
      },
      onError: (error) => {
        console.error('Voice error:', error);
        setIsListening(false);
        setInterimTranscript('');
      },
      onEnd: () => {
        setIsListening(false);
      }
    });

    if (started) {
      setIsListening(true);
      setInterimTranscript('');
    }
  }, [autoSendDelay, onFinalTranscript]);

  const stopListening = useCallback(() => {
    voiceManagerRef.current?.stop();
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const speakText = useCallback((text: string) => {
    if (!ttsEnabled) return;
    const cleanText = formatForSpeech(text);
    speak(cleanText).catch(console.error);
  }, [ttsEnabled]);

  const toggleTTS = useCallback(() => {
    if (ttsEnabled) {
      stopSpeaking();
    }
    setTtsEnabled(!ttsEnabled);
  }, [ttsEnabled]);

  return {
    isListening,
    voiceSupported,
    ttsEnabled,
    ttsSupported: isSpeechSynthesisSupported(),
    interimTranscript,
    startListening,
    stopListening,
    toggleListening,
    speakText,
    toggleTTS,
  };
}

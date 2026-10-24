"use client";
import {request} from "../../lib/api-client";
import { useEffect, useRef, useState } from "react";

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>; resultIndex: number }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

export function useSpeech(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const callback = useRef(onText);
  callback.current = onText;
  const stop = () => {
    const current = recognition.current;
    recognition.current = null;
    if (current) { current.onresult = null; current.onerror = null; current.onend = null; current.abort(); }
    setListening(false);
  };
  useEffect(() => {
    const browser = window as SpeechWindow;
    setSupported(!!(browser.SpeechRecognition || browser.webkitSpeechRecognition) && window.isSecureContext);
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hide);
    return () => { stop(); document.removeEventListener("visibilitychange", hide); };
  }, []);
  async function toggle() {
    if (recognition.current) { recognition.current.stop(); return; }
    try{const [preferences,access]=await Promise.all([request('preferences'),request('practice/access')]);if(!preferences?.voice||!access.allowed){setError('Sesli öğrenme kapalı. Ayarlar’dan tercihini değiştirebilir veya yazarak devam edebilirsin.');return}}catch{setError('Ses izni kontrol edilemedi. Yazarak devam edebilirsin.');return}
    const browser = window as SpeechWindow;
    const Constructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Constructor || !window.isSecureContext) { setError("Bu tarayıcıda sesli giriş kullanılamıyor. Cevabını yazabilirsin."); return; }
    setError("");
    try {
      const current = new Constructor();
      recognition.current = current;
      current.lang = "tr-TR";
      current.continuous = false;
      current.interimResults = false;
      current.onresult = event => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) callback.current(event.results[i][0].transcript);
        }
      };
      current.onerror = event => {
        const messages: Record<string, string> = {
          "not-allowed": "Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verebilir veya yazabilirsin.",
          "service-not-allowed": "Tarayıcı ses tanıma hizmetine izin vermiyor. Yazılı giriş kullanabilirsin.",
          "audio-capture": "Mikrofon bulunamadı veya başka bir uygulama tarafından kullanılıyor.",
          "no-speech": "Ses algılanmadı. Tekrar deneyebilir veya yazabilirsin.",
          "network": "Ses tanıma bağlantısı kurulamadı. Yazılı giriş kullanabilirsin.",
        };
        if (event.error !== "aborted") setError(messages[event.error] || "Ses tanıma tamamlanamadı. Tekrar deneyebilir veya yazabilirsin.");
        stop();
      };
      current.onend = () => { recognition.current = null; setListening(false); };
      current.start();
      setListening(true);
    } catch { stop(); setError("Mikrofon başlatılamadı. Yazılı giriş kullanabilirsin."); }
  }
  return { supported, listening, error, toggle, stop };
}

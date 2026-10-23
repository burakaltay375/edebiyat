"use client";
import { useEffect } from "react";
import { useSpeech } from "../features/practice/useSpeech";

export default function VoiceInput({ onText, disabled = false, onListening }: {
  onText: (text: string) => void; disabled?: boolean; onListening?: (listening: boolean) => void;
}) {
  const speech = useSpeech(onText);
  useEffect(() => { onListening?.(speech.listening); }, [speech.listening, onListening]);
  useEffect(() => { if (disabled) speech.stop(); }, [disabled]);
  return <div className="voice-tools">
    <button type="button" className="button secondary" disabled={disabled || !speech.supported} aria-pressed={speech.listening}
      onClick={() => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); speech.toggle(); }}>
      {speech.listening ? "Mikrofonu durdur" : "Mikrofonla anlat"}
    </button>
    <span role="status">{speech.listening ? "● Dinleniyor…" : speech.supported ? "Konuşman metne çevrilir; göndermeden önce düzenleyebilirsin." : "Sesli giriş desteklenmiyor. Metin yazarak devam edebilirsin."}</span>
    {speech.error && <p role="alert">{speech.error}</p>}
    <small>Ses kaydı saklanmaz. Tarayıcının ses tanıma hizmeti internet kullanabilir.</small>
  </div>;
}

"use client";
import { useEffect, useRef, useState } from "react";

export default function SpeakButton({ text, disabled = false }: { text: string; disabled?: boolean }) {
  const [supported, setSupported] = useState(false), [speaking, setSpeaking] = useState(false), [error, setError] = useState("");
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  function stop() {
    if (current.current) { current.current.onend = null; current.current.onerror = null; current.current = null; }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }
  useEffect(() => {
    setSupported("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    const hidden = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hidden);
    return () => { stop(); document.removeEventListener("visibilitychange", hidden); };
  }, []);
  useEffect(() => { stop(); }, [text, disabled]);
  function toggle() {
    if (speaking) { stop(); return; }
    setError("");
    try {
      const output = new SpeechSynthesisUtterance(text);
      output.lang = "tr-TR";
      output.voice = window.speechSynthesis.getVoices().find(voice => voice.lang.startsWith("tr")) || null;
      output.onend = () => { setSpeaking(false); current.current = null; };
      output.onerror = () => { setSpeaking(false); current.current = null; setError("Seslendirilemedi. Yanıtı okuyabilir veya yeniden deneyebilirsin."); };
      current.current = output; setSpeaking(true); window.speechSynthesis.speak(output);
    } catch { stop(); setError("Seslendirme başlatılamadı; metni okuyabilirsin."); }
  }
  return <div className="voice-tools"><button type="button" className="button secondary" onClick={toggle} disabled={!supported || disabled || !text} aria-pressed={speaking}>{speaking ? "Seslendirmeyi kapat" : "Yanıtı dinle"}</button>{!supported && <small>Bu tarayıcıda seslendirme yok; metin yanıtı kullanabilirsin.</small>}{error && <p role="alert">{error}</p>}</div>;
}

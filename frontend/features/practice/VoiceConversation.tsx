"use client";
import { useEffect, useRef, useState } from "react";
import { practiceService, type ChatMessage } from "./service";
import { useSpeech } from "./useSpeech";

export default function VoiceConversation() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const history = useRef<HTMLDivElement>(null);
  const speech = useSpeech(text => setDraft(value => (value + " " + text).trim().slice(0, 2000)));
  function silence() {
    if (utterance.current) { utterance.current.onend = null; utterance.current.onerror = null; utterance.current = null; }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }
  useEffect(() => {
    setCanSpeak("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    const hide = () => { if (document.hidden) silence(); };
    document.addEventListener("visibilitychange", hide);
    return () => { controller.current?.abort(); silence(); document.removeEventListener("visibilitychange", hide); };
  }, []);
  useEffect(() => { if (history.current) history.current.scrollTop = history.current.scrollHeight; }, [messages, busy]);
  function speak(text: string) {
    if (!canSpeak) return;
    speech.stop(); silence(); setError("");
    try {
      const output = new SpeechSynthesisUtterance(text);
      output.lang = "tr-TR";
      output.voice = window.speechSynthesis.getVoices().find(voice => voice.lang.startsWith("tr")) || null;
      output.onend = () => { utterance.current = null; setSpeaking(false); };
      output.onerror = () => { utterance.current = null; setSpeaking(false); setError("Yanıt seslendirilemedi. Metni okuyabilir veya ‘Dinle’ ile tekrar deneyebilirsin."); };
      utterance.current = output; setSpeaking(true); window.speechSynthesis.speak(output);
    } catch { silence(); setError("Seslendirme kullanılamıyor. Yanıtı ekrandan okuyabilirsin."); }
  }
  async function send() {
    if (!draft.trim() || controller.current || speech.listening) return;
    silence(); speech.stop(); setError("");
    const next: ChatMessage[] = [...messages, { role: "user", content: draft.trim() }];
    setMessages(next); setDraft(""); setBusy(true);
    const request = new AbortController(); controller.current = request;
    try {
      const reply = await practiceService.reply(next, request.signal);
      if (request.signal.aborted) return;
      if (!reply.trim()) throw new Error("Empty reply");
      setMessages([...next, { role: "assistant", content: reply }]);
      if (autoSpeak && !document.hidden) speak(reply);
    } catch { if (!request.signal.aborted) setError("Yanıt alınamadı. Mesajını yeniden yazarak deneyebilirsin."); }
    finally { if (!request.signal.aborted) { controller.current = null; setBusy(false); } }
  }
  return <section className="practice-area"><div className="page-heading"><div><div className="eyebrow">KONUŞARAK ÇALIŞ</div><h1>Sesli Konuşma</h1><p>Edebiyat hakkında konuş, yaz ve yanıtları dinle.</p></div></div>
    <div className="alert">Örnek yanıt modu: Henüz yapay zekâ bağlantısı yok. Konuşma geçmişi yalnızca bu ekran açıkken tutulur.</div>
    <div className="panel"><div className="practice-toolbar"><span className={`mic-status ${speech.listening ? "listening" : ""}`} role="status">● {speech.listening ? "Mikrofon açık · Dinleniyor" : speaking ? "Yanıt seslendiriliyor" : "Mikrofon kapalı"}</span><button className="text-button" disabled={busy || !messages.length} onClick={() => { silence(); speech.stop(); setMessages([]); setError(""); }}>Geçmişi temizle</button></div>
      <div className="conversation-history" ref={history} role="log" aria-label="Konuşma geçmişi" aria-live="polite" tabIndex={0}>{!messages.length && <div className="empty"><h2>Bir soruyla başla.</h2><p>Örneğin: “Kişileştirme nedir?”</p></div>}{messages.map((message, index) => <article className={`conversation-message ${message.role}`} key={index}><strong>{message.role === "user" ? "Sen" : "Çalışma arkadaşı · Örnek"}</strong><p>{message.content}</p>{message.role === "assistant" && canSpeak && <button className="text-button" disabled={speech.listening || busy} onClick={() => speak(message.content)}>Dinle</button>}</article>)}{busy && <p role="status">Yanıt hazırlanıyor…</p>}</div>
      <form onSubmit={event => { event.preventDefault(); void send(); }}><label htmlFor="voice-message">Mesajın</label><textarea id="voice-message" value={draft} maxLength={2000} disabled={busy} onChange={e => setDraft(e.target.value)} placeholder="Sorunu yaz veya mikrofonla söyle…"/><div className="practice-actions"><button type="button" className="button secondary" disabled={!speech.supported || busy} aria-pressed={speech.listening} onClick={() => { silence(); speech.toggle(); }}>{speech.listening ? "Mikrofonu kapat" : "Mikrofonu aç"}</button><button className="button primary" disabled={busy || speech.listening || !draft.trim()}>Gönder</button>{speaking && <button type="button" className="button secondary" onClick={silence}>Sesi durdur</button>}</div></form>
      <label className="checkbox"><input type="checkbox" checked={autoSpeak} disabled={!canSpeak} onChange={e => { setAutoSpeak(e.target.checked); if (!e.target.checked) silence(); }}/>Yanıtları sesli oku</label>
      {!speech.supported && <p className="practice-note">Bu tarayıcıda sesli giriş desteklenmiyor. Yazılı olarak devam edebilirsin.</p>}{!canSpeak && <p className="practice-note">Seslendirme desteklenmiyor; yanıtlar metin olarak gösterilir.</p>}
      <p className="practice-note">Konuşman metne çevrilir; göndermeden önce düzenleyebilirsin. Ses tanıma, tarayıcına bağlı olarak internet bağlantısı gerektirebilir ve tarayıcının hizmetini kullanabilir.</p>
      {(speech.error || error) && <div className="alert error" role="alert">{speech.error || error}</div>}
    </div></section>;
}

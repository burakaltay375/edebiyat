"use client";
import { useEffect, useState } from "react";
import { practiceService, type KnowledgeCard } from "./service";
import { recordAttempt, summarize, type Attempt } from "./session";
import { useSpeech } from "./useSpeech";

export default function KnowledgeCards() {
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [answer, setAnswer] = useState("");
  const [flipped, setFlipped] = useState(false);
  const [rating, setRating] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const speech = useSpeech(text => setAnswer(value => (value + " " + text).trim().slice(0, 2000)));
  useEffect(() => {
    let live = true;
    setLoading(true); setError("");
    practiceService.loadCards().then(items => {
      if (!live) return;
      if (!items.length || new Set(items.map(c => c.id)).size !== items.length || items.some(c => !c.id || !c.question?.trim() || !c.answer?.trim())) throw new Error("Kartlar hazırlanamadı.");
      setCards(items); setQueue(items.map(c => c.id));
    }).catch(() => { if (live) setError("Kartlar yüklenemedi. Lütfen yeniden dene."); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [version]);
  const card = cards.find(c => c.id === queue[0]);
  const stats = summarize(attempts);
  function reset() {
    speech.stop(); setAttempts([]); setAnswer(""); setFlipped(false); setRating(null); setFinished(false); setVersion(v => v + 1);
  }
  function rate(correct: boolean) {
    if (!card || rating !== null) return;
    setRating(correct); setAttempts(items => [...items, { id: card.id, correct }]);
  }
  function next() {
    if (rating === null) return;
    const remaining = recordAttempt(queue, rating);
    setQueue(remaining); setAnswer(""); setFlipped(false); setRating(null);
    if (!remaining.length) setFinished(true);
  }
  return <section className="practice-area">
    <div className="page-heading"><div><div className="eyebrow">HATIRLA · KONTROL ET · TEKRARLA</div><h1>Bilgi Kartları</h1><p>Önce cevabını ver, sonra kartı çevir ve kendini değerlendir.</p></div></div>
    <p className="practice-note">Örnek kartlar · Öz değerlendirme · Bu oturumdaki sonuçlar hesabına kaydedilmez.</p>
    {loading ? <p role="status">Kartlar hazırlanıyor…</p> : error ? <div role="alert" className="alert error">{error}<button className="button secondary" onClick={reset}>Yeniden dene</button></div> : finished ? <div className="panel result-card">
      <h2>Oturum sonucu</h2><p>İlk cevaplarına göre başarı durumun</p>
      <div className="result-stats"><div><b>{stats.correct}</b><span>Doğru</span></div><div><b>{stats.wrong}</b><span>Yanlış</span></div><div><b>%{stats.rate}</b><span>Başarı oranı</span></div></div>
      <p>{stats.correct + stats.wrong} / {cards.length} kart değerlendirildi. {stats.repeats} tekrar denemesi yapıldı. {queue.length ? `${queue.length} kartın çalışması tamamlanmadı.` : "Tüm kartlar tamamlandı."}</p>
      <button className="button primary" onClick={reset}>Yeni oturum başlat</button>
    </div> : card && <>
      <div className="practice-toolbar"><span>{queue.length} kart kaldı · {attempts.length} değerlendirme</span><button className="text-button" onClick={() => { speech.stop(); if (rating !== null) setQueue(recordAttempt(queue, rating)); setFinished(true); }}>Oturumu bitir</button></div>
      <div className={`knowledge-card ${flipped ? "is-flipped" : ""} ${rating === true ? "is-correct" : rating === false ? "is-wrong" : ""}`}>
        <div className="knowledge-card-inner">
          <article className="knowledge-face" aria-hidden={flipped}><span className="eyebrow">SORU</span><h2>{card.question}</h2><p>Cevabını aşağıya yazabilir veya sesli söyleyebilirsin.</p></article>
          <article className="knowledge-face knowledge-back" aria-hidden={!flipped}><span className="eyebrow">CEVAPLARI KARŞILAŞTIR</span><h2>{card.question}</h2><h3>Doğru cevap</h3><p>{flipped ? card.answer : ""}</p><h3>Senin cevabın</h3><p className="student-answer">{answer}</p></article>
        </div>
      </div>
      {!flipped ? <div className="panel practice-input"><label htmlFor="card-answer">Senin cevabın</label><textarea id="card-answer" value={answer} maxLength={2000} onChange={e => setAnswer(e.target.value)} placeholder="Hatırladıklarını yaz…"/>
        <div className="practice-actions"><button className="button secondary" disabled={!speech.supported} aria-pressed={speech.listening} onClick={speech.toggle}>{speech.listening ? "Mikrofonu kapat" : "Sesli cevap ver"}</button><button className="button primary" disabled={!answer.trim() || speech.listening} onClick={() => { speech.stop(); setFlipped(true); }}>Kartı çevir</button></div>
        <p role="status">{speech.listening ? "● Dinleniyor…" : !speech.supported ? "Sesli giriş desteklenmiyor. Cevabını yazabilirsin." : "Sesli girişten sonra metni düzeltebilirsin."}</p>{speech.error && <p role="alert">{speech.error}</p>}
      </div> : <div className="panel"><p role="status">{rating === true ? "✓ Bildim — kart yeşil oldu." : rating === false ? "✕ Bilemedim — kart kırmızı oldu, tekrar sorulacak." : "Cevabını karşılaştırıp bir seçim yap."}</p><div className="practice-actions"><button className="button practice-good" disabled={rating !== null} onClick={() => rate(true)}>✓ Bildim</button><button className="button practice-bad" disabled={rating !== null} onClick={() => rate(false)}>✕ Bilemedim</button>{rating !== null && <button className="button primary" onClick={next}>Devam et</button>}</div></div>}
    </>}
  </section>;
}

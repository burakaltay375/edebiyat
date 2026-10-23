"use client";
import { useEffect, useRef, useState } from "react";
import podcasts from "../data/podcasts.json";

type Podcast = (typeof podcasts)[number];
export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function Player({ podcast }: { podcast: Podcast }) {
  const audio = useRef<HTMLAudioElement>(null);
  const alive = useRef(true);
  const [playing, setPlaying] = useState(false), [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(0), [position, setPosition] = useState(0), [speed, setSpeed] = useState(1), [error, setError] = useState("");
  useEffect(() => {
    alive.current = true;
    const media = audio.current;
    return () => { alive.current = false; media?.pause(); };
  }, []);
  async function toggle() {
    const media = audio.current;
    if (!media) return;
    if (!media.paused) { media.pause(); return; }
    setLoading(true); setError("");
    try { await media.play(); if (!alive.current) media.pause(); }
    catch { if (alive.current) setError("Ses oynatılamadı. Dosya eksik olabilir veya tarayıcı oynatmayı engellemiş olabilir. Yeniden dene."); }
    finally { if (alive.current) setLoading(false); }
  }
  function seek(value: number) {
    if (!audio.current || !duration) return;
    const next = Math.max(0, Math.min(duration, value));
    audio.current.currentTime = next; setPosition(next);
  }
  function mediaError() {
    setLoading(false); setPlaying(false);
    const code = audio.current?.error?.code;
    setError(code === 2 ? "Ses dosyasına ulaşılamadı. Bağlantını ve dosyanın sunucuda bulunduğunu kontrol et." : "Ses dosyası eksik, bozuk veya bu tarayıcıda desteklenmiyor.");
  }
  return <article className="panel podcast-player">
    <span className="eyebrow">{podcast.grade}. SINIF · PODCAST {podcast.order}</span>
    <h2>{podcast.title}</h2><p>Ses: Fatih Yıldırım · ElevenLabs ile hazırlanmış kayıt</p>
    <audio ref={audio} src={podcast.src || undefined} preload="metadata" onError={mediaError}
      onLoadedMetadata={() => { const value = audio.current?.duration || 0; setDuration(Number.isFinite(value) ? value : 0); if (audio.current) audio.current.playbackRate = speed; }}
      onDurationChange={() => { const value = audio.current?.duration || 0; if (Number.isFinite(value)) setDuration(value); }}
      onTimeUpdate={() => setPosition(audio.current?.currentTime || 0)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      onEnded={() => setPlaying(false)} onWaiting={() => setLoading(true)} onPlaying={() => setLoading(false)} onCanPlay={() => setLoading(false)}/>
    {!podcast.src ? <p className="alert error" role="alert">Bu konu için ses dosyası henüz eklenmedi.</p> : <>
      <div className="podcast-controls"><button className="button secondary" disabled={!duration} onClick={() => seek(position - 10)} aria-label="10 saniye geri sar">−10 sn</button>
        <button className="button primary" onClick={toggle} aria-label={playing ? "Podcasti duraklat" : "Podcasti oynat"}>{playing ? "Duraklat" : "Oynat"}</button>
        <button className="button secondary" disabled={!duration} onClick={() => seek(position + 10)} aria-label="10 saniye ileri sar">+10 sn</button></div>
      <label htmlFor="podcast-progress">Dinleme ilerlemesi</label><input id="podcast-progress" type="range" min={0} max={duration || 1} step={0.1} value={Math.min(position,duration || 1)} disabled={!duration} onChange={event => seek(Number(event.target.value))} aria-valuetext={`${formatTime(position)} / ${formatTime(duration)}`}/>
      <div className="practice-toolbar"><span>{formatTime(position)} / {formatTime(duration)}</span><label className="podcast-speed">Oynatma hızı<select value={speed} onChange={event => { const value = Number(event.target.value); setSpeed(value); if (audio.current) audio.current.playbackRate = value; }}>{[0.75,1,1.25,1.5,2].map(value => <option value={value} key={value}>{value}x</option>)}</select></label></div>
      {loading && <p role="status">Ses yükleniyor…</p>}{error && <div className="alert error" role="alert">{error}<button className="button secondary" onClick={() => { setError(""); setLoading(false); audio.current?.load(); }}>Yeniden yükle</button></div>}
    </>}
    <details className="podcast-transcript" open><summary>Podcast anlatım metni</summary>{podcast.transcript ? <p>{podcast.transcript}</p> : <p>Anlatım metni henüz eklenmedi. Bu kayıt için doğrulanmış metin sağlandığında burada gösterilecek.</p>}</details>
  </article>;
}

export default function Podcasts({grade,onGradeChange}:{grade:number;onGradeChange:(grade:number)=>void}) {
  const [selected, setSelected] = useState(podcasts[0]?.id || "");
  useEffect(()=>{setSelected(podcasts.find(item=>item.grade===grade)?.id||"")},[grade]);
  const items = podcasts.filter(podcast => podcast.grade === grade);
  const podcast = items.find(item => item.id === selected);
  return <section className="podcast-page"><div className="page-heading"><div><span className="eyebrow">DİNLE · DÜŞÜN · HATIRLA</span><h1>Edebiyat Podcastleri</h1><p>Konunu seç, kendi hızında dinle.</p></div></div>
    <div className="podcast-filters"><label>Sınıf<select aria-label="Podcast sınıfı" value={grade} onChange={event => { const value = Number(event.target.value); onGradeChange(value); setSelected(podcasts.find(item => item.grade === value)?.id || ""); }}>{[9,10,11,12].map(value => <option key={value} value={value}>{value}. sınıf</option>)}</select></label>
      <label>Konu<select aria-label="Podcast konusu" value={selected} disabled={!items.length} onChange={event => setSelected(event.target.value)}>{items.length ? items.map(item => <option key={item.id} value={item.id}>{item.order}. {item.title}</option>) : <option value="">Henüz podcast yok</option>}</select></label></div>
    {!items.length ? <div className="panel empty"><h2>Bu sınıf için henüz podcast eklenmedi.</h2><p>Hazır kayıtlar 10. sınıf bölümünde bulunuyor.</p></div> : <div className="podcast-layout"><nav className="podcast-list" aria-label="Podcast listesi">{items.map(item => <button key={item.id} className={item.id === selected ? "podcast-item selected" : "podcast-item"} aria-current={item.id === selected ? "true" : undefined} onClick={() => setSelected(item.id)}><span>{String(item.order).padStart(2,"0")}</span><strong>{item.title}</strong></button>)}</nav>{podcast && <Player key={podcast.id} podcast={podcast}/>}</div>}
  </section>;
}

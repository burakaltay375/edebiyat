export type KnowledgeCard = { id: string; question: string; answer: string };
export type ChatMessage = { role: "user" | "assistant"; content: string };
export interface PracticeService {
  loadCards(): Promise<KnowledgeCard[]>;
  reply(history: readonly ChatMessage[], signal: AbortSignal): Promise<string>;
}

// Integration boundary: replace these implementations with your own server calls.
// Keep API credentials on the server. This demo makes no network requests.
export const practiceService: PracticeService = {
  async loadCards() {
    return [
      { id: "1", question: "İstiklâl Marşı'nın şairi kimdir?", answer: "Mehmet Âkif Ersoy." },
      { id: "2", question: "Bir şiirde her bir satıra ne ad verilir?", answer: "Dize (mısra)." },
      { id: "3", question: "Kişileştirme (teşhis) nedir?", answer: "İnsan dışındaki varlıklara insana özgü özellikler verilmesidir." },
      { id: "4", question: "Kutadgu Bilig'in yazarı kimdir?", answer: "Yusuf Has Hacib." },
      { id: "5", question: "Olayları yaşayan veya gözlemleyen kişinin ağzından aktaran anlatıcı türü nedir?", answer: "Birinci kişi anlatıcı." },
    ];
  },
  async reply(history, signal) {
    signal.throwIfAborted();
    const text = history.at(-1)?.content.toLocaleLowerCase("tr") || "";
    if (/şiir|dize|mısra/.test(text)) return "Örnek yanıt: Şiirin her satırına dize denir. Sevdiğin bir şiirin bir dizesini hatırlıyor musun?";
    if (/teşhis|kişileştirme/.test(text)) return "Örnek yanıt: ‘Rüzgâr kulağıma fısıldadı’ cümlesinde rüzgâra insana özgü bir eylem verilmiştir. Sen de bir kişileştirme örneği kurabilir misin?";
    return "Örnek yanıt: Birlikte edebiyat çalışalım. Şiir, dize veya kişileştirme hakkında konuşabilirsin. Bu gösterimde yalnızca hazır yanıtlar kullanıyorum.";
  },
};

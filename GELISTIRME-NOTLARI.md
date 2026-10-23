# Bilgi Kartları ve Sesli Konuşma

## Değişiklikler
- `frontend/components/Workspace.tsx`: mevcut menüye Bilgi Kartları ve Sesli Konuşma eklendi.
- `frontend/app/globals.css`: yeni bölümlere özel mobil tasarım, kart çevirme animasyonu, doğru/yanlış renkleri. Hareket azaltma tercihi desteklenir.
- `frontend/features/practice/KnowledgeCards.tsx`: yazılı/sesli cevap, cevap sonrası çevirme, öz değerlendirme, yanlış kartların tekrar kuyruğu, bitirme ve yeniden başlatma.
- `frontend/features/practice/VoiceConversation.tsx`: mikrofon durumu, düzenlenebilir konuşma metni, geçmiş, örnek yanıtlar, seslendirme ve yazılı alternatif.
- `frontend/features/practice/useSpeech.ts`: Türkçe Web Speech ses tanıma, izin/destek/bağlantı hataları ve ekran kapandığında mikrofon temizliği.
- `frontend/features/practice/service.ts`: örnek kartlar ve sohbet sağlayıcısı sözleşmesi.
- `frontend/features/practice/session.ts`: tekrar kuyruğu ve ilk cevap istatistikleri.
- `frontend/features/practice/practice.test.mjs`: tekrar, istatistik ve örnek servis testleri.

Mevcut LearningSession, özet/konu anlatımı, aktif hatırlama, quiz, sunucu, veritabanı ve AI adaptörü değiştirilmedi. Yeni API anahtarı, Gemini bağlantısı veya yapay zekâ servisi eklenmedi. Paket dosyaları değiştirilmedi.

## Gemini'yi sonradan bağlayacağın yer
`frontend/features/practice/service.ts` içindeki `practiceService` nesnesi tek bağlantı noktasıdır:

- `loadCards(): Promise<KnowledgeCard[]>`: `{ id, question, answer }` nesnelerinden oluşan bir dizi döndürür. Kimlikler benzersiz ve alanlar dolu olmalıdır. Örnek dizinin yerine kendi sunucundan gelen kartları döndürebilirsin.
- `reply(history, signal): Promise<string>`: `role: "user" | "assistant"` ve `content` alanlarını içeren konuşma geçmişini alır, metin yanıt döndürür. Kendi sunucu isteğinde `AbortSignal` kullanarak ekran kapatılınca isteği iptal edebilirsin.

Anahtar ve sağlayıcı çağrısı kendi sunucu tarafındaki entegrasyonunda kalmalı; bu dosya tarayıcıya dahil edilir. Arayüz bileşenlerini değiştirmeden bu iki fonksiyonun gövdesini değiştirebilirsin. Entegrasyon tamamlandığında örnek yanıt etiketlerini de gerçek davranışa uygun güncelle.

## Davranış
Bildim/Bilemedim öğrenci öz değerlendirmesidir; otomatik anlamsal doğrulama yapılmaz. Yanlış kart kuyruğun sonuna taşınır, bilinince çıkar. Öğrenci istediği zaman oturumu bitirebilir. Sonuç ilk değerlendirmelerdeki doğru/yanlış sayısını ve bunlara göre başarı yüzdesini gösterir; tekrarlar başarı oranını yapay olarak yükseltmez. Yanıtlanmayan kartlar puana katılmaz, kalan sayı gösterilir.

Kart sonuçları ve sohbet geçmişi yalnız ekranın belleğinde tutulur; bölümden çıkınca sıfırlanır ve mevcut hesap/araştırma puanlarına yazılmaz. Örnek kartlar sınıfa göre filtrelenmez.

Sesli metin otomatik gönderilmez: öğrenci düzenleyip Gönder'i seçer. Mikrofon kullanıcı eylemiyle açılır; tarayıcı kısa konuşma sonunda kendiliğinden durabilir. HTTPS veya localhost gerekir. Desteklenmeyen tarayıcıda yazılı giriş devam eder. Ses tanıma tarayıcı hizmetine ve internet bağlantısına bağlı olabilir. Seslendirme başarısız olursa yanıt metni korunur ve Dinle ile tekrar denenebilir.

## Doğrulama
Depo frontend/backend olarak ayrılmış; mevcut dosyalar birleşik kök dizin bekliyor. Dosyalar yalnız geçici doğrulama klasöründe birleştirildi.
- Mevcut `node tests/run.mjs`: 41 kontrol geçti.
- `node --test features/practice/practice.test.mjs`: 3 test geçti (birleşik kökte; frontend bağımsız kullanılırsa aynı yol frontend içinden).
- Yeni özellik dosyalarının strict TypeScript kontrolü geçti.
- Geçici DOM arayüz testi: boş cevapta çevirmenin engellenmesi, cevapların gösterilmesi, kırmızı/yeşil durumlar, yanlış kart tekrarı, %80 ilk cevap sonucu, yeniden başlatma, yazılı sohbet, örnek yanıt ve geçmiş temizleme geçti.
- Tam uygulama derlemesi mevcut eksik `.openai/hosting.json`, `build/sites-vite-plugin` ve `build/connector-preview-plugin.mjs` nedeniyle tamamlanamadı. Bunlar bu geliştirmede silinmedi; kaynak depoda bulunmuyor.
- Gerçek mikrofon, fiziksel telefon ve tarayıcı ses hizmeti testi yapılmadı. Görsel tarayıcı doğrulaması yapılmadı.

## Teslim
Arşiv güncel frontend/backend kaynaklarını içerir; node_modules veya gizli anahtar içermez. Değişiklikler yerel kopyada yapıldı; GitHub'a gönderilmedi ve yayına alınmadı.

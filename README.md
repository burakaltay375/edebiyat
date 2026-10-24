# EdebLab

React/TypeScript, Vinext, Cloudflare Workers ve D1. Kaynaklar `frontend/` ve `backend/` altında korunur. Kök komutlar kaynakları üretilen `.runtime/` dizininde birleştirir. Bu dizin kaynak kontrolüne alınmaz.

## Yerel geliştirme

Node.js 22.13+ gerekir. Proje kökünde:

```sh
npm ci
npm run db:local
npm run dev
```

Yerel adres: http://127.0.0.1:5173. Kayıt Ol ekranından hesap açılır. Yerelde de otomatik kimlik veya yönetici atanmaz. Yeni giriş sistemi, izinler, yönetici hesabı ve yayın adımları için **EDEBLAB-TESLIM.md** dosyasını okuyun.

```sh
npm run typecheck
npm test
npm run build
```

Derleme `.runtime/dist/client` ve `.runtime/dist/server` altında oluşur. Önceki depoda eksik olan Sites derleme eklentilerinin yerine Vinext'in standart Cloudflare Vite adaptörü kullanılır. Mevcut veritabanı, kaynak onayları, öğrenme puanları ve araştırma tabloları korunur.

Tarayıcı testleri için yerel sunucu açıkken `npx playwright install chromium` ve `npm run test:browser` çalıştırılabilir. Kurulu Edge ile PowerShell: `$env:TEST_BROWSER_CHANNEL='msedge'; npm run test:browser`. Testler yalnız localhost üzerinde çalışır; ayrı yerel test hesapları oluşturur; gerçek üretim veritabanında çalıştırılmamalıdır.

## Ses tamamen isteğe bağlı

- Sen Anlat ve Birlikte Açalım varsayılan olarak yazılı çalışır. Mikrofon yalnız düğmeye basılınca açılır.
- Yazılı ve mikrofondan çevrilmiş metin aynı mevcut değerlendirme uçlarına gider. Gönderme/değerlendirme kullanıcı tarafından yapılır.
- Yanıtlar metin olarak gösterilir. Seslendirme yalnız Dinle düğmesiyle başlar; kapatılabilir.
- Mikrofon desteği/izni olmayan cihazda metinle bütün ders akışı devam eder.
- Podcastler ayrı çalışma alanıdır. Ders tamamlama, quiz, puan veya tekrar takvimi için dinleme şartı yoktur.
- Araştırmaya onay vermiş deney ve kontrol katılımcılarına yeni podcast, bilgi kartı ve bağımsız örnek sohbet alanları açılmaz. Öğrenme oturumunda yeni sesli girişler de kapalıdır. Sunucu `inputMode: voice` isteklerini reddeder; eski yazılı protokol korunur.

## Podcast kaynakları

Sekiz kayıt `frontend/public/podcasts/` altında, eşleştirme ve SHA-256 değerleri `frontend/data/podcasts.json` içindedir. Tümü mevcut 10. sınıf `t9`–`t16` konularına bağlıdır. Kullanıcının düzelttiği dosya sırası esas alınmıştır: ada/zamana göre yukarıdan aşağı; Mesneviden Modern Hikâyeye son dosya.

- 18:50:21 → Koşuk ve Türkü
- 18:52:40 → Şiirde Ahenk
- 18:57:35 → Gazel ve Kaside
- 18:59:42 → Şiirde Tema ve Söyleyici
- 19:01:55 → Destan ve Efsane
- 19:12:05 → Mesneviden Modern Hikâyeye
- 19:04:41 → Halk Hikâyesi
- 19:05:45 → Edebiyat ve Kültürel Bellek

Ses: Fatih Yıldırım, ElevenLabs ile önceden hazırlanmış MP3. Yeni ses üretimi veya ElevenLabs bağlantısı yoktur. Kullanıcı anlatım metni bulunmadığını belirttiği için `transcript: null` tutulur. Daha sonra doğrulanmış metin aynı alana eklenebilir; şimdilik eksik metin açıklaması gösterilir. Seslerin içerikleri otomatik yazıya dökülmedi; eşleştirme kullanıcının açık sıralama düzeltmesiyle, dosya bütünlüğü ve oynatılabilirlik ise teknik testlerle doğrulandı.

## Gemini

Mevcut `backend/lib/ai.ts` kullanılır. Varsayılan Gemini modeli `gemini-2.5-flash`; `GEMINI_MODEL` ile değiştirilebilir. Açıkça seçilmiş eski OpenAI sağlayıcısı korunur. Yeni örnek yapılandırma Gemini'yi seçer. Anahtar yoksa hazır dersler/quiz ve ses dosyaları çalışır; model gerektiren işlemlerde anlaşılır mesaj verilir.

JSON/Zod doğrulamaları, kaynak alıntısı denetimleri, yalnız onaylı MEB içeriği ve oturum sahipliği kontrolleri korunur. Her öğrenciye tüm model çağrıları toplamında dakikada 6, saatte 60 çağrı sınırı uygulanır. Soru üretimi + bağımsız kontrol iki çağrı sayılır. Başarısız model çağrıları da sayılır. Sayaçlar atomik D1 güncellemesiyle tutulur; öğrenci metni sayaç tablosuna yazılmaz. Sağlayıcı çağrısı 45 saniyede zaman aşımına uğrar. Kota, yetki, bozuk JSON ve eksik yanıtlar puana dönüşmez.

Yerel anahtar için `.env.example` dosyasını `.dev.vars` adıyla kopyalayıp kendi bilgisayarında doldur. Bu dosya Git tarafından dışlanır; hazırlık komutu yalnız yerel `.runtime/.dev.vars` kopyası oluşturur. Frontend'e anahtar aktarılmaz.

## Cloudflare hazırlığı ve mevcut veritabanı

`wrangler.json` içindeki D1 kimliği yalnız yerel yer tutucudur. Dağıtım öncesi aynı yapıyı `wrangler.local.json` dosyasına kopyala ve **mevcut** Worker adı ile D1 veritabanı kimliğini kullan; yeni veritabanı oluşturma. `npm run build` bu dosyayı varsa tercih eder. Üretim çıktısının yapılandırması `.runtime/dist/server/wrangler.json` olur.

Mevcut üretim veritabanında uygulanmamış eklemeli migration dosyaları gerekir; bu teslimde yenisi `0003_student_accounts.sql` dosyasıdır. İlk iki migration daha önce uygulandıysa tekrar çalıştırma. Örneğin doğru hedefi ayarladıktan sonra:

```sh
npx wrangler d1 execute DB --config .runtime/wrangler.json --remote --file backend/drizzle/0002_ai_usage.sql
```

Bu geliştirme sırasında uzak veritabanına veya yayındaki siteye değişiklik yapılmadı.

### Öğrenci girişi

Kullanıcı adı/şifre ve D1 tabanlı güvenli oturum kullanılır. ChatGPT kimlik başlıkları giriş yetkisi vermez. Şifreler rastgele salt ile PBKDF2-SHA256 (600.000 iterasyon) özeti olarak saklanır. HTTPS oturum çerezi `__Host-`, Secure, HttpOnly ve SameSite=Lax özelliklerini taşır. Yerelde yalnız HTTP geliştirme için ayrı bir çerez adı kullanılır. Ayrıntılar **EDEBLAB-TESLIM.md** içindedir.

Statik podcastler Worker üzerinden geçer: giriş ve araştırma katılımı kontrolü yapılır, yetkili yanıt `private, no-store` döner. `run_worker_first: true` ayarını kaldırmayın.

## Gemini anahtarını Cloudflare'a ekleme

1. Cloudflare panelinde **Workers & Pages** bölümünden mevcut uygulamanın Worker'ını seç.
2. **Settings → Variables and Secrets → Add** yolunu aç.
3. Tür olarak **Secret**, ad olarak `GEMINI_API_KEY` gir. Değer alanına anahtarını kendin yapıştır.
4. Gizli olmayan ayarları `AI_PROVIDER=gemini` ve `GEMINI_MODEL=gemini-2.5-flash` olarak ayarla. Bu değerler örnek Wrangler yapılandırmasında da var.
5. **Deploy** ile ayarları uygula. Test ve üretim ortamlarını ayrı kullanıyorsan her ortamın secret'ını ayrı ayarla.
6. Onaylı bir ders üzerinden yazılı soru/değerlendirme dene. Anahtarın görünmesini bekleme; yalnız model yanıtı veya güvenli hata mesajı görünmelidir.

Alternatif olarak doğru Worker hedefiyle `npx wrangler secret put GEMINI_API_KEY --name SENIN_MEVCUT_WORKER_ADIN` komutunu çalıştırıp anahtarı etkileşimli istemde gir. Değeri komut satırı argümanı, `vars`, frontend dosyası veya GitHub dosyasına koyma. `secret put` yeni Worker sürümünü yayımlar; kademeli dağıtımda sürüm tabanlı secret komutunu kullan.

Kaynak: [Cloudflare Secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [yerel ortam değişkenleri](https://developers.cloudflare.com/workers/local-development/environment-variables/).

Google'ın güncel belgesine göre Gemini 2.5 modellerine erişim daha önce kullanmış hesaplarla sınırlanabilir. İstenen varsayılan model korunmuştur; erişim hatasında otomatik başka modele geçilmez. Kaynak: [Gemini 2.5 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash).

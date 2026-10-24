# EdebLab — geliştirme ve yayın rehberi

Bu teslim, burakaltay375/edebiyat deposunun mevcut React, TypeScript, Vinext, Cloudflare Workers ve D1 uygulamasını geliştirir. Yeni bir öğrenme sistemi kurulmadı. Uzak depoya push, uzak D1 migration veya canlı yayın yapılmadı.

## Yapılan değişiklikler

- Ad/soyad ayrı alanlarda, sınıf ve benzersiz kullanıcı adıyla öğrenci kaydı; aynı isimde öğrenciler ayrı hesap açabilir.
- PBKDF2-SHA256, 600.000 iterasyon, 32 bayt rastgele salt; ham şifre saklanmaz. D1 yalnız oturum belirtecinin SHA-256 özetini saklar. Oturum 7 günde sona erer; çıkış sunucu kaydını iptal eder.
- Secure / HttpOnly / SameSite=Lax çerez; HTTPS ortamında __Host- öneki. Origin denetimi, giriş denemesi sınırlaması ve sunucuda kullanıcı/rol kontrolleri.
- İlk ziyaretçiyi yönetici yapan kural ve yerelde otomatik giriş kaldırıldı. Sahte kimlik başlıkları kabul edilmez.
- İlk girişte gerekli veri işlemleri ve isteğe bağlı ses/ayrıntılı analiz tercihleri ayrıldı. İki tercih de varsayılan kapalı. Ayarlardan değiştirilebilir; analiz kapatılınca yöntem ayrıntıları silinir.
- Mikrofon, tercih ve araştırma erişimi doğrulandıktan sonra yalnız düğmeyle başlar. Yazılı öğrenme bağımsız çalışır.
- Kişiselleştirilmiş ana sayfa: bugünkü aktif süre, tamamlanan konular, soru sayısı ve doğru oranı. Sen Anlat, Birlikte Açalım ve Testler kısayolları mevcut konu/öğrenme akışına götürür; mevcut öğrenme sırası korunur.
- /admin: öğrenciler, sınıf, son çalışma, toplam süre, konu/soru/doğru/yanlış özetleri; öğrenci detayında günlük/haftalık grafik. Yöntem ayrıntıları yalnız analiz izniyle. Özel AI metinleri, şifreler ve ses kayıtları gösterilmez.
- Sekme görünür ve odaklı olmalı; son 60 saniyede etkileşim yoksa süre durur. Sunucu her kalp atışında en fazla 30 saniye ekler; 45 saniyeyi aşan boşluk kredilendirilmez. Eşzamanlı aynı kalp atışı tekrar kredilendirilmez.
- Araştırma katılımı için kullanıcıya ve koda bağlı yönetici yetkilendirmesi; ayrı onay kaydı referansı ve gerekli veli onayının doğrulanması. Genel gizlilik tercihleri araştırma onayı değildir. Deney/kontrol kısıtları korunur.
- EdebLab logo/favicon, uygulama manifesti, Fraunces/Inter, sıcak kitap/yaprak/tüy illüstrasyonu, krem-yeşil-bakır palet, responsive menü ve kartlar.
- Worker-first ayarıyla geliştirme modüllerinin ve herkese açık tasarım varlıklarının doğru sunulması düzeltildi. Podcastler erişim denetimini korur. Üretim varlık sunucusu Range başlığını karşılamadığında Worker tek byte aralığını doğru 206/416 yanıtıyla karşılar; böylece ileri/geri sarma çalışır.

## Yeni D1 tabloları

`0003_student_accounts.sql` eklemeli migration dosyasıdır; eski tabloları silmez veya sıfırlamaz.

- `student_accounts`: mevcut users.id ile ilişkili kullanıcı adı, ad, soyad, şifre özeti ve rol.
- `auth_sessions`: özetlenmiş oturum belirteci, kullanıcı kimliği ve son geçerlilik zamanı.
- `auth_limits`: kullanıcı adı/IP bazlı giriş denemesi sayaçları; IP açık olarak saklanmaz.
- `privacy_preferences`: ayrıntılı analiz ve ses tercihleri, ilk tamamlama ve güncelleme zamanı.
- `learning_activity`: kullanıcı/gün başına temel aktif öğrenme süresi.
- `learning_methods`: yalnız izin verilmiş kullanıcıların gün/yöntem süreleri.
- `research_authorizations`: öğrenci/kod eşleştirme yetkisi, yetkilendiren yönetici ve ayrı onay kayıt referansı.

İlerleme, test cevapları ve oturumlar mevcut `users`, `learning_sessions`, `student_progress`, `attempts` ve diğer mevcut tablolarda kalır. Eski ChatGPT kullanıcı kimlikleri silinmez ve ad benzerliğinden otomatik hesap eşleştirmesi yapılmaz. Eski kullanıcıların yeni şifreli hesaplarına kontrollü aktarımı bu teslimde otomatikleştirilmedi; gerçek kimlik doğrulanmadan kayıtlar birleştirilmemelidir.

## Yerelde başlatma

Node.js 22.13 veya üzeri ile proje kökünde:

```sh
npm ci
npm run db:local
npm run dev
```

Tarayıcı: http://127.0.0.1:5173. Kayıt Ol ile hesap açın, isteğe bağlı izinlerinizi seçin. Kaynaklar `frontend/` ve `backend/` altındadır; `.runtime/` otomatik hazırlanır. Kaynak değişikliklerinden sonra geliştirme sunucusunu yeniden başlatmak dosyaları yeniden hazırlar. `.runtime/` içindeki veritabanını silmeyin.

Gemini için `.env.example` dosyasını `.dev.vars` olarak kopyalayıp kendi anahtarınızı yerelde doldurun. Anahtar sürüm kontrolüne girmez. Varsayılan model `gemini-2.5-flash` korunmuştur.

## Yönetici hesabı

Önce normal kayıt ekranında kendi hesabınızı oluşturun. Herkese açık kayıt yönetici rolü veremez. Ardından yalnız proje/Cloudflare erişimi olan operatör, proje kökünden hesabı yönetici yapar:

```sh
node scripts/admin.mjs kendi_kullanici_adiniz --local
```

Komut çıktısında doğru kullanıcı adı ve `admin` rolü görünmelidir. Ekranı yenileyin ve `/admin` adresini açın. Canlı hesap için doğru Worker/D1 yapılandırmasını doğruladıktan sonra aynı komutu `--remote` ile çalıştırın. Komut şifre istemez veya şifreyi loglamaz; yalnız mevcut hesabın rolünü değiştirir.

Araştırma eşleştirmesi: /admin içinden öğrenciyi seçin → ayrı araştırma katılımını yetkilendir → kurumda tamamlanan bilgilendirme/veli onayının kayıt referansını girin → doğru D/K kodunu yetkilendirin. Öğrenci ayrıca Araştırma modunda kendi katılım tercihini bildirip kodunu bağlar. Onay belgelerini bu alana yüklemeyin; yalnız güvenli kurumsal kaydın referansını girin.

## Cloudflare’a yayınlama

Depodaki D1 kimliği örnek değerdir. `wrangler.json` dosyasını `wrangler.local.json` olarak kopyalayın; mevcut Worker adı, mevcut D1 database_name ve gerçek database_id değerlerini yazın. Yeni veritabanı oluşturmayın. `run_worker_first: true` korunmalı.

Önce mevcut veritabanının yedeğini alın. Ardından proje kökünden:

```sh
npx wrangler login
npm run prepare
npx wrangler d1 export DB --remote --config .runtime/wrangler.json --output work/edeblab-before-migration.sql
npx wrangler d1 migrations list DB --remote --config .runtime/wrangler.json
```

Migration geçmişi eski sürümlerle uyumluysa yalnız bekleyen dosyaları uygulatın:

```sh
npx wrangler d1 migrations apply DB --remote --config .runtime/wrangler.json
```

Eski tablolar manuel SQL ile kurulmuş ve migration geçmişi tutulmamışsa bütün migration zincirini tekrar uygulamayın. Önce mevcut şemayı kontrol edin; 0000–0002 zaten kuruluyken yalnız yeni dosyayı bir kez uygulama seçeneği:

```sh
npx wrangler d1 execute DB --remote --config .runtime/wrangler.json --file backend/drizzle/0003_student_accounts.sql
```

Bu iki yöntemi aynı migration için birlikte kullanmayın; manuel uygulama seçildiyse migration geçmişini operatör mevcut duruma göre uzlaştırmalıdır.

Anahtarı tarayıcı koduna yazmadan Worker secret olarak tanımlayın:

```sh
npx wrangler secret put GEMINI_API_KEY --config .runtime/wrangler.json
npm run typecheck
npm test
npm run build
npx wrangler deploy --config .runtime/dist/server/wrangler.json
```

Şifre türetme işlemi bilinçli olarak maliyetlidir. Cloudflare planınızın Worker CPU bütçesini kayıt/giriş yükü altında ölçüp uygun yapılandırın; PBKDF2 maliyetini sessizce azaltmayın. Node crypto desteği: https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/

## Doğrulama ve sınırlar

- TypeScript denetimi ve Vinext üretim derlemesi başarılı.
- 86 entegrasyon kontrolü ve 3 bilgi kartı/örnek sağlayıcı testi başarılı.
- Geliştirme sunucusu ve derlenmiş Worker üzerinde Edge/Chromium tarayıcı senaryoları başarılı.
- 320, 375, 768 ve 1280 pikselde ana sayfa, konu listesi, bilgi kartları, isteğe bağlı sohbet ve podcast ekranlarında yatay taşma bulunmadı. Giriş ekranı ayrıca 320 pikselde kontrol edildi.
- Kayıt, giriş, yanlış şifre, çıkış, yönetici detay grafiği, izinlerin kalıcılığı ve metinle öğrenme akışı test edildi.
- Sekiz MP3 için SHA-256 bütünlüğü ve oynatılabilirlik; hız değiştirme, ileri/geri sarma, tam/sonek/geçersiz byte range yanıtları doğrulandı.
- Araştırma yetkilendirmesi ve hem normal hem URL kodlamalı podcast yollarındaki erişim kısıtları doğrulandı.
- Mikrofonun ilk girişte açılmadığı ve yalnız düğmeye basınca başladığı taklit tarayıcı ses aygıtıyla doğrulandı; gerçek mikrofon kaydı yapılmadı.


Entegrasyon testleri gerçek HTTP işleyicilerini ve SQLite üzerinde aynı migration dosyalarını kullanır. Gemini yanıtları testte kontrollü taklit yanıtlarla doğrulanır; gerçek ücretli sağlayıcı çağrısı yapılmadı.

Grafikler migration sonrasında kaydedilen gün bazlı süreleri gösterir; eski oturum toplamları korunur. Temel süre/başarı istatistikleri mevcut ders oturumları ve quizlerden hesaplanır. Bağımsız bilgi kartı gösterimi, örnek sesli sohbet ve podcast dinleme için yeni başarı puanı veya otomatik araştırma ölçümü oluşturulmadı. Mevcut bağımsız sohbetin hazır örnek yanıtları aynen korunmuştur; gerçek Gemini desteği mevcut ders içi Sen Anlat/Birlikte Açalım uçlarında kalır.

İllüstrasyon referansın sıcak kitap/yaprak dilini takip eden özgün SVG’dir; referanstaki heykel/öğrenci görselinin birebir kopyası değildir. Gerçek iPhone Safari ve Android donanım testleri yapılmadı; responsive kontroller masaüstü Chromium/Edge’de yürütüldü.

Bağımlılık denetimi: mevcut kilit dosyasında üretim bağımlılıkları için 1 kritik, 3 yüksek ve 2 orta bildirim bulundu (Next, Zod ve dolaylı paketler dahil). Bildirimlerin Vinext yürütme yollarına etkisi ayrıca değerlendirilmelidir. Altyapıyı bozabilecek toplu/ana sürüm yükseltmesi yapılmadı; kamuya açık yayından önce bu denetim ve uygun güncellemeler tamamlanmalıdır.

Kurumun veri sorumlusu/iletişim bilgisi, saklama süreleri ve araştırma onay belgeleri gerçek uygulamaya göre tamamlanmalıdır. Bu arayüz tek başına hukuki uygunluk garantisi veya veli onay belgesi değildir.

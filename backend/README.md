# Edebiyat Atölyesi

React + TypeScript arayüzü, Vinext sunucu rotaları, Cloudflare D1 (SQLite) veritabanı ve sunucu tarafında OpenAI Responses API adaptörü.

## Çalışan sürüm
- 9–12. sınıflar, 16 MEB tema başlığı, 32 başlangıç ders taslağı.
- 96 alt konu/kazanım bağlantısı ve 192 başlangıç soru kaydı (her konu için 5 objektif + 1 kısa cevap).
- Kısa anlatım, notları kapalı hatırlama, anlatma, yönlendirici değerlendirme, soru, sonuç.
- Oturum ve yanıt taslakları veritabanında saklanır.
- Soru sayısı 5/10/15/20; kolay/orta/zor/karışık seçimi. Yeterli uygun hazır soru yoksa kaynak temelli AI üretimi gerekir; sayı veya zorluk sessizce değiştirilmez.
- İlk cevap puanı, sonradan ipucuyla düzeltmeden ayrı tutulur.
- 1/3/7/14/30 günlük tekrar; düşük başarıda 1 güne döner.
- Kişisel ilerleme ve alt konu doğruluğu.
- Ayrı araştırma alanı; D01–D10/K01–K10, sabit protokol, ayrı ön/son/kalıcılık testleri, CSV.
- Kontrol grubu çalışma oturumlarına erişemez. Araştırma başladıktan sonra protokol koşulları değiştirilemez.
- İçerik JSON içe aktarma ve inceleme/onay akışı.

## Henüz tamamlanmış sayılmayanlar
- OPENAI_API_KEY etkinleştirilmedi. Canlı model çağrıları sınanmadı. AI sonuçları taklit edilmez.
- Başlangıç içerikleri taslaktır; öğretmen incelemesinden geçmiş veya bütün müfredatı kapsayan doğrulanmış ders kitabı değildir.
- MEB sayfaları tema adlarını doğrulamak için kullanıldı. Ders metni, kaynak parçaları ve yerel öğrenme hedefleri ayrıca akademik inceleme bekler.
- Dinamik sorular, açık uçlu anlamsal puanlama ve farklı sorularla tekrar için onaylı kaynak + API bağlantısı gerekir.
- Yazarlar ve eserler için ilişkisel tablolar hazırdır; başlangıç sürümünde ayrı yazar/eser kataloğu doldurulmadı.
- Araştırma modu bir veri toplama aracıdır; bilimsel geçerlilik, test eşdeğerliği veya öğrenme etkisi ispatı değildir.
- MEB'in 2024 programı temalarına göre düzenlenmiştir. Okul yılına göre kademeli geçiş ve 12. sınıf eski program gereksinimleri ayrıca eşlenmelidir.

## Geliştirme
Node 22.13+ gerekir. Proje kökünde:
1. npm ci
2. npm run db:generate (yalnız şema değiştiyse)
3. npm run build
4. Her yeni drizzle/*.sql dosyasını bir kez yerel D1'e uygula:
   node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/DOSYA.sql
5. npm run dev
6. http://127.0.0.1:5173/

Windows kısıtlı çalışma ortamında scripts/windows-path.cjs yalnız geliştirme işlemleri için yol ve kullanıcı bilgisi uyumluluğu sağlar; uygulama Worker koduna dahil edilmez.

## AI bağlantısı
Yerelde .env örneğindeki OPENAI_API_KEY ve OPENAI_MODEL değerlerini sunucuda tanımla. Yayında anahtarı Sites gizli ortam değişkeni olarak kaydet ve yeniden yayınla. Tarayıcıya veya kaynak kontrolüne anahtar koyma.
API çağrıları lib/ai.ts dosyasında soyutlanmıştır. Öğrenci metni güvenilmeyen veri kabul edilir. Kaynak dışındaki bilgiler kesin doğru sayılmaz. Çıktılar Zod ile doğrulanır.
Soru üretiminde: tam sayı, zorluk dağılımı, tür çeşitliliği, benzersizlik, kaynak parçası eşleşmesi ve bağımsız model denetimi kontrol edilir. Bu kontroller insan akademik incelemesinin yerini almaz.
Kaynak sayısı 20 parçayla sınırlıdır; yalnız seçilen konu gönderilir.

## İçerik ekleme
outputs/MEB-icerik-sablonu.json örneğini doldur. MEB veya EBA kaynak URL'si gerekir. Kazanım kodu gerçek MEB koduysa aynen yaz; yerel hedefi MEB kazanımı gibi adlandırma.
İçerik yönetiminde JSON'u içe aktar. Eski içerik arşivlenir, eski soru havuzu yeni oturumlarda devre dışı kalır. Yeni metin taslak olarak kaydedilir.
Kaynağı, bölüm/sayfa bilgisini, müfredat yılını ve akademik doğruluğu kontrol et; ancak sonra onayla. AI yalnız onaylı source_chunks kayıtlarını kullanır.

## Kimlik ve erişim
Yayın yeni ve yalnız sahibine açık Site olarak hazırlanır. İlk doğrulanmış ziyaretçi uygulama yöneticisi olarak app_meta.owner_user_id kaydına alınır. Kullanıcı paylaşımından ÖNCE sahip hesabıyla ilk girişi tamamlamak zorundadır. Bu ilk-kullanıcı kurulumu açık internete uygulanmamalıdır.
Üretimde kimlik başlıklarını Sites platformu doğrular. Yerel geliştirme sahte local_seedy hesabı kullanır; bu yalnız loopback geliştiricisi içindir.
Araştırma verileri kodlanmıştır, tamamen anonim değildir; teknik user_id bağlantısı bulunur. CSV kimlik bağlantısını içermez. Katılım öncesi çalışmalar araştırmaya dahil edilmez.
Çekilme yeni araştırma kaydını durdurur; daha önce kodlanmış çalışma kayıtlarını veya testleri otomatik silmez.
Ön/son/kalıcılık testleri haricen uygulanır ve araştırmacı tarafından ayrı kaydedilir; öğrenme puanı ve tekrar planına katılmaz.
Aktif süre yaklaşık bir görünür/odaklı pencere ölçümüdür; kesin dikkat veya öğrenme süresi ölçümü değildir. Araştırma süre sınırı sunucu başlangıç zamanından hesaplanır.

## Testler
node tests/run.mjs
npx tsc --noEmit
npm run build

Entegrasyon testleri geçici bellek içi SQLite kullanır; gerçek kullanıcı verisini değiştirmez. AI adaptör testleri sahte sağlayıcı yanıtları kullanır; canlı modelin eğitimsel kalitesini doğrulamaz.

## Temel kaynaklar
- 9: https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/11
- 10: https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/12
- 11: https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/13
- 12: https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/14

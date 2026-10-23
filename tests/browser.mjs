import { chromium } from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
if (!["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname)) throw new Error("Browser regression tests write only to a local test database.");
const browser = await chromium.launch({ headless: true, ...(process.env.TEST_BROWSER_CHANNEL ? { channel: process.env.TEST_BROWSER_CHANNEL } : {}) });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
fs.mkdirSync("work/screenshots", { recursive: true });
try {
  await page.goto(baseURL);
  await page.getByRole("button", { name: "Podcastler", exact: true }).waitFor({ timeout: 60000 });
  const podcasts = JSON.parse(fs.readFileSync("frontend/data/podcasts.json", "utf8"));
  assert.equal(podcasts.length, 8);
  for (const podcast of podcasts) {
    const bytes = fs.readFileSync("frontend/public" + podcast.src);
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), podcast.sha256);
    const duration = await page.evaluate(src => new Promise((resolve, reject) => {
      const audio = new Audio(); const timer = setTimeout(() => reject(new Error("Audio timeout")), 15000);
      audio.onloadedmetadata = () => { clearTimeout(timer); resolve(audio.duration); audio.src = ""; };
      audio.onerror = () => { clearTimeout(timer); reject(new Error("Audio could not be decoded: " + src)); };
      audio.src = src;
    }), podcast.src);
    assert.ok(duration > 10 && Number.isFinite(duration));
    console.log("PASS MP3", podcast.title, Math.round(duration) + "s");
  }
  assert.match(podcasts[0].originalFile, /18_50_21/);
  assert.match(podcasts[5].originalFile, /19_12_05/);
  assert.match(podcasts[6].originalFile, /19_04_41/);
  assert.match(podcasts[7].originalFile, /19_05_45/);

  async function navigate(name) {
    const opener = page.getByRole("button", { name: "Menüyü aç", exact: true });
    if (await opener.isVisible()) await opener.click();
    await page.getByRole("button", { name, exact: true }).click();
  }
  await navigate("Podcastler");
  await page.getByLabel("Podcast sınıfı",{exact:true}).selectOption("10");
  for (const width of [320,375,768,1280]) {
    await page.setViewportSize({ width, height: 850 });
    for (const name of ["Ana sayfa", "Konular", "Bilgi Kartları", "Sesli Konuşma", "Podcastler"]) {
      await navigate(name);
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, name + " overflow at " + width);
    }
    await page.screenshot({ path: `work/screenshots/podcasts-${width}.png`, fullPage: true });
  }
  await page.getByRole("button", { name: "Podcasti oynat", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector("audio").paused);
  await page.getByRole("button", { name: "Podcasti duraklat", exact: true }).click();
  await page.getByLabel("Oynatma hızı").selectOption("1.5");
  assert.equal(await page.locator("audio").evaluate(el => el.playbackRate), 1.5);
  await page.getByRole("button", { name: "10 saniye ileri sar", exact: true }).click();
  assert.ok(await page.locator("audio").evaluate(el => el.currentTime >= 10));
  await page.getByRole("button", { name: "10 saniye geri sar", exact: true }).click();
  assert.ok(await page.locator("audio").evaluate(el => el.currentTime < 2));
  await page.getByLabel("Podcast sınıfı", { exact: true }).selectOption("9");
  assert.ok(await page.getByText("Bu sınıf için henüz podcast eklenmedi.").isVisible());

  await navigate("Bilgi Kartları");
  assert.equal(await page.getByRole("button", { name: "Kartı çevir", exact: true }).isDisabled(), true);
  await page.getByLabel("Senin cevabın", { exact: true }).fill("Mehmet Âkif Ersoy");
  await page.getByRole("button", { name: "Kartı çevir", exact: true }).click();
  await page.getByRole("button", { name: "✕ Bilemedim", exact: true }).click();
  assert.equal(await page.locator(".knowledge-card.is-wrong").count(), 1);
  await page.getByRole("button", { name: "Devam et", exact: true }).click();

  await navigate("Sesli Konuşma");
  assert.equal(await page.getByLabel("Yanıtları sesli oku").isChecked(), false);
  await page.getByLabel("Mesajın", { exact: true }).fill("Şiir nedir?");
  await page.getByRole("button", { name: "Gönder", exact: true }).click();
  await page.getByText(/Şiirin her satırına dize denir/).waitFor();
  console.log("PASS responsive views, podcast player, card input and text-first demo chat");
  // Use mocked browser speech devices; never ask for a real microphone in CI.
  const speechPage = await browser.newPage({ viewport: { width: 320, height: 780 } });
  const testSession = await (await speechPage.request.post(baseURL+"/api/learning/start",{data:{topicId:"t1",questionCount:5,difficulty:"easy"}})).json();
  await speechPage.request.post(baseURL+"/api/profile",{data:{grade:9}});
  await speechPage.request.post(baseURL+"/api/session/save",{data:{sessionId:testSession.id,stage:0,draft:{recall:"",explanation:"",answers:{}},active:false}});
  await speechPage.addInitScript(() => {
    window.speechStarts = 0; window.speechReads = 0;
    class Recognition {
      start() { window.speechStarts++; queueMicrotask(() => { this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "Konuyu kendi cümlelerimle sesli anlatıyorum." } }] }); this.onend?.(); }); }
      stop() { this.onend?.(); }
      abort() {}
    }
    window.SpeechRecognition = Recognition;
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { cancel() {}, getVoices: () => [], speak(output) { window.speechReads++; queueMicrotask(() => output.onend?.()); } } });
  });
  await speechPage.goto(baseURL);
  await speechPage.getByRole("button",{name:"Menüyü aç",exact:true}).click();
  await speechPage.getByRole("button",{name:"Ana sayfa",exact:true}).click();
  await speechPage.getByRole("button",{name:/Öğrenmeye başla|Çalışmaya devam et/,exact:true}).waitFor({timeout:60000});
  await speechPage.getByRole("button",{name:/Öğrenmeye başla|Çalışmaya devam et/,exact:true}).click();
  const start = speechPage.getByRole("button",{name:"Oturumu başlat",exact:true});
  if(await start.isVisible()) await start.click();
  await speechPage.getByLabel("Konu hakkında sor").waitFor({timeout:60000});
  assert.equal(await speechPage.evaluate(()=>window.speechStarts),0);
  let tutorBody;
  await speechPage.route("**/api/tutor", route=> { tutorBody=route.request().postDataJSON();return route.fulfill({json:{explanation:"Test için hazırlanmış metin yanıtı.",recall_question:"Nasıl açıklarsın?",source_ids:[]}}); });
  await speechPage.getByLabel("Konu hakkında sor").fill("Yazarak bir soru soruyorum.");
  await speechPage.getByRole("button",{name:"Sor",exact:true}).click();
  await speechPage.getByText("Test için hazırlanmış metin yanıtı.").waitFor();
  assert.equal(tutorBody.inputMode,"text");
  assert.equal(await speechPage.evaluate(()=>window.speechReads),0);
  await speechPage.getByRole("button",{name:"Yanıtı dinle",exact:true}).click();
  assert.equal(await speechPage.evaluate(()=>window.speechReads),1);
  await speechPage.getByRole("button",{name:"Mikrofonla anlat",exact:true}).click();
  await speechPage.waitForFunction(()=>window.speechStarts===1);
  await speechPage.getByRole("button",{name:"Sor",exact:true}).click();
  await speechPage.waitForTimeout(100);
  assert.equal(tutorBody.inputMode,"voice");
  while(await speechPage.getByRole("button",{name:"Sonraki parça",exact:true}).isVisible()) await speechPage.getByRole("button",{name:"Sonraki parça",exact:true}).click();
  await speechPage.getByRole("button",{name:"Hazırım, hatırlayayım",exact:true}).click();
  await speechPage.evaluate(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;});
  await speechPage.getByLabel("Hatırladıkların",{exact:true}).fill("Bu konu hakkında hatırladıklarımı yalnızca yazarak anlatıyorum.");
  await speechPage.getByRole("button",{name:"Hatırladıklarımı değerlendir",exact:true}).click();
  await speechPage.getByRole("button",{name:"Şimdi anlatayım",exact:true}).click();
  assert.equal(await speechPage.getByRole("button",{name:"Mikrofonla anlat",exact:true}).isDisabled(),true);
  await speechPage.getByLabel("Senin açıklaman",{exact:true}).fill("Yazılı anlatım kullanarak bu konuyu kendi cümlelerimle açıklıyorum.");
  await speechPage.getByRole("button",{name:"Açıklamamı değerlendir",exact:true}).click();
  await speechPage.getByRole("button",{name:"Sorulara geç",exact:true}).click();
  await speechPage.locator(".answer-option").first().waitFor();
  assert.equal(await speechPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  console.log("PASS microphone starts only on click; tutor defaults to text, reads only on click; written recall and explanation reach quiz at 320px");
  await speechPage.close();
  const enrolled = await page.request.post(baseURL+"/api/research/enroll",{data:{code:"D10",consent:true}});
  assert.equal(enrolled.status(),200);
  try {
    const denied = await page.request.get(baseURL+podcasts[0].src);
    assert.equal(denied.status(),403,"Research participant cannot access audio URL directly");
    const encoded = await page.request.get(baseURL+podcasts[0].src.replace("/podcasts/","/%70odcasts/"));
    assert.equal(encoded.status(),403,"Encoded audio URL cannot bypass access checks");
  } finally { await page.request.post(baseURL+"/api/research/withdraw",{data:{}}); }
  console.log("PASS direct podcast assets enforce research access, including encoded paths");
  assert.deepEqual(errors, []);
} finally { await browser.close(); }

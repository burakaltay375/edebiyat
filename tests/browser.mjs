import { chromium } from "playwright";
import fs from "node:fs";
import {spawnSync} from "node:child_process";
import path from "node:path";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
if (!["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname)) throw new Error("Browser regression tests write only to a local test database.");
const adminUsername='admin_'+Date.now();
const adminRegistration=await fetch(baseURL+'/api/auth/register',{method:'POST',headers:{Origin:baseURL,'Content-Type':'application/json'},body:JSON.stringify({username:adminUsername,firstName:'Test',lastName:'Yönetici',grade:12,password:'Browser-admin-password-19',passwordRepeat:'Browser-admin-password-19'})});
assert.equal(adminRegistration.status,200);const adminCookie=adminRegistration.headers.get('set-cookie').split(';')[0];
await fetch(baseURL+'/api/preferences',{method:'POST',headers:{Origin:baseURL,Cookie:adminCookie,'Content-Type':'application/json'},body:JSON.stringify({voice:false,analytics:false})});
const promotion=spawnSync(process.execPath,[path.resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','DB','--local','--config','wrangler.json','--command',`UPDATE student_accounts SET role='admin' WHERE username='${adminUsername}'`],{cwd:path.resolve('.runtime'),encoding:'utf8'});assert.equal(promotion.status,0,JSON.stringify(promotion));
const browser = await chromium.launch({ headless: true, ...(process.env.TEST_BROWSER_CHANNEL ? { channel: process.env.TEST_BROWSER_CHANNEL } : {}) });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
fs.mkdirSync("work/screenshots", { recursive: true });
try {
  await page.goto(baseURL);
  await page.getByRole('tab',{name:'Giriş Yap'}).waitFor();
  await page.screenshot({path:'work/screenshots/signin-desktop.png',fullPage:true});
  await page.setViewportSize({width:320,height:850});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'work/screenshots/signin-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:900});
  await page.getByRole('tab',{name:'Kayıt Ol'}).click();
  await page.getByLabel('Ad',{exact:true}).fill('Deneme');await page.getByLabel('Soyad',{exact:true}).fill('Öğrenci');
  const username='browser_'+Date.now();
  await page.getByLabel('Kullanıcı adı',{exact:true}).fill(username);
  await page.getByLabel('Şifre',{exact:true}).fill('Browser-test-password-19');await page.getByLabel('Şifre tekrarı').fill('Browser-test-password-19');
  await page.getByRole('button',{name:'Hesabımı oluştur'}).click();
  await page.getByRole('heading',{name:'Nasıl öğrenmek istersin?'}).waitFor({timeout:60000});
  assert.equal(await page.getByRole('checkbox',{name:/Ayrıntılı/}).isChecked(),false);
  assert.equal(await page.getByRole('checkbox',{name:/Sesli öğrenme/}).isChecked(),false);
  await page.getByRole('checkbox',{name:/Sesli öğrenme/}).check();
  await page.getByRole('button',{name:'Tercihlerimi kaydet ve devam et'}).click();
  await page.getByRole('button', { name: 'Podcast', exact: true }).waitFor({ timeout: 60000 });
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
  const ranged=await page.request.get(baseURL+podcasts[0].src,{headers:{Range:'bytes=0-99'}});assert.equal(ranged.status(),206);assert.equal((await ranged.body()).length,100);
  const suffix=await page.request.get(baseURL+podcasts[0].src,{headers:{Range:'bytes=-100'}});assert.equal(suffix.status(),206);assert.deepEqual(await suffix.body(),fs.readFileSync('frontend/public'+podcasts[0].src).subarray(-100));
  const beyond=await page.request.get(baseURL+podcasts[0].src,{headers:{Range:'bytes=999999999-'}});assert.equal(beyond.status(),416);
  console.log('PASS exact, suffix and invalid podcast byte ranges');
  assert.match(podcasts[0].originalFile, /18_50_21/);
  assert.match(podcasts[5].originalFile, /19_12_05/);
  assert.match(podcasts[6].originalFile, /19_04_41/);
  assert.match(podcasts[7].originalFile, /19_05_45/);

  async function navigate(name) {
    const opener = page.getByRole("button", { name: "Menüyü aç", exact: true });
    const mobile=await opener.isVisible();
    if(mobile)await opener.click();
    await page.getByRole("button", { name, exact: true }).click();
    if(mobile&&name!=='Çıkış yap')await page.getByRole('button',{name:'Menüyü aç',exact:true}).waitFor();
  }
  await navigate("Podcast");
  await page.getByLabel("Podcast sınıfı",{exact:true}).selectOption("10");
  for (const width of [320,375,768,1280]) {
    await page.setViewportSize({ width, height: 850 });
    for (const name of ["Ana sayfa", "Konu Anlatımları", "Bilgi Kartları", "Sesli Konuşma", "Podcast"]) {
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
  await page.waitForFunction(()=>document.querySelector("audio").currentTime>=9.5);
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
  const speechPage = await page.context().newPage();await speechPage.setViewportSize({width:320,height:780});
  const testSession = await (await speechPage.request.post(baseURL+"/api/learning/start",{headers:{Origin:baseURL},data:{topicId:"t1",questionCount:5,difficulty:"easy"}})).json();
  await speechPage.request.post(baseURL+"/api/profile",{headers:{Origin:baseURL},data:{grade:9}});
  await speechPage.request.post(baseURL+"/api/session/save",{headers:{Origin:baseURL},data:{sessionId:testSession.id,stage:0,draft:{recall:"",explanation:"",answers:{}},active:false}});
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
  const denied = await page.request.post(baseURL+'/api/research/enroll',{headers:{Origin:baseURL},data:{code:'D10',consent:true}});
  assert.equal(denied.status(),403,'Unapproved research linkage rejected');
  const outsider=await browser.newContext();const privateAudio=await outsider.request.get(baseURL+podcasts[0].src);assert.equal(privateAudio.status(),401);await outsider.close();
  console.log('PASS public podcast URL rejects unauthenticated requests');
  const adminContext=await browser.newContext();await adminContext.addCookies([{name:adminCookie.split('=')[0],value:adminCookie.split('=')[1],url:baseURL}]);const adminPage=await adminContext.newPage();
  await adminPage.goto(baseURL+'/admin');await adminPage.getByRole('heading',{name:'Öğrenme yolculukları'}).waitFor();
  const studentCard=adminPage.locator('.student-card').first();await studentCard.waitFor();await studentCard.click();await adminPage.locator('.activity-chart').waitFor();
  assert.equal(await adminPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await adminPage.screenshot({path:'work/screenshots/admin.png',fullPage:true});const studentId=(await(await page.request.get(baseURL+'/api/me')).json()).profile.id;
  const authorized=await adminContext.request.post(baseURL+'/api/admin/research-authorize',{headers:{Origin:baseURL},data:{userId:studentId,code:'D10',consentReference:'browser-test-consent',guardianConfirmed:true}});assert.equal(authorized.status(),200);
  assert.equal((await page.request.post(baseURL+'/api/research/enroll',{headers:{Origin:baseURL},data:{code:'D10',consent:true}})).status(),200);
  try{for(const src of [podcasts[0].src,podcasts[0].src.replace('/podcasts/','/%70odcasts/')])assert.equal((await page.request.get(baseURL+src)).status(),403)}finally{await page.request.post(baseURL+'/api/research/withdraw',{headers:{Origin:baseURL},data:{}})}
  console.log('PASS approved research linkage and direct/encoded podcast restrictions');
  await adminContext.close();
  await navigate('Ayarlar ve izinler');await page.getByRole('checkbox',{name:/Sesli öğrenme/}).uncheck();await page.getByRole('button',{name:'Tercihlerimi kaydet ve devam et'}).click();
  await navigate('Çıkış yap');await page.getByRole('tab',{name:'Giriş Yap'}).waitFor();
  await page.getByLabel('Kullanıcı adı',{exact:true}).fill(username);await page.getByLabel('Şifre',{exact:true}).fill('wrong-password');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await page.getByRole('alert').waitFor();
  await page.getByLabel('Şifre',{exact:true}).fill('Browser-test-password-19');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await page.getByRole('heading',{name:'Hoş geldin, Deneme!'}).waitFor();
  assert.equal((await (await page.request.get(baseURL+'/api/me')).json()).preferences.voice,0);
  await page.screenshot({path:'work/screenshots/dashboard.png',fullPage:true});
  console.log('PASS admin UI, logout/login, invalid password feedback, saved privacy preferences');
  assert.deepEqual(errors, []);
} finally { await browser.close(); }

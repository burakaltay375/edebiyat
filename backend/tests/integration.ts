import assert from "node:assert/strict";import {GET,POST} from "../app/api/[...path]/route";import {setUser,sqlite,env,testCookie} from "./env";import {schedule,mastery} from "../lib/learning";
let passed=0;function check(condition:any,message:string){assert.ok(condition,message);console.log("PASS "+message);passed++}
async function call(path:string,body?:any){const req=new Request("https://test.local/api/"+path,{method:body===undefined?"GET":"POST",headers:{"Content-Type":"application/json",Origin:"https://test.local",Cookie:testCookie},body:body===undefined?undefined:JSON.stringify(body)});const res=await (body===undefined?GET:POST)(req);return {status:res.status,data:await res.json() as any}}
const {digest}=await import('../lib/student-auth');
for(const id of ['owner','other','participant','control']){
 sqlite.prepare("INSERT INTO users(id,created_at) VALUES(?,?)").run(id,new Date().toISOString());
 sqlite.prepare("INSERT INTO student_accounts(user_id,username,first_name,last_name,password_hash,role,created_at) VALUES(?,?,?,?,?,?,?)").run(id,id,'Test','Öğrenci','fixture',id==='owner'?'admin':'student',new Date().toISOString());
 sqlite.prepare("INSERT INTO privacy_preferences(user_id,completed_at,updated_at) VALUES(?,?,?)").run(id,new Date().toISOString(),new Date().toISOString());
 setUser(id);sqlite.prepare('INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(await digest(testCookie.split('=')[1]),id,Date.now()+86400000);
}
setUser(null);check((await call("me")).status===401,"Unauthenticated request rejected");
setUser("owner");check((await call("me")).data.admin===true,"Explicit administrator role is recognized");
const c=(await call("catalog")).data;check(c.length===32&&new Set(c.map((x:any)=>x.grade_level)).size===4,"Database serves four grades and 32 topics");
check(sqlite.prepare("SELECT COUNT(*) n FROM questions").get()!.n===192,"192 question records inserted");
let s=await call("learning/start",{topicId:"t1",questionCount:5,difficulty:"easy"});check(s.status===200,"Five-question baseline starts without AI");const sid=s.data.id;
const resumed=await call("learning/start",{topicId:"t1",questionCount:5,difficulty:"easy"});check(resumed.data.id===sid,"Unfinished matching session resumes");
check((await call("learning/start",{topicId:"t1",questionCount:10,difficulty:"hard"})).status===503,"Unavailable requested question set is not silently reduced");
setUser("other");check((await call("sessions/"+sid)).status===404,"Session ownership enforced");check((await call("research")).status===403,"Research data access restricted");
setUser("owner");check((await call("quiz/submit",{sessionId:sid})).status===400,"Incomplete quiz cannot be submitted");
for(const kind of ["recall","explanation"]){let r=await call("explanation/evaluate",{sessionId:sid,kind,text:"Şiirde çağrışım ve imgeler, duyguları farklı biçimde anlatır."});check(r.status===200&&r.data.unavailable&&!r.data.feedback,"Missing AI has no invented "+kind+" score")}
const sq=(await call("sessions/"+sid)).data.questions;
check(sq.length===5&&!JSON.stringify(sq).includes("correct_answer"),"Questions hide answer keys");
const first=sq[0];for(let i=1;i<=3;i++){const r=await call("questions/answer",{sessionId:sid,questionId:first.id,answer:"yanlış seçenek"});check(r.status===200&&(i<3?!r.data.correctAnswer&&r.data.shouldRetry:r.data.correctAnswer&&r.data.resolved),"Hint ladder "+i)}
for(const q of sq.slice(1)){const row:any=sqlite.prepare("SELECT correct_answer FROM questions WHERE id=?").get(q.id);const r=await call("questions/answer",{sessionId:sid,questionId:q.id,answer:JSON.parse(row.correct_answer)[0]});check(r.data.correct,"Objective answer graded on server")}
const result=await call("quiz/submit",{sessionId:sid});check(result.status===200&&result.data.quizScore===80&&result.data.provisional,"First answers determine provisional 80% quiz score");
check(result.data.interval===1,"First completion schedules one-day review");
const again=await call("quiz/submit",{sessionId:sid});check(again.data.quizScore===80&&sqlite.prepare("SELECT COUNT(*) n FROM attempts WHERE session_id=?").get(sid)!.n===5,"Repeated submission does not duplicate attempts");
check((await call("progress")).data.progress.length===1,"Dashboard progress persists");
check(schedule(0,90,true,new Date("2026-10-05T12:00:00Z")).interval===3,"Successful review lengthens interval");check(schedule(4,20,true).interval===1,"Failure resets to one day");check(mastery(100,null,null,null,false)===100,"Missing AI evidence is not fabricated");
const protocol={topicId:"t2",durationMinutes:3,questionCount:5,difficulty:"easy",startsAt:"2020-01-01T00:00:00.000Z",endsAt:"2099-01-01T00:00:00.000Z",active:true};
check((await call("research/protocol",protocol)).status===200,"Researcher configures protocol");
sqlite.prepare("INSERT INTO research_authorizations VALUES('participant','D01','owner',?,'parent-consent-test')").run(new Date().toISOString());
sqlite.prepare("INSERT INTO research_authorizations VALUES('control','K01','owner',?,'parent-consent-test')").run(new Date().toISOString());
setUser("participant");check((await call("research/enroll",{code:"D01",consent:true})).status===200,"Participant code enrolls");
const research=await call("learning/start",{topicId:"t1",questionCount:20,difficulty:"hard"});check(research.data.topic_id==="t2"&&research.data.question_count===5&&research.data.difficulty==="easy"&&research.data.max_seconds===180,"Research overrides all student study preferences");
setUser("control");await call("research/enroll",{code:"K01",consent:true});check((await call("learning/start",{topicId:"t1"})).status===403,"Control group cannot start learning");
setUser("owner");check((await call("research/protocol",{...protocol,questionCount:10})).status===409,"Protocol cannot change after participant work starts");
check((await call("research/test",{code:"D01",phase:"post",score:70,date:"2026-10-06"})).status===400,"Post-test requires pre-test");
await call("research/test",{code:"D01",phase:"pre",score:40,date:"2026-10-05"});await call("research/test",{code:"D01",phase:"post",score:70,date:"2026-10-06"});await call("research/test",{code:"D01",phase:"retention",score:65,date:"2026-10-22"});
check(sqlite.prepare("SELECT COUNT(*) n FROM research_tests").get()!.n===3,"Three test phases stored separately");
check((await call("progress")).data.progress[0].mastery_score===80,"Research tests do not influence mastery");
const out=(await call("research")).data;check(out.participants.length===20&&!JSON.stringify(out).includes("@example.test")&&!JSON.stringify(out).includes("user_id"),"Research export omits identity");

const AIResponses:any[]=[];env.OPENAI_API_KEY="test-only";
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify(AIResponses.shift()),{headers:{"Content-Type":"application/json"}});
const wrap=(data:any)=>({status:"completed",output:[{type:"message",content:[{type:"output_text",text:JSON.stringify(data)}]}]});
const {questionAnswer}=await import("../lib/question-engine");
await call("content/approve",{topicId:"t1",approved:true});
AIResponses.push(wrap({understanding_score:90,correct_points:["Anlamı doğru kuruyor."],missing_points:[],incorrect_points:[],hint:"Açıklamana bir örnek ekle.",should_retry:false,explanatory_question:"Bu ilişkiyi nasıl örneklersin?"}));
const semantic=await questionAnswer({question_type:"explanation",question:"İmgeyi açıkla.",rubric:"Çağrışım ve tasarım ilişkisi",correct_answer:JSON.stringify(["İmge zihinsel tasarımdır."])}, "Sözcükleri yeni bağlarla zihnimizde canlandırırız.",1,"t1","owner");
check(semantic.score===90&&semantic.correct,"Semantic adapter accepts validated provider score for a paraphrase (mock)");
AIResponses.push(wrap({understanding_score:120,correct_points:[],missing_points:[],incorrect_points:[],hint:"",should_retry:false,explanatory_question:""}));
let invalid=false;try{await questionAnswer({question_type:"explanation",question:"İmge",rubric:"",correct_answer:'["imge"]'},"Örnek açıklama",1,"t1","owner")}catch{invalid=true}
check(invalid,"Invalid AI score is rejected by schema validation");

sqlite.exec("DELETE FROM ai_usage");
const {prepareQuestions}=await import("../lib/question-engine");
const src:any=sqlite.prepare("SELECT * FROM source_chunks WHERE id='t1src0'").get();
const generated=Array.from({length:5},(_,i)=>({type:["multiple_choice","true_false","cause_effect","comparison","fill_blank"][i],prompt:"Kaynak temelli farklı soru "+i,options:i===0?["A","B"]:i===1?["Doğru","Yanlış"]:[],answer:[i===0?"A":i===1?"Doğru":"Çağrışım"],explanation:"Kaynak bağlamı",rubric:"Anlamsal ilişki",difficulty:[1,2,3,1,2][i],subtopicId:"t1s0",sourceId:"t1src0",evidence:src.content.slice(0,40)}));
AIResponses.push(wrap({questions:generated}),wrap({valid:true,reason:"Test denetimi"}));
const ids=await prepareQuestions("t1",5,"mixed","owner",true);check(ids.length===5,"Dynamic question set persists exact selected count (mock provider)");
AIResponses.push(wrap({questions:generated.slice(0,4)}));
let wrongCount=false;try{await prepareQuestions("t1",5,"mixed","owner",true)}catch{wrongCount=true}check(wrongCount,"Wrong generated count is rejected");
AIResponses.push(wrap({questions:generated.map(q=>({...q,evidence:"Kaynakta bulunmayan doğrulanmamış bir alıntı"}))}));
let wrongSource=false;try{await prepareQuestions("t1",5,"mixed","owner",true)}catch{wrongSource=true}check(wrongSource,"Ungrounded generated evidence is rejected");
globalThis.fetch=originalFetch;
console.log("TOTAL "+passed+" checks passed");

// Additional regression checks: opt-in voice and shared Gemini adapter.
setUser("participant");
check((await call("me")).data.extraFeatures===false,"Experiment participants do not receive optional features");
check((await call("practice/access")).data.allowed===false,"Experiment access is denied by the server");
check((await call("tutor",{sessionId:research.data.id,message:"Konu nedir?",inputMode:"voice"})).status===403,"Voice tutor rejected for experiment participant");
check((await call("explanation/evaluate",{sessionId:research.data.id,text:"Kendi cümlelerimle konuyu anlatıyorum.",kind:"explanation",inputMode:"voice"})).status===403,"Voice explanation rejected for experiment participant");
setUser("control");check((await call("practice/access")).data.allowed===false,"Control group does not receive podcasts or voice");
setUser("owner");check((await call("me")).data.extraFeatures===true,"Ordinary student can use optional features");
const {structured,aiConfigured}=await import("../lib/ai");
const {z}=await import("zod");
const {reserveAIRequest}=await import("../lib/ai-usage");
const shape={type:"object",properties:{text:{type:"string"}},required:["text"]};
const validator=z.object({text:z.string()});
const invoke=()=>structured("test",shape,"Only approved source.",{source:"test"},validator,"owner");
env.AI_PROVIDER="gemini";delete env.GEMINI_API_KEY;sqlite.exec("DELETE FROM ai_usage");
let calls=0;globalThis.fetch=async()=>{calls++;return new Response("{}");};
check(!aiConfigured(),"Gemini without key is unconfigured");
let unavailable=false;try{await invoke()}catch(e){unavailable=(e as Error).message.includes("henüz yapılandırılmadı")}
check(unavailable&&calls===0,"Missing key has a readable error and makes no provider request");
env.GEMINI_API_KEY="mock-secret-for-test";
let requestedUrl="",requestedBody:any=null,requestedHeaders:any=null;
globalThis.fetch=async(url,options)=>{requestedUrl=String(url);requestedBody=JSON.parse(String(options?.body));requestedHeaders=options?.headers;return Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify({text:"test response"})}]}}]});};
check((await invoke()).text==="test response"&&requestedUrl.includes("gemini-2.5-flash:generateContent"),"Existing Gemini adapter defaults to 2.5 Flash");
check(requestedHeaders["x-goog-api-key"]==="mock-secret-for-test"&&!requestedUrl.includes("mock-secret")&&requestedBody.generationConfig.responseJsonSchema.required[0]==="text","Secret stays in server request header and JSON schema is preserved");
env.GEMINI_MODEL="custom-test-model";await invoke();check(requestedUrl.includes("custom-test-model:"),"Gemini model override is honored");delete env.GEMINI_MODEL;
for(const status of [403,429,500]){
 globalThis.fetch=async()=>new Response("provider details must not leak",{status});
 let message="";try{await invoke()}catch(e){message=(e as Error).message}
 check(message.length>0&&!message.includes("provider details")&&(status!==429||message.includes("kota")),"Provider HTTP "+status+" handled without leaking raw data");
}
sqlite.exec("DELETE FROM ai_usage");globalThis.fetch=async()=>{throw new DOMException("hidden-secret","TimeoutError")};
let timeout=false;try{await invoke()}catch(e){timeout=(e as Error).message.includes("süre aşımı")&&!String(e).includes("hidden-secret")}
check(timeout,"Timeout error is safe and understandable");
sqlite.exec("DELETE FROM ai_usage");
const reservations=await Promise.allSettled(Array.from({length:7},()=>reserveAIRequest("owner")));
check(reservations.filter(r=>r.status==="fulfilled").length===6,"Concurrent AI requests cannot exceed six per minute");
sqlite.exec("UPDATE ai_usage SET minute_window=minute_window-1,hour_count=60");
let hourly=false;try{await reserveAIRequest("owner")}catch{hourly=true}check(hourly,"Hour quota survives minute rollover");
// Completed text-only sessions above passed without any microphone or podcast request.
globalThis.fetch=originalFetch;delete env.GEMINI_API_KEY;delete env.AI_PROVIDER;
console.log("TOTAL "+passed+" checks passed including optional features");

// Credential, cookie, privacy and isolation coverage uses the real HTTP handlers.
async function authCall(path:string,body?:any,cookie='',origin='https://test.local'){
 const req=new Request('https://test.local/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const res=await(body===undefined?GET:POST)(req);return {status:res.status,data:await res.json() as any,cookie:res.headers.get('set-cookie')||''};
}
const registration={username:'student_a',password:'Strong-test-password-19',passwordRepeat:'Strong-test-password-19',firstName:'Ada',lastName:'Yılmaz',grade:10,role:'admin'};
const reg=await authCall('auth/register',registration);check(reg.status===200,'Registration succeeds');
check(reg.cookie.includes('HttpOnly')&&reg.cookie.includes('Secure')&&reg.cookie.includes('SameSite=Lax')&&reg.cookie.startsWith('__Host-'),'Secure host-only session cookie');
const cookieA=reg.cookie.split(';')[0];const meA=(await authCall('me',undefined,cookieA)).data;
check(!meA.admin&&!meA.preferences.voice&&!meA.preferences.analytics&&!meA.preferences.completed_at,'Registration cannot assign admin and optional consents default off');
const stored:any=sqlite.prepare('SELECT * FROM student_accounts WHERE username=?').get('student_a');
check(stored.password_hash.startsWith('pbkdf2-sha256$')&&!stored.password_hash.includes(registration.password),'Salted PBKDF2 hash stored instead of plaintext');
check(!sqlite.prepare('SELECT token_hash FROM auth_sessions WHERE token_hash=?').get(cookieA.split('=')[1]),'Raw session token is not stored');
check((await authCall('catalog',undefined,cookieA)).status===403,'First-login preference gate enforced on server');
check((await authCall('preferences',{voice:false,analytics:false},cookieA)).status===200,'Optional permissions may both be declined');
check((await authCall('catalog',undefined,cookieA)).status===200,'Text learning remains accessible without optional permissions');
check((await authCall('auth/register',registration)).status===409,'Duplicate username rejected');
check((await authCall('auth/register',{...registration,username:'student_b'})).status===200,'Same first and last name may register separately');
check((await authCall('auth/login',{username:'student_a',password:'incorrect-password'})).status===401,'Wrong password rejected');
check((await authCall('auth/login',{username:'STUDENT_A',password:registration.password})).status===200,'Username normalization and correct password login');
check((await authCall('admin/students',undefined,cookieA)).status===403,'Student cannot enumerate students');
check((await authCall('admin/students/'+meA.profile.id,undefined,cookieA)).status===403,'Student cannot access administrator detail endpoint');
check((await authCall('profile',{grade:12},cookieA,'https://evil.example')).status===403,'Cross-origin state change rejected');
check((await authCall('research/enroll',{code:'D02',consent:true},cookieA)).status===403,'Predictable research code alone cannot enroll student');
const sessionA=(await authCall('learning/start',{topicId:'t3',questionCount:5,difficulty:'easy'},cookieA)).data;
const loginB=await authCall('auth/login',{username:'student_b',password:registration.password});const cookieB=loginB.cookie.split(';')[0];await authCall('preferences',{voice:false,analytics:false},cookieB);
check((await authCall('sessions/'+sessionA.id,undefined,cookieB)).status===404,'Second credential account cannot read first account session');
check((await authCall('session/save',{sessionId:sessionA.id,stage:0,active:true},cookieB)).status===404,'Second account cannot mutate first account session');
check((await authCall('tutor',{sessionId:sessionA.id,message:'Şiir nedir?',inputMode:'voice'},cookieA)).status===403,'Server enforces voice opt-in');
sqlite.prepare('UPDATE learning_sessions SET last_heartbeat=? WHERE id=?').run(new Date(Date.now()-3600000).toISOString(),sessionA.id);
await authCall('session/save',{sessionId:sessionA.id,stage:0,active:true},cookieA);
check(sqlite.prepare('SELECT active_seconds FROM learning_sessions WHERE id=?').get(sessionA.id)!.active_seconds===0,'Long-idle heartbeat receives no credit');
await authCall('preferences',{voice:false,analytics:true},cookieA);
sqlite.prepare('UPDATE learning_sessions SET last_heartbeat=? WHERE id=?').run(new Date(Date.now()-15000).toISOString(),sessionA.id);
await authCall('session/save',{sessionId:sessionA.id,stage:0,active:true},cookieA);
check(Number(sqlite.prepare('SELECT active_seconds FROM learning_sessions WHERE id=?').get(sessionA.id)!.active_seconds)>=15,'Active study heartbeat receives bounded credit');
check(Number(sqlite.prepare('SELECT COUNT(*) n FROM learning_methods WHERE user_id=?').get(meA.profile.id)!.n)===1,'Method detail is collected only after opt-in');
await authCall('preferences',{voice:false,analytics:false},cookieA);
check(Number(sqlite.prepare('SELECT COUNT(*) n FROM learning_methods WHERE user_id=?').get(meA.profile.id)!.n)===0,'Withdrawing analytics deletes optional method history');
setUser('owner');const detail=(await call('admin/students/'+meA.profile.id)).data;
check(detail.student.first_name==='Ada'&&detail.daily.length===1&&!JSON.stringify(detail).includes('password_hash')&&!JSON.stringify(detail).includes('student_explanation'),'Admin detail contains summary and chart data, no credentials or conversations');
await authCall('auth/logout',{},cookieA);check((await authCall('me',undefined,cookieA)).status===401,'Logout revokes server session');
check((await GET(new Request('https://test.local/api/me',{headers:{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.test'}}))).status===401,'Forged identity headers cannot authenticate');
sqlite.prepare('UPDATE auth_sessions SET expires_at=0 WHERE user_id=?').run((sqlite.prepare('SELECT user_id FROM student_accounts WHERE username=?').get('student_b') as any).user_id);
check((await authCall('me',undefined,cookieB)).status===401,'Expired session rejected');
for(let i=0;i<13;i++)await authCall('auth/login',{username:'rate_limit_user',password:'wrong-password'});
check((await authCall('auth/login',{username:'rate_limit_user',password:'wrong-password'})).status===429,'Repeated login attempts are rate limited');
console.log('TOTAL '+passed+' integration checks passed');

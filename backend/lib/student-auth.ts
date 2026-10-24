import {pbkdf2, timingSafeEqual} from 'node:crypto';
import {db} from '../db/raw';
import {z} from 'zod';
const encoder=new TextEncoder();
const hex=(bytes:ArrayBuffer|Uint8Array)=>Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');
export const digest=async(value:string)=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
export async function passwordHash(password:string,salt=hex(crypto.getRandomValues(new Uint8Array(32)))){
 const value=await new Promise<Buffer>((resolve,reject)=>pbkdf2(password,salt,600000,32,'sha256',(err,key)=>err?reject(err):resolve(key)));
 return `pbkdf2-sha256$${salt}$${value.toString('hex')}`;
}
async function verify(password:string,stored:string){
 const [,salt]=stored.split('$');const actual=await passwordHash(password,salt);
 return actual.length===stored.length&&timingSafeEqual(Buffer.from(actual),Buffer.from(stored));
}
const cookieName=(req:Request)=>new URL(req.url).protocol==='https:'?'__Host-edeblab':'edeblab-local';
const token=(req:Request)=>(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName(req)+'='))?.split('=')[1];
export async function currentAccount(req:Request):Promise<any>{
 const value=token(req);if(!value||!/^[a-f0-9]{64}$/.test(value))return null;
 return db().prepare('SELECT a.user_id,a.username,a.first_name,a.last_name,a.role FROM auth_sessions s JOIN student_accounts a ON a.user_id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(value),Date.now()).first();
}
const response=(data:unknown,status=200,cookie?:string)=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
function sessionCookie(req:Request,value:string,maxAge=604800){return `${cookieName(req)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(req.url).protocol==='https:'?'; Secure':''}`;}
export async function authEndpoint(req:Request,path:string){
 if(req.method!=='POST')return response({error:'Yöntem desteklenmiyor.'},405);
 if(req.headers.get('origin')!==new URL(req.url).origin)return response({error:'Geçersiz istek kaynağı.'},403);
 const d=db();
 if(path==='auth/logout'){const value=token(req);if(value)await d.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await digest(value)).run();return response({saved:true},200,sessionCookie(req,'',0));}
 if(!['auth/login','auth/register'].includes(path))return response({error:'Bulunamadı.'},404);
 const raw=await req.text();if(raw.length>4096)return response({error:'İstek çok uzun.'},413);
 const b=z.object({username:z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,32}$/),password:z.string().min(10).max(128),firstName:z.string().trim().min(1).max(60).optional(),lastName:z.string().trim().min(1).max(60).optional(),grade:z.number().int().min(9).max(12).optional(),passwordRepeat:z.string().optional()}).parse(JSON.parse(raw));
 const window=Math.floor(Date.now()/900000);
 for(const key of ['ip:'+await digest(req.headers.get('cf-connecting-ip')||'local'),'username:'+b.username]){
 const r:any=await d.prepare('INSERT INTO auth_limits(key,window,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END,window=excluded.window RETURNING count').bind(key,window).first();
 if(r.count>(key.startsWith('ip:')?80:12))return response({error:'Çok fazla deneme. 15 dakika sonra tekrar dene.'},429);
 }
 let account:any;
 if(path==='auth/register'){
 if(!b.firstName||!b.lastName||!b.grade||b.passwordRepeat!==b.password)return response({error:'Tüm alanları doldur ve şifrelerin eşleştiğini kontrol et.'},400);
 const hash=await passwordHash(b.password);const id=crypto.randomUUID(),now=new Date().toISOString();
 try{await d.batch([
 d.prepare('INSERT INTO users(id,name,grade_level,created_at) VALUES(?,?,?,?)').bind(id,b.firstName+' '+b.lastName,b.grade,now),
 d.prepare('INSERT INTO student_accounts(user_id,username,first_name,last_name,password_hash,created_at) VALUES(?,?,?,?,?,?)').bind(id,b.username,b.firstName,b.lastName,hash,now),
 d.prepare('INSERT INTO privacy_preferences(user_id,updated_at) VALUES(?,?)').bind(id,now)
 ]);}catch(e){if(await d.prepare('SELECT user_id FROM student_accounts WHERE username=?').bind(b.username).first())return response({error:'Bu kullanıcı adı kullanılıyor.'},409);throw e;}
 account={user_id:id};
 }else{
 account=await d.prepare('SELECT user_id,password_hash FROM student_accounts WHERE username=?').bind(b.username).first();
 const valid=await verify(b.password,account?.password_hash||'pbkdf2-sha256$0000000000000000000000000000000000000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000');
 if(!account||!valid)return response({error:'Kullanıcı adı veya şifre hatalı.'},401);
 }
 const value=hex(crypto.getRandomValues(new Uint8Array(32)));
 await d.batch([d.prepare('DELETE FROM auth_sessions WHERE expires_at<?').bind(Date.now()),d.prepare('INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await digest(value),account.user_id,Date.now()+604800000)]);
 return response({saved:true},200,sessionCookie(req,value));
}

import {db} from '../db/raw';
import {z} from 'zod';
const ok=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const summary=`SELECT a.user_id,a.username,a.first_name,a.last_name,u.grade_level,
 (SELECT MAX(last_heartbeat) FROM learning_sessions WHERE user_id=u.id) last_activity,
 (SELECT COALESCE(SUM(active_seconds),0) FROM learning_sessions WHERE user_id=u.id) active_seconds,
 (SELECT COUNT(*) FROM student_progress WHERE user_id=u.id AND completed=1) completed_topics,
 (SELECT COUNT(*) FROM attempts WHERE user_id=u.id) questions,
 (SELECT COALESCE(SUM(correct),0) FROM attempts WHERE user_id=u.id) correct,
 COALESCE(p.analytics,0) analytics
 FROM student_accounts a JOIN users u ON u.id=a.user_id LEFT JOIN privacy_preferences p ON p.user_id=u.id`;
export async function accountGet(path:string,account:any){
 const d=db(),uid=account.user_id;
 if(path==='dashboard'){
 const profile:any=await d.prepare(summary+' WHERE a.user_id=?').bind(uid).first();
 const today:any=await d.prepare('SELECT active_seconds FROM learning_activity WHERE user_id=? AND day=?').bind(uid,new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Istanbul'})).first();
 return ok({...profile,today_seconds:today?.active_seconds||0});
 }
 if(path==='preferences')return ok(await d.prepare('SELECT analytics,voice,completed_at FROM privacy_preferences WHERE user_id=?').bind(uid).first());
 if(path==='admin/students'||path.startsWith('admin/students/')){
 if(account.role!=='admin')return ok({error:'Bu alan yönetici yetkisi gerektirir.'},403);
 if(path==='admin/students')return ok((await d.prepare(summary+" WHERE a.role='student' ORDER BY a.first_name,a.last_name").all()).results);
 const id=path.split('/')[2];const student:any=await d.prepare(summary+' WHERE a.user_id=?').bind(id).first();if(!student)return ok({error:'Öğrenci bulunamadı.'},404);
 const daily=(await d.prepare('SELECT day,active_seconds FROM learning_activity WHERE user_id=? ORDER BY day DESC LIMIT 35').bind(id).all()).results;
 const methods=student.analytics?(await d.prepare('SELECT method,SUM(active_seconds) active_seconds FROM learning_methods WHERE user_id=? GROUP BY method').bind(id).all()).results:[];
 return ok({student,daily,methods});
 }
 return null;
}
export async function accountPost(path:string,body:unknown,account:any){
 if(path==='admin/research-authorize'){
  if(account.role!=='admin')return ok({error:'Yönetici yetkisi gerekiyor.'},403);
  const b=z.object({userId:z.string().uuid(),code:z.string().regex(/^[DK](0[1-9]|10)$/),consentReference:z.string().trim().min(3).max(200),guardianConfirmed:z.literal(true)}).parse(body);
  const d=db();const student=await d.prepare("SELECT user_id FROM student_accounts WHERE user_id=? AND role='student'").bind(b.userId).first();if(!student)return ok({error:'Öğrenci bulunamadı.'},404);
  const linked=await d.prepare('SELECT code FROM research_participants WHERE (code=? AND user_id IS NOT NULL) OR user_id=?').bind(b.code,b.userId).first();if(linked)return ok({error:'Hesap veya kod zaten araştırmaya bağlı.'},409);
  await d.prepare('INSERT INTO research_authorizations(user_id,code,approved_by,approved_at,consent_reference) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET code=excluded.code,approved_by=excluded.approved_by,approved_at=excluded.approved_at,consent_reference=excluded.consent_reference').bind(b.userId,b.code,account.user_id,new Date().toISOString(),b.consentReference).run();return ok({saved:true});
 }
 if(path!=='preferences')return null;
 const b=z.object({analytics:z.boolean(),voice:z.boolean()}).parse(body);const now=new Date().toISOString();const d=db();
 const statements=[d.prepare('INSERT INTO privacy_preferences(user_id,analytics,voice,completed_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET analytics=excluded.analytics,voice=excluded.voice,completed_at=COALESCE(completed_at,excluded.completed_at),updated_at=excluded.updated_at').bind(account.user_id,+b.analytics,+b.voice,now,now)];
 if(!b.analytics)statements.push(d.prepare('DELETE FROM learning_methods WHERE user_id=?').bind(account.user_id));
 await d.batch(statements);return ok({saved:true});
}

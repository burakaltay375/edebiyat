import {db} from "../db/raw";
export async function topicDetail(id:string){
 const d=db();const topic=await d.prepare("SELECT t.*,u.grade_level,u.title unit_title,u.source FROM topics t JOIN units u ON u.id=t.unit_id WHERE t.id=?").bind(id).first();
 if(!topic)return null;
 const lessons=await d.prepare("SELECT l.*,s.title subtopic_title FROM lesson_contents l JOIN subtopics s ON s.id=l.subtopic_id WHERE s.topic_id=? AND l.review_status!='archived'").bind(id).all();
 const subs=await d.prepare("SELECT * FROM subtopics WHERE topic_id=?").bind(id).all();
 const questions=await d.prepare("SELECT q.id,q.subtopic_id,q.question_type,q.question,q.options FROM questions q JOIN subtopics s ON s.id=q.subtopic_id WHERE s.topic_id=? ORDER BY q.id").bind(id).all();
 return {...topic,lessons:lessons.results.map((l:any)=>({...l,key_points:JSON.parse(l.key_points)})),subtopics:subs.results,questions:questions.results.map((q:any)=>({...q,options:JSON.parse(q.options)}))};
}
export async function progress(user:string){
 const d=db();const [p,r,s,sub]=await Promise.all([
 d.prepare("SELECT p.*,t.title,u.grade_level FROM student_progress p JOIN topics t ON t.id=p.topic_id JOIN units u ON u.id=t.unit_id WHERE p.user_id=?").bind(user).all(),
 d.prepare("SELECT r.*,t.title,u.grade_level FROM review_schedule r JOIN topics t ON t.id=r.topic_id JOIN units u ON u.id=t.unit_id WHERE r.user_id=? ORDER BY r.next_review").bind(user).all(),
 d.prepare("SELECT s.*,t.title FROM learning_sessions s JOIN topics t ON t.id=s.topic_id WHERE s.user_id=? ORDER BY s.started_at DESC LIMIT 100").bind(user).all(),
 d.prepare("SELECT p.*,s.title,s.topic_id FROM subtopic_progress p JOIN subtopics s ON s.id=p.subtopic_id WHERE p.user_id=?").bind(user).all()
 ]);return {progress:p.results,reviews:r.results,sessions:s.results,subtopics:sub.results};
}

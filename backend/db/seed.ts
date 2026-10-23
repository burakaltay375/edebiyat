import curriculum from "../data/curriculum.json";import questions from "../data/questions.json";import {db} from "./raw";
export async function ensureSeed(){
 const d=db();if(await d.prepare("SELECT value FROM app_meta WHERE key='seed_v1'").first())return;
 const queries:D1PreparedStatement[]=[];
 for(const n of [9,10,11,12])queries.push(d.prepare("INSERT OR IGNORE INTO grades(id,title) VALUES(?,?)").bind(n,n+". sınıf"));
 for(const u of curriculum){
 queries.push(d.prepare("INSERT OR IGNORE INTO units(id,grade_level,title,sort_order,source) VALUES(?,?,?,?,?)").bind(u.id,u.grade,u.title,u.order,u.source));
 for(const t of u.topics){
 queries.push(d.prepare("INSERT OR IGNORE INTO topics(id,unit_id,title,description) VALUES(?,?,?,?)").bind(t.id,u.id,t.title,t.prompt));
 for(let i=0;i<3;i++)queries.push(d.prepare("INSERT OR IGNORE INTO subtopics(id,topic_id,title) VALUES(?,?,?)").bind(t.id+"s"+i,t.id,["Temel kavramlar","Metin çözümleme","Kavram ilişkileri"][i]));
 queries.push(d.prepare("INSERT OR IGNORE INTO lesson_contents(id,subtopic_id,content,key_points,example,recall_prompt,source,review_status) VALUES(?,?,?,?,?,?,?,?)").bind(t.id+"c",t.id+"s0",t.body,JSON.stringify(t.concepts),t.example,t.prompt,u.source,"draft"));
 }}
 for(const u of curriculum)for(const t of u.topics)for(let i=0;i<3;i++){
 queries.push(d.prepare("INSERT OR IGNORE INTO learning_outcomes(id,subtopic_id,code,description) VALUES(?,?,?,?)").bind(t.id+"o"+i,t.id+"s"+i,"YEREL-"+t.id+"-"+i,t.prompt));
 queries.push(d.prepare("INSERT OR IGNORE INTO source_chunks(id,outcome_id,content,source_name,source_url,section,curriculum_year,review_status) VALUES(?,?,?,?,?,?,?,'draft')").bind(t.id+"src"+i,t.id+"o"+i,t.body+" "+t.example,"MEB programı doğrultusunda hazırlanmış taslak",u.source,u.title,"2024"));
}
 for(const q of questions)queries.push(d.prepare("INSERT OR IGNORE INTO questions(id,subtopic_id,question_type,question,options,correct_answer,explanation,difficulty) VALUES(?,?,?,?,?,?,?,?)").bind(q.id,q.subtopicId,q.type,q.prompt,JSON.stringify(q.options),JSON.stringify(q.answer),q.explanation,1));
 for(let i=1;i<=10;i++)for(const g of ["D","K"])queries.push(d.prepare("INSERT OR IGNORE INTO research_participants(code,group_name,consent) VALUES(?,?,0)").bind(g+String(i).padStart(2,"0"),g==="D"?"deney":"kontrol"));
 for(let i=0;i<queries.length;i+=40)await d.batch(queries.slice(i,i+40));
 await d.prepare("INSERT OR IGNORE INTO app_meta(key,value) VALUES('seed_v1','1')").run();
}

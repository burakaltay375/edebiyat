import {db} from "../db/raw";import {z} from "zod";
export async function sourceContext(topicId:string){
 const rows=await db().prepare("SELECT c.*,o.code outcome_code,o.description outcome,s.id subtopic_id,s.title subtopic_title FROM source_chunks c JOIN learning_outcomes o ON o.id=c.outcome_id JOIN subtopics s ON s.id=o.subtopic_id WHERE s.topic_id=? AND c.review_status='approved' ORDER BY c.id LIMIT 20").bind(topicId).all();
 return rows.results as any[];
}
export const ContentImport=z.object({grade:z.number().int().min(9).max(12),unit:z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),title:z.string().min(1).max(200),order:z.number().int().min(1).max(100)}),topic:z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),title:z.string().min(1).max(200),description:z.string().max(1000)}),subtopics:z.array(z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),title:z.string(),outcomeCode:z.string(),outcome:z.string(),content:z.string().min(30).max(12000),keyPoints:z.array(z.string()).max(12),example:z.string(),recallPrompt:z.string(),sourceName:z.string(),sourceUrl:z.string().url().refine(v=>{const h=new URL(v).hostname;return h==="meb.gov.tr"||h.endsWith(".meb.gov.tr")||h==="eba.gov.tr"||h.endsWith(".eba.gov.tr")},"MEB veya EBA kaynağı gerekli."),section:z.string(),curriculumYear:z.string()})).min(1).max(8)});
export async function importContent(input:unknown){
 const b=ContentImport.parse(input);const d=db();
 const priorUnit:any=await d.prepare("SELECT grade_level FROM units WHERE id=?").bind(b.unit.id).first();
 const priorTopic:any=await d.prepare("SELECT unit_id FROM topics WHERE id=?").bind(b.topic.id).first();
 if(priorUnit&&priorUnit.grade_level!==b.grade)throw new Error("Ünite kimliği başka bir sınıfa ait.");
 if(priorTopic&&priorTopic.unit_id!==b.unit.id)throw new Error("Konu kimliği başka bir üniteye ait.");
 for(const s of b.subtopics){const prior:any=await d.prepare("SELECT topic_id FROM subtopics WHERE id=?").bind(s.id).first();if(prior&&prior.topic_id!==b.topic.id)throw new Error("Alt konu kimliği başka bir konuya ait.");}
 const commands=[
 d.prepare("UPDATE lesson_contents SET review_status='archived' WHERE subtopic_id IN(SELECT id FROM subtopics WHERE topic_id=?)").bind(b.topic.id),
 d.prepare("UPDATE source_chunks SET review_status='archived' WHERE outcome_id IN(SELECT o.id FROM learning_outcomes o JOIN subtopics s ON s.id=o.subtopic_id WHERE s.topic_id=?)").bind(b.topic.id),
 d.prepare("UPDATE questions SET generated=-1 WHERE subtopic_id IN(SELECT id FROM subtopics WHERE topic_id=?)").bind(b.topic.id),
 d.prepare("INSERT INTO units(id,grade_level,title,sort_order,source) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,sort_order=excluded.sort_order,source=excluded.source").bind(b.unit.id,b.grade,b.unit.title,b.unit.order,b.subtopics[0].sourceUrl),
 d.prepare("INSERT INTO topics(id,unit_id,title,description) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description").bind(b.topic.id,b.unit.id,b.topic.title,b.topic.description)];
 for(const s of b.subtopics){
 commands.push(d.prepare("INSERT INTO subtopics(id,topic_id,title) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title").bind(s.id,b.topic.id,s.title));
 commands.push(d.prepare("INSERT INTO learning_outcomes(id,subtopic_id,code,description) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET code=excluded.code,description=excluded.description").bind(s.id+"-o",s.id,s.outcomeCode,s.outcome));
 commands.push(d.prepare("INSERT INTO source_chunks(id,outcome_id,content,source_name,source_url,section,curriculum_year,review_status) VALUES(?,?,?,?,?,?,?,'draft') ON CONFLICT(id) DO UPDATE SET content=excluded.content,source_name=excluded.source_name,source_url=excluded.source_url,section=excluded.section,curriculum_year=excluded.curriculum_year,review_status='draft'").bind(s.id+"-src",s.id+"-o",s.content,s.sourceName,s.sourceUrl,s.section,s.curriculumYear));
 commands.push(d.prepare("INSERT INTO lesson_contents(id,subtopic_id,content,key_points,example,recall_prompt,source,review_status,source_name,source_section,curriculum_year) VALUES(?,?,?,?,?,?,?,'draft',?,?,?) ON CONFLICT(id) DO UPDATE SET content=excluded.content,key_points=excluded.key_points,example=excluded.example,recall_prompt=excluded.recall_prompt,source=excluded.source,source_name=excluded.source_name,source_section=excluded.source_section,curriculum_year=excluded.curriculum_year,review_status='draft',version=version+1").bind(s.id+"-c",s.id,s.content,JSON.stringify(s.keyPoints),s.example,s.recallPrompt,s.sourceUrl,s.sourceName,s.section,s.curriculumYear));
 }await d.batch(commands);return {saved:true,topicId:b.topic.id};
}

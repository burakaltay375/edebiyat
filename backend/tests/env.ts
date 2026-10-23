import {DatabaseSync} from "node:sqlite";import fs from "node:fs";
export const sqlite=new DatabaseSync(":memory:");sqlite.exec("PRAGMA foreign_keys=ON");
for(const file of fs.readdirSync("./drizzle").filter(x=>x.endsWith(".sql")).sort())sqlite.exec(fs.readFileSync("./drizzle/"+file,"utf8"));
function prepared(sql:string,args:any[]=[]):any{return {bind(...a:any[]){return prepared(sql,a)},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){const r=sqlite.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}}}}}
export const env:any={DB:{prepare:prepared,async batch(statements:any[]){sqlite.exec("BEGIN");try{const result=[];for(const s of statements)result.push(await s.run());sqlite.exec("COMMIT");return result}catch(e){sqlite.exec("ROLLBACK");throw e}}}};
export let requestHeaders=new Headers();
export function setUser(id:string|null){requestHeaders=new Headers(id?{"oai-authenticated-user-id":id,"oai-authenticated-user-email":id+"@example.test"}:{})}

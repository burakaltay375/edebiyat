export async function request<T=any>(path:string,body?:unknown):Promise<T>{
 const r=await fetch("/api/"+path,{method:body===undefined?"GET":"POST",headers:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
 const d:any=await r.json();if(!r.ok){if(d.signin)throw new Error("SIGNIN");throw new Error(d.error||"İşlem tamamlanamadı.");}return d;
}
export const dateLabel=(value:string)=>new Date(value).toLocaleDateString("tr-TR",{day:"numeric",month:"long"});

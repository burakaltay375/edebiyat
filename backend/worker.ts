import handler from "vinext/server/fetch-handler";
import {currentAccount} from './lib/student-auth';
type Bindings={DB:D1Database;ASSETS:Fetcher};
export default {
 async fetch(request:Request,env:Bindings,ctx:ExecutionContext){
  const url=new URL(request.url);let pathname:string;
  try{pathname=new URL(decodeURIComponent(url.pathname).replaceAll("\\","/"),url.origin).pathname}catch{return new Response('Geçersiz dosya yolu.',{status:400})}
  // Public identity headers never authenticate a student or administrator.
  const headers=new Headers(request.headers);for(const key of [...headers.keys()])if(key.startsWith('oai-authenticated-')||key==='x-edebiyat-gateway-secret')headers.delete(key);
  const trustedRequest=new Request(request,{headers});
  if(pathname==='/admin'||pathname.startsWith('/admin/')){const account=await currentAccount(request);if(!account)return Response.redirect(new URL('/',url).href,302);if(account.role!=='admin')return new Response('Bu alan yönetici yetkisi gerektirir.',{status:403,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}})}
  if(pathname.startsWith('/podcasts/')){
   const account=await currentAccount(request);if(!account)return new Response('Podcast için giriş yapmalısın.',{status:401});
   const participant=await env.DB.prepare('SELECT code FROM research_participants WHERE user_id=? AND consent=1').bind(account.user_id).first();
   if(participant)return new Response('Podcast araştırma protokolüne dahil değil.',{status:403});
   const asset=await env.ASSETS.fetch(trustedRequest);const assetHeaders=new Headers(asset.headers);assetHeaders.set('Cache-Control','private, no-store');assetHeaders.set('Accept-Ranges','bytes');
   // The local production asset binding may ignore Range. Preserve native 206
   // responses; otherwise satisfy a single byte range for seekable MP3 playback.
   const range=request.headers.get('range');
   if(range&&asset.status===200&&request.method==='GET'){
    const match=/^bytes=(\d*)-(\d*)$/.exec(range);
    if(match&&(match[1]||match[2])){
     const bytes=await asset.arrayBuffer(),size=bytes.byteLength;
     const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
     const end=match[1]?(match[2]?Math.min(size-1,Number(match[2])):size-1):size-1;
     if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size){assetHeaders.set('Content-Range',`bytes */${size}`);assetHeaders.delete('Content-Length');return new Response(null,{status:416,headers:assetHeaders})}
     assetHeaders.set('Content-Range',`bytes ${start}-${end}/${size}`);assetHeaders.set('Content-Length',String(end-start+1));return new Response(bytes.slice(start,end+1),{status:206,headers:assetHeaders});
    }
   }
   return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers:assetHeaders});
  }
  // With run_worker_first enabled, explicitly forward Vite modules and public assets.
  const publicAsset=pathname.startsWith('/assets/')||pathname.startsWith('/_next/static/')||['/favicon.svg','/literary-scene.svg','/site.webmanifest','/icon-180.png','/icon-192.png','/icon-512.png'].includes(pathname);
  const devAsset=import.meta.env.DEV&&['/@','/app/','/components/','/features/','/lib/','/node_modules/','/data/','/hooks/'].some(prefix=>pathname.startsWith(prefix))&&!pathname.startsWith('/app/api/');
  if(publicAsset||devAsset)return env.ASSETS.fetch(trustedRequest);
  const response=await handler.fetch(trustedRequest,env,ctx);const secured=new Response(response.body,response);
  secured.headers.set('X-Content-Type-Options','nosniff');secured.headers.set('Referrer-Policy','same-origin');secured.headers.set('X-Frame-Options','DENY');
  return secured;
 }
};

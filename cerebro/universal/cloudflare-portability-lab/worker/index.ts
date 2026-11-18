/**
 * CEREBRO Cloudflare portability QA — NOT FOR DEPLOYMENT.
 * All API routes fail CLOSED; no Supabase calls, writes or credentials.
 */
import {queryCerebroAgentDirectoryV0} from '../../../../api/cerebro-agent-directory.ts';
type Bindings={ASSETS?:{fetch:(request:Request)=>Promise<Response>}};
const fixed={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','X-Robots-Tag':'noindex,nofollow'};
const deny=(status:number,reason:string)=>new Response(JSON.stringify({ok:false,reason,executed:false,production_authorized:false}),{status,headers:{...fixed,'Content-Type':'application/json; charset=utf-8'}});
/** Reads the real local JSON + compressed UMS registry; no backend/network. */
export function offlineCatalogCheck(){
 const result=queryCerebroAgentDirectoryV0(new URLSearchParams({company_id:'fenix',kind:'ALL',limit:'25'}));
 return {total:result.page.total,read_only:result.read_only,executed:result.executed,verified_live:result.active_agents_verified};
}
export default {
 async fetch(request:Request,env:Bindings):Promise<Response>{
  const u=new URL(request.url),path=u.pathname;
  if(path==='/api/cerebro-agent-directory'){
   if(request.method!=='GET')return deny(405,'READ_ONLY');
   const origin=request.headers.get('origin');
   if(origin&&origin!==u.origin)return deny(403,'ORIGIN_DENIED');
   if(offlineCatalogCheck().total!==2506)return deny(503,'SOURCE_INTEGRITY_FAILED');
   return deny(503,'CLOUDFLARE_PORTABILITY_LAB_API_DISABLED');
  }
  if(path.startsWith('/api/'))return deny(503,'CLOUDFLARE_PORTABILITY_LAB_API_DISABLED');
  if(!['GET','HEAD'].includes(request.method))return deny(405,'READ_ONLY');
  if(!env?.ASSETS)return deny(503,'STATIC_ASSETS_UNAVAILABLE');
  const response=await env.ASSETS.fetch(request);
  const headers=new Headers(response.headers);headers.set('X-Robots-Tag','noindex,nofollow');headers.set('X-Content-Type-Options','nosniff');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 }
};
/** Isolated PREVIEW-only server-verified owner identity. No DB writes. */
type H=string|string[]|undefined;
type Req={method?:string;headers:Record<string,H>};
type Res={status:(code:number)=>Res;setHeader:(key:string,value:string)=>void;json:(value:unknown)=>void};
function h(value:H){return Array.isArray(value)?value[0]||'':value||''}
const TARGET='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const PREVIEW_HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 res.setHeader('Vary','Authorization');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({allowed:false,reason:'METHOD_NOT_ALLOWED'});
 const host=h(req.headers.host).toLowerCase();
 if(process.env.VERCEL_ENV!=='preview'||!PREVIEW_HOST.test(host))
  return res.status(403).json({allowed:false,reason:'LAB_ONLY'});
 const origin=h(req.headers.origin);
 if(origin&&origin!=='https://'+host)
  return res.status(403).json({allowed:false,reason:'ORIGIN_NOT_ALLOWED'});
 const bearer=h(req.headers.authorization),apikey=h(req.headers.apikey);
 if(!/^Bearer\s+\S{20,}$/i.test(bearer)||!apikey)
  return res.status(401).json({allowed:false,reason:'AUTH_REQUIRED'});
 try{
  const response=await fetch(TARGET,{
   method:'GET',headers:{authorization:bearer,apikey,accept:'application/json'},
   signal:AbortSignal.timeout(6500),cache:'no-store'
  });
  if(response.status!==200)return res.status(403).json({allowed:false,reason:'OWNER_NOT_VERIFIED'});
  const value:unknown=await response.json();
  const raw=value&&typeof value==='object'?value as Record<string,unknown>:{};
  const ctx=raw.context&&typeof raw.context==='object'?raw.context as Record<string,unknown>:raw;
  if(ctx.actor_code!=='CARLOS-ADMIN')
   return res.status(403).json({allowed:false,reason:'OWNER_NOT_VERIFIED'});
  return res.status(200).json({allowed:true,source:'SERVER_VERIFIED_OWNER_CONTEXT'});
 }catch{return res.status(503).json({allowed:false,reason:'OWNER_CONTEXT_UNAVAILABLE'})}
}

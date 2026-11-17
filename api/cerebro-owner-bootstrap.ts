/**
 * Owner-only staged-production identity/navigation bridge.
 * Browser -> same-origin GET -> existing Fénix PROD Gateway. This bypasses
 * the BROWSER's CORS restriction, never the upstream server's auth/RBAC.
 * No service role, cookies, credentials persistence, write verbs or new grants.
 */
type H=string|string[]|undefined;
type Req={method?:string;url?:string;headers:Record<string,H>;query?:Record<string,H>};
type Res={status:(code:number)=>Res;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void};
const header=(v:H)=>Array.isArray(v)?v[0]||'':v||'';
const HOST=/^fenix-capital-preprod-[a-z0-9]+\.vercel\.app$/;
const BASE='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway';
const PATHS:Record<string,string>={context:'/session/context',navigation:'/navigation'};
function object(v:unknown):Record<string,unknown>|null{
 return v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:null;
}
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('Vary','Authorization, Origin');
 res.setHeader('X-Content-Type-Options','nosniff');
 const host=header(req.headers.host).toLowerCase();
 // The real app domain is NEVER an allowed host; no PROD behavior changes.
 if(process.env.VERCEL_ENV!=='production'||!HOST.test(host))
  return res.status(403).json({ok:false,reason:'STAGED_HOST_ONLY'});
 if(req.method!=='GET')
  return res.status(405).json({ok:false,reason:'READ_ONLY'});
 const origin=header(req.headers.origin);
 if(origin&&origin!=='https://'+host)
  return res.status(403).json({ok:false,reason:'ORIGIN_DENIED'});
 const resource=header(req.query?.resource)||new URL(req.url||'/', 'https://'+host).searchParams.get('resource')||'';
 if(!Object.hasOwn(PATHS,resource))
  return res.status(404).json({ok:false,reason:'RESOURCE_DENIED'});
 const bearer=header(req.headers.authorization);
 const apikey=header(req.headers.apikey);
 if(!/^Bearer [A-Za-z0-9._-]{40,8192}$/.test(bearer)||!/^sb_publishable_[A-Za-z0-9_-]{12,128}$/.test(apikey))
  return res.status(401).json({ok:false,reason:'OWNER_SESSION_REQUIRED'});
 const headers={authorization:bearer,apikey,accept:'application/json'};
 try{
  // Verify owner afresh for EVERY request; do not trust user_metadata or UI.
  const owner=await fetch(BASE+'/session/context',{method:'GET',headers,
   cache:'no-store',redirect:'error',signal:AbortSignal.timeout(6500)});
  if(owner.status!==200)return res.status(owner.status>=500?503:401).json({ok:false,reason:'OWNER_SESSION_UNVERIFIED'});
  const ownerRaw:unknown=await owner.json();
  const body=object(ownerRaw);
  const ctx=object(body?.context)||body;
  if(body?.ok===false||ctx?.actor_code!=='CARLOS-ADMIN')
   return res.status(403).json({ok:false,reason:'OWNER_NOT_AUTHORIZED'});
  if(resource==='context')return res.status(200).json(ownerRaw);
  const nav=await fetch(BASE+PATHS.navigation,{method:'GET',headers,
   cache:'no-store',redirect:'error',signal:AbortSignal.timeout(6500)});
  if(nav.status!==200)return res.status(nav.status>=500?503:403).json({ok:false,reason:'NAVIGATION_UNAVAILABLE'});
  const navRaw:unknown=await nav.json();
  const parsed=object(navRaw);
  if(!parsed||parsed.ok===false||JSON.stringify(navRaw).length>150000)
   return res.status(502).json({ok:false,reason:'NAVIGATION_INVALID'});
  return res.status(200).json(navRaw);
 }catch{
  return res.status(503).json({ok:false,reason:'OWNER_GATEWAY_UNAVAILABLE'});
 }
}

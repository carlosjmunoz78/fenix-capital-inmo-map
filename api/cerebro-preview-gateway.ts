/**
 * CEREBRO Operativa Premium V3 — isolated PREVIEW owner-only gateway.
 * Strict allowlist; no service-role key, no proxy URL input, no storage,
 * no permission grants, no production CORS edits and no action confirmations.
 */
type H=string|string[]|undefined;
type Req={method?:string;url?:string;headers:Record<string,H>;query?:Record<string,string|string[]|undefined>;body?:unknown};
type Res={status:(code:number)=>Res;setHeader:(key:string,value:string)=>void;json:(value:unknown)=>void};
function hdr(v:H){return Array.isArray(v)?v[0]||'':v||''}
const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
const BASE='https://cluhljgonannaafpmblx.supabase.co/functions/v1/';
const RESOURCES:Record<string,{path:string;method:'GET'|'POST'}>={
 health:{path:'cerebro-console-gateway-v0/health',method:'GET'},
 preferences:{path:'cerebro-console-gateway-v0/preferences',method:'GET'},
 chat:{path:'cerebro-console-gateway-v0/chat',method:'POST'},
 activity:{path:'cerebro-console-activity-v0/',method:'GET'},
 universe:{path:'cerebro-console-gateway-v36-followups-lab/owner-universe',method:'GET'}
};
const SCOPE=new Set(['all','fenix','aion','captacasa']);
function object(value:unknown):Record<string,unknown>|null{
 return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null
}
function shortText(v:unknown,max:number){return typeof v==='string'?v.slice(0,max):''}
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('Vary','Authorization');
 res.setHeader('X-Content-Type-Options','nosniff');
 const host=hdr(req.headers.host).toLowerCase();
 if(process.env.VERCEL_ENV!=='preview'||!HOST.test(host))
  return res.status(403).json({status:'CLOSED',reason:'PREVIEW_ONLY'});
 const origin=hdr(req.headers.origin);
 if(origin&&origin!=='https://'+host)
  return res.status(403).json({status:'CLOSED',reason:'ORIGIN_NOT_ALLOWED'});
 const source=hdr(req.query?.resource)||new URL(req.url||'/', 'https://'+host).searchParams.get('resource')||'';
 const rule=RESOURCES[source];
 if(!rule)return res.status(404).json({status:'CLOSED',reason:'RESOURCE_NOT_ALLOWED'});
 if(req.method!==rule.method)return res.status(405).json({status:'CLOSED',reason:'METHOD_NOT_ALLOWED'});
 const bearer=hdr(req.headers.authorization),apikey=hdr(req.headers.apikey);
 if(!/^Bearer\s+\S{20,}$/i.test(bearer)||!apikey||apikey.length>256)
  return res.status(401).json({status:'CLOSED',reason:'AUTH_REQUIRED'});
 const userHeaders={authorization:bearer,apikey,accept:'application/json'};
 try{
  // Re-check server-linked owner identity on EVERY request. Never trust user_metadata.
  const owner=await fetch(BASE+'fenix-app-gateway/session/context',{
   method:'GET',headers:userHeaders,cache:'no-store',signal:AbortSignal.timeout(6500)
  });
  if(owner.status!==200)return res.status(403).json({status:'CLOSED',reason:'OWNER_DENIED'});
  const raw=object(await owner.json());
  const identity=object(raw?.context)||raw;
  if(identity?.actor_code!=='CARLOS-ADMIN')
   return res.status(403).json({status:'CLOSED',reason:'OWNER_DENIED'});
  let path=rule.path;
  if(source==='universe'){
   const scope=hdr(req.query?.company_id)||new URL(req.url||'/', 'https://'+host).searchParams.get('company_id')||'';
   if(!SCOPE.has(scope))return res.status(400).json({status:'CLOSED',reason:'COMPANY_SCOPE_DENIED'});
   path+='?company_id='+encodeURIComponent(scope);
  }
  let postBody:string|undefined;
  if(source==='chat'){
   const body=object(req.body);
   const message=shortText(body?.message,4001).trim();
   if(!message||message.length>4000)
    return res.status(400).json({status:'CLOSED',reason:'INVALID_MESSAGE'});
   // Read-only preview: never forward pending actions, confirmation tokens or learning writes.
   const turns=Array.isArray(body?.conversation_context)?body.conversation_context.slice(-10):[];
   const context=turns.map(x=>{
    const item=object(x);
    return{role:item?.role==='user'?'user':'cerebro',text:shortText(item?.text,1200)}
   }).filter(x=>x.text);
   postBody=JSON.stringify({message,conversation_context:context,pending_action:null,read_context:null,learning_candidate:null});
  }
  const response=await fetch(BASE+path,{
   method:rule.method,
   headers:{...userHeaders,...(postBody?{'content-type':'application/json'}:{})},
   body:postBody,
   cache:'no-store',signal:AbortSignal.timeout(source==='chat'?20000:9500)
  });
  const length=Number(response.headers.get('content-length')||'0');
  if(length>160000)return res.status(502).json({status:'ERROR',reason:'RESPONSE_TOO_LARGE'});
  let result:unknown=null;
  try{result=await response.json()}catch{return res.status(502).json({status:'ERROR',reason:'INVALID_UPSTREAM_RESPONSE'})}
  return res.status(response.status).json(result);
 }catch{return res.status(503).json({status:'ERROR',reason:'PREVIEW_GATEWAY_UNAVAILABLE'})}
}

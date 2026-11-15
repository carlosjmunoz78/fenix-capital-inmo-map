/** LAB PREVIEW owner-only live fleet observation. Read-only; no secrets or run controls. */
import registry from '../cerebro/registry/role-agent-registry.v1.json';
import {summarizeFleetRoles,summarizeFleetRuns} from '../cerebro/universal/v0/operator-fleet-logic.mjs';
type H=string|string[]|undefined;
type Req={method?:string;url?:string;headers:Record<string,H>};
type Res={status:(s:number)=>Res;setHeader:(k:string,v:string)=>void;json:(o:unknown)=>void};
const HNAME=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
const SOURCES=[
 {platform:'GitHub',repo:'carlosjmunoz78/fenix-capital-inmo-map',name:'App / CEREBRO'},
 {platform:'GitHub',repo:'carlosjmunoz78/capital-mapa-pro',name:'FACT / Web'}
] as const;
const PRIVATE={platform:'GitHub',repo:'carlosjmunoz78/fenix-capital-cerebro-social',name:'Social / AUTOQUAL',
 state:'UNAVAILABLE',reason:'PRIVATE_REPO_RUNTIME_CONNECTOR_NOT_CONFIGURED',
 observed_at:null,observed_sample:null,active_in_sample:null,queued_in_sample:null,total_repo_run_count:null,recent:[]};
const CONNECTORS=['Cloudflare','Supabase (inventario global)','Vercel (inventario global)','Hostinger','Notion','WordPress','Meta / Instagram','LinkedIn','Navegadores','Trading aislado'];
const ownerUrl='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const hdr=(v:H)=>Array.isArray(v)?v[0]||'':v||'';
async function observe(item:typeof SOURCES[number]){
 try{
  const url='https://api.github.com/repos/'+item.repo+'/actions/runs?per_page=35';
  const response=await fetch(url,{method:'GET',redirect:'error',cache:'no-store',
   headers:{Accept:'application/vnd.github+json','User-Agent':'CEREBRO-OS-Fleet-Preview-LAB','X-GitHub-Api-Version':'2022-11-28'},
   signal:AbortSignal.timeout(6500)});
  if(response.status!==200)return{...item,state:'UNAVAILABLE',
   reason:response.status===403||response.status===429?'GITHUB_RATE_LIMIT_OR_DENIED':'SOURCE_HTTP_UNAVAILABLE',
   observed_at:null,observed_sample:null,active_in_sample:null,queued_in_sample:null,total_repo_run_count:null,recent:[]};
  const raw=await response.json();
  const parsed=summarizeFleetRuns(raw,item.repo);
  if(!parsed)throw Error('SOURCE_CONTRACT_INVALID');
  return{...item,state:'LIVE',reason:null,observed_at:new Date().toISOString(),...parsed};
 }catch{return{...item,state:'UNAVAILABLE',reason:'SOURCE_UNREACHABLE_OR_INVALID',
  observed_at:null,observed_sample:null,active_in_sample:null,queued_in_sample:null,total_repo_run_count:null,recent:[]}}
}
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('Vary','Authorization');
 res.setHeader('X-Content-Type-Options','nosniff');
 const host=hdr(req.headers.host).toLowerCase();
 if(process.env.VERCEL_ENV!=='preview'||!HNAME.test(host))
  return res.status(403).json({status:'CLOSED',reason:'PREVIEW_ONLY'});
 if(req.method!=='GET')return res.status(405).json({status:'CLOSED',reason:'READ_ONLY'});
 const origin=hdr(req.headers.origin);
 if(origin&&origin!=='https://'+host)return res.status(403).json({status:'CLOSED',reason:'ORIGIN_DENIED'});
 const url=new URL(req.url||'/','https://'+host);
 if([...url.searchParams.keys()].some(k=>k!=='company_id')||url.searchParams.get('company_id')!=='fenix')
  return res.status(403).json({status:'CLOSED',reason:'FENIX_LAB_SCOPE_ONLY'});
 const bearer=hdr(req.headers.authorization),apikey=hdr(req.headers.apikey);
 if(!/^Bearer\s+\S{20,8192}$/i.test(bearer)||apikey.length<12||apikey.length>256)
  return res.status(401).json({status:'CLOSED',reason:'AUTH_REQUIRED'});
 let identity:Record<string,unknown>|null=null;
 try{
  const auth=await fetch(ownerUrl,{method:'GET',redirect:'error',cache:'no-store',
   headers:{authorization:bearer,apikey,accept:'application/json'},signal:AbortSignal.timeout(6500)});
  if(auth.status!==200)return res.status(403).json({status:'CLOSED',reason:'OWNER_DENIED'});
  const p=await auth.json();
  identity=p&&typeof p==='object'?(p.context&&typeof p.context==='object'?p.context:p):null;
 }catch{return res.status(503).json({status:'UNAVAILABLE',reason:'OWNER_RESOLVER_UNAVAILABLE'})}
 if(identity?.actor_code!=='CARLOS-ADMIN')
  return res.status(403).json({status:'CLOSED',reason:'OWNER_DENIED'});
 const roles=summarizeFleetRoles(registry);
 if(!roles)return res.status(503).json({status:'UNAVAILABLE',reason:'ROLE_REGISTRY_INVALID'});
 const result=await Promise.all(SOURCES.map(item=>observe(item)));
 const repositories=[...result,PRIVATE];
 const sources=[
  ...repositories,
  ...CONNECTORS.map(platform=>({platform,state:'UNAVAILABLE',reason:'OWNER_RUNTIME_CONNECTOR_NOT_VERIFIED',
   observed_at:null,registered_agents:null,active_agents:null,subagents:null}))
 ];
 return res.status(200).json({status:'OK',source:'OWNER_LAB_FLEET_SOURCES_V1',
  environment:'LAB',company_id:'fenix',observed_at:new Date().toISOString(),
  verified_owner:true,read_only:true,execution_enabled:false,additional_cost_eur:0,
  roles:{...roles,registry_id:registry.registry_id,registry_environment:registry.environment,
   registry_status:registry.status},
  engine_registry_count:179,engine_registry_semantics:'DEFINED_NOT_RUNNING',
  sources,control:{pause:'NOT_CONNECTED',resume:'NOT_CONNECTED',prioritize:'NOT_CONNECTED',
   reason:'NO_VERIFIED_CONTROL_EXECUTOR',staging_status:'SUSPENDED_BY_OWNER'},
  scope_note:'Repository workflow runs are NOT agents or subagents; counts are sample observations. Unknown provider counts remain null.'});
}
